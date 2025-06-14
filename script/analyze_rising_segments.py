#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库响应分析工具 - Database Response Analyzer
===========================================

功能描述:
    定时分析数据库响应耗时和多种监控指标的上升段，通过大模型分析其关联性和可能原因。
    支持自动调度和手动执行两种模式。

主要特性:
    1. 自动定时分析（默认每5分钟执行一次）
    2. 手动执行分析（支持指定时间范围或分析最近5分钟）
    3. 多数据源支持（Elasticsearch + Zabbix）
    4. 多指标监控支持（网卡入出流量、DNS解析时间、CPU使用率、内存使用率等）
    5. 智能上升段检测（每个指标可配置独立阈值）
    6. 大模型关联分析（支持多指标关联性分析）
    7. 重试机制和异常处理
    8. 优雅退出支持（Ctrl+C）
    9. 防止多实例运行的安全机制（文件锁）
    10. 僵尸锁文件清理
    11. 大模型调用超时和重试机制

支持的监控指标:
    - 网卡入流量 (net.if.in[eth0])
    - 网卡出流量 (net.if.out[eth0]) 
    - DNS解析时间 (net.dns.time[,8.8.8.8])
    - CPU使用率 (system.cpu.util[,avg1])
    - 内存使用率 (vm.memory.size[pused])
    注：可在CONFIG.zabbix.metrics中添加更多指标，每个指标支持独立开关控制

使用方法:
    1. 帮助:
       python3 analyze_rising_segments.py --help
         2. 定时调度模式:
        python3 analyze_rising_segments.py --mode scheduler  # 默认5分钟间隔
        python3 analyze_rising_segments.py --mode scheduler --interval 10  # 10分钟间隔
    
    3. 手动执行模式:
       python3 analyze_rising_segments.py --mode manual  # 分析最近5分钟
       python3 analyze_rising_segments.py --mode manual --time-from "2025-06-14 10:00:00" --time-till "2025-06-14 10:05:00"
    

参数说明:
    --mode          运行模式，可选值: scheduler(定时调度), manual(手动执行)
    --interval      定时执行间隔（分钟），默认5分钟
    --time-from     手动模式：分析开始时间，格式: YYYY-MM-DD HH:MM:SS
    --time-till     手动模式：分析结束时间，格式: YYYY-MM-DD HH:MM:SS

配置说明:
    在CONFIG变量中可配置:
    - 数据源连接信息（Elasticsearch, Zabbix）
    - 多指标监控配置（每个指标可设置独立阈值、名称、单位、启用/禁用开关）
    - 重试机制参数
    - 大模型API配置（包括超时时间和重试次数）
    - 锁文件路径设置

多指标配置示例:
    CONFIG.zabbix.metrics = {
        "net_in": {
            "item_key": "net.if.in[eth0]",
            "threshold": 100*1000,  # 100kbps
            "name": "网卡入流量",
            "unit": "bps",
            "enabled": True  # 启用此指标
        },
        "memory_usage": {
            "item_key": "vm.memory.size[pused]",
            "threshold": 85,  # 85%
            "name": "内存使用率",
            "unit": "%",
            "enabled": False  # 禁用此指标
        }
        # 可添加更多指标...
    }

运行示例:
    # 启动定时调度器，每5分钟分析一次
    python3 analyze_rising_segments.py --mode scheduler
    
    # 启动定时调度器，每10分钟分析一次
    python3 analyze_rising_segments.py --mode scheduler --interval 10
    
    # 手动分析最近5分钟数据
    python3 analyze_rising_segments.py --mode manual
    
    # 手动分析指定时间段
    python3 analyze_rising_segments.py --mode manual --time-from "2025-06-14 10:00:00" --time-till "2025-06-14 10:05:00"

停止方法:
    按 Ctrl+C 优雅退出定时调度器

作者: 自动化监控团队
版本: v2.1
更新时间: 2025-06-14
更新内容: 支持多指标监控和关联分析
"""

import logging
import time
import signal
import sys
import argparse
import os
import atexit
from datetime import datetime, timedelta
from es_api_script import create_elasticsearch_client
from zabbix_api_script import create_zabbix_client
import json
from types import SimpleNamespace
import requests

# 全局变量用于优雅退出和锁文件管理
running = True
lock_file_path = None

def cleanup_lock_file():
    """清理锁文件（只清理属于当前进程的锁文件）"""
    global lock_file_path
    if lock_file_path and os.path.exists(lock_file_path):
        try:
            # 检查锁文件是否属于当前进程
            with open(lock_file_path, 'r') as f:
                file_pid = int(f.read().strip())
            current_pid = os.getpid()
            
            if file_pid == current_pid:
                os.remove(lock_file_path)
                logger.info(f"已清理锁文件: {lock_file_path}")
            else:
                logger.debug(f"锁文件属于其他进程 (PID: {file_pid})，不清理")
        except Exception as e:
            logger.error(f"清理锁文件失败: {e}")

def signal_handler(signum, frame):
    """信号处理器，用于优雅退出"""
    global running
    logger.info(f"接收到信号 {signum}，正在优雅退出...")
    running = False
    cleanup_lock_file()
    sys.exit(0)

# 注册信号处理器和退出处理器
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)
atexit.register(cleanup_lock_file)

# 全局配置
def dict2ns(d):
    if isinstance(d, dict):
        return SimpleNamespace(**{k: dict2ns(v) for k, v in d.items()})
    return d

CONFIG = dict2ns({
    "scheduler": {
        "interval_minutes": 5,  # 定时执行间隔（分钟）
        "max_retries": 3,      # 最大重试次数
        "retry_delay": 30,     # 重试延迟（秒）
        "lock_file": "/tmp/db_analyzer.lock"  # 锁文件路径
    },
    "es": {
        "url": "http://82.156.146.51:9200",
        "index": "mysql-slow-*",
        "field": "query_time",
        "threshold": 0.01,  # 毫秒，判断是否上升段的基础阈值，避免微小波动被误判
        "fixed_interval": "5s"  # 聚合间隔
    },
    "zabbix": {
        "url": "http://82.156.146.51/zabbix",
        "username": "Admin",
        "password": "zabbix",
        # 支持多个监控指标，每个指标可以有不同的阈值
        "metrics": {
            "net_in": {
                "item_key": "net.if.in[eth0]",
                "threshold": 100*1000,  # 100kbps
                "name": "网卡入流量",
                "unit": "bps",
                "enabled": True  # 启用此指标
            },
            "net_out": {
                "item_key": "net.if.out[eth0]",
                "threshold": 100*1000,  # 100kbps
                "name": "网卡出流量",
                "unit": "bps",
                "enabled": True  # 是否启用此指标
            },
            "dns_time": {
                "item_key": "net.dns.time[,8.8.8.8]",
                "threshold": 0.05,  # 50ms
                "name": "DNS解析时间",
                "unit": "秒",
                "enabled": True  # 是否启用此指标
            },
            "cpu_usage": {
                "item_key": "system.cpu.util[,avg1]",
                "threshold": 80,  # 80%
                "name": "CPU使用率",
                "unit": "%",
                "enabled": True  # 是否启用此指标
            },
            "memory_usage": {
                "item_key": "vm.memory.size[pused]",
                "threshold": 85,  # 85%
                "name": "内存使用率",
                "unit": "%",
                "enabled": False  # 禁用此指标
            }
        }
    },
    "llm": {
        "url": "http://127.0.0.1/v1/chat-messages",
        "api_key": "app-B8Ux0kQnN51hcgjwlGtp7xoL",
        "user": "abc-123",
        "timeout": 30,      # 大模型调用超时时间（秒）
        "max_retries": 3    # 最大重试次数
    }
})

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_lock_file():
    """创建锁文件，防止多个实例同时运行"""
    global lock_file_path
    lock_file_path = CONFIG.scheduler.lock_file
    
    # 检查锁文件是否存在
    if os.path.exists(lock_file_path):
        try:
            # 检查锁文件中的PID是否仍在运行
            with open(lock_file_path, 'r') as f:
                old_pid = int(f.read().strip())
            
            # 检查进程是否还在运行
            try:
                os.kill(old_pid, 0)  # 发送信号0来检查进程是否存在
                logger.error(f"检测到另一个实例正在运行 (PID: {old_pid})")
                logger.error("如果确认没有其他实例在运行，请手动删除锁文件：")
                logger.error(f"rm {lock_file_path}")
                return False
            except OSError:
                # 进程不存在，说明是僵尸锁文件
                logger.warning(f"发现僵尸锁文件，正在清理: {lock_file_path}")
                os.remove(lock_file_path)
                
        except (ValueError, FileNotFoundError):
            # 锁文件格式错误或不存在，删除它
            logger.warning(f"锁文件格式错误，正在清理: {lock_file_path}")
            try:
                os.remove(lock_file_path)
            except FileNotFoundError:
                pass
    
    # 创建新的锁文件
    try:
        current_pid = os.getpid()
        with open(lock_file_path, 'w') as f:
            f.write(str(current_pid))
        logger.info(f"已创建锁文件: {lock_file_path} (PID: {current_pid})")
        return True
    except Exception as e:
        logger.error(f"创建锁文件失败: {e}")
        return False

def get_analysis_time_range():
    """获取分析时间范围：最近5分钟"""
    now = datetime.now()
    time_till = now
    time_from = now - timedelta(minutes=CONFIG.scheduler.interval_minutes)
    return time_from, time_till

def find_rising_segments(data, threshold):
    """
    找出上升段
    Args:
        data: 数据列表
            [
                ('2025-06-13 10:00:00', 1000),
                ('2025-06-13 10:01:00', 1001),
                ('2025-06-13 10:02:00', 1002),
                ...
            ]
        threshold: 阈值
    Returns:
        上升段列表，每个元素为 (start_idx, end_idx, max_value)
    """
    rising_segments = []
    start_idx = None
    max_value = None
    
    for i in range(1, len(data)):
        if data[i] > data[i-1]:  # 上升
            if start_idx is None:
                start_idx = i-1
                max_value = data[i]
            else:
                max_value = max(max_value, data[i])
        elif start_idx is not None:  # 下降且之前有上升段
            if max_value > threshold:
                rising_segments.append((min(start_idx, i-1), max(start_idx, i-1), max_value))
            start_idx = None
            max_value = None
    
    # 处理最后一个上升段
    if start_idx is not None and max_value > threshold:
        rising_segments.append((min(start_idx, len(data)-1), max(start_idx, len(data)-1), max_value))
    
    return rising_segments

def get_es_metric_data(time_from, time_till):
    """只获取ES的指标数据"""
    try:
        es_client = create_elasticsearch_client(CONFIG.es.url)
        logger.info("正在从ES获取数据...")
        es_query = {
            "size": 0,
            "query": {
                "range": {
                    "@timestamp": {
                        "gte": time_from.isoformat(),
                        "lte": time_till.isoformat(),
                        "time_zone": "+08:00"
                    }
                }
            },
            "aggs": {
                "my_aggs_name": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "fixed_interval": CONFIG.es.fixed_interval
                    },
                    "aggs": {
                        "avg_response_time": {
                            "avg": {
                                "field": CONFIG.es.field
                            }
                        }
                    }
                }
            }
        }
        es_result = es_client.search_logs(CONFIG.es.index, es_query)
        es_buckets = es_result.get("aggregations", {}).get("my_aggs_name", {}).get("buckets", [])
        es_data = [
            {"time": bucket["key_as_string_bj"], "value": bucket["avg_response_time"]["value"], "key": "avg_response_time"}
            for bucket in es_buckets
            if bucket["avg_response_time"]["value"] is not None
        ]
        logger.info(f"从ES获取到 {len(es_data)} 条数据")
        return es_data
    except Exception as e:
        logger.error(f"获取ES数据异常: {str(e)}")
        raise

def get_zabbix_metric_data(time_from, time_till):
    """获取所有启用的Zabbix指标数据"""
    try:
        zabbix_client = create_zabbix_client(CONFIG.zabbix.url, CONFIG.zabbix.username, CONFIG.zabbix.password)
        logger.info("正在从Zabbix获取数据...")
        
        # 只获取启用的指标 - 使用vars()来获取SimpleNamespace的属性字典
        enabled_metrics = {
            name: config for name, config in vars(CONFIG.zabbix.metrics).items()
            if config.enabled
        }
        
        if not enabled_metrics:
            logger.warning("没有启用任何Zabbix监控指标")
            return {}
        
        # 获取所有启用指标的item_keys
        item_keys = [metric.item_key for metric in enabled_metrics.values()]
        
        logger.info(f"启用的监控指标: {[config.name for config in enabled_metrics.values()]}")
        
        # 获取所有启用指标的历史数据
        zabbix_data = zabbix_client.get_history(
            time_from=time_from,
            time_till=time_till,
            host_ips=None,
            item_keys=item_keys
        )
        
        # 按指标分组数据
        metrics_data = {}
        for metric_name, metric_config in enabled_metrics.items():
            # 筛选出当前指标的数据
            metric_data = [
                item for item in zabbix_data 
                if item.get("key") == metric_config.item_key
            ]
            metrics_data[metric_name] = {
                "data": metric_data,
                "config": metric_config
            }
            logger.info(f"从Zabbix获取到 {metric_config.name} 数据: {len(metric_data)} 条")
        
        logger.info(f"从Zabbix总共获取到 {len(zabbix_data)} 条数据，涵盖 {len(metrics_data)} 个启用指标")
        return metrics_data
    except Exception as e:
        logger.error(f"获取Zabbix数据异常: {str(e)}")
        raise

def extract_time_value_series(data):
    """
    从原始数据中提取时间序列和值序列
    Args:
        data: 原始数据列表
            [
                {"time": "2025-06-13 10:00:00", "value": 1000},
                {"time": "2025-06-13 10:01:00", "value": 1001},
                ...
            ]
    Returns:
        times: 时间序列
        values: 值序列
    """
    times = [item["time"] for item in data]
    values = [item["value"] for item in data]
    return times, values

def format_rising_segments(rising_segments, times, raw_data, source="es"):
    """
    将原始上升段数据格式化为包含time_from、time_till和data的列表
    Args:
        rising_segments: 原始上升段数据，格式为 [(start_idx, end_idx, max_value), ...]
        times: 时间列表
        raw_data: 原始数据列表，格式为[{"time": "2025-06-13 10:00:00", "value": 1000, "key": "key名称"}]
    Returns:
        格式化后的上升段列表：
        [
            {
                "time_from": "YYYY-MM-DD HH:MM:SS",
                "time_till": "YYYY-MM-DD HH:MM:SS",
                "data": [...]
            },
            ...
        ]
    """
    formatted_segments = []
    for start, end, max_value in rising_segments:
        time_from_str = times[start]
        time_till_str = times[end]
        segment_data = [
            {
                "key": item.get("key"),
                 "time": item.get("time"),
                 "value": item.get("value")
             }
             for item in raw_data[start:end+1]
         ]
        formatted_segments.append({
            "time_from": time_from_str,
            "time_till": time_till_str,
            "data": segment_data
        })
    return formatted_segments

def call_llm_analysis(prompt, api_url=CONFIG.llm.url, api_key=CONFIG.llm.api_key, user=CONFIG.llm.user, timeout=CONFIG.llm.timeout):
    """
    调用大模型分析，支持超时和重试机制
    Args:
        prompt: 分析提示词
        api_url: API地址
        api_key: API密钥
        user: 用户标识
        timeout: 超时时间（秒）
    Returns:
        str: 分析结果
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": {},
        "query": prompt,
        "response_mode": "blocking",
        "conversation_id": "",
        "user": user
    }
    
    # 多次重试机制
    max_retries = CONFIG.llm.max_retries
    for attempt in range(max_retries):
        try:
            logger.info(f"正在调用大模型分析 (尝试 {attempt + 1}/{max_retries})，超时设置: {timeout}秒")
            
            # 设置连接超时和读取超时
            response = requests.post(
                api_url, 
                headers=headers, 
                json=payload, 
                timeout=(10, timeout)  # (连接超时, 读取超时)
            )
            response.raise_for_status()
            
            try:
                result = response.json().get("answer", response.text)
                logger.info("大模型分析调用成功")
                return result
            except Exception as parse_error:
                logger.warning(f"解析响应失败: {parse_error}")
                return response.text
                
        except requests.exceptions.Timeout as e:
            logger.error(f"大模型调用超时 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5  # 递增等待时间: 5s, 10s, 15s
                logger.info(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                return f"大模型调用超时，已重试 {max_retries} 次。请检查网络连接或增加超时时间。"
                
        except requests.exceptions.ConnectionError as e:
            logger.error(f"大模型连接失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 3  # 递增等待时间: 3s, 6s, 9s
                logger.info(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                return f"大模型连接失败，已重试 {max_retries} 次。请检查API服务是否可用。"
                
        except requests.exceptions.HTTPError as e:
            logger.error(f"大模型HTTP错误 (尝试 {attempt + 1}/{max_retries}): {e}")
            if e.response.status_code == 429:  # 限流错误
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 10  # 限流时等待更长时间
                    logger.info(f"遇到限流，等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
                else:
                    return f"大模型API限流，已重试 {max_retries} 次。请稍后再试。"
            else:
                return f"大模型HTTP错误: {e}"
                
        except Exception as e:
            logger.error(f"大模型调用未知错误 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                logger.info(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                return f"大模型调用失败，已重试 {max_retries} 次。错误: {e}"
    
    return "大模型调用失败，已达到最大重试次数。"

def analyze_es_rising_segments(time_from, time_till):
    # 获取ES的指标数据
    es_data = get_es_metric_data(time_from, time_till)
    # 提取时间序列和值序列
    es_times, es_values = extract_time_value_series(es_data)
    # 找出上升段
    es_threshold = CONFIG.es.threshold
    es_rising_segments = find_rising_segments(es_values, es_threshold)
    # 格式化上升段
    formatted_es_segments = format_rising_segments(es_rising_segments, es_times, es_data, source="es")
    return formatted_es_segments

def analyze_zabbix_rising_segments(time_from, time_till):
    """分析所有启用的Zabbix指标的上升段"""
    # 检查有哪些指标被禁用 - 使用vars()来获取SimpleNamespace的属性字典
    disabled_metrics = [
        config.name for name, config in vars(CONFIG.zabbix.metrics).items()
        if not config.enabled
    ]
    if disabled_metrics:
        logger.info(f"已禁用的监控指标: {disabled_metrics}")
    
    # 获取所有启用的Zabbix指标数据
    metrics_data = get_zabbix_metric_data(time_from, time_till)
    
    if not metrics_data:
        logger.info("没有启用的Zabbix监控指标或数据为空")
        return {}
    
    all_formatted_segments = {}
    
    # 对每个启用的指标分别分析上升段
    for metric_name, metric_info in metrics_data.items():
        metric_data = metric_info["data"]
        metric_config = metric_info["config"]
        
        if not metric_data:
            logger.info(f"{metric_config.name} 没有数据，跳过分析")
            continue
            
        # 提取时间序列和值序列
        times, values = extract_time_value_series(metric_data)
        
        if not times or not values:
            logger.info(f"{metric_config.name} 数据为空，跳过分析")
            continue
            
        # 找出上升段
        threshold = metric_config.threshold
        rising_segments = find_rising_segments(values, threshold)
        
        if rising_segments:
            # 格式化上升段
            formatted_segments = format_rising_segments(rising_segments, times, metric_data, source="zabbix")
            all_formatted_segments[metric_name] = {
                "name": metric_config.name,
                "unit": metric_config.unit,
                "threshold": threshold,
                "segments": formatted_segments
            }
            logger.info(f"{metric_config.name} 发现 {len(formatted_segments)} 个上升段")
        else:
            logger.info(f"{metric_config.name} 没有发现上升段")
    
    return all_formatted_segments

def analyze_db_response_with_retry():
    """带重试机制的数据库响应分析"""
    for attempt in range(CONFIG.scheduler.max_retries):
        try:
            # 获取分析时间范围
            time_from, time_till = get_analysis_time_range()
            logger.info(f"开始分析时间段: {time_from.strftime('%Y-%m-%d %H:%M:%S')} - {time_till.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # 分析ES的上升段
            formatted_es_segments = analyze_es_rising_segments(time_from, time_till)
            # 检查是否有上升段数据
            if not formatted_es_segments:
                logger.info("没有ES的上升段，无需继续分析")
                return True
            
            # 分析所有Zabbix指标的上升段
            all_zabbix_segments = analyze_zabbix_rising_segments(time_from, time_till)
            
            # 检查是否有任何Zabbix指标的上升段
            has_zabbix_segments = any(
                metric_info["segments"] for metric_info in all_zabbix_segments.values()
            )
            
            if not has_zabbix_segments:
                logger.info("没有任何Zabbix指标的上升段，无需继续当前分析，从其他方面排查原因")
                return True
            
            # 统计各指标的上升段数量
            segment_counts = {
                metric_name: len(metric_info["segments"]) 
                for metric_name, metric_info in all_zabbix_segments.items()
                if metric_info["segments"]
            }
            
            logger.info(f"发现上升段 - ES: {len(formatted_es_segments)}, Zabbix指标: {segment_counts}")
            
            # 组装大模型分析的prompt
            llm_prompt = f"""
            # 时间段分析报告
            分析时间: {time_from.strftime('%Y-%m-%d %H:%M:%S')} - {time_till.strftime('%Y-%m-%d %H:%M:%S')}
            
            # 数据库响应耗时上升的各个区间时间段如下(单位为秒)：
            {json.dumps(formatted_es_segments, ensure_ascii=False, indent=2) if formatted_es_segments else "无明显上升段"}
            
            # 各监控指标上升的区间如下：
            """
            
            # 为每个有上升段的指标添加详细信息
            for metric_name, metric_info in all_zabbix_segments.items():
                if metric_info["segments"]:
                    llm_prompt += f"""
            ## {metric_info["name"]} (单位: {metric_info["unit"]})
            阈值: {metric_info["threshold"]}
            上升段数据:
            {json.dumps(metric_info["segments"], ensure_ascii=False, indent=2)}
            """
            
            llm_prompt += """
            
            请分析这些数据的关联性和可能的原因，重点关注：
            1. 数据库响应时间上升与各监控指标的时间关联性
            2. 不同监控指标之间的相关性
            3. 可能的根本原因分析
            4. 优化建议
            """
            
            result = call_llm_analysis(llm_prompt)
            logger.info(f"大模型分析结果：\n{result}")
            
            return True
            
        except Exception as e:
            logger.error(f"分析失败 (尝试 {attempt + 1}/{CONFIG.scheduler.max_retries}): {str(e)}")
            if attempt < CONFIG.scheduler.max_retries - 1:
                logger.info(f"等待 {CONFIG.scheduler.retry_delay} 秒后重试...")
                time.sleep(CONFIG.scheduler.retry_delay)
            else:
                logger.error("达到最大重试次数，本次分析失败")
                return False

def run_scheduler():
    """运行定时调度器"""
    # 创建锁文件
    if not create_lock_file():
        logger.error("无法创建锁文件，程序退出")
        sys.exit(1)
    
    logger.info(f"启动数据库响应分析调度器，间隔: {CONFIG.scheduler.interval_minutes} 分钟")
    logger.info("按 Ctrl+C 退出程序")
    
    # 立即执行一次分析
    logger.info("执行初始分析...")
    analyze_db_response_with_retry()
    
    while running:
        try:
            # 等待指定间隔
            sleep_seconds = CONFIG.scheduler.interval_minutes * 60
            logger.info(f"等待 {CONFIG.scheduler.interval_minutes} 分钟后执行下次分析...")
            
            # 分段睡眠，以便能够响应退出信号
            for _ in range(sleep_seconds):
                if not running:
                    break
                time.sleep(1)
            
            if running:
                logger.info("开始执行定时分析...")
                analyze_db_response_with_retry()
                
        except KeyboardInterrupt:
            logger.info("接收到键盘中断信号，正在退出...")
            break
        except Exception as e:
            logger.error(f"调度器运行异常: {str(e)}")
            time.sleep(30)  # 异常后等待一会再继续
    
    logger.info("数据库响应分析调度器已停止")

def run_manual_analysis(time_from_str=None, time_till_str=None):
    """手动执行分析"""
    # 创建锁文件
    if not create_lock_file():
        logger.error("无法创建锁文件，程序退出")
        return False
    
    try:
        if time_from_str and time_till_str:
            # 使用指定时间范围
            try:
                time_from = datetime.strptime(time_from_str, "%Y-%m-%d %H:%M:%S")
                time_till = datetime.strptime(time_till_str, "%Y-%m-%d %H:%M:%S")
            except ValueError as e:
                logger.error(f"时间格式错误: {e}")
                logger.error("请使用格式: YYYY-MM-DD HH:MM:SS")
                return False
        else:
            # 使用最近5分钟
            time_from, time_till = get_analysis_time_range()
        
        logger.info("执行手动分析...")
        return analyze_db_response_with_retry()
    finally:
        # 确保锁文件被清理
        cleanup_lock_file()

def main():
    parser = argparse.ArgumentParser(description='数据库响应分析工具')
    parser.add_argument('--mode', choices=['scheduler', 'manual'], required=True,
                       help='运行模式: scheduler=定时调度, manual=手动执行 (必需参数)')
    parser.add_argument('--time-from', type=str,
                       help='分析开始时间 (格式: YYYY-MM-DD HH:MM:SS)')
    parser.add_argument('--time-till', type=str,
                       help='分析结束时间 (格式: YYYY-MM-DD HH:MM:SS)')
    parser.add_argument('--interval', type=int, default=5,
                       help='定时执行间隔（分钟），默认5分钟')
    
    args = parser.parse_args()
    
    # 更新配置
    if args.interval != 5:  # 只有当用户明确指定了间隔时才更新
        CONFIG.scheduler.interval_minutes = args.interval
    
    if args.mode == 'scheduler':
        run_scheduler()
    elif args.mode == 'manual':
        success = run_manual_analysis(args.time_from, args.time_till)
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()