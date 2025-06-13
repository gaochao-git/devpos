#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging
from datetime import datetime
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
        "threshold": 1,  # 毫秒，判断是否上升段的基础阈值，避免微小波动被误判
        "fixed_interval": "5s"  # 聚合间隔
    },
    "zabbix": {
        "url": "http://82.156.146.51/zabbix",
        "username": "Admin",
        "password": "zabbix",
        "item_keys": ["net.if.in[eth0]"],
        "threshold": 100*1000  # 100kbps，判断是否上升段的基础阈值，避免微小波动被误判
    },
    "llm": {
        "url": "http://127.0.0.1/v1/chat-messages",
        "api_key": "app-B8Ux0kQnN51hcgjwlGtp7xoL",
        "user": "abc-123"
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
    """只获取Zabbix的指标数据"""
    try:
        zabbix_client = create_zabbix_client(CONFIG.zabbix.url, CONFIG.zabbix.username, CONFIG.zabbix.password)
        logger.info("正在从Zabbix获取数据...")
        zabbix_data = zabbix_client.get_history(
            time_from=time_from,
            time_till=time_till,
            host_ips=None,
            item_keys=CONFIG.zabbix.item_keys
        )
        logger.info(f"从Zabbix获取到 {len(zabbix_data)} 条数据")
        return zabbix_data
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

def call_llm_analysis(prompt, api_url=CONFIG.llm.url, api_key=CONFIG.llm.api_key, user=CONFIG.llm.user):
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
    # 获取Zabbix的指标数据
    zabbix_data = get_zabbix_metric_data(time_from, time_till)
    # 提取时间序列和值序列
    zabbix_times, zabbix_values = extract_time_value_series(zabbix_data)
    # 找出上升段
    zabbix_threshold = CONFIG.zabbix.threshold
    zabbix_rising_segments = find_rising_segments(zabbix_values, zabbix_threshold)
    # 格式化上升段
    formatted_zabbix_segments = format_rising_segments(zabbix_rising_segments, zabbix_times, zabbix_data, source="zabbix")
    return formatted_zabbix_segments

def main():
    # 获取时间范围（强制要求字符串）
    time_from_str = "2025-06-13 23:02:00"
    time_till_str = "2025-06-13 23:07:00"
    time_from = datetime.strptime(time_from_str, "%Y-%m-%d %H:%M:%S")
    time_till = datetime.strptime(time_till_str, "%Y-%m-%d %H:%M:%S")

    # 分析ES的上升段
    formatted_es_segments = analyze_es_rising_segments(time_from, time_till)
    if not formatted_es_segments:
        logger.info("没有ES的上升段")
        return

    # 分析Zabbix的上升段
    formatted_zabbix_segments = analyze_zabbix_rising_segments(time_from, time_till)
    if not formatted_zabbix_segments:
        logger.info("没有Zabbix的上升段")
        return

    # 组装大模型分析的prompt，并调用大模型分析
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