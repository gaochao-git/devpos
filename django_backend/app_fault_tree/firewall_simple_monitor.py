#!/usr/bin/env python3
"""
🔥 防火墙流量与业务响应关联分析脚本 (简化版)

适用于定时任务调度：
- 检测指定时间窗口内流量是否持续升高
- 如果流量持续升高，检查业务响应耗时
- 判断流量增加是否影响业务响应

用法:
  python firewall_simple_monitor.py <机房> <IP> <时间窗口秒数> [debug=on|off]
  
示例:
  python firewall_simple_monitor.py IDC1 192.168.1.1 300
  python firewall_simple_monitor.py IDC1 192.168.1.1 300 debug=on
  python firewall_simple_monitor.py IDC2 10.0.0.1 600 debug=off
"""

import sys
from datetime import datetime, timedelta
import requests
from typing import Dict, List, Optional

# DeepSeek API 配置
DEEPSEEK_CONFIG = {
    "api_key": "sk-490738f8ce8f4a36bcc0bfb165270008",
    "api_base": "https://api.deepseek.com/v1",
    "model": "deepseek-chat",
    "timeout": 30
}

# 防火墙配置
FIREWALL_CONFIG = {
    "max_bandwidth_gbps": 40,  # 防火墙最大带宽 40Gbps
    "increase_threshold": 0.6,  # 60%的数据点增加才判定为持续升高
    "response_degradation_threshold": 1.3,  # 响应时间增加30%判定为恶化
    "traffic_baseline_bps": 5 * 1000 * 1000, # 流量基线 10Mbps，低于此值不重点分析
    "db_response_baseline_ms": 4  # 数据库响应基线 4ms，低于此值不重点分析
}

# 防火墙流量指标配置
TRAFFIC_METRICS = {
    "inbound_traffic": "net.if.in[eth0]",      # 入流量
    "outbound_traffic": "net.if.out[eth0]",    # 出流量
}

# 业务响应指标配置  
BUSINESS_METRICS = {
    "database_response": "db.commit.rt"        # 数据库提交响应时间
}

def log_message(message, level="INFO"):
    """记录日志消息"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] [{level}] {message}")

def call_deepseek_api(prompt, max_retries=2):
    """调用DeepSeek API进行智能分析"""
    try:
        config = DEEPSEEK_CONFIG
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config['api_key']}"
        }
        
        data = {
            "model": config["model"],
            "messages": [
                {
                    "role": "system",
                    "content": "你是网络运维专家。你的任务是基于给出的数据，分析在网络流量高增长的时间区间内，数据库的响应耗时是否也同步增加。请直接陈述分析结论，不要提供任何建议或推测根因。"
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 800
        }
        
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    config["api_base"] + "/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=config["timeout"]
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if "choices" in result and len(result["choices"]) > 0:
                        return result["choices"][0]["message"]["content"]
                        
            except requests.exceptions.RequestException:
                if attempt < max_retries - 1:
                    continue
                    
    except Exception as e:
        log_message(f"API调用错误: {e}", "ERROR")
        
    return None

def get_metrics_data(host_ip: str, metrics: Dict[str, str], time_from: datetime, time_till: datetime) -> Dict[str, List]:
    """获取指标数据"""
    try:
        from zabbix_api_util import get_zabbix_metrics
        
        time_from_ts = int(time_from.timestamp())
        time_till_ts = int(time_till.timestamp())
        
        print(f"\n🔍 调试：获取指标数据")
        print(f"主机IP: {host_ip}")
        print(f"时间范围: {time_from.strftime('%Y-%m-%d %H:%M:%S')} ~ {time_till.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"时间戳: {time_from_ts} ~ {time_till_ts}")
        
        metrics_data = {}
        
        for metric_name, metric_key in metrics.items():
            print(f"\n📊 获取指标: {metric_name} ({metric_key})")
            
            result = get_zabbix_metrics(
                host_ip=host_ip,
                metric_name=metric_key,
                time_from=time_from_ts,
                time_till=time_till_ts,
                match_type='search',
                limit=1000
            )
            
            print(f"API返回状态: {result.get('status', 'unknown')}")
            print(f"API返回消息: {result.get('message', 'no message')}")
            
            if result['status'] == 'success' and result['data']:
                print(f"获取到数据点数量: {len(result['data'])}")
                
                # 显示前5个原始数据点
                print(f"\n📋 前5个原始数据点:")
                for i, item in enumerate(result['data'][:5]):
                    timestamp = int(item['clock'])
                    time_str = datetime.fromtimestamp(timestamp).strftime('%H:%M:%S')
                    print(f"  [{i+1}] 时间: {time_str}, 时间戳: {timestamp}, 原始值: {item['value']}, 类型: {type(item['value'])}")
                
                # 处理数据
                data = []
                raw_values = []
                
                for item in result['data']:
                    try:
                        raw_value = float(item['value'])
                        raw_values.append(raw_value)
                        data.append({
                            'time': datetime.fromtimestamp(int(item['clock'])),
                            'value': raw_value  # 直接使用原始值，假设是bps
                        })
                    except (ValueError, KeyError) as e:
                        print(f"  ⚠️ 数据转换错误: {e}, 项目: {item}")
                        continue
                
                if data:
                    min_val = min(raw_values)
                    max_val = max(raw_values)
                    avg_val = sum(raw_values) / len(raw_values)
                    
                    print(f"\n📈 数据统计:")
                    print(f"  有效数据点: {len(data)}")
                    print(f"  数值范围: {min_val:.2f} ~ {max_val:.2f}")
                    print(f"  平均值: {avg_val:.2f}")
                    print(f"  单位推测: {'可能是bps' if max_val > 1000 else '可能是Kbps或其他'}")
                    
                    # 格式化显示示例
                    print(f"\n🎨 格式化显示示例:")
                    print(f"  最小值: {format_traffic_rate(min_val, is_bits=True)} (当作bps)")
                    print(f"  最大值: {format_traffic_rate(max_val, is_bits=True)} (当作bps)")
                    print(f"  平均值: {format_traffic_rate(avg_val, is_bits=True)} (当作bps)")
                    
                    if max_val > 0:
                        print(f"\n🔄 如果当作bytes/s会是:")
                        print(f"  最大值: {format_traffic_rate(max_val, is_bits=False)} (当作bytes/s)")
                        print(f"  平均值: {format_traffic_rate(avg_val, is_bits=False)} (当作bytes/s)")
                
                log_message(f"指标 {metric_name} 获取成功, 数据点: {len(data)}, 范围: {min_val:.1f} ~ {max_val:.1f}")
                
                metrics_data[metric_name] = sorted(data, key=lambda x: x['time'])
            else:
                print(f"❌ 获取数据失败或无数据")
                if 'error' in result:
                    print(f"错误详情: {result['error']}")
                metrics_data[metric_name] = []
        
        print(f"\n✅ 数据获取完成，共获取 {len(metrics_data)} 个指标")
        return metrics_data
        
    except Exception as e:
        print(f"❌ 获取指标数据异常: {e}")
        import traceback
        traceback.print_exc()
        log_message(f"获取指标数据失败: {e}", "ERROR")
        return {}

def format_traffic_rate(bits_or_bytes_per_second: float, is_bits: bool = False) -> str:
    """根据流量大小动态格式化显示单位
    
    Args:
        bits_or_bytes_per_second: 流量值
        is_bits: True表示输入已经是bits/s，False表示是bytes/s需要转换
    """
    if bits_or_bytes_per_second == 0:
        return "0 B/s"
    
    # 如果不是bits，则转换为bits/second
    if is_bits:
        bits_per_second = bits_or_bytes_per_second
    else:
        bits_per_second = bits_or_bytes_per_second * 8
    
    # 使用十进制进制（1000）
    units = [
        (1000**4, "Tbps"),
        (1000**3, "Gbps"), 
        (1000**2, "Mbps"),
        (1000**1, "Kbps"),
        (1, "bps")
    ]
    
    for threshold, unit in units:
        if bits_per_second >= threshold:
            value = bits_per_second / threshold
            if value >= 100:
                return f"{value:.1f} {unit}"
            elif value >= 10:
                return f"{value:.1f} {unit}"
            else:
                return f"{value:.2f} {unit}"
    
    return f"{bits_per_second:.2f} bps"

def bytes_to_gbps(bits_or_bytes_per_second: float, is_bits: bool = False) -> float:
    """将流量值转换为Gbps（使用十进制）
    
    Args:
        bits_or_bytes_per_second: 流量值
        is_bits: True表示输入已经是bits/s，False表示是bytes/s需要转换
    """
    if is_bits:
        return bits_or_bytes_per_second / (1000 ** 3)
    else:
        return (bits_or_bytes_per_second * 8) / (1000 ** 3)

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
                # 开始新的递增区间
                current_interval = {
                    'start_time': data[i-1]['time'],
                    'end_time': data[i]['time'],
                    'start_value': prev_value,
                    'end_value': curr_value,
                    'peak_value': curr_value,
                    'data_points': [data[i-1], data[i]]
                }
            else:
                # 延续当前递增区间
                current_interval['end_time'] = data[i]['time']
                current_interval['end_value'] = curr_value
                current_interval['peak_value'] = max(current_interval['peak_value'], curr_value)
                current_interval['data_points'].append(data[i])
        else:
            # 流量不再递增，结束当前区间
            if current_interval is not None:
                # 计算递增幅度
                increase_ratio = (current_interval['end_value'] - current_interval['start_value']) / current_interval['start_value'] if current_interval['start_value'] > 0 else 0
                current_interval['increase_ratio'] = increase_ratio
                current_interval['duration_seconds'] = (current_interval['end_time'] - current_interval['start_time']).total_seconds()
                
                # 只保留有意义的递增区间（增长超过10%或持续时间超过30秒）
                if increase_ratio > 0.1 or current_interval['duration_seconds'] > 30:
                    increase_intervals.append(current_interval)
                
                current_interval = None
    
    # 处理最后一个区间
    if current_interval is not None:
        increase_ratio = (current_interval['end_value'] - current_interval['start_value']) / current_interval['start_value'] if current_interval['start_value'] > 0 else 0
        current_interval['increase_ratio'] = increase_ratio
        current_interval['duration_seconds'] = (current_interval['end_time'] - current_interval['start_time']).total_seconds()
        
        if increase_ratio > 0.1 or current_interval['duration_seconds'] > 30:
            increase_intervals.append(current_interval)
    
    return increase_intervals

def analyze_traffic_with_intervals(data: List[Dict]) -> Dict:
    """分析流量趋势，包含递增区间信息"""
    if not data or len(data) < 3:
        return {
            "is_increasing": False,
            "avg_gbps": 0,
            "max_gbps": 0,
            "max_formatted": "0 B/s",
            "avg_formatted": "0 B/s",
            "trend": "insufficient_data",
            "utilization_percent": 0,
            "data_points": len(data) if data else 0,
            "increase_intervals": []
        }
    
    values = [item['value'] for item in data]
    gbps_values = [bytes_to_gbps(v, is_bits=True) for v in values]
    
    avg_gbps = sum(gbps_values) / len(gbps_values)
    max_gbps = max(gbps_values)
    avg_bytes = sum(values) / len(values)
    max_bytes = max(values)
    
    # 计算利用率
    max_bandwidth = FIREWALL_CONFIG["max_bandwidth_gbps"]
    utilization_percent = (max_gbps / max_bandwidth) * 100

    # 如果峰值流量低于基线，则认为流量正常，不进行深入的趋势分析
    traffic_baseline = FIREWALL_CONFIG.get("traffic_baseline_bps", 0)
    if max_bytes < traffic_baseline:
        return {
            "is_increasing": False,
            "avg_gbps": round(avg_gbps, 2),
            "max_gbps": round(max_gbps, 2),
            "max_formatted": format_traffic_rate(max_bytes, is_bits=True),
            "avg_formatted": format_traffic_rate(avg_bytes, is_bits=True),
            "trend": "normal",
            "utilization_percent": round(utilization_percent, 1),
            "data_points": len(values),
            "increase_ratio": 0,
            "increase_intervals": []
        }
    
    # 识别递增区间
    increase_intervals = identify_traffic_increase_intervals(data)
    
    # 整体趋势分析
    is_increasing = False
    trend = "stable"
    increase_ratio = 0
    
    if len(values) >= 3:
        increasing_count = 0
        for i in range(1, len(gbps_values)):
            if gbps_values[i] > gbps_values[i-1]:
                increasing_count += 1
        
        increase_ratio = increasing_count / (len(gbps_values) - 1)
        if increase_ratio >= FIREWALL_CONFIG["increase_threshold"]:
            is_increasing = True
            trend = "increasing"
        elif increase_ratio <= 0.3:
            trend = "decreasing"
    
    # 为每个递增区间添加格式化信息
    for interval in increase_intervals:
        interval['start_formatted'] = format_traffic_rate(interval['start_value'], is_bits=True)
        interval['end_formatted'] = format_traffic_rate(interval['end_value'], is_bits=True)
        interval['peak_formatted'] = format_traffic_rate(interval['peak_value'], is_bits=True)
        interval['increase_percent'] = interval['increase_ratio'] * 100
    
    return {
        "is_increasing": is_increasing,
        "avg_gbps": round(avg_gbps, 2),
        "max_gbps": round(max_gbps, 2),
        "max_formatted": format_traffic_rate(max_bytes, is_bits=True),
        "avg_formatted": format_traffic_rate(avg_bytes, is_bits=True),
        "trend": trend,
        "utilization_percent": round(utilization_percent, 1),
        "data_points": len(values),
        "increase_ratio": round(increase_ratio, 2) if len(values) >= 3 else 0,
        "increase_intervals": increase_intervals
    }

def analyze_response_trend(data: List[Dict]) -> Dict:
    """分析响应时间趋势"""
    if not data or len(data) < 3:
        return {
            "is_degrading": False,
            "avg_ms": 0,
            "max_ms": 0,
            "trend": "insufficient_data",
            "data_points": len(data) if data else 0
        }
    
    values = [item['value'] for item in data]
    
    avg_ms = sum(values) / len(values)
    max_ms = max(values)
    
    db_baseline = FIREWALL_CONFIG.get("db_response_baseline_ms", 0)
    # 只有当最大响应时间超过基线时，才进一步分析是否存在恶化
    if max_ms < db_baseline:
        return {
            "is_degrading": False,
            "avg_ms": round(avg_ms, 2),
            "max_ms": round(max_ms, 2),
            "trend": "normal",
            "data_points": len(values)
        }

    # 响应时间趋势分析
    is_degrading = False
    trend = "stable"
    
    if len(values) >= 3:
        # 比较前半段和后半段的平均值
        mid_point = len(values) // 2
        earlier_avg = sum(values[:mid_point]) / mid_point
        recent_avg = sum(values[mid_point:]) / (len(values) - mid_point)
        
        if recent_avg > earlier_avg * FIREWALL_CONFIG["response_degradation_threshold"]:
            is_degrading = True
            trend = "degrading"
        elif recent_avg < earlier_avg * 0.8:
            trend = "improving"
    
    return {
        "is_degrading": is_degrading,
        "avg_ms": round(avg_ms, 2),
        "max_ms": round(max_ms, 2),
        "trend": trend,
        "data_points": len(values)
    }

def get_change_intensity_indicator(increase_percent: float) -> str:
    """根据增长百分比返回变化剧烈程度标识符"""
    if increase_percent < 25:
        return "*"
    elif increase_percent < 50:
        return "**"
    elif increase_percent < 100:
        return "***"
    elif increase_percent < 200:
        return "****"
    elif increase_percent < 500:
        return "*****"
    else:
        return "******"

def generate_interval_analysis_prompt(datacenter: str, host_ip: str, time_window: int, critical_interval: Dict, all_intervals: List[Dict]) -> str:
    """生成区间分析的AI提示词"""
    
    # 分别收集入站流量、出站流量的数据
    inbound_intervals = [i for i in all_intervals if i['traffic_type'] == 'inbound']
    outbound_intervals = [i for i in all_intervals if i['traffic_type'] == 'outbound']
    
    # 入站流量分析
    inbound_analysis = ""
    if inbound_intervals:
        max_inbound_increase = max(interval['increase_percent'] for interval in inbound_intervals)
        max_inbound_interval = max(inbound_intervals, key=lambda x: x['increase_percent'])
        max_inbound_absolute = max(inbound_intervals, key=lambda x: x['peak_value'])
        
        inbound_analysis = f"""【入站流量分析】
最大增长: {max_inbound_increase:.1f}%
发生时间: {max_inbound_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_inbound_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}
流量变化: {max_inbound_interval['start_formatted']} -> {max_inbound_interval['end_formatted']}
最大流量值: {max_inbound_absolute['peak_formatted']}
影响区间数: {len(inbound_intervals)}个"""
    else:
        inbound_analysis = "【入站流量分析】\n无入站流量异常区间"
    
    # 出站流量分析
    outbound_analysis = ""
    if outbound_intervals:
        max_outbound_increase = max(interval['increase_percent'] for interval in outbound_intervals)
        max_outbound_interval = max(outbound_intervals, key=lambda x: x['increase_percent'])
        max_outbound_absolute = max(outbound_intervals, key=lambda x: x['peak_value'])
        
        outbound_analysis = f"""【出站流量分析】
最大增长: {max_outbound_increase:.1f}%
发生时间: {max_outbound_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_outbound_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}
流量变化: {max_outbound_interval['start_formatted']} -> {max_outbound_interval['end_formatted']}
最大流量值: {max_outbound_absolute['peak_formatted']}
影响区间数: {len(outbound_intervals)}个"""
    else:
        outbound_analysis = "【出站流量分析】\n无出站流量异常区间"
    
    # 数据库响应耗时分析
    max_response_degradation = 0
    max_response_interval = None
    min_response_time = float('inf')
    max_response_time = 0
    avg_response_time = 0
    max_response_earlier_avg = 0
    max_response_recent_avg = 0
    
    response_times = []
    for interval in all_intervals:
        business_impact = interval['business_impact']
        response_data = business_impact.get('response_data', [])
        if response_data and len(response_data) >= 3:
            values = [item['value'] for item in response_data]
            response_times.extend(values)
            
            # 计算响应时间恶化
            mid_point = len(values) // 2
            earlier_avg = sum(values[:mid_point]) / mid_point if mid_point > 0 else values[0]
            recent_avg = sum(values[mid_point:]) / (len(values) - mid_point)
            degradation_ratio = (recent_avg - earlier_avg) / earlier_avg if earlier_avg > 0 else 0
            
            if degradation_ratio > max_response_degradation:
                max_response_degradation = degradation_ratio
                max_response_interval = interval
                max_response_earlier_avg = earlier_avg
                max_response_recent_avg = recent_avg
    
    if response_times:
        min_response_time = min(response_times)
        max_response_time = max(response_times)
        avg_response_time = sum(response_times) / len(response_times)
    
    db_analysis = f"""【数据库响应耗时分析】
最大响应耗时增长率: {max_response_degradation*100:.1f}%"""
    
    if max_response_interval:
        db_analysis += f"""
响应变化: {max_response_earlier_avg:.1f}ms -> {max_response_recent_avg:.1f}ms
恶化发生时间: {max_response_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_response_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}
该时段响应: 平均{max_response_interval['business_impact']['analysis']['avg_ms']:.1f}ms, 最大{max_response_interval['business_impact']['analysis']['max_ms']:.1f}ms"""
    
    if response_times:
        db_analysis += f"""
整体响应时间: 最小{min_response_time:.1f}ms, 最大{max_response_time:.1f}ms, 平均{avg_response_time:.1f}ms
数据点总数: {len(response_times)}个"""
    
    # 统计影响区间
    total_intervals = len(all_intervals)
    severe_intervals = len([i for i in all_intervals if i['increase_percent'] >= 500])  # ******级别
    critical_intervals = len([i for i in all_intervals if i['increase_percent'] >= 200])  # *****级别以上
    
    # 影响级别判定
    if severe_intervals >= 3:
        impact_level = "紧急"
    elif critical_intervals >= 5:
        impact_level = "严重"
    elif total_intervals >= 10:
        impact_level = "中等"
    else:
        impact_level = "轻微"
    
    # 时间跨度
    first_time = min(interval['start_time'] for interval in all_intervals)
    last_time = max(interval['end_time'] for interval in all_intervals)
    duration_minutes = (last_time - first_time).total_seconds() / 60
    
    prompt = f"""防火墙流量与数据库响应关联分析：

机房: {datacenter}
防火墙IP: {host_ip}
分析时间窗口: {time_window}秒

【综合影响评估】
{inbound_analysis}

{outbound_analysis}

{db_analysis}

请基于以上三个维度数据分析流量增长对数据库响应的影响。"""
    
    return prompt

def generate_interval_impact_report(datacenter: str, host_ip: str, time_window: int, impact_intervals: List[Dict], debug_mode: bool):
    """生成受影响区间的综合分析报告"""
    
    print(f"\n🔥 防火墙流量递增区间影响分析")
    print(f"=" * 60)
    print(f"机房: {datacenter}")
    print(f"防火墙IP: {host_ip}")
    print(f"分析时间窗口: {time_window}秒")
    print(f"总递增区间数: {len(impact_intervals)}")
    
    if debug_mode:
        print(f"\n📊 变化剧烈程度图例:")
        print(f"  * = 轻微(25%以下)   ** = 较小(25-50%)   *** = 中等(50-100%)")
        print(f"  **** = 较大(100-200%)   ***** = 严重(200-500%)   ****** = 极端(500%+)")
    
    # 统计最严重的影响
    max_traffic_increase = 0
    max_response_degradation = 0
    critical_interval = None
    max_traffic_interval = None
    max_response_interval = None
    max_absolute_traffic = 0
    max_absolute_interval = None
    max_response_ms = 0
    max_response_ms_interval = None
    max_response_earlier_avg = 0
    max_response_recent_avg = 0
    
    # 只在debug模式下打印每个区间的详细信息
    if debug_mode:
        for i, interval in enumerate(impact_intervals):
            business_impact = interval['business_impact']
            analysis = business_impact['analysis']
            
            # 获取变化剧烈程度标识符
            intensity_indicator = get_change_intensity_indicator(interval['increase_percent'])
            
            print(f"\n📈 区间 {i+1}: {interval['traffic_type']}流量异常 {intensity_indicator}")
            print(f"  时间段: {interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"  持续时间: {interval['duration_seconds']:.0f}秒")
            print(f"  流量变化: {interval['start_formatted']} -> {interval['end_formatted']} (+{interval['increase_percent']:.1f}%)")
            print(f"  峰值流量: {interval['peak_formatted']}")
            print(f"  数据库响应: 响应时间{analysis['trend']}, 平均{analysis['avg_ms']:.1f}ms, 最大{analysis['max_ms']:.1f}ms")
    
    # 无论debug模式如何，都要统计最大值用于后续分析
    for i, interval in enumerate(impact_intervals):
        business_impact = interval['business_impact']
        analysis = business_impact['analysis']
        
        if 'max_ms' in analysis and analysis['max_ms'] > max_response_ms:
            max_response_ms = analysis['max_ms']
            max_response_ms_interval = interval
        
        # 更新最大流量增长统计
        if interval['increase_percent'] > max_traffic_increase:
            max_traffic_increase = interval['increase_percent']
            max_traffic_interval = interval
        
        # 更新最大绝对流量统计
        if interval['peak_value'] > max_absolute_traffic:
            max_absolute_traffic = interval['peak_value']
            max_absolute_interval = interval
        
        # 计算响应时间恶化程度
        if analysis['data_points'] >= 3:
            # 从业务响应数据中获取原始数据进行计算
            response_data = business_impact.get('response_data', [])
            if not response_data:
                # 如果没有原始数据，使用mock数据重新生成来计算
                response_data = get_business_response_data(
                    "mock_host", 
                    interval['start_time'], 
                    interval['end_time']
                ).get('database_response', [])
            
            if response_data and len(response_data) >= 3:
                values = [item['value'] for item in response_data]
                mid_point = len(values) // 2
                earlier_avg = sum(values[:mid_point]) / mid_point if mid_point > 0 else values[0]
                recent_avg = sum(values[mid_point:]) / (len(values) - mid_point)
                degradation_ratio = (recent_avg - earlier_avg) / earlier_avg if earlier_avg > 0 else 0
                
                if degradation_ratio > max_response_degradation:
                    max_response_degradation = degradation_ratio
                    max_response_interval = interval
                    critical_interval = interval
                    max_response_earlier_avg = earlier_avg
                    max_response_recent_avg = recent_avg
    
    # 综合评估 - 分三个维度显示
    print(f"\n📊 综合影响评估:")
    
    # 分别统计入站流量、出站流量
    inbound_intervals = [i for i in impact_intervals if i['traffic_type'] == 'inbound']
    outbound_intervals = [i for i in impact_intervals if i['traffic_type'] == 'outbound']
    
    # 入站流量分析
    if inbound_intervals:
        max_inbound_increase = max(interval['increase_percent'] for interval in inbound_intervals)
        max_inbound_interval = max(inbound_intervals, key=lambda x: x['increase_percent'])
        max_inbound_peak_interval = max(inbound_intervals, key=lambda x: x['peak_value'])
        
        print(f"  【入站流量】")
        print(f"    最大流量增长率: {max_inbound_increase:.1f}% 流量变化: {max_inbound_interval['start_formatted']} -> {max_inbound_interval['end_formatted']} 发生时间: {max_inbound_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_inbound_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"    最大流量值: {max_inbound_peak_interval['peak_formatted']} 发生时间: {max_inbound_peak_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_inbound_peak_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print(f"  【入站流量】无异常区间")
    
    # 出站流量分析
    if outbound_intervals:
        max_outbound_increase = max(interval['increase_percent'] for interval in outbound_intervals)
        max_outbound_interval = max(outbound_intervals, key=lambda x: x['increase_percent'])
        max_outbound_peak_interval = max(outbound_intervals, key=lambda x: x['peak_value'])
        
        print(f"  【出站流量】")
        print(f"    最大流量增长率: {max_outbound_increase:.1f}% 流量变化: {max_outbound_interval['start_formatted']} -> {max_outbound_interval['end_formatted']} 发生时间: {max_outbound_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_outbound_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"    最大流量值: {max_outbound_peak_interval['peak_formatted']} 发生时间: {max_outbound_peak_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_outbound_peak_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print(f"  【出站流量】无异常区间")
    
    # 数据库响应耗时分析
    print(f"  【数据库响应耗时】")
    if max_response_interval and max_response_degradation > 0:
        print(f"    最大响应耗时增长率: {max_response_degradation*100:.1f}% 响应变化:{max_response_earlier_avg:.1f}ms->{max_response_recent_avg:.1f}ms 发生时间:{max_response_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_response_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print(f"    最大响应耗时增长率: 无法计算（数据不足）")
        
    if max_response_ms_interval:
        print(f"    最大响应耗时: {max_response_ms:.1f}ms 发生时间:{max_response_ms_interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {max_response_ms_interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print(f"    最大响应耗时: 无法计算（数据不足）")
    
    # 总体影响级别评估
    total_intervals = len(impact_intervals)
    severe_intervals = len([i for i in impact_intervals if i['increase_percent'] >= 500])  # ******级别
    critical_intervals = len([i for i in impact_intervals if i['increase_percent'] >= 200])  # *****级别以上
    
    # print(f"  影响区间统计: 总计{total_intervals}个, 严重{critical_intervals}个, 极端{severe_intervals}个")
    
    # 影响级别判定
    if severe_intervals >= 3:
        impact_level = "紧急"
    elif critical_intervals >= 5:
        impact_level = "严重"
    elif total_intervals >= 10:
        impact_level = "中等"
    else:
        impact_level = "轻微"
    
    # print(f"  综合影响级别: {impact_level}")
    
    # 时间分布分析
    # if len(impact_intervals) >= 2:
    #     first_time = min(interval['start_time'] for interval in impact_intervals)
    #     last_time = max(interval['end_time'] for interval in impact_intervals)
    #     duration_minutes = (last_time - first_time).total_seconds() / 60
    #     print(f"  影响时间跨度: {first_time.strftime('%H:%M:%S')} ~ {last_time.strftime('%H:%M:%S')} (共{duration_minutes:.1f}分钟)")
    
    # 生成AI分析
    if critical_interval:
        prompt = generate_interval_analysis_prompt(datacenter, host_ip, time_window, critical_interval, impact_intervals)
        
        log_message("正在进行AI区间影响分析...")
        ai_analysis = call_deepseek_api(prompt)
        
        if ai_analysis:
            print(f"\n🤖 AI分析结果:")
            print("=" * 50)
            print(ai_analysis)
        else:
            print(f"\n⚠️ 结论: 检测到{len(impact_intervals)}个流量递增区间对业务造成影响")
    else:
        print(f"\n⚠️ 结论: 检测到{len(impact_intervals)}个流量递增区间对业务造成影响")

def get_business_response_data(host_ip: str, time_from: datetime, time_till: datetime) -> Dict[str, List]:
    """获取业务响应数据 - 目前使用mock数据"""
    log_message("获取数据库响应数据 (使用mock数据)...")
    
    # Mock数据生成
    import random
    
    # 计算时间点数量
    duration_seconds = int((time_till - time_from).total_seconds())
    data_points = max(3, duration_seconds // 30)  # 每30秒一个数据点，最少3个点
    
    # 生成mock数据库响应数据
    base_db_time = 15  # 基础数据库响应时间 15ms
    db_response_data = []
    
    for i in range(data_points):
        # 根据时间进度计算响应时间变化
        time_point = time_from + timedelta(seconds=i * 30)
        
        # 模拟数据库响应时间趋势
        if random.random() < 0.3:  # 30%概率模拟响应时间恶化
            # 模拟响应时间逐渐恶化
            degradation_factor = 1 + (i / data_points) * 3  # 最多恶化到4倍
            db_time = base_db_time * degradation_factor + random.uniform(-5, 15)
        else:
            # 模拟正常响应时间
            db_time = base_db_time + random.uniform(-8, 20)
        
        db_response_data.append({
            'time': time_point,
            'value': max(1, db_time)  # 数据库响应时间最少1ms
        })
    
    mock_data = {
        "database_response": db_response_data
    }
    
    log_message(f"Mock数据库响应数据生成完成: {len(db_response_data)}个点")
    
    return mock_data

def analyze_business_response_for_interval(host_ip: str, interval: Dict) -> Dict:
    """分析特定时间区间的业务响应"""
    log_message(f"分析递增区间数据库响应: {interval['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ~ {interval['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 获取对应时间段的数据库响应数据
    business_data = get_business_response_data(host_ip, interval['start_time'], interval['end_time'])
    
    if not business_data or 'database_response' not in business_data:
        return {
            "has_data": False,
            "impact_detected": False,
            "analysis": None,
            "response_data": []
        }
    
    # 分析这个时间段的数据库响应
    response_analysis = analyze_response_trend(business_data['database_response'])
    
    # 判断是否有业务影响
    impact_detected = response_analysis['is_degrading']
    
    return {
        "has_data": True,
        "impact_detected": impact_detected,
        "analysis": response_analysis,
        "response_data": business_data['database_response'],  # 保存原始数据
        "interval_info": {
            "duration": interval['duration_seconds'],
            "traffic_increase": interval['increase_percent'],
            "start_traffic": interval['start_formatted'],
            "end_traffic": interval['end_formatted'],
            "peak_traffic": interval['peak_formatted']
        }
    }

def main():
    """主函数"""
    # 检查参数
    if len(sys.argv) < 4 or len(sys.argv) > 5:
        print("""🔥 防火墙流量与业务响应关联分析脚本

用法:
  python firewall_simple_monitor.py <机房> <IP> <时间窗口秒数> [debug=on|off]
  
示例:
  python firewall_simple_monitor.py IDC1 192.168.1.1 300
  python firewall_simple_monitor.py IDC1 192.168.1.1 300 debug=on
  python firewall_simple_monitor.py IDC2 10.0.0.1 600 debug=off
  
说明:
  - 从当前时间往前推指定秒数获取数据
  - 检测流量是否持续升高
  - 如果流量持续升高，分析对业务响应的影响
  - debug=on: 显示每个区间的详细信息
  - debug=off: 只显示综合分析结果 (默认)""")
        sys.exit(1)
    
    datacenter = sys.argv[1]
    host_ip = sys.argv[2]
    
    try:
        time_window = int(sys.argv[3])
    except ValueError:
        print("错误：时间窗口必须是数字（秒）")
        sys.exit(1)
    
    # 解析debug参数
    debug_mode = False
    if len(sys.argv) == 5:
        debug_param = sys.argv[4].lower()
        if debug_param == "debug=on":
            debug_mode = True
        elif debug_param == "debug=off":
            debug_mode = False
        else:
            print("错误：debug参数格式应为 debug=on 或 debug=off")
            sys.exit(1)
    
    # 计算时间范围
    time_till = datetime.now()
    time_from = time_till - timedelta(seconds=time_window)
    
    log_message(f"开始分析 - 机房:{datacenter}, IP:{host_ip}, 时间窗口:{time_window}秒")
    log_message(f"分析时间段: {time_from.strftime('%Y-%m-%d %H:%M:%S')} ~ {time_till.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 获取流量数据
    log_message("获取防火墙流量数据...")
    traffic_data = get_metrics_data(host_ip, TRAFFIC_METRICS, time_from, time_till)
    
    if not traffic_data:
        log_message("流量数据获取失败", "ERROR")
        sys.exit(1)
    
    # 分析入流量和出流量趋势
    inbound_analysis = analyze_traffic_with_intervals(traffic_data.get('inbound_traffic', []))
    outbound_analysis = analyze_traffic_with_intervals(traffic_data.get('outbound_traffic', []))
    
    log_message(f"入流量: {inbound_analysis['trend']}, 数据点:{inbound_analysis['data_points']}, 最大:{inbound_analysis['max_formatted']}")
    log_message(f"出流量: {outbound_analysis['trend']}, 数据点:{outbound_analysis['data_points']}, 最大:{outbound_analysis['max_formatted']}")
    
    # 收集所有递增区间
    all_increase_intervals = []
    
    # 添加入流量递增区间
    for interval in inbound_analysis['increase_intervals']:
        interval['traffic_type'] = 'inbound'
        all_increase_intervals.append(interval)
    
    # 添加出流量递增区间
    for interval in outbound_analysis['increase_intervals']:
        interval['traffic_type'] = 'outbound'
        all_increase_intervals.append(interval)
    
    if not all_increase_intervals:
        log_message("未检测到流量递增区间，无需检查业务响应")
        print(f"结论：机房{datacenter}防火墙{host_ip}流量正常，无业务影响")
        sys.exit(0)
    
    log_message(f"检测到{len(all_increase_intervals)}个流量递增区间，开始逐一分析业务影响...")
    
    # 分析每个递增区间的业务影响
    impact_intervals = []
    
    for i, interval in enumerate(all_increase_intervals):
        intensity_indicator = get_change_intensity_indicator(interval['increase_percent'])
        log_message(f"分析第{i+1}个递增区间 ({interval['traffic_type']}流量) {intensity_indicator}: {interval['start_formatted']} -> {interval['end_formatted']} (+{interval['increase_percent']:.1f}%)")
        
        # 分析这个区间的业务响应
        interval_analysis = analyze_business_response_for_interval(host_ip, interval)
        
        if interval_analysis['has_data']:
            if interval_analysis['impact_detected']:
                log_message(f"第{i+1}个区间检测到业务影响: 响应时间{interval_analysis['analysis']['trend']}")
                interval['business_impact'] = interval_analysis
                impact_intervals.append(interval)
            else:
                log_message(f"第{i+1}个区间业务响应正常: 平均{interval_analysis['analysis']['avg_ms']:.1f}ms")
        else:
            log_message(f"第{i+1}个区间无法获取业务响应数据")
    
    if not impact_intervals:
        log_message("所有递增区间都未对业务造成影响")
        print(f"结论：机房{datacenter}防火墙{host_ip}虽有流量递增，但无业务影响")
        sys.exit(0)
    
    log_message(f"发现{len(impact_intervals)}个递增区间对业务造成影响，生成分析报告...")
    
    # 生成受影响区间的综合分析
    generate_interval_impact_report(datacenter, host_ip, time_window, impact_intervals, debug_mode)

if __name__ == "__main__":
    main() 