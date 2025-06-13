#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from es_api_script import create_elasticsearch_client
from zabbix_api_script import create_zabbix_client
import json
from types import SimpleNamespace
import requests

# 全局配置
def dict2ns(d):
    if isinstance(d, dict):
        return SimpleNamespace(**{k: dict2ns(v) for k, v in d.items()})
    return d

CONFIG = dict2ns({
    "es": {
        "url": "http://82.156.146.51:9200",
        "index": "mysql-slow-*",
        "field": "query_time",
        "threshold": 3,  # 毫秒，判断是否上升段的基础阈值，避免微小波动被误判
        "fixed_interval": "5s"  # 聚合间隔
    },
    "zabbix": {
        "url": "http://82.156.146.51/zabbix",
        "username": "Admin",
        "password": "zabbix",
        "item_keys": ["net.if.in[eth0]"],
        "threshold": 100*1000  # 100kbps，判断是否上升段的基础阈值，避免微小波动被误判
    }
})

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
                        "lte": time_till.isoformat(),
                        "time_zone": "+08:00"
                    }
                }
            },
            "aggs": {
                "response_time_over_time": {
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
        es_buckets = es_result.get("aggregations", {}).get("response_time_over_time", {}).get("buckets", [])
        es_data = [
            (datetime.strptime(bucket["key_as_string_bj"], "%Y-%m-%d %H:%M:%S"), bucket["avg_response_time"]["value"])
            for bucket in es_buckets
            if bucket["avg_response_time"]["value"] is not None
        ]
        logger.info(f"从ES获取到 {len(es_data)} 条数据")
        
        # 获取Zabbix数据
        logger.info("正在从Zabbix获取数据...")
        zabbix_data = zabbix_client.get_history(
            time_from=time_from,
            time_till=time_till,
            host_ips=None,
            item_keys=CONFIG.zabbix.item_keys
        )
        logger.info(f"从Zabbix获取到 {len(zabbix_data)} 条数据")
        return es_data, zabbix_data
    except Exception as e:
        logger.error(f"获取数据异常: {str(e)}")
        raise

def extract_time_value_series(data, is_es=True):
    """
    从原始数据中提取时间序列和值序列
    Args:
        data: 原始数据列表
        is_es: 是否为ES数据，默认为True
    Returns:
        times: 时间序列
        values: 值序列
    """
    if is_es:
        times = [t for t, v in data]
        values = [v for t, v in data]
    else:
        times = [datetime.strptime(item["time"], "%Y-%m-%d %H:%M:%S") for item in data]
        values = [item["value"] for item in data]
    return times, values

def format_rising_segments(rising_segments, times, raw_data):
    """
    将原始上升段数据格式化为包含time_from、time_till和data的列表
    Args:
        rising_segments: 原始上升段数据，格式为 [(start_idx, end_idx, max_value), ...]
        times: 时间列表
        raw_data: 原始数据列表
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
        time_from_str = times[start].strftime("%Y-%m-%d %H:%M:%S")
        time_till_str = times[end].strftime("%Y-%m-%d %H:%M:%S")
        # 判断数据类型
        if raw_data and isinstance(raw_data[0], dict):
            # Zabbix数据
            segment_data = [
                {
                    "key": item.get("key"),
                    "time": item.get("time"),
                    "value": item.get("value")
                }
                for item in raw_data[start:end+1]
            ]
        else:
            # ES数据
            segment_data = [
                (t.strftime("%Y-%m-%d %H:%M:%S") if isinstance(t, datetime) else t, v)
                for t, v in raw_data[start:end+1]
            ]
        formatted_segments.append({
            "time_from": time_from_str,
            "time_till": time_till_str,
            "data": segment_data
        })
    return formatted_segments

def call_llm_analysis(prompt, api_url="http://127.0.0.1/v1/chat-messages", api_key="app-B8Ux0kQnN51hcgjwlGtp7xoL", user="abc-123"):
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
    response = requests.post(api_url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    try:
        return response.json().get("answer", response.text)
    except Exception:
        return response.text

def main():
    # 初始化客户端
    es_client = create_elasticsearch_client(CONFIG.es.url)
    zabbix_client = create_zabbix_client(CONFIG.zabbix.url, CONFIG.zabbix.username, CONFIG.zabbix.password)
    
    # 获取时间范围（强制要求字符串）
    time_from_str = "2025-06-13 23:02:00"
    time_till_str = "2025-06-13 23:07:00"
    time_from = datetime.strptime(time_from_str, "%Y-%m-%d %H:%M:%S")
    time_till = datetime.strptime(time_till_str, "%Y-%m-%d %H:%M:%S")
    
    # 获取数据
    es_data, zabbix_data = get_metric_data(es_client, zabbix_client, time_from, time_till)
    
    # 提取时间序列和值序列
    es_times, es_values = extract_time_value_series(es_data, is_es=True)
    zabbix_times, zabbix_values = extract_time_value_series(zabbix_data, is_es=False)
    
    # 设置阈值，控制确认为上升段的基础阈值，避免微小波动被误判
    es_threshold = CONFIG.es.threshold
    zabbix_threshold = CONFIG.zabbix.threshold
    print(es_threshold)
    print(zabbix_threshold)
    # 找出上升段
    es_rising_segments = find_rising_segments(es_values, es_threshold)
    zabbix_rising_segments = find_rising_segments(zabbix_values, zabbix_threshold)
    
    # 格式化上升段数据为人类或者大模型可读的json格式
    formatted_es_segments = format_rising_segments(es_rising_segments, es_times, es_data)
    formatted_zabbix_segments = format_rising_segments(zabbix_rising_segments, zabbix_times, zabbix_data)
    
    # print(f"formatted_es_segments: {json.dumps(formatted_es_segments, ensure_ascii=False, indent=2)}")
    # print(f"formatted_zabbix_segments: {json.dumps(formatted_zabbix_segments, ensure_ascii=False, indent=2)}")
    llm_prompt = f"""
    # 当前数据库响应耗时上升的各个区间时间段如下(单位为秒)：
    {json.dumps(formatted_es_segments, ensure_ascii=False, indent=2)}
    # 当前网络流量上升的各个区间如下(单位为bps)：
    {json.dumps(formatted_zabbix_segments, ensure_ascii=False, indent=2)}
    """
    result = call_llm_analysis(llm_prompt)
    logger.info(f"大模型分析结果：\n{result}")

if __name__ == "__main__":
    main()