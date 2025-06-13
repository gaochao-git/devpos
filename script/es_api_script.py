#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Elasticsearch API 客户端模块

这个模块提供了一个简单易用的 Elasticsearch API 客户端，用于日志数据采集和分析。
使用原生的 Elasticsearch 查询语法进行搜索。

使用示例：
```python
# 创建客户端
es_client = create_elasticsearch_client(
    host="your_es_host",
    port=9200,
    username="your_username",  # 可选
    password="your_password",  # 可选
    use_ssl=False  # 可选，是否使用SSL
)

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

# 2.4 使用带时区的时间范围
query = {
    "size": 100,
    "query": {
        "range": {
            "@timestamp": {
                "gte": "2024-03-13T00:00:00+08:00",  # 东八区时间
                "lte": "2024-03-13T23:59:59+08:00"
            }
        }
    },
    "sort": [{"@timestamp": {"order": "desc"}}]
}
result = es_client.search_logs("your-index-*", query)

# 2.5 使用时间戳（毫秒）
query = {
    "size": 100,
    "query": {
        "range": {
            "@timestamp": {
                "gte": 1710345600000,  # 毫秒级时间戳
                "lte": 1710431999000
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

# 6.3 多维度聚合
query = {
    "size": 0,
    "aggs": {
        "logs_over_time": {
            "date_histogram": {
                "field": "@timestamp",
                "calendar_interval": "1h"
            },
            "aggs": {
                "log_levels": {
                    "terms": {
                        "field": "level.keyword",
                        "size": 10
                    }
                }
            }
        }
    }
}
result = es_client.search_logs("your-index-*", query)

# 6.4 带过滤条件的聚合
query = {
    "size": 0,
    "query": {
        "range": {
            "@timestamp": {
                "gte": start_time.isoformat(),
                "lte": end_time.isoformat()
            }
        }
    },
    "aggs": {
        "log_levels": {
            "terms": {
                "field": "level.keyword",
                "size": 10
            }
        },
        "avg_response_time": {
            "avg": {
                "field": "response_time"
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
           "hits": [
               {
                   "_index": "索引名",
                   "_source": {
                       "@timestamp": "时间戳",
                       "message": "日志消息",
                       "level": "日志级别",
                       ...
                   }
               }
           ]
       },
       "aggregations": {  # 聚合结果
           "聚合名称": {
               "buckets": [
                   {
                       "key": "分组值",
                       "doc_count": 数量
                   }
               ]
           }
       }
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

import json
import requests
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from urllib.parse import urljoin
import base64
import urllib3

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ElasticsearchAPI:
    """Elasticsearch API 客户端类"""
    
    def __init__(self, host: str, port: int = 9200, username: str = None, 
                 password: str = None, use_ssl: bool = False, verify_certs: bool = True):
        """
        初始化Elasticsearch API客户端
        
        Args:
            host: ES服务器地址
            port: ES服务器端口
            username: 用户名
            password: 密码
            use_ssl: 是否使用SSL
            verify_certs: 是否验证证书
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_ssl = use_ssl
        self.verify_certs = verify_certs
        
        # 构建基础URL
        protocol = 'https' if use_ssl else 'http'
        self.base_url = f"{protocol}://{host}:{port}"
        
        # 创建session
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Elasticsearch API Client'
        })
        
        # 设置认证
        if username and password:
            auth_string = base64.b64encode(f"{username}:{password}".encode()).decode()
            self.session.headers.update({
                'Authorization': f'Basic {auth_string}'
            })
            
        # SSL设置
        if not verify_certs:
            self.session.verify = False
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            
    def _make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """
        发送HTTP请求
        
        Args:
            method: HTTP方法
            endpoint: API端点
            data: 请求数据
            params: URL参数
            
        Returns:
            响应数据
        """
        url = urljoin(self.base_url, endpoint)
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=30
            )
            
            response.raise_for_status()
            
            if response.content:
                return response.json()
            else:
                return {}
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            raise
            
    def test_connection(self) -> bool:
        """
        测试连接
        
        Returns:
            连接是否成功
        """
        try:
            result = self._make_request('GET', '/')
            logger.info(f"Connected to Elasticsearch: {result.get('version', {}).get('number', 'Unknown')}")
            return True
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False
            
    def get_cluster_health(self) -> Dict:
        """
        获取集群健康状态
        
        Returns:
            集群健康信息
        """
        return self._make_request('GET', '/_cluster/health')
        
    def list_indices(self, pattern: str = "*") -> List[Dict]:
        """
        列出索引
        
        Args:
            pattern: 索引模式
            
        Returns:
            索引列表
        """
        result = self._make_request('GET', f'/_cat/indices/{pattern}', params={'format': 'json'})
        return result if isinstance(result, list) else []
        
    def search_logs(self, index: str, query: Dict = None) -> Dict:
        """
        搜索日志
        
        Args:
            index: 索引名称
            query: Elasticsearch原生查询体
            
        Returns:
            搜索结果
        """
        return self._make_request('POST', f'/{index}/_search', data=query)


def create_elasticsearch_client(host: str, port: int = 9200, username: str = None,
                              password: str = None, use_ssl: bool = False) -> ElasticsearchAPI:
    """
    创建Elasticsearch API客户端
    
    Args:
        host: ES服务器地址
        port: ES服务器端口
        username: 用户名
        password: 密码
        use_ssl: 是否使用SSL
        
    Returns:
        ElasticsearchAPI客户端实例
    """
    client = ElasticsearchAPI(host, port, username, password, use_ssl)
    if client.test_connection():
        return client
    else:
        raise Exception("Failed to connect to Elasticsearch")


# 使用示例
if __name__ == "__main__":
    # 配置信息
    ES_HOST = "82.156.146.51"
    ES_PORT = 9200
    ES_USERNAME = None  # 无需认证
    ES_PASSWORD = None  # 无需认证
    
    try:
        # 创建客户端
        es_client = create_elasticsearch_client(ES_HOST, ES_PORT, ES_USERNAME, ES_PASSWORD)
        
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
            index="mysql-error-*",
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
            index="mysql-error-*",
            query=query
        )
        
        print("\nLog levels distribution:")
        print(json.dumps(agg_result.get('aggregations', {}).get('log_levels', {}).get('buckets', []), indent=2))
        
    except Exception as e:
        logger.error(f"Error: {e}")
