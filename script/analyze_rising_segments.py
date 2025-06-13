#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from es_api_script import create_elasticsearch_client
from zabbix_api_script import create_zabbix_client
import json

# 全局配置
CONFIG = {
    "es": {
        "host": "82.156.146.51",
        "port": 9200,
        "index": "mysql-slow-*",
        "field": "response_time",
        "threshold": 1000  # 毫秒
    },
    "zabbix": {
        "url": "http://82.156.146.51/zabbix",
        "username": "Admin",
        "password": "zabbix",
        "item_keys": ["net.if.in[eth0]"],
        "threshold": 100*1000  # kbps
    },
    "time": {
        "hours_back": 1
    }
}

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def find_rising_segments(data, threshold, times=None, raw_data=None):
    """
    找出上升段
    Args:
        data: 数据列表
        threshold: 阈值
        times: 时间列表（可选）
        raw_data: 原始数据列表（可选）
    Returns:
        如果提供了times和raw_data，返回格式化后的上升段列表：
        [
            {
                "time_from": "YYYY-MM-DD HH:MM:SS",
                "time_till": "YYYY-MM-DD HH:MM:SS",
                "data": [...]
            },
            ...
        ]
        否则返回原始格式：
        [(start_idx, end_idx, max_value), ...]
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
    
    # 如果提供了times和raw_data，返回格式化后的数据
    if times is not None and raw_data is not None:
        formatted_segments = []
        for start, end, max_value in rising_segments:
            time_from_str = times[start].strftime("%Y-%m-%d %H:%M:%S")
            time_till_str = times[end].strftime("%Y-%m-%d %H:%M:%S")
            segment_data = raw_data[start:end+1]
            formatted_segments.append({
                "time_from": time_from_str,
                "time_till": time_till_str,
                "data": segment_data
            })
        return formatted_segments
    return rising_segments

def get_metric_data(es_client, zabbix_client, time_from, time_till):
    """获取ES和Zabbix的指标数据"""
    try:
        # 获取ES数据
        logger.info("正在从ES获取数据...")
        es_query = {
            "size": 0,
            "query": {
                "range": {
                    "@timestamp": {
                        "gte": time_from.isoformat(),
                        "lte": time_till.isoformat()
                    }
                }
            },
            "aggs": {
                "response_time_over_time": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "fixed_interval": "1m"
                    },
                    "aggs": {
                        "avg_response_time": {
                            "avg": {
                                "field": CONFIG["es"]["field"]
                            }
                        }
                    }
                }
            }
        }
        
        es_result = es_client.search_logs(CONFIG["es"]["index"], es_query)
        es_buckets = es_result.get("aggregations", {}).get("response_time_over_time", {}).get("buckets", [])
        es_data = [(datetime.fromisoformat(bucket["key_as_string"]), bucket["avg_response_time"]["value"]) for bucket in es_buckets]
        logger.info(f"从ES获取到 {len(es_data)} 条数据")
        
        # 获取Zabbix数据
        logger.info("正在从Zabbix获取数据...")
        zabbix_data = zabbix_client.get_history(
            time_from=time_from,
            time_till=time_till,
            host_ips=None,
            item_keys=CONFIG["zabbix"]["item_keys"]
        )
        logger.info(f"从Zabbix获取到 {len(zabbix_data)} 条数据")
        return es_data, zabbix_data
    except Exception as e:
        logger.error(f"获取数据异常: {str(e)}")
        raise

def main():
    # 初始化客户端
    es_client = create_elasticsearch_client(CONFIG["es"]["host"], CONFIG["es"]["port"])
    zabbix_client = create_zabbix_client(CONFIG["zabbix"]["url"], CONFIG["zabbix"]["username"], CONFIG["zabbix"]["password"])
    
    # 获取时间范围
    time_till = datetime.now()
    time_from = time_till - timedelta(hours=CONFIG["time"]["hours_back"])
    
    # 获取数据
    es_data, zabbix_data = get_metric_data(es_client, zabbix_client, time_from, time_till)
    
    # 提取时间序列
    es_times = [t for t, v in es_data]
    es_values = [v for t, v in es_data]
    zabbix_times = [datetime.strptime(item["time"], "%Y-%m-%d %H:%M:%S") for item in zabbix_data]
    zabbix_values = [item["value"] for item in zabbix_data]
    
    # 设置阈值
    es_threshold = CONFIG["es"]["threshold"]
    zabbix_threshold = CONFIG["zabbix"]["threshold"]
    
    es_rising_segments = find_rising_segments(es_values, es_threshold)
    zabbix_rising_segments = find_rising_segments(zabbix_values, zabbix_threshold, times=zabbix_times, raw_data=zabbix_data)
    
    print(f"es_rising_segments: {es_rising_segments}")
    print(f"zabbix_rising_segments: {zabbix_rising_segments}")

if __name__ == "__main__":
    main()