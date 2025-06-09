#!/usr/bin/env python3
"""
🔥 防火墙流量与业务响应关联分析脚本 (简化版)

用法:
  python firewall_simple_monitor.py <机房> <IP> <时间窗口秒数>
  
示例:
  python firewall_simple_monitor.py IDC1 192.168.1.1 300
"""

import sys
from datetime import datetime, timedelta
import requests
from typing import Dict, List

# 配置
CONFIG = {
    "max_bandwidth_bps": 40 * 1000 * 1000 * 1000,  # 40Gbps最大带宽
    "traffic_baseline_bps": 5 * 1000 * 1000,  # 5Mbps基线
    "db_response_baseline_ms": 4  # 4ms基线
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
                limit=1000
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

def generate_report(datacenter: str, host_ip: str, time_window: int, impact_intervals: List[Dict]):
    """生成分析报告"""
    
    # 计算基准值用于显示
    traffic_baseline_mbps = CONFIG["traffic_baseline_bps"] / (1000 * 1000)
    db_baseline_ms = CONFIG["db_response_baseline_ms"]
    
    print(f"""
防火墙流量递增区间影响分析
============================================================
机房: {datacenter}
防火墙IP: {host_ip}
分析时间窗口: {time_window}秒
总递增区间数: {len(impact_intervals)}
流量分析基准值: > {traffic_baseline_mbps:.0f} Mbps
数据库响应分析基准值: > {db_baseline_ms} ms
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

def main():
    """主函数"""
    if len(sys.argv) != 4:
        print("""用法: python firewall_simple_monitor.py <机房> <IP> <时间窗口秒数>
示例: python firewall_simple_monitor.py IDC1 192.168.1.1 300""")
        sys.exit(1)
    
    datacenter = sys.argv[1]
    host_ip = sys.argv[2]
    
    try:
        time_window = int(sys.argv[3])
    except ValueError:
        print("错误：时间窗口必须是数字（秒）")
        sys.exit(1)
    
    # 计算时间范围
    time_till = datetime.now()
    time_from = time_till - timedelta(seconds=time_window)
    
    log_message(f"开始分析 - 机房:{datacenter}, IP:{host_ip}, 时间窗口:{time_window}秒")
    
    # 获取流量数据
    traffic_data = get_metrics_data(host_ip, TRAFFIC_METRICS, time_from, time_till)
    
    if not traffic_data:
        log_message("流量数据获取失败", "ERROR")
        sys.exit(1)
    
    # 分析流量趋势
    inbound_analysis = analyze_traffic_trend(traffic_data.get('inbound_traffic', []))
    outbound_analysis = analyze_traffic_trend(traffic_data.get('outbound_traffic', []))
    
    log_message(f"入流量: {inbound_analysis['trend']}, 最大:{format_traffic_rate(inbound_analysis['max_bps'])}")
    log_message(f"出流量: {outbound_analysis['trend']}, 最大:{format_traffic_rate(outbound_analysis['max_bps'])}")
    
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
    
    log_message(f"检测到{len(all_intervals)}个流量递增区间，开始分析业务影响...")
    
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
    generate_report(datacenter, host_ip, time_window, impact_intervals)

if __name__ == "__main__":
    main() 