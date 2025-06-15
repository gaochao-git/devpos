#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Elasticsearch API 客户端模块

这个模块提供了一个简单易用的 Elasticsearch API 客户端，用于日志数据采集和分析。
使用原生的 Elasticsearch 查询语法进行搜索。

使用示例：
```python
# 创建客户端 - 指定Elasticsearch服务器URL和索引
es_client = create_elasticsearch_client("http://your_es_host:9200/_search", "your-index-*")

# 1. 基础搜索
query = {
    "size": 100,
    "sort": [{"@timestamp": {"order": "desc"}}]
}
result = es_client.search_logs(query)

# 2. 时间范围搜索
# 2.1 使用相对时间
query = {
    "size": 100,
    "query": {
        "range": {
            "@timestamp": {
                "gte": "now-1h",  # 1小时前
                "lte": "now"      # 当前时间
            }
        }
    },
    "sort": [{"@timestamp": {"order": "desc"}}]
}
result = es_client.search_logs(query)

# 2.2 使用日期范围
query = {
    "size": 100,
    "query": {
        "range": {
            "@timestamp": {
                "gte": "now/d",      # 今天开始
                "lte": "now/d+1d"    # 明天开始
            }
        }
    },
    "sort": [{"@timestamp": {"order": "desc"}}]
}
result = es_client.search_logs(query)

# 2.3 使用Python datetime对象
from datetime import datetime, timedelta
end_time = datetime.now()
start_time = end_time - timedelta(hours=2)
query = {
    "size": 100,
    "query": {
        "range": {
            "@timestamp": {
                "gte": start_time.isoformat(),  # 转换为ISO格式
                "lte": end_time.isoformat()
            }
        }
    },
    "sort": [{"@timestamp": {"order": "desc"}}]
}
result = es_client.search_logs(query)

# 3. 日志级别搜索
query = {
    "size": 100,
    "query": {
        "match": {
            "level": "ERROR"
        }
    },
    "sort": [{"@timestamp": {"order": "desc"}}]
}
result = es_client.search_logs(query)

# 4. 关键词搜索
query = {
    "size": 100,
    "query": {
        "multi_match": {
            "query": "your_keyword",
            "fields": ["message", "content"]
        }
    },
    "sort": [{"@timestamp": {"order": "desc"}}]
}
result = es_client.search_logs(query)

# 5. 组合查询
query = {
    "size": 100,
    "query": {
        "bool": {
            "must": [
                {
                    "range": {
                        "@timestamp": {
                            "gte": start_time.isoformat(),
                            "lte": end_time.isoformat()
                        }
                    }
                },
                {
                    "match": {
                        "level": "ERROR"
                    }
                },
                {
                    "multi_match": {
                        "query": "your_keyword",
                        "fields": ["message"]
                    }
                }
            ]
        }
    },
    "sort": [{"@timestamp": {"order": "desc"}}]
}
result = es_client.search_logs(query)

# 6. 聚合查询示例
# 6.1 按时间统计日志数量
query = {
    "size": 0,
    "aggs": {
        "logs_over_time": {
            "date_histogram": {
                "field": "@timestamp",
                "calendar_interval": "1h"
            }
        }
    }
}
result = es_client.search_logs(query)

# 6.2 按日志级别统计
query = {
    "size": 0,
    "aggs": {
        "log_levels": {
            "terms": {
                "field": "level.keyword",
                "size": 10
            }
        }
    }
}
result = es_client.search_logs(query)
```

参数说明：
1. create_elasticsearch_client 方法参数：
   - url: Elasticsearch服务器URL，格式：http://host:port/_msearch
   - index: 索引名称，支持通配符

2. search_logs 方法参数：
   - query: Elasticsearch原生查询体，包含查询条件、排序、分页、聚合等

3. 返回结果格式：
   {
       "hits": {
           "total": {"value": 数量},
           "hits": [...]
       },
       "aggregations": {...}  # 如果有聚合查询
   }

@timestamp时间范围查询说明：
1. 相对时间格式：
   - now: 当前时间
   - now-1h: 1小时前
   - now/d: 今天开始
   - now/d+1d: 明天开始
   - now/M: 本月开始
   - now/M+1M: 下月开始

2. ISO 8601 时间格式：
   - 基本格式：YYYY-MM-DDThh:mm:ssZ
   - 带时区：YYYY-MM-DDThh:mm:ss+08:00
   - 示例：2024-03-13T00:00:00+08:00

3. 时间戳格式：
   - 毫秒级时间戳
   - 示例：1710345600000

4. Python datetime 对象：
   - 使用 isoformat() 转换为 ISO 格式
   - 示例：datetime.now().isoformat()
"""

import requests
import json
import logging
from typing import Dict, List
from datetime import datetime, timedelta, timezone

# 配置日志
logger = logging.getLogger(__name__)

class ElasticsearchAPI:
    """Elasticsearch API 客户端类"""
    
    def __init__(self, base_url: str, index: str):
        """
        初始化Elasticsearch API客户端
        
        Args:
            base_url: Elasticsearch服务器基础URL，格式：http://host:port
            index: 索引名称，支持通配符
        """
        self.base_url = base_url.rstrip('/')
        self.index = index
        
        # 构造不同API的URL
        self.search_url = f"{self.base_url}/{self.index}/_search"
        self.msearch_url = f"{self.base_url}/_msearch"
        
        self.json_headers = {"Content-Type": "application/json"}
        self.ndjson_headers = {"Content-Type": "application/x-ndjson"}
        
        # msearch用的header行
        self.msearch_header = json.dumps({
            "index": self.index,
            "search_type": "query_then_fetch",
            "ignore_unavailable": "true"
        })
        
    def search_log(self, query: Dict = None) -> Dict:
        """
        使用普通_search API搜索日志
        
        Args:
            query: Elasticsearch查询体，包含查询条件、排序、分页、聚合等
            
        Returns:
            搜索结果
        """
        try:
            response = requests.post(self.search_url, json=query, headers=self.json_headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            # 处理时间字段为北京时间（复用时间处理逻辑）
            self._process_time_fields(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Search log failed: {e}")
            raise
    
    def msearch_log(self, query: Dict = None) -> Dict:
        """
        使用_msearch API搜索日志
        
        Args:
            query: Elasticsearch查询体，包含查询条件、排序、分页、聚合等
            
        Returns:
            搜索结果
        """
        try:
            # 构造msearch格式的请求体：第一行是索引信息，第二行是查询体
            query_line = json.dumps(query) if query else "{}"
            request_body = f"{self.msearch_header}\n{query_line}\n"
            
            # 使用data参数发送纯文本格式的请求体
            response = requests.post(self.msearch_url, data=request_body, headers=self.ndjson_headers, timeout=30)
            response.raise_for_status()
            msearch_result = response.json()
            
            # _msearch 返回的是一个数组，我们取第一个结果
            result = msearch_result.get('responses', [{}])[0] if msearch_result.get('responses') else {}
            
            # 处理时间字段为北京时间
            self._process_time_fields(result)
            
            return result
            
        except Exception as e:
            logger.error(f"MSearch log failed: {e}")
            raise
    
    def _process_time_fields(self, result: Dict):
        """
        处理时间字段为北京时间（内部方法）
        
        Args:
            result: 搜索结果
        """
        def process_bucket(bucket):
            # 处理key_as_string为北京时间
            if "key_as_string" in bucket:
                try:
                    # 解析UTC时间
                    utc_time = datetime.fromisoformat(bucket["key_as_string"].replace('Z', '+00:00'))
                    # 转换为北京时间
                    beijing_time = utc_time.astimezone(timezone(timedelta(hours=8)))
                    bucket["key_as_string_bj"] = beijing_time.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    bucket["key_as_string_bj"] = bucket["key_as_string"]
            
            # 递归处理嵌套的聚合
            for key, value in bucket.items():
                if isinstance(value, dict) and "buckets" in value:
                    for sub_bucket in value["buckets"]:
                        process_bucket(sub_bucket)
        
        # 处理聚合结果中的时间字段
        if "aggregations" in result:
            for agg_name, agg_data in result["aggregations"].items():
                if "buckets" in agg_data:
                    for bucket in agg_data["buckets"]:
                        process_bucket(bucket)
    
    def search_logs(self, query: Dict = None) -> Dict:
        """
        搜索日志（独立实现）
        
        Args:
            query: Elasticsearch查询体，包含查询条件、排序、分页、聚合等
            
        Returns:
            搜索结果
        """
        try:
            # 使用普通_search API的独立实现
            response = requests.post(self.search_url, json=query, headers=self.json_headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            # 处理时间字段为北京时间
            self._process_time_fields(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Search logs failed: {e}")
            raise



# 使用示例
if __name__ == "__main__":
    # 配置信息
    ES_BASE_URL = "http://82.156.146.51:9200"
    ES_USERNAME = None  # 无需认证
    ES_PASSWORD = None  # 无需认证
    
    try:
        # 创建客户端 - 传入基础URL
        es_client = ElasticsearchAPI(base_url=ES_BASE_URL, index="mysql-error-*")
        
        # 查询配置
        query = {
            "size": 100,
            "query": {
                "match": {
                    "level": "ERROR"
                }
            },
            "sort": [{"@timestamp": {"order": "desc"}}]
        }
        
        # 测试普通_search API
        print("=== 使用普通_search API ===")
        error_logs = es_client.search_log(query=query)
        print(f"Found {error_logs.get('hits', {}).get('total', {}).get('value', 0)} error logs")
        
        # 测试_msearch API
        print("\n=== 使用_msearch API ===")
        error_logs_ms = es_client.msearch_log(query=query)
        print(f"Found {error_logs_ms.get('hits', {}).get('total', {}).get('value', 0)} error logs")
        
        # 聚合查询示例
        print("\n=== 聚合查询示例 ===")
        agg_query = {
            "size": 0,
            "aggs": {
                "log_levels": {
                    "terms": {
                        "field": "level.keyword",
                        "size": 10
                    }
                }
            }
        }
        
        # 使用普通_search做聚合
        agg_result = es_client.search_log(query=agg_query)
        print("Log levels distribution (using _search):")
        print(json.dumps(agg_result.get('aggregations', {}).get('log_levels', {}).get('buckets', []), indent=2))
        
        # 使用_msearch做聚合
        agg_result_ms = es_client.msearch_log(query=agg_query)
        print("\nLog levels distribution (using _msearch):")
        print(json.dumps(agg_result_ms.get('aggregations', {}).get('log_levels', {}).get('buckets', []), indent=2))
        
        # 测试search_logs方法（独立实现）
        print("\n=== 测试search_logs方法（独立实现）===")
        search_logs_result = es_client.search_logs(query=query)
        print(f"Found {search_logs_result.get('hits', {}).get('total', {}).get('value', 0)} error logs")
        
    except Exception as e:
        logger.error(f"Error: {e}")
