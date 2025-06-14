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
    7. 优雅退出支持（Ctrl+C）
    8. 防止多实例运行的安全机制（文件锁）
    9. 僵尸锁文件清理

支持的监控指标:
    - 网卡入流量 (net.if.in[eth0])
    - 网卡出流量 (net.if.out[eth0]) 
    - DNS解析时间 (net.dns.time[,8.8.8.8])
    - CPU使用率 (system.cpu.util[,avg1])
    注：可在CONFIG.zabbix.metrics中添加更多指标，每个指标支持独立开关控制

使用方法:
    1. 帮助:
       python3 analyze_rising_segments.py --help
         2. 定时调度模式（默认5分钟间隔）:
        python3 analyze_rising_segments.py --mode scheduler  # 默认5分钟间隔
        python3 analyze_rising_segments.py --mode scheduler --interval 10  # 10分钟间隔
    
    3. 手动执行模式（执行1次）:
       python3 analyze_rising_segments.py --mode manual  # 分析最近5分钟
       python3 analyze_rising_segments.py --mode manual --time-from "2025-06-14 10:00:00" --time-till "2025-06-14 10:05:00"
    

参数说明:
    --mode          运行模式，可选值: scheduler(定时调度), manual(手动执行)
    --interval      定时执行间隔（分钟），默认5分钟
    --time-from     手动模式：分析开始时间，格式: YYYY-MM-DD HH:MM:SS
    --time-till     手动模式：分析结束时间，格式: YYYY-MM-DD HH:MM:SS

配置说明:
    在CONFIG变量中可配置:
    - 多机房配置（每个机房独立的ES、Zabbix配置）
    - 机房开关控制（支持灰度执行，可单独启用/禁用某个机房）
    - 多指标监控配置（每个指标可设置独立阈值、名称、单位、启用/禁用开关）
    - 大模型API配置（包括超时时间）
    - 锁文件路径设置

多机房配置示例:
    CONFIG.datacenters = {
        "11": {
            "name": "北京机房11",
            "enabled": True,  # 机房开关，支持灰度执行
            "es": {
                "url": "http://es-bj11:9200",
                "index": "mysql-slow-*",
                "field": "query_time",
                "threshold": 0.01,
                "fixed_interval": "5s"
            },
            "zabbix": {
                "url": "http://zabbix-bj11/zabbix",
                "username": "Admin",
                "password": "zabbix",
                "firewall_ip": "192.168.1.1",
                "dns_ip": "192.168.1.10",
                "metrics": {
                    "net_in": {"enabled": True, ...},
                    "net_out": {"enabled": True, ...},
                    "dns_time": {"enabled": True, ...}
                }
            }
        },
        "12": {
            "name": "北京机房12",
            "enabled": False,  # 禁用此机房（灰度控制）
            # ... 其他配置
        }
        # ... 更多机房
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
版本: v2.3
更新时间: 2025-06-14
更新内容: 支持多指标监控和关联分析
"""

import logging
import logging.handlers
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
        "lock_file": "/tmp/db_analyzer.lock"  # 锁文件路径
    },
    # 机房配置
    "datacenters": {
        "11": {
            "name": "北京机房11",
            "enabled": True,  # 机房开关，支持灰度执行
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
                # 支持多个监控指标，每个指标可以有不同的阈值和主机IP
                "metrics": {
                    "net_in": {
                        "item_key": "net.if.in[eth0]",
                        "threshold": 100*1000,  # 100kbps
                        "name": "机房防火墙入流量",
                        "unit": "bps",
                        "enabled": True,  # 启用此指标
                        "host_ip": "127.0.0.1"  # 防火墙IP
                    },
                    "net_out": {
                        "item_key": "net.if.out[eth0]",
                        "threshold": 100*1000,  # 100kbps
                        "name": "防火墙出流量",
                        "unit": "bps",
                        "enabled": True,  # 是否启用此指标
                        "host_ip": "127.0.0.1"  # 防火墙IP
                    },
                    "dns_time": {
                        "item_key": "net.dns.time[,8.8.8.8]",
                        "threshold": 0.05,  # 0.05ms
                        "name": "DNS解析时间",
                        "unit": "ms",
                        "enabled": True,  # 是否启用此指标
                        "host_ip": "192.168.1.10"  # DNS服务器IP
                    }
                }
            }
        },
        "12": {
            "name": "北京机房12",
            "enabled": True,  # 机房开关，支持灰度执行
            "es": {
                "url": "http://82.156.146.51:9200",
                "index": "mysql-slow-*",
                "field": "query_time",
                "threshold": 0.01,
                "fixed_interval": "5s"
            },
            "zabbix": {
                "url": "http://82.156.146.51/zabbix",
                "username": "Admin",
                "password": "zabbix",
                "metrics": {
                    "dns_time": {
                        "item_key": "net.dns.time[,8.8.8.8]",
                        "threshold": 0.05,
                        "name": "DNS解析时间",
                        "unit": "ms",
                        "enabled": True,
                        "host_ip": "192.168.1.20"  # DNS服务器IP
                    }
                }
            }
        },
        "20": {
            "name": "上海机房20",
            "enabled": True,  # 机房开关，支持灰度执行
            "es": {
                "url": "http://82.156.146.51:9200",
                "index": "mysql-slow-*",
                "field": "query_time",
                "threshold": 0.01,
                "fixed_interval": "5s"
            },
            "zabbix": {
                "url": "http://82.156.146.51/zabbix",
                "username": "Admin",
                "password": "zabbix",
                "metrics": {
                    "net_in": {
                        "item_key": "net.if.in[eth0]",
                        "threshold": 100*1000,
                        "name": "机房防火墙入流量",
                        "unit": "bps",
                        "enabled": True,
                        "host_ip": "192.168.2.1"
                    },
                    "net_out": {
                        "item_key": "net.if.out[eth0]",
                        "threshold": 100*1000,
                        "name": "防火墙出流量",
                        "unit": "bps",
                        "enabled": True,
                        "host_ip": "192.168.2.1"
                    },
                    "dns_time": {
                        "item_key": "net.dns.time[,8.8.8.8]",
                        "threshold": 0.05,
                        "name": "DNS解析时间",
                        "unit": "ms",
                        "enabled": True,
                        "host_ip": "192.168.2.10"
                    }
                }
            }
        },
        "21": {
            "name": "上海机房21",
            "enabled": True,  # 机房开关，支持灰度执行
            "es": {
                "url": "http://82.156.146.51:9200",
                "index": "mysql-slow-*",
                "field": "query_time",
                "threshold": 0.01,
                "fixed_interval": "5s"
            },
            "zabbix": {
                "url": "http://82.156.146.51/zabbix",
                "username": "Admin",
                "password": "zabbix",
                "metrics": {
                    "net_in": {
                        "item_key": "net.if.in[eth0]",
                        "threshold": 100*1000,
                        "name": "机房防火墙入流量",
                        "unit": "bps",
                        "enabled": True,
                        "host_ip": "192.168.2.2"
                    },
                    "net_out": {
                        "item_key": "net.if.out[eth0]",
                        "threshold": 100*1000,
                        "name": "防火墙出流量",
                        "unit": "bps",
                        "enabled": True,
                        "host_ip": "192.168.2.2"
                    },
                    "dns_time": {
                        "item_key": "net.dns.time[,8.8.8.8]",
                        "threshold": 0.05,
                        "name": "DNS解析时间",
                        "unit": "ms",
                        "enabled": True,
                        "host_ip": "192.168.2.20"
                    }
                }
            }
        },
        "30": {
            "name": "深圳机房30",
            "enabled": True,  # 机房开关，支持灰度执行
            "es": {
                "url": "http://82.156.146.51:9200",
                "index": "mysql-slow-*",
                "field": "query_time",
                "threshold": 0.01,
                "fixed_interval": "5s"
            },
            "zabbix": {
                "url": "http://82.156.146.51/zabbix",
                "username": "Admin",
                "password": "zabbix",
                "metrics": {
                    "net_in": {
                        "item_key": "net.if.in[eth0]",
                        "threshold": 100*1000,
                        "name": "机房防火墙入流量",
                        "unit": "bps",
                        "enabled": True,
                        "host_ip": "192.168.3.1"
                    },
                    "net_out": {
                        "item_key": "net.if.out[eth0]",
                        "threshold": 100*1000,
                        "name": "防火墙出流量",
                        "unit": "bps",
                        "enabled": True,
                        "host_ip": "192.168.3.1"
                    },
                    "dns_time": {
                        "item_key": "net.dns.time[,8.8.8.8]",
                        "threshold": 0.05,
                        "name": "DNS解析时间",
                        "unit": "ms",
                        "enabled": True,
                        "host_ip": "192.168.3.10"
                    }
                }
            }
        },
        "31": {
            "name": "深圳机房31",
            "enabled": False,  # 机房开关，支持灰度执行（示例：此机房暂时禁用）
            "es": {
                "url": "http://82.156.146.51:9200",
                "index": "mysql-slow-*",
                "field": "query_time",
                "threshold": 0.01,
                "fixed_interval": "5s"
            },
            "zabbix": {
                "url": "http://82.156.146.51/zabbix",
                "username": "Admin",
                "password": "zabbix",
                "metrics": {
                    "net_in": {
                        "item_key": "net.if.in[eth0]",
                        "threshold": 100*1000,
                        "name": "机房防火墙入流量",
                        "unit": "bps",
                        "enabled": True,
                        "host_ip": "192.168.3.2"
                    },
                    "net_out": {
                        "item_key": "net.if.out[eth0]",
                        "threshold": 100*1000,
                        "name": "防火墙出流量",
                        "unit": "bps",
                        "enabled": True,
                        "host_ip": "192.168.3.2"
                    },
                    "dns_time": {
                        "item_key": "net.dns.time[,8.8.8.8]",
                        "threshold": 0.05,
                        "name": "DNS解析时间",
                        "unit": "ms",
                        "enabled": True,
                        "host_ip": "192.168.3.20"
                    }
                }
            }
        }
    },
    "llm": {
        "url": "http://127.0.0.1/v1/chat-messages",
        "api_key": "app-B8Ux0kQnN51hcgjwlGtp7xoL",
        "user": "abc-123",
        "timeout": 30      # 大模型调用超时时间（秒）
    },
    "logging": {
        "file": "/tmp/db_analyzer.log",  # 日志文件路径. 如果为空，则不输出到文件
        "level": "INFO",                # 日志级别
        "when": "D",                    # 按天 'D' 切割
        "interval": 1,                  # 每天一个文件
        "backupCount": 7                # 保留最近7天的日志
    }
})

# 配置日志
logger = logging.getLogger(__name__)
logger.propagate = False
logger.setLevel(getattr(logging, CONFIG.logging.level.upper(), logging.INFO))
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

# 检查是否需要输出到文件
log_file_path = CONFIG.logging.file
if log_file_path:
    # 确保日志目录存在
    log_dir = os.path.dirname(log_file_path)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)
    
    # 创建文件处理器，按日切割
    file_handler = logging.handlers.TimedRotatingFileHandler(
        filename=log_file_path,
        when=CONFIG.logging.when,
        interval=CONFIG.logging.interval,
        backupCount=CONFIG.logging.backupCount,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

# 始终输出到控制台
stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)


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
    调用大模型分析
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
    
    try:
        logger.info(f"正在调用大模型分析，超时设置: {timeout}秒")
        
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
        logger.error(f"大模型调用超时: {e}")
        raise Exception(f"大模型调用超时: {e}")
        
    except requests.exceptions.ConnectionError as e:
        logger.error(f"大模型连接失败: {e}")
        raise Exception(f"大模型连接失败: {e}")
        
    except requests.exceptions.HTTPError as e:
        logger.error(f"大模型HTTP错误: {e}")
        raise Exception(f"大模型HTTP错误: {e}")
        
    except Exception as e:
        logger.error(f"大模型调用失败: {e}")
        raise Exception(f"大模型调用失败: {e}")



def analyze_db_response():
    """多机房数据库响应分析 - 按机房顺序依次处理"""
    try:
        # 获取分析时间范围
        time_from, time_till = get_analysis_time_range()
        logger.info(f"开始多机房分析，时间段: {time_from.strftime('%Y-%m-%d %H:%M:%S')} - {time_till.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 获取机房列表，按编号顺序处理
        datacenter_order = ["11", "12", "20", "21", "30", "31"]
        
        # 筛选出启用的机房
        enabled_datacenters = []
        disabled_datacenters = []
        
        for idc in datacenter_order:
            if idc not in vars(CONFIG.datacenters):
                logger.warning(f"机房 {idc} 未在配置中找到，跳过")
                continue
                
            dc = getattr(CONFIG.datacenters, idc)
            if dc.enabled:
                enabled_datacenters.append((idc, dc.name))
            else:
                disabled_datacenters.append((idc, dc.name))
        
        logger.info(f"启用的机房: {[idc for idc, name in enabled_datacenters]}")
        if disabled_datacenters:
            logger.info(f"禁用的机房: {[idc for idc, name in disabled_datacenters]}")
        
        if not enabled_datacenters:
            logger.warning("没有启用任何机房，退出分析")
            return True
        
        all_es_segments = {}
        all_zabbix_segments = {}
        
        # 按顺序逐个处理每个启用的机房
        for idc, dc_name in enabled_datacenters:
            dc = getattr(CONFIG.datacenters, idc)
            # 定义当前机房的日志前缀
            log_prefix = f"[idc{idc}]"
            
            logger.info("="*60)
            # 处理当前机房的ES数据
            logger.info(f"{log_prefix} 开始分析ES数据库响应耗时...")
            try:
                es_client = create_elasticsearch_client(dc.es.url)
                
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
                                "fixed_interval": dc.es.fixed_interval
                            },
                            "aggs": {
                                "avg_response_time": {
                                    "avg": {
                                        "field": dc.es.field
                                    }
                                }
                            }
                        }
                    }
                }
                
                es_result = es_client.search_logs(dc.es.index, es_query)
                es_buckets = es_result.get("aggregations", {}).get("my_aggs_name", {}).get("buckets", [])
                es_data = [
                    {"time": bucket["key_as_string_bj"], "value": bucket["avg_response_time"]["value"], "key": "avg_response_time"}
                    for bucket in es_buckets
                    if bucket["avg_response_time"]["value"] is not None
                ]
                
                logger.info(f"{log_prefix} ES数据获取成功: {len(es_data)} 条记录")
                
                if es_data:
                    # 分析ES上升段
                    es_times, es_values = extract_time_value_series(es_data)
                    es_threshold = dc.es.threshold
                    es_rising_segments = find_rising_segments(es_values, es_threshold)
                    
                    if es_rising_segments:
                        formatted_segments = format_rising_segments(es_rising_segments, es_times, es_data, source="es")
                        all_es_segments[idc] = {
                            "threshold": es_threshold,
                            "segments": formatted_segments
                        }
                        logger.info(f"{log_prefix} ES发现 {len(formatted_segments)} 个上升段")
                    else:
                        logger.info(f"{log_prefix} ES没有发现上升段，跳过Zabbix监控指标获取")
                        continue
                else:
                    logger.info(f"{log_prefix} ES数据为空，跳过Zabbix监控指标获取")
                    continue
                    
            except Exception as e:
                logger.error(f"{log_prefix} ES数据获取失败: {str(e)}")
                continue
            
            # 只有ES有上升段时才处理Zabbix数据
            logger.info(f"{log_prefix} ES发现上升段，开始分析Zabbix监控指标...")
            try:
                logger.info(f"{log_prefix} 连接Zabbix: {dc.zabbix.url}")
                zabbix_client = create_zabbix_client(dc.zabbix.url, dc.zabbix.username, dc.zabbix.password)
                
                # 获取当前机房启用的指标
                enabled_metrics = {
                    name: config for name, config in vars(dc.zabbix.metrics).items()
                    if config.enabled
                }
                
                if not enabled_metrics:
                    logger.info(f"{log_prefix} 没有启用任何Zabbix监控指标")
                    continue
                
                # 按指标逐个获取数据，每个指标使用自己的host_ip
                all_metric_data = {}
                total_data_count = 0
                
                for metric_name, metric_config in enabled_metrics.items():
                    if not hasattr(metric_config, 'host_ip') or not metric_config.host_ip:
                        logger.warning(f"{log_prefix} {metric_config.name} 缺少host_ip配置，跳过")
                        continue
                    
                    logger.info(f"{log_prefix} 获取指标 {metric_config.name}, 主机IP: {metric_config.host_ip}")
                    
                    try:
                        metric_data = zabbix_client.get_history(
                            time_from=time_from,
                            time_till=time_till,
                            host_ips=[metric_config.host_ip],
                            item_keys=[metric_config.item_key]
                        )
                        all_metric_data[metric_name] = metric_data
                        total_data_count += len(metric_data)
                        logger.info(f"{log_prefix} {metric_config.name}: {len(metric_data)} 条数据")
                    except Exception as e:
                        logger.error(f"{log_prefix} {metric_config.name} 数据获取失败: {str(e)}")
                        all_metric_data[metric_name] = []
                
                logger.info(f"{log_prefix} Zabbix数据获取完成，总计: {total_data_count} 条记录")
                
                # 按指标分组数据并分析上升段
                dc_segments = {}
                for metric_name, metric_config in enabled_metrics.items():
                    # 获取当前指标的数据
                    metric_data = all_metric_data.get(metric_name, [])
                    
                    if metric_data:
                        # 提取时间序列和值序列
                        times, values = extract_time_value_series(metric_data)
                        
                        if times and values:
                            # 找出上升段
                            threshold = metric_config.threshold
                            rising_segments = find_rising_segments(values, threshold)
                            
                            if rising_segments:
                                # 格式化上升段
                                formatted_segments = format_rising_segments(rising_segments, times, metric_data, source="zabbix")
                                dc_segments[metric_name] = {
                                    "name": metric_config.name,
                                    "unit": metric_config.unit,
                                    "threshold": threshold,
                                    "host_ip": metric_config.host_ip,
                                    "segments": formatted_segments
                                }
                                logger.info(f"{log_prefix} {metric_config.name} 发现 {len(formatted_segments)} 个上升段")
                            else:
                                logger.info(f"{log_prefix} {metric_config.name} 没有发现上升段")
                        else:
                            logger.info(f"{log_prefix} {metric_config.name} 数据为空")
                    else:
                        logger.info(f"{log_prefix} {metric_config.name} 没有数据")
                
                if dc_segments:
                    all_zabbix_segments[idc] = {
                        "zabbix_url": dc.zabbix.url,
                        "metrics": dc_segments
                    }
                    
            except Exception as e:
                logger.error(f"{log_prefix} Zabbix数据获取失败: {str(e)}")
            
            # 检查当前机房是否需要大模型分析
            # 由于只有ES有上升段才会获取Zabbix数据，所以这里一定有ES上升段
            dc_has_zabbix_segments = idc in all_zabbix_segments and any(
                metric_info["segments"] for metric_info in all_zabbix_segments[idc]["metrics"].values()
            )
            
            if dc_has_zabbix_segments:
                logger.info(f"{log_prefix} 开始大模型分析...")
                
                # 组装当前机房的分析prompt
                dc_es_info = all_es_segments[idc]
                dc_zabbix_info = all_zabbix_segments[idc]
                
                llm_prompt = f"""
                # 机房{idc} 时间段分析报告
                分析时间: {time_from.strftime('%Y-%m-%d %H:%M:%S')} - {time_till.strftime('%Y-%m-%d %H:%M:%S')}
                
                # 数据库响应耗时上升的区间时间段如下(单位为秒)：
                阈值: {dc_es_info["threshold"]}
                上升段数据:
                {json.dumps(dc_es_info["segments"], ensure_ascii=False, indent=2)}
                
                # 监控指标上升的区间如下：
                Zabbix服务器: {dc_zabbix_info["zabbix_url"]}
                """
                
                for metric_name, metric_info in dc_zabbix_info["metrics"].items():
                    if metric_info["segments"]:
                        llm_prompt += f"""
                ## {metric_info["name"]} (单位: {metric_info["unit"]})
                主机IP: {metric_info["host_ip"]}
                阈值: {metric_info["threshold"]}
                上升段数据:
                {json.dumps(metric_info["segments"], ensure_ascii=False, indent=2)}
                """
                
                llm_prompt += """
                
                请分析这个机房的数据关联性和可能的原因，重点关注：
                1. 数据库响应时间上升与监控指标的时间关联性
                2. 不同监控指标之间的相关性
                3. 可能的根本原因分析（网络、基础设施、应用层面）
                4. 针对性的优化建议
                """
                
                try:
                    result = call_llm_analysis(llm_prompt)
                    logger.info(f"{log_prefix} 大模型分析结果：")
                    logger.info(result)
                except Exception as e:
                    logger.error(f"{log_prefix} 大模型分析失败: {str(e)}")
                    
            else:
                logger.info(f"{log_prefix} ES有上升段但Zabbix指标无上升段，建议从其他方面排查原因")
            
            logger.info(f"{log_prefix} 机房处理完成")
        
        # 简单汇总
        logger.info("")
        logger.info("="*60)
        logger.info("所有机房处理完成")
        logger.info("="*60)
        
        # 统计汇总信息
        total_es_segments = sum(len(dc_info["segments"]) for dc_info in all_es_segments.values())
        total_zabbix_segments = sum(
            sum(len(metric_info["segments"]) for metric_info in dc_info["metrics"].values())
            for dc_info in all_zabbix_segments.values()
        )
        
        logger.info(f"汇总统计 - ES上升段总数: {total_es_segments}, Zabbix指标上升段总数: {total_zabbix_segments}")
        
        return True
        
    except Exception as e:
        logger.error(f"分析失败: {str(e)}")
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
    analyze_db_response()
    
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
                analyze_db_response()
                
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
        return analyze_db_response()
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