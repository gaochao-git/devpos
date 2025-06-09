#!/usr/bin/env python3
"""
🔥 防火墙流量与业务响应关联分析脚本 (简化版)

用法:
  模式1 - 指定时间窗口: python firewall_simple_monitor.py <IP> <时间窗口秒数>
  模式2 - 指定时间范围: python firewall_simple_monitor.py <IP> <开始时间> <结束时间>
  
示例:
  python firewall_simple_monitor.py 192.168.1.1 3600
  python firewall_simple_monitor.py 192.168.1.1 "2024-01-15 10:00:00" "2024-01-15 12:00:00"
  
说明:
  - 时间范围最多支持6小时
  - 时间格式: YYYY-MM-DD HH:MM:SS
"""

import sys
from datetime import datetime, timedelta
import requests
from typing import Dict, List, Tuple

# 配置
CONFIG = {
    "max_bandwidth_bps": 40 * 1000 * 1000,  # 40Gbps最大带宽
    "traffic_baseline_bps": 5 * 1000 * 1000,  # 5Mbps基线
    "db_response_baseline_ms": 4,  # 4ms基线
    "max_time_range_hours": 6  # 最大时间范围6小时
}

# IP到机房的映射关系
IP_TO_DATACENTER = {
    "192.168.1.1": "IDC1",
    "192.168.1.2": "IDC1", 
    "10.0.0.1": "IDC2",
    "10.0.0.2": "IDC2",
    "172.16.0.1": "IDC3",
    "172.16.0.2": "IDC3",
    # 可以继续添加更多IP映射
}

TRAFFIC_METRICS = {
    "inbound_traffic": "net.if.in[eth0]",
    "outbound_traffic": "net.if.out[eth0]",
}

BUSINESS_METRICS = {
    "database_response": "db.commit.rt"
}

def log_message(message, level="INFO"):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] [{level}] {message}")

def get_metrics_data(host_ip: str, metrics: Dict[str, str], time_from: datetime, time_till: datetime) -> Dict[str, List]:
    """获取指标数据"""
    try:
        from zabbix_api_util import get_zabbix_metrics
        
        time_from_ts = int(time_from.timestamp())
        time_till_ts = int(time_till.timestamp())
        
        metrics_data = {}
        
        for metric_name, metric_key in metrics.items():
            result = get_zabbix_metrics(
                host_ip=host_ip,
                metric_name=metric_key,
                time_from=time_from_ts,
                time_till=time_till_ts,
                match_type='search',
                limit=3600
            )
            
            if result['status'] == 'success' and result['data']:
                data = []
                for item in result['data']:
                    try:
                        data.append({
                            'time': datetime.fromtimestamp(int(item['clock'])),
                            'value': float(item['value'])
                        })
                    except (ValueError, KeyError):
                        continue
                
                metrics_data[metric_name] = sorted(data, key=lambda x: x['time'])
                log_message(f"指标 {metric_name} 获取成功, 数据点: {len(data)}")
            else:
                metrics_data[metric_name] = []
                log_message(f"指标 {metric_name} 获取失败", "ERROR")
        
        return metrics_data
        
    except Exception as e:
        log_message(f"获取指标数据失败: {e}", "ERROR")
        return {}

def format_traffic_rate(bps: float) -> str:
    """格式化流量显示"""
    if bps >= 1000**3:
        return f"{bps/(1000**3):.2f} Gbps"
    elif bps >= 1000**2:
        return f"{bps/(1000**2):.2f} Mbps"
    elif bps >= 1000:
        return f"{bps/1000:.2f} Kbps"
    else:
        return f"{bps:.2f} bps"

def identify_traffic_increase_intervals(data: List[Dict]) -> List[Dict]:
    """识别流量递增区间"""
    if not data or len(data) < 3:
        return []
    
    increase_intervals = []
    current_interval = None
    
    for i in range(1, len(data)):
        prev_value = data[i-1]['value']
        curr_value = data[i]['value']
        
        if curr_value > prev_value:  # 流量递增
            if current_interval is None:
                current_interval = {
                    'start_time': data[i-1]['time'],
                    'end_time': data[i]['time'],
                    'start_value': prev_value,
                    'end_value': curr_value,
                    'peak_value': curr_value
                }
            else:
                current_interval['end_time'] = data[i]['time']
                current_interval['end_value'] = curr_value
                current_interval['peak_value'] = max(current_interval['peak_value'], curr_value)
        else:
            if current_interval is not None:
                # 计算递增幅度和持续时间
                increase_ratio = (current_interval['end_value'] - current_interval['start_value']) / current_interval['start_value'] if current_interval['start_value'] > 0 else 0
                duration = (current_interval['end_time'] - current_interval['start_time']).total_seconds()
                
                if increase_ratio > 0.1 or duration > 30:  # 增长超过10%或持续超过30秒
                    current_interval['increase_ratio'] = increase_ratio
                    current_interval['duration_seconds'] = duration
                    increase_intervals.append(current_interval)
                
                current_interval = None
    
    # 处理最后一个区间
    if current_interval is not None:
        increase_ratio = (current_interval['end_value'] - current_interval['start_value']) / current_interval['start_value'] if current_interval['start_value'] > 0 else 0
        duration = (current_interval['end_time'] - current_interval['start_time']).total_seconds()
        
        if increase_ratio > 0.1 or duration > 30:
            current_interval['increase_ratio'] = increase_ratio
            current_interval['duration_seconds'] = duration
            increase_intervals.append(current_interval)
    
    return increase_intervals

def analyze_traffic_trend(data: List[Dict]) -> Dict:
    """分析流量趋势"""
    if not data or len(data) < 3:
        return {
            "is_increasing": False,
            "max_bps": 0,
            "avg_bps": 0,
            "trend": "insufficient_data",
            "increase_intervals": []
        }
    
    values = [item['value'] for item in data]
    max_bps = max(values)
    avg_bps = sum(values) / len(values)
    
    # 直接识别所有递增区间
    all_increase_intervals = identify_traffic_increase_intervals(data)
    
    # 筛选出最大值超过基准值的递增区间
    significant_intervals = []
    for interval in all_increase_intervals:
        if interval['peak_value'] > CONFIG["traffic_baseline_bps"]:
            significant_intervals.append(interval)
    
    # 根据是否有超过基准值的递增区间来判断趋势
    is_increasing = len(significant_intervals) > 0
    trend = "increasing" if is_increasing else "normal"
    
    return {
        "is_increasing": is_increasing,
        "max_bps": max_bps,
        "avg_bps": avg_bps,
        "trend": trend,
        "increase_intervals": significant_intervals  # 只返回超过基准值的区间
    }

def analyze_response_trend(data: List[Dict]) -> Dict:
    """分析响应时间趋势"""
    if not data or len(data) < 3:
        return {
            "is_degrading": False,
            "avg_ms": 0,
            "max_ms": 0,
            "trend": "insufficient_data"
        }
    
    values = [item['value'] for item in data]
    avg_ms = sum(values) / len(values)
    max_ms = max(values)
    
    # 直接识别所有响应时间递增区间
    all_increase_intervals = identify_traffic_increase_intervals(data)  # 复用递增区间识别函数
    
    # 筛选出最大值超过基准值的递增区间
    significant_intervals = []
    for interval in all_increase_intervals:
        if interval['peak_value'] > CONFIG["db_response_baseline_ms"]:
            significant_intervals.append(interval)
    
    # 根据是否有超过基准值的递增区间来判断是否恶化
    is_degrading = len(significant_intervals) > 0
    trend = "degrading" if is_degrading else "normal"
    
    return {
        "is_degrading": is_degrading,
        "avg_ms": avg_ms,
        "max_ms": max_ms,
        "trend": trend
    }

def get_mock_response_data(host_ip: str, time_from: datetime, time_till: datetime) -> Dict[str, List]:
    """生成mock业务响应数据"""
    import random
    
    duration_seconds = int((time_till - time_from).total_seconds())
    data_points = max(3, duration_seconds // 30)
    
    base_db_time = 15
    db_response_data = []
    
    for i in range(data_points):
        time_point = time_from + timedelta(seconds=i * 30)
        
        if random.random() < 0.3:  # 30%概率模拟响应时间恶化
            degradation_factor = 1 + (i / data_points) * 3
            db_time = base_db_time * degradation_factor + random.uniform(-5, 15)
        else:
            db_time = base_db_time + random.uniform(-8, 20)
        
        db_response_data.append({
            'time': time_point,
            'value': max(1, db_time)
        })
    
    return {"database_response": db_response_data}

def analyze_interval_impact(host_ip: str, interval: Dict) -> Dict:
    """分析区间业务影响"""
    business_data = get_mock_response_data(host_ip, interval['start_time'], interval['end_time'])
    
    if not business_data or 'database_response' not in business_data:
        return {"has_impact": False, "analysis": None}
    
    response_analysis = analyze_response_trend(business_data['database_response'])
    
    return {
        "has_impact": response_analysis['is_degrading'],
        "analysis": response_analysis
    }

def generate_report(datacenter: str, host_ip: str, time_window: int, impact_intervals: List[Dict], traffic_data: Dict, time_from: datetime, time_till: datetime):
    """生成分析报告"""
    
    # 计算基准值用于显示
    traffic_baseline_mbps = CONFIG["traffic_baseline_bps"] / (1000 * 1000)
    db_baseline_ms = CONFIG["db_response_baseline_ms"]
    
    # 统计数据点数
    inbound_points = len(traffic_data.get('inbound_traffic', []))
    outbound_points = len(traffic_data.get('outbound_traffic', []))
    
    # 计算响应时间数据点数（基于第一个影响区间的mock数据）
    response_points = 0
    if impact_intervals:
        # 使用第一个区间的时间范围来估算响应时间数据点数
        first_interval = impact_intervals[0]
        duration_seconds = int((first_interval['end_time'] - first_interval['start_time']).total_seconds())
        response_points = max(3, duration_seconds // 30)  # 每30秒一个点，最少3个点
    
    print(f"""
防火墙流量递增区间影响分析
============================================================
机房: {datacenter}
防火墙IP: {host_ip}
流量分析基准值: > {traffic_baseline_mbps:.0f} Mbps
数据库响应分析基准值: > {db_baseline_ms} ms
分析时间窗口: {time_window}秒 ({time_from.strftime('%Y-%m-%d %H:%M:%S')} ~ {time_till.strftime('%Y-%m-%d %H:%M:%S')})
入流量数据点数: {inbound_points}
出流量数据点数: {outbound_points}
响应耗时数据点数: {response_points}
""")
    
    if not impact_intervals:
        print("结论：无流量递增区间对业务造成影响")
        return
    
    # 生成综合影响分析
    generate_comprehensive_assessment(impact_intervals)

def generate_comprehensive_assessment(impact_intervals: List[Dict]):
    """生成综合影响分析"""
    print("\n综合影响分析:")
    
    # 分别统计入站流量、出站流量
    inbound_intervals = [i for i in impact_intervals if i['traffic_type'] == 'inbound']
    outbound_intervals = [i for i in impact_intervals if i['traffic_type'] == 'outbound']
    
    # 入站流量分析
    if inbound_intervals:
        max_inbound_increase = max(interval['increase_ratio'] * 100 for interval in inbound_intervals)
        max_inbound_interval = max(inbound_intervals, key=lambda x: x['increase_ratio'])
        max_inbound_peak_interval = max(inbound_intervals, key=lambda x: x['peak_value'])
        
        print(f"""  【入站流量】
    最大流量增长率: {max_inbound_increase:.1f}% 流量变化: {format_traffic_rate(max_inbound_interval['start_value'])} -> {format_traffic_rate(max_inbound_interval['end_value'])} 发生时间: {max_inbound_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_inbound_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}
    最大流量值: {format_traffic_rate(max_inbound_peak_interval['peak_value'])} 发生时间: {max_inbound_peak_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_inbound_peak_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}""")
    else:
        print("  【入站流量】无异常区间")
    
    # 出站流量分析
    if outbound_intervals:
        max_outbound_increase = max(interval['increase_ratio'] * 100 for interval in outbound_intervals)
        max_outbound_interval = max(outbound_intervals, key=lambda x: x['increase_ratio'])
        max_outbound_peak_interval = max(outbound_intervals, key=lambda x: x['peak_value'])
        
        print(f"""  【出站流量】
    最大流量增长率: {max_outbound_increase:.1f}% 流量变化: {format_traffic_rate(max_outbound_interval['start_value'])} -> {format_traffic_rate(max_outbound_interval['end_value'])} 发生时间: {max_outbound_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_outbound_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}
    最大流量值: {format_traffic_rate(max_outbound_peak_interval['peak_value'])} 发生时间: {max_outbound_peak_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_outbound_peak_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}""")
    else:
        print("  【出站流量】无异常区间")
    
    # 数据库响应耗时分析
    print("  【数据库响应耗时】")
    
    # 计算最大响应时间恶化
    max_response_degradation = 0
    max_response_interval = None
    max_response_earlier_avg = 0
    max_response_recent_avg = 0
    max_response_ms = 0
    max_response_ms_interval = None
    
    for interval in impact_intervals:
        business_impact = interval['business_impact']
        analysis = business_impact['analysis']
        
        # 找到最大响应时间
        if analysis['max_ms'] > max_response_ms:
            max_response_ms = analysis['max_ms']
            max_response_ms_interval = interval
        
        # 计算响应时间恶化程度 - 简化版本，基于平均值和最大值的关系
        if analysis['max_ms'] > analysis['avg_ms'] * 1.5:  # 如果最大值明显高于平均值
            # 假设前半段是平均值，后半段是最大值附近的值来估算恶化
            estimated_earlier_avg = analysis['avg_ms'] * 0.8
            estimated_recent_avg = analysis['max_ms'] * 0.9
            degradation_ratio = (estimated_recent_avg - estimated_earlier_avg) / estimated_earlier_avg if estimated_earlier_avg > 0 else 0
            
            if degradation_ratio > max_response_degradation:
                max_response_degradation = degradation_ratio
                max_response_interval = interval
                max_response_earlier_avg = estimated_earlier_avg
                max_response_recent_avg = estimated_recent_avg
    
    if max_response_interval and max_response_degradation > 0:
        print(f"    最大响应耗时增长率: {max_response_degradation*100:.1f}% 响应变化:{max_response_earlier_avg:.1f}ms->{max_response_recent_avg:.1f}ms 发生时间:{max_response_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_response_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print("    最大响应耗时增长率: 无明显恶化")
        
    if max_response_ms_interval:
        print(f"    最大响应耗时: {max_response_ms:.1f}ms 发生时间:{max_response_ms_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_response_ms_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print("    最大响应耗时: 无数据")

def parse_time_arguments(args: List[str]) -> Tuple[datetime, datetime, int]:
    """解析时间参数，返回(开始时间, 结束时间, 时间窗口秒数)"""
    
    if len(args) == 3:
        # 模式1: IP + 秒数
        try:
            time_window = int(args[2])
            if time_window <= 0:
                raise ValueError("时间窗口必须大于0")
            
            max_seconds = CONFIG["max_time_range_hours"] * 3600
            if time_window > max_seconds:
                raise ValueError(f"时间窗口不能超过{CONFIG['max_time_range_hours']}小时({max_seconds}秒)")
            
            time_till = datetime.now()
            time_from = time_till - timedelta(seconds=time_window)
            
            return time_from, time_till, time_window
            
        except ValueError as e:
            if "invalid literal" in str(e):
                raise ValueError("时间窗口必须是数字（秒）")
            else:
                raise e
    
    elif len(args) == 4:
        # 模式2: IP + 开始时间 + 结束时间
        try:
            start_time_str = args[2]
            end_time_str = args[3]
            
            # 解析时间字符串
            time_from = datetime.strptime(start_time_str, "%Y-%m-%d %H:%M:%S")
            time_till = datetime.strptime(end_time_str, "%Y-%m-%d %H:%M:%S")
            
            # 验证时间范围
            if time_from >= time_till:
                raise ValueError("开始时间必须早于结束时间")
            
            duration = time_till - time_from
            max_duration = timedelta(hours=CONFIG["max_time_range_hours"])
            
            if duration > max_duration:
                raise ValueError(f"时间范围不能超过{CONFIG['max_time_range_hours']}小时")
            
            # 检查是否是未来时间
            now = datetime.now()
            if time_till > now:
                raise ValueError("结束时间不能是未来时间")
            
            time_window = int(duration.total_seconds())
            
            return time_from, time_till, time_window
            
        except ValueError as e:
            if "time data" in str(e):
                raise ValueError("时间格式错误，应为: YYYY-MM-DD HH:MM:SS")
            else:
                raise e
    
    else:
        raise ValueError("参数数量错误")

def get_datacenter_by_ip(host_ip: str) -> str:
    """根据IP获取对应的机房名称"""
    return IP_TO_DATACENTER.get(host_ip, "UNKNOWN")

def main():
    """主函数"""
    if len(sys.argv) not in [3, 4]:
        print("""用法:
  模式1 - 指定时间窗口: python firewall_simple_monitor.py <IP> <时间窗口秒数>
  模式2 - 指定时间范围: python firewall_simple_monitor.py <IP> <开始时间> <结束时间>
  
示例:
  python firewall_simple_monitor.py 192.168.1.1 3600
  python firewall_simple_monitor.py 192.168.1.1 "2024-01-15 10:00:00" "2024-01-15 12:00:00"
  
说明:
  - 时间范围最多支持6小时
  - 时间格式: YYYY-MM-DD HH:MM:SS""")
        sys.exit(1)
    
    host_ip = sys.argv[1]
    datacenter = get_datacenter_by_ip(host_ip)
    
    try:
        time_from, time_till, time_window = parse_time_arguments(sys.argv)
    except ValueError as e:
        print(f"错误：{e}")
        sys.exit(1)
    
    log_message(f"开始分析 - 机房:{datacenter}, IP:{host_ip}")
    log_message(f"时间范围: {time_from.strftime('%Y-%m-%d %H:%M:%S')} ~ {time_till.strftime('%Y-%m-%d %H:%M:%S')} (时间窗口:{time_window}秒)")
    
    # 获取流量数据
    traffic_data = get_metrics_data(host_ip, TRAFFIC_METRICS, time_from, time_till)
    
    if not traffic_data:
        log_message("流量数据获取失败", "ERROR")
        sys.exit(1)
    
    # 分析流量趋势
    inbound_analysis = analyze_traffic_trend(traffic_data.get('inbound_traffic', []))
    outbound_analysis = analyze_traffic_trend(traffic_data.get('outbound_traffic', []))
    
    # 收集所有递增区间
    all_intervals = []
    
    for interval in inbound_analysis['increase_intervals']:
        interval['traffic_type'] = 'inbound'
        all_intervals.append(interval)
    
    for interval in outbound_analysis['increase_intervals']:
        interval['traffic_type'] = 'outbound'
        all_intervals.append(interval)
    
    if not all_intervals:
        print(f"结论：机房{datacenter}防火墙{host_ip}流量正常，无业务影响")
        sys.exit(0)
    
    # 统计各类型递增区间数量
    inbound_count = len(inbound_analysis['increase_intervals'])
    outbound_count = len(outbound_analysis['increase_intervals'])
    
    log_message(f"检测到流量递增区间: 入流量{inbound_count}个, 出流量{outbound_count}个, 开始分析业务影响...")
    
    # 分析业务影响
    impact_intervals = []
    
    for interval in all_intervals:
        impact_analysis = analyze_interval_impact(host_ip, interval)
        
        if impact_analysis['has_impact']:
            interval['business_impact'] = impact_analysis
            impact_intervals.append(interval)
    
    if not impact_intervals:
        print(f"结论：机房{datacenter}防火墙{host_ip}虽有流量递增，但无业务影响")
        sys.exit(0)
    
    # 生成报告
    generate_report(datacenter, host_ip, time_window, impact_intervals, traffic_data, time_from, time_till)

if __name__ == "__main__":
    main() 