#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用日志分析与报告生成器 - Universal Log Analyzer and Report Generator
===================================================================

功能描述:
    定时分析指定的日志文件，生成多层级的分析报告（每小时、每天、每月、每年）。
    利用大模型对日志内容进行智能总结，并逐级汇聚报告，以控制信息密度，避免超出模型处理长度。

主要特性:
    1.  通用性: 可通过命令行参数指定任何格式清晰的日志文件。
    2.  分层报告: 自动生成和管理小时、天、月、年四个层级的报告。
    3.  智能摘要: 调用大模型（LLM）对原始日志和各级报告进行总结。
    4.  内容量控制: 通过预处理和分层总结，有效管理输入给大模型的内容长度。
    5.  自动化调度: 设计为每小时通过cron等工具调用，自动完成报告生成和汇聚。
    6.  持久化存储: 将生成的报告以结构化（JSON）格式存储在文件中，便于查阅和后续处理。
    7.  配置灵活: 大模型API、报告存储路径等均可在脚本内配置。

使用方法:
    配置好脚本中的CONFIG变量后，通过cron或其他调度工具每小时执行一次。
    调度命令示例 (例如，在每小时的第5分钟执行):
    5 * * * * /usr/bin/python3 /path/to/your/script/log_analyzer.py /var/log/syslog "System-Logs" >> /var/log/log_analyzer.log 2>&1

    手动执行示例:
    python3 log_analyzer.py /tmp/db_analyzer.log "Database-Analysis"

参数说明:
    logfile         要分析的日志文件路径 (位置参数, 必需)。
    subject         分析的主题，用于创建报告目录 (位置参数, 必需)。
    --reports-dir   报告存储的根目录 (可选, 默认值在CONFIG中配置)。
    --force-time    强制指定当前时间 (格式: YYYY-MM-DD HH:MM:SS), 用于测试和回溯执行。

报告存储结构:
    <reports-dir>/
    └── <log_file_basename>/
        ├── YYYY/
        │   ├── YYYY-MM-DD_daily.json
        │   ├── YYYY-MM_monthly.json
        │   └── hourly/
        │       └── YYYY-MM-DDTHH_hourly.json
        └── YYYY_yearly.json

作者: 自动化监控团队
版本: v1.0
创建时间: 2025-06-15
"""

import argparse
import collections
import json
import logging
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import requests

# --- 全局配置 ---
def dict2ns(d):
    if isinstance(d, dict):
        return SimpleNamespace(**{k: dict2ns(v) for k, v in d.items()})
    return d

CONFIG = dict2ns({
    "llm": {
        "url": "http://127.0.0.1/v1/chat-messages",
        "api_key": "app-B8Ux0kQnN51hcgjwlGtp7xoL",
        "user": "log-analyzer",
        "timeout": 120  # 日志分析可能需要更长超时
    },
    "analyzer": {
        "reports_dir": "/tmp/log_analyzer/reports",         # 报告存储的根目录
        "max_log_lines_for_llm": 500, # 单次发给LLM的原始日志最大行数
        "log_timestamp_regex": r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}" # 匹配行首时间戳的正则
    }
})

# --- 日志配置 ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# --- 核心功能 ---

def call_llm_analysis(prompt, timeout=CONFIG.llm.timeout):
    """
    调用大模型分析。
    """
    headers = {
        "Authorization": f"Bearer {CONFIG.llm.api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": {},
        "query": prompt,
        "response_mode": "blocking",
        "conversation_id": "",
        "user": CONFIG.llm.user
    }

    try:
        logger.info(f"正在调用大模型分析，超时设置: {timeout}秒")
        response = requests.post(
            CONFIG.llm.url,
            headers=headers,
            json=payload,
            timeout=(10, timeout)
        )
        response.raise_for_status()
        result = response.json().get("answer", response.text)
        logger.info("大模型分析调用成功")
        return result
    except requests.exceptions.RequestException as e:
        logger.error(f"大模型调用失败: {e}")
        return f"Error: LLM call failed. Details: {e}"

def get_report_path(reports_dir, subject, period, target_time):
    """
    根据时间、周期和主题，生成报告文件的标准路径。
    """
    year = target_time.strftime('%Y')
    month = target_time.strftime('%m')
    day = target_time.strftime('%d')
    hour = target_time.strftime('%H')

    if period == 'hourly':
        filename = f"{year}{month}{day}{hour}_hourly.json"
        return os.path.join(reports_dir, subject, year, 'hourly', filename)
    elif period == 'daily':
        filename = f"{year}{month}{day}_daily.json"
        return os.path.join(reports_dir, subject, year, filename)
    elif period == 'monthly':
        filename = f"{year}{month}_monthly.json"
        return os.path.join(reports_dir, subject, year, filename)
    elif period == 'yearly':
        filename = f"{year}_yearly.json"
        return os.path.join(reports_dir, subject, filename)
    else:
        raise ValueError(f"未知的报告周期: {period}")

def save_report(report_path, content):
    """
    将报告内容保存为JSON文件。
    """
    try:
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=4)
        logger.info(f"报告已保存: {report_path}")
    except IOError as e:
        logger.error(f"保存报告失败: {report_path}, 错误: {e}")

def load_report(report_path):
    """
    从JSON文件加载报告内容。
    """
    if not os.path.exists(report_path):
        return None
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        logger.error(f"加载报告失败: {report_path}, 错误: {e}")
        return None

def read_logs_for_period(log_file, start_time, end_time):
    """
    从日志文件中读取指定时间范围内的日志行。
    """
    lines = []
    # 2025-06-15 11:06:29
    time_format = "%Y-%m-%d %H:%M:%S"
    timestamp_regex = re.compile(CONFIG.analyzer.log_timestamp_regex)

    logger.info(f"正在读取日志 '{log_file}' 从 {start_time} 到 {end_time}")

    try:
        with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                match = timestamp_regex.match(line)
                if not match:
                    continue
                
                try:
                    # '2025-06-15 11:06:29'
                    timestamp_str = line[:19]
                    log_time = datetime.strptime(timestamp_str, time_format)
                    
                    if start_time <= log_time < end_time:
                        lines.append(line.strip())
                except (ValueError, IndexError):
                    # 忽略无法解析时间的行
                    continue
        logger.info(f"读取到 {len(lines)} 行日志")
        return lines
    except FileNotFoundError:
        logger.error(f"日志文件未找到: {log_file}")
        return []

def preprocess_and_summarize_logs(log_lines):
    """
    对原始日志进行预处理，提取关键信息，以减少LLM的输入。
    """
    if not log_lines:
        return "日志内容为空。", {}

    line_count = len(log_lines)
    
    # 按级别分类和计数
    levels = collections.defaultdict(list)
    for line in log_lines:
        # 简单的级别判断
        if 'ERROR' in line:
            levels['ERROR'].append(line)
        elif 'WARNING' in line:
            levels['WARNING'].append(line)
        else:
            levels['INFO'].append(line)
            
    # 提取关键信息
    summary = {
        "total_lines": line_count,
        "error_count": len(levels['ERROR']),
        "warning_count": len(levels['WARNING']),
        "info_count": len(levels['INFO']),
    }
    
    # 构建发给LLM的精简内容
    content_for_llm = f"日志概览: 共 {line_count} 行, " \
                      f"Errors: {summary['error_count']}, " \
                      f"Warnings: {summary['warning_count']}.\n\n"

    # 添加错误和警告的样本
    if levels['ERROR']:
        content_for_llm += "错误日志样本:\n" + "\n".join(levels['ERROR'][:10]) + "\n\n"
    if levels['WARNING']:
        content_for_llm += "警告日志样本:\n" + "\n".join(levels['WARNING'][:10]) + "\n\n"

    # 如果日志行数过多，进行截断
    if line_count > CONFIG.analyzer.max_log_lines_for_llm:
        content_for_llm += "精选日志 (由于日志量过大，仅展示部分):\n"
        # 简单策略：取头部和尾部
        log_sample = log_lines[:20] + ["... (中间日志已省略) ..."] + log_lines[-20:]
        content_for_llm += "\n".join(log_sample)
    else:
        content_for_llm += "所有日志内容:\n" + "\n".join(log_lines)
        
    return content_for_llm, summary


def analyze_hourly(log_file, reports_dir, subject, current_time):
    """
    执行每小时的日志分析。
    """
    # 分析上一个完整的小时
    target_hour_start = (current_time - timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
    target_hour_end = target_hour_start + timedelta(hours=1)
    
    report_path = get_report_path(reports_dir, subject, 'hourly', target_hour_start)

    if os.path.exists(report_path):
        logger.info(f"小时报告已存在，跳过: {report_path}")
        return

    logger.info(f"--- 开始生成小时报告 for {target_hour_start.strftime('%Y-%m-%d %H:00')} ---")
    
    # 1. 读取原始日志
    log_lines = read_logs_for_period(log_file, target_hour_start, target_hour_end)
    if not log_lines:
        logger.warning("指定时间段内无日志，不生成报告。")
        # 可以选择创建一个空的报告文件来标记已处理
        time_format = '%Y-%m-%d %H:%M:%S'
        report_content = {
            "period": "hourly",
            "time_range": {
                "from": target_hour_start.strftime(time_format),
                "to": target_hour_end.strftime(time_format)
            },
            "summary": "No logs found in this period.",
            "stats": {},
            "generated_at": current_time.strftime(time_format)
        }
        save_report(report_path, report_content)
        return

    # 2. 预处理日志并构建Prompt
    content_for_llm, stats = preprocess_and_summarize_logs(log_lines)
    prompt = f"""
    你是一个资深的运维专家(SRE)，请根据以下一小时内的日志内容，生成一份简明的总结报告。
    请重点关注：
    1.  主要的活动或事件。
    2.  出现的错误(ERROR)和警告(WARNING)的根本原因和潜在影响。
    3.  是否有异常模式或趋势。
    4.  如果可能，提供优化建议。
    
    日志内容如下:
    ---
    {content_for_llm}
    ---
    请以Markdown格式返回你的分析报告。
    """

    # 3. 调用LLM
    summary_text = call_llm_analysis(prompt)

    # 4. 保存报告
    time_format = '%Y-%m-%d %H:%M:%S'
    report_content = {
        "period": "hourly",
        "time_range": {
            "from": target_hour_start.strftime(time_format),
            "to": target_hour_end.strftime(time_format)
        },
        "summary": summary_text,
        "stats": stats,
        "generated_at": current_time.strftime(time_format)
    }
    save_report(report_path, report_content)
    logger.info(f"--- 小时报告生成完毕 ---")

def analyze_daily(reports_dir, subject, current_time):
    """
    汇聚24小时的报告，生成每日报告。
    """
    # 分析上一个完整的天
    target_day_start = (current_time - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 仅在每天的第一个小时执行 (e.g., 00:xx)
    if not (current_time.hour == 0):
        logger.info(f"当前小时({current_time.hour})不是汇聚每日报告的时间点，跳过。")
        return

    report_path = get_report_path(reports_dir, subject, 'daily', target_day_start)
    if os.path.exists(report_path):
        logger.info(f"每日报告已存在，跳过: {report_path}")
        return

    logger.info(f"--- 开始生成每日报告 for {target_day_start.strftime('%Y-%m-%d')} ---")
    
    # 1. 收集过去24小时的所有小时报告
    hourly_reports_summaries = []
    all_stats = collections.defaultdict(int)
    missing_hours = []

    for i in range(24):
        hour_time = target_day_start + timedelta(hours=i)
        hourly_report_path = get_report_path(reports_dir, subject, 'hourly', hour_time)
        report_data = load_report(hourly_report_path)
        if report_data and "summary" in report_data:
            hourly_reports_summaries.append(f"**{hour_time.strftime('%H:00')} - {hour_time.strftime('%H:59')}**:\n{report_data['summary']}\n")
            if "stats" in report_data:
                for key, value in report_data["stats"].items():
                    all_stats[key] += value
        else:
            missing_hours.append(hour_time.strftime('%H:00'))

    if not hourly_reports_summaries:
        logger.warning("未找到任何小时报告，无法生成每日报告。")
        return
        
    if missing_hours:
        logger.warning(f"缺少以下小时的报告: {', '.join(missing_hours)}")

    # 2. 构建Prompt
    consolidated_summaries = "\n".join(hourly_reports_summaries)
    prompt = f"""
    你是一个资深的运维专家(SRE)，这里是过去24小时的日志分析报告摘要。请将它们整合成一份连贯的每日总结报告。
    请重点分析：
    1.  全天的核心事件和系统状态变化。
    2.  反复出现的、或在特定时间段内爆发的错误和警告。
    3.  识别全天的趋势，例如错误率的变化、系统负载的波动等。
    4.  提出针对性的日度运维建议。

    每日总体统计数据:
    - 总日志行数: {all_stats.get('total_lines', 'N/A')}
    - 总错误数: {all_stats.get('error_count', 'N/A')}
    - 总警告数: {all_stats.get('warning_count', 'N/A')}

    各小时摘要如下:
    ---
    {consolidated_summaries}
    ---
    请以Markdown格式返回你的每日综合分析报告。
    """

    # 3. 调用LLM
    summary_text = call_llm_analysis(prompt, timeout=180) # 可能需要更长超时

    # 4. 保存报告
    time_format = '%Y-%m-%d %H:%M:%S'
    report_content = {
        "period": "daily",
        "time_range": {
            "from": target_day_start.strftime(time_format),
            "to": (target_day_start + timedelta(days=1)).strftime(time_format)
        },
        "summary": summary_text,
        "stats": dict(all_stats),
        "generated_at": current_time.strftime(time_format)
    }
    save_report(report_path, report_content)
    logger.info(f"--- 每日报告生成完毕 ---")

def analyze_monthly(reports_dir, subject, current_time):
    """
    汇聚一个月的每日报告，生成每月报告。
    """
    # 分析上一个完整的月
    first_day_of_current_month = current_time.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    target_month_start = (first_day_of_current_month - timedelta(days=1)).replace(day=1)
    
    # 仅在每月第一天的第一个小时执行
    if not (current_time.day == 1 and current_time.hour == 0):
        logger.info(f"当前时间({current_time.strftime('%Y-%m-%d %H:%M')})不是汇聚月度报告的时间点，跳过。")
        return
        
    report_path = get_report_path(reports_dir, subject, 'monthly', target_month_start)
    if os.path.exists(report_path):
        logger.info(f"月度报告已存在，跳过: {report_path}")
        return
        
    # ... 此处省略月度报告的实现逻辑，与每日报告类似 ...
    logger.info(f"月度报告生成功能待实现...")
    # 1. 收集所有每日报告
    # 2. 构建Prompt
    # 3. 调用LLM
    # 4. 保存报告


def analyze_yearly(reports_dir, subject, current_time):
    """
    汇聚一年的每月报告，生成每年报告。
    """
    # 分析上一个完整的年
    first_day_of_current_year = current_time.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    target_year_start = (first_day_of_current_year - timedelta(days=1)).replace(month=1, day=1)

    # 仅在每年第一天、第一个小时执行
    if not (current_time.month == 1 and current_time.day == 1 and current_time.hour == 0):
        logger.info(f"当前时间({current_time.strftime('%Y-%m-%d %H:%M')})不是汇聚年度报告的时间点，跳过。")
        return
        
    report_path = get_report_path(reports_dir, subject, 'yearly', target_year_start)
    if os.path.exists(report_path):
        logger.info(f"年度报告已存在，跳过: {report_path}")
        return

    # ... 此处省略年度报告的实现逻辑，与每日/月度报告类似 ...
    logger.info(f"年度报告生成功能待实现...")


def main():
    parser = argparse.ArgumentParser(
        description='通用日志分析与报告生成器。',
        epilog='使用示例: python3 log_analyzer.py /var/log/app.log "WebApp" --reports-dir ./my_reports'
    )
    parser.add_argument('logfile', type=str,
                       help='要分析的日志文件路径 (例如 /var/log/syslog)。')
    parser.add_argument('subject', type=str,
                       help='分析的主题，用于创建报告目录 (例如 "WebApp" 或 "Database")。')
    parser.add_argument('--reports-dir', type=str, default=CONFIG.analyzer.reports_dir,
                       help=f'报告存储的根目录 (默认: {CONFIG.analyzer.reports_dir})。')
    parser.add_argument('--force-time', type=str,
                       help='强制指定当前时间 (格式: "YYYY-MM-DD HH:MM:SS"), 用于测试。')
    
    args = parser.parse_args()

    # 确定执行时间
    if args.force_time:
        try:
            current_time = datetime.strptime(args.force_time, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            logger.error("强制时间格式错误，请使用 'YYYY-MM-DD HH:MM:S'。")
            sys.exit(1)
    else:
        current_time = datetime.now()

    logger.info(f"分析任务开始，使用时间: {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"日志文件: {args.logfile}")
    logger.info(f"分析主题: {args.subject}")
    logger.info(f"报告目录: {os.path.join(args.reports_dir, args.subject)}")


    # --- 核心调度逻辑 ---
    # 每次执行时，都尝试生成上一小时的报告
    analyze_hourly(args.logfile, args.reports_dir, args.subject, current_time)
    
    # 接着，检查是否需要进行更高级别的报告汇聚
    # 顺序很重要，先尝试汇聚小的，再汇聚大的
    analyze_daily(args.reports_dir, args.subject, current_time)
    analyze_monthly(args.reports_dir, args.subject, current_time)
    analyze_yearly(args.reports_dir, args.subject, current_time)

    logger.info("分析任务结束。")


if __name__ == "__main__":
    main()
