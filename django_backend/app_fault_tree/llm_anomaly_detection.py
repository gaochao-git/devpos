#!/usr/bin/env python3
"""
🤖 基于大模型的智能异常检测系统

核心设计理念：
- 只获取必要的原始数据
- 简洁的提示词，让大模型自己分析
- 避免过度处理和冗余信息

用法: python llm_anomaly_detection.py <时间范围> <zabbix_key>
示例: python llm_anomaly_detection.py "30m" "system.cpu.util"
"""

import sys
from datetime import datetime, timedelta
import time
import calendar
import requests

# DeepSeek API 配置
DEEPSEEK_CONFIG = {
    "api_key": "sk-490738f8ce8f4a36bcc0bfb165270008",
    "api_base": "https://api.deepseek.com/v1",
    "model": "deepseek-chat",
    "timeout": 30
}

def call_deepseek_api(prompt, max_retries=3):
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
                    "content": "你是一位专业的系统运维工程师，专门负责时间序列数据的异常检测分析。请基于提供的时间序列数据进行简洁、准确的异常检测分析。"
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2000
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
                    else:
                        return None
                else:
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)
                    else:
                        return None
                        
            except requests.exceptions.RequestException:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    return None
                    
    except Exception as e:
        print(f"API调用错误: {e}")
        return None

def parse_quick_time(time_str):
    """解析快捷时间格式"""
    import re
    
    match = re.match(r'^(\d+)([smhd])$', time_str.lower())
    if not match:
        raise ValueError(f"时间格式错误: {time_str}")
    
    value = int(match.group(1))
    unit = match.group(2)
    
    unit_seconds = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}
    return value * unit_seconds[unit]

def parse_datetime(datetime_str):
    """解析时间字符串"""
    try:
        return datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            return datetime.strptime(datetime_str, "%Y-%m-%d")
        except ValueError:
            raise ValueError(f"时间格式错误: {datetime_str}，请使用 'YYYY-MM-DD HH:MM:SS' 或 'YYYY-MM-DD'")

def get_data_for_period(host_ip, metric_name, time_from, time_till):
    """获取指定时间段的数据"""
    try:
        from zabbix_api_util import get_zabbix_metrics
        
        time_from_ts = int(time_from.timestamp())
        time_till_ts = int(time_till.timestamp())
        
        result = get_zabbix_metrics(
            host_ip=host_ip,
            metric_name=metric_name,
            time_from=time_from_ts,
            time_till=time_till_ts,
            match_type='search',
            limit=10000
        )
        
        if result['status'] != 'success' or not result['data']:
            return None
        
        data = []
        for item in result['data']:
            try:
                data.append({
                    'time': datetime.fromtimestamp(int(item['clock'])).strftime('%H:%M'),
                    'value': float(item['value'])
                })
            except (ValueError, KeyError):
                continue
        
        return sorted(data, key=lambda x: x['time'])
        
    except Exception:
        return None

def collect_comparison_data(host_ip, metric_name, current_time_from, current_time_till):
    """收集对比数据"""
    
    # 当前数据
    current_data = get_data_for_period(host_ip, metric_name, current_time_from, current_time_till)
    if not current_data:
        print("获取数据结果: 失败")
        return None
    
    duration = current_time_till - current_time_from
    
    # 对比数据
    comparison_data = {}
    
    # 昨天
    yesterday_from = current_time_from - timedelta(days=1)
    yesterday_till = current_time_till - timedelta(days=1)
    yesterday_data = get_data_for_period(host_ip, metric_name, yesterday_from, yesterday_till)
    if yesterday_data:
        comparison_data['昨天'] = yesterday_data
    
    # 上周
    last_week_from = current_time_from - timedelta(days=7)
    last_week_till = current_time_till - timedelta(days=7)
    last_week_data = get_data_for_period(host_ip, metric_name, last_week_from, last_week_till)
    if last_week_data:
        comparison_data['上周'] = last_week_data
    
    # 上月
    try:
        if current_time_from.month == 1:
            last_month_year = current_time_from.year - 1
            last_month_month = 12
        else:
            last_month_year = current_time_from.year
            last_month_month = current_time_from.month - 1
        
        last_month_max_day = calendar.monthrange(last_month_year, last_month_month)[1]
        last_month_day = min(current_time_from.day, last_month_max_day)
        
        last_month_from = current_time_from.replace(
            year=last_month_year, 
            month=last_month_month, 
            day=last_month_day
        )
        last_month_till = last_month_from + duration
        
        last_month_data = get_data_for_period(host_ip, metric_name, last_month_from, last_month_till)
        if last_month_data:
            comparison_data['上月'] = last_month_data
    except:
        pass
    
    # 去年同期
    try:
        last_year_from = current_time_from.replace(year=current_time_from.year - 1)
        last_year_till = current_time_till.replace(year=current_time_till.year - 1)
        
        last_year_data = get_data_for_period(host_ip, metric_name, last_year_from, last_year_till)
        if last_year_data:
            comparison_data['去年'] = last_year_data
    except:
        pass
    
    print(f"获取数据结果: 成功 (当前{len(current_data)}个点, 对比{len(comparison_data)}个时段)")
    
    return {
        'current': current_data,
        'comparison': comparison_data
    }

def generate_analysis_prompt(data_collection, metric_name, time_from, time_till):
    """生成简洁的分析提示词"""
    
    current_data = data_collection['current']
    comparison_data = data_collection['comparison']
    
    # 构建简洁的提示词
    prompt = f"""分析指标 {metric_name} 的异常情况

时间范围: {time_from.strftime('%Y-%m-%d %H:%M')} ~ {time_till.strftime('%Y-%m-%d %H:%M')}

当前数据:
{', '.join([f"{item['time']}:{item['value']:.1f}" for item in current_data])}

"""
    
    # 对比数据 - 显示具体日期
    for period_name, period_data in comparison_data.items():
        if period_name == '昨天':
            date_label = (time_from - timedelta(days=1)).strftime('%Y-%m-%d') + '同时间段(昨天)'
        elif period_name == '上周':
            date_label = (time_from - timedelta(days=7)).strftime('%Y-%m-%d') + '同时间段(上周)'
        elif period_name == '上月':
            # 计算上月的具体日期
            if time_from.month == 1:
                last_month_year = time_from.year - 1
                last_month_month = 12
            else:
                last_month_year = time_from.year
                last_month_month = time_from.month - 1
            
            last_month_max_day = calendar.monthrange(last_month_year, last_month_month)[1]
            last_month_day = min(time_from.day, last_month_max_day)
            
            last_month_date = time_from.replace(
                year=last_month_year, 
                month=last_month_month, 
                day=last_month_day
            )
            date_label = last_month_date.strftime('%Y-%m-%d') + '同时间段(上月)'
        elif period_name == '去年':
            date_label = (time_from.replace(year=time_from.year - 1)).strftime('%Y-%m-%d') + '同时间段(去年)'
        else:
            date_label = period_name
            
        prompt += f"{date_label}:\n"
        prompt += f"{', '.join([f'{item['time']}:{item['value']:.1f}' for item in period_data])}\n\n"
    
    prompt += """请按照以下固定模板格式进行分析:

【服务器IP】: 127.0.0.1
【指标名称】: """ + metric_name + """
【检查时间段】: """ + time_from.strftime('%Y-%m-%d %H:%M') + " ~ " + time_till.strftime('%Y-%m-%d %H:%M') + """
【异常等级】: [正常/轻微/中等/严重/紧急]
【异常描述】: [简述当前数据的异常情况，必须包含具体异常时间点，如"XX:XX时达到峰值YY.Y%"，限100字内]
【数据对比】: [必须按照格式"当前峰值XX.X比昨日同时间段峰值YY.Y高/低Z%、上周同时间段峰值AA.A高/低B%、上月同时间段峰值CC.C高/低D%、去年同时间段峰值EE.E高/低F%"，限120字内]
【根因分析】: [可能的异常原因，限100字内]
【影响评估】: [对系统/业务的影响程度，限60字内]
【处理建议】: [具体的处理措施，限120字内]
【紧急程度】: [立即处理/1小时内/4小时内/24小时内/监控观察]

请严格按照上述模板格式输出，每个字段必须填写。"""
    
    return prompt

def analyze_with_llm(data_collection, metric_name, time_from, time_till, show_prompt=False):
    """基于大模型的异常检测"""
    
    prompt = generate_analysis_prompt(data_collection, metric_name, time_from, time_till)
    
    print("大模型提示词:")
    print(f"{prompt}\n{'='*50}")
    
    analysis = call_deepseek_api(prompt)
    
    if analysis:
        return analysis
    else:
        return None

def parse_analysis_result(analysis_text):
    """解析大模型的固定模板输出结果，便于报警推送使用"""
    
    if not analysis_text:
        return None
    
    # 解析结果字典
    result = {
        'anomaly_level': '',
        'anomaly_description': '',
        'data_comparison': '',
        'root_cause': '',
        'impact_assessment': '',
        'handling_suggestions': '',
        'urgency_level': '',
        'raw_analysis': analysis_text
    }
    
    # 正则表达式匹配模板字段
    import re
    
    patterns = {
        'anomaly_level': r'【异常等级】:\s*([^\n【]+)',
        'anomaly_description': r'【异常描述】:\s*([^\n【]+)',
        'data_comparison': r'【数据对比】:\s*([^\n【]+)',
        'root_cause': r'【根因分析】:\s*([^\n【]+)',
        'impact_assessment': r'【影响评估】:\s*([^\n【]+)',
        'handling_suggestions': r'【处理建议】:\s*([^\n【]+)',
        'urgency_level': r'【紧急程度】:\s*([^\n【]+)'
    }
    
    for key, pattern in patterns.items():
        match = re.search(pattern, analysis_text)
        if match:
            result[key] = match.group(1).strip()
    
    return result

def format_for_alert(parsed_result, metric_name, time_range):
    """将解析结果格式化为报警消息"""
    
    if not parsed_result:
        return "解析异常检测结果失败"
    
    alert_message = f"""
【异常检测报告】

监控指标: {metric_name}
检测时间: {time_range}
异常等级: {parsed_result['anomaly_level']}
紧急程度: {parsed_result['urgency_level']}

异常描述: {parsed_result['anomaly_description']}
数据对比: {parsed_result['data_comparison']}
根因分析: {parsed_result['root_cause']}
影响评估: {parsed_result['impact_assessment']}
处理建议: {parsed_result['handling_suggestions']}
""".strip()
    
    return alert_message

def main():
    """主函数"""
    args = sys.argv[1:]
    
    # 检查是否有verbose参数
    show_prompt = False
    if '--verbose' in args:
        show_prompt = True
        args.remove('--verbose')
    
    if len(args) == 1:
        # 默认最近5分钟
        time_range_seconds = 300
        metric_name = args[0]
        time_till = datetime.now()
        time_from = time_till - timedelta(seconds=time_range_seconds)
        
    elif len(args) == 2:
        try:
            time_range_seconds = parse_quick_time(args[0])
            metric_name = args[1]
            time_till = datetime.now()
            time_from = time_till - timedelta(seconds=time_range_seconds)
        except ValueError as e:
            print(f"{e}")
            return
            
    elif len(args) == 3:
        # 指定具体时间范围
        try:
            time_from = parse_datetime(args[0])
            time_till = parse_datetime(args[1])
            metric_name = args[2]
            
            if time_till <= time_from:
                print("结束时间必须晚于开始时间")
                return
                
        except ValueError as e:
            print(f"{e}")
            return
            
    else:
        print("""用法:
  python llm_anomaly_detection.py "system.cpu.util"
  python llm_anomaly_detection.py "30m" "system.cpu.util"
  python llm_anomaly_detection.py "2025-06-08 08:00:00" "2025-06-08 10:00:00" "system.cpu.util"
  添加 --verbose 参数可显示发送给大模型的提示词""")
        return
    
    print(f"开始异常检测: {metric_name} ({time_from.strftime('%m-%d %H:%M')} ~ {time_till.strftime('%m-%d %H:%M')})")
    
    # 收集数据
    data_collection = collect_comparison_data("127.0.0.1", metric_name, time_from, time_till)
    if not data_collection:
        return
    
    # 大模型分析
    analysis = analyze_with_llm(data_collection, metric_name, time_from, time_till, show_prompt)
    
    if analysis:
        print("\n报警结果:")
        print(analysis)
    else:
        print("\n报警结果: 分析失败")

if __name__ == "__main__":
    main() 