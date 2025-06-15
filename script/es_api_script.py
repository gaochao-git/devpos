#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Elasticsearch API 客户端模块

这个模块提供了一个简单易用的 Elasticsearch API 客户端，用于日志数据采集和分析。
使用原生的 Elasticsearch 查询语法进行搜索。

使用示例：
```python
# 创建客户端
es_client = create_elasticsearch_client("http://your_es_host:9200")

# 1. 基础搜索
query = {
    "size": 100,
    "sort": [{"@timestamp": {"order": "desc"}}]
}
result = es_client.search_logs("your-index-*", query)

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
result = es_client.search_logs("your-index-*", query)

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
result = es_client.search_logs("your-index-*", query)

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
result = es_client.search_logs("your-index-*", query)

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
result = es_client.search_logs("your-index-*", query)

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
result = es_client.search_logs("your-index-*", query)

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
result = es_client.search_logs("your-index-*", query)

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
result = es_client.search_logs("your-index-*", query)

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
result = es_client.search_logs("your-index-*", query)
```

参数说明：
1. search_logs 方法参数：
   - index: 索引名称，支持通配符
   - query: Elasticsearch原生查询体，包含查询条件、排序、分页、聚合等

2. 返回结果格式：
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
    
    def __init__(self, url: str, index: str):
        """
        初始化Elasticsearch API客户端
        
        Args:
            url: 完整的查询URL
        """
        self.api_url = url
        self.headers = {"Content-Type": "application/json"}
        self.index = index
        
    def search_logs(self, query: Dict = None) -> Dict:
        """
        搜索日志
        
        Args:
            index: 索引名称
            query: 查询体
            
        Returns:
            搜索结果
        """
        try:
            response = requests.post(self.api_url, json=query, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            # 处理时间字段为北京时间
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
            
            return result
            
        except Exception as e:
            logger.error(f"Search logs failed: {e}")
            raise


def create_elasticsearch_client(url: str, index: str) -> ElasticsearchAPI:
    """
    创建Elasticsearch客户端
    
    Args:
        url: Elasticsearch服务器URL
        
    Returns:
        ElasticsearchAPI实例
    """
    client = ElasticsearchAPI(url, index)
    
    return client


# 使用示例
if __name__ == "__main__":
    # 配置信息
    ES_BASE_URL = "http://82.156.146.51:9200/_search"
    ES_USERNAME = None  # 无需认证
    ES_PASSWORD = None  # 无需认证
    
    try:
        # 创建客户端 - 使用完整的查询URL
        es_client = create_elasticsearch_client(url=f"{ES_BASE_URL}", index="mysql-error-*")
        
        # 搜索错误日志
        query = {
            "size": 100,
            "query": {
                "match": {
                    "level": "ERROR"
                }
            },
            "sort": [{"@timestamp": {"order": "desc"}}]
        }
        error_logs = es_client.search_logs(
            query=query
        )
        
        print(f"Found {error_logs.get('hits', {}).get('total', {}).get('value', 0)} error logs")
        
        # 聚合查询示例
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
        agg_result = es_client.search_logs(
            query=query
        )
        
        print("\nLog levels distribution:")
        print(json.dumps(agg_result.get('aggregations', {}).get('log_levels', {}).get('buckets', []), indent=2))
        
    except Exception as e:
        logger.error(f"Error: {e}")
