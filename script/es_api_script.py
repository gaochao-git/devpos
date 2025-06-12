#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Elasticsearch API 公共方法模块
用于采集日志数据
"""

import json
import requests
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from urllib.parse import urljoin
import base64

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
            import urllib3
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
        
    def search_logs(self, index: str, query: Dict = None, size: int = 100, 
                   from_: int = 0, sort: List[Dict] = None) -> Dict:
        """
        搜索日志
        
        Args:
            index: 索引名称
            query: 查询条件
            size: 返回结果数量
            from_: 起始位置
            sort: 排序条件
            
        Returns:
            搜索结果
        """
        search_body = {
            "size": size,
            "from": from_
        }
        
        if query:
            search_body["query"] = query
        else:
            search_body["query"] = {"match_all": {}}
            
        if sort:
            search_body["sort"] = sort
        else:
            search_body["sort"] = [{"@timestamp": {"order": "desc"}}]
            
        return self._make_request('POST', f'/{index}/_search', data=search_body)
        
    def search_by_time_range(self, index: str, start_time: datetime, end_time: datetime,
                           query_string: str = None, fields: List[str] = None,
                           size: int = 1000) -> Dict:
        """
        按时间范围搜索日志
        
        Args:
            index: 索引名称
            start_time: 开始时间
            end_time: 结束时间
            query_string: 查询字符串
            fields: 返回字段列表
            size: 返回结果数量
            
        Returns:
            搜索结果
        """
        # 构建时间范围查询
        time_range_query = {
            "range": {
                "@timestamp": {
                    "gte": start_time.isoformat(),
                    "lte": end_time.isoformat()
                }
            }
        }
        
        # 构建完整查询
        if query_string:
            query = {
                "bool": {
                    "must": [
                        time_range_query,
                        {
                            "query_string": {
                                "query": query_string
                            }
                        }
                    ]
                }
            }
        else:
            query = time_range_query
            
        search_body = {
            "query": query,
            "size": size,
            "sort": [{"@timestamp": {"order": "desc"}}]
        }
        
        # 指定返回字段
        if fields:
            search_body["_source"] = fields
            
        return self._make_request('POST', f'/{index}/_search', data=search_body)
        
    def search_by_level(self, index: str, level: str, hours_back: int = 1,
                       size: int = 1000) -> Dict:
        """
        按日志级别搜索
        
        Args:
            index: 索引名称
            level: 日志级别 (ERROR, WARN, INFO, DEBUG等)
            hours_back: 搜索多少小时前的日志
            size: 返回结果数量
            
        Returns:
            搜索结果
        """
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours_back)
        
        query = {
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
                            "level": level.upper()
                        }
                    }
                ]
            }
        }
        
        return self.search_logs(index, query, size)
        
    def search_by_keyword(self, index: str, keyword: str, fields: List[str] = None,
                         hours_back: int = 24, size: int = 1000) -> Dict:
        """
        按关键词搜索日志
        
        Args:
            index: 索引名称
            keyword: 关键词
            fields: 搜索字段列表
            hours_back: 搜索多少小时前的日志
            size: 返回结果数量
            
        Returns:
            搜索结果
        """
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours_back)
        
        # 构建多字段搜索
        if fields:
            keyword_query = {
                "multi_match": {
                    "query": keyword,
                    "fields": fields
                }
            }
        else:
            keyword_query = {
                "query_string": {
                    "query": f"*{keyword}*"
                }
            }
            
        query = {
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
                    keyword_query
                ]
            }
        }
        
        return self.search_logs(index, query, size)
        
    def get_aggregation_data(self, index: str, agg_field: str, hours_back: int = 24) -> Dict:
        """
        获取聚合数据
        
        Args:
            index: 索引名称
            agg_field: 聚合字段
            hours_back: 聚合多少小时前的数据
            
        Returns:
            聚合结果
        """
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours_back)
        
        search_body = {
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
                "data_over_time": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "calendar_interval": "1h"
                    }
                },
                "top_values": {
                    "terms": {
                        "field": f"{agg_field}.keyword",
                        "size": 10
                    }
                }
            }
        }
        
        return self._make_request('POST', f'/{index}/_search', data=search_body)
        
    def get_log_statistics(self, index: str, hours_back: int = 24) -> Dict:
        """
        获取日志统计信息
        
        Args:
            index: 索引名称
            hours_back: 统计多少小时前的数据
            
        Returns:
            统计信息
        """
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours_back)
        
        search_body = {
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
                "logs_over_time": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "calendar_interval": "1h"
                    }
                },
                "top_hosts": {
                    "terms": {
                        "field": "host.keyword",
                        "size": 10
                    }
                }
            }
        }
        
        return self._make_request('POST', f'/{index}/_search', data=search_body)
        
    def collect_logs(self, indices: List[str], query_conditions: Dict = None,
                    hours_back: int = 1, max_logs: int = 10000) -> Dict[str, Any]:
        """
        采集日志数据（综合方法）
        
        Args:
            indices: 索引列表
            query_conditions: 查询条件
            hours_back: 采集多少小时前的数据
            max_logs: 最大日志条数
            
        Returns:
            采集的日志数据
        """
        try:
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=hours_back)
            
            collected_data = {
                "indices": [],
                "total_logs": 0,
                "statistics": {},
                "timestamp": datetime.now().isoformat()
            }
            
            for index in indices:
                try:
                    # 获取基础日志数据
                    logs = self.search_by_time_range(
                        index=index,
                        start_time=start_time,
                        end_time=end_time,
                        size=min(max_logs // len(indices), 1000)
                    )
                    
                    # 获取统计信息
                    stats = self.get_log_statistics(index, hours_back)
                    
                    index_data = {
                        "index": index,
                        "logs": logs.get("hits", {}).get("hits", []),
                        "total_hits": logs.get("hits", {}).get("total", {}).get("value", 0),
                        "statistics": stats.get("aggregations", {})
                    }
                    
                    collected_data["indices"].append(index_data)
                    collected_data["total_logs"] += len(index_data["logs"])
                    
                except Exception as e:
                    logger.error(f"Failed to collect logs from index {index}: {e}")
                    continue
                    
            return collected_data
            
        except Exception as e:
            logger.error(f"Failed to collect logs: {e}")
            return {"error": str(e)}


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
        
        # 采集日志数据
        log_data = es_client.collect_logs(
            indices=["mysql-error-*", "mysql-slow-*", "logstash-test"],
            hours_back=2,
            max_logs=5000
        )
        
        print(json.dumps(log_data, indent=2, ensure_ascii=False, default=str))
        
        # 搜索错误日志
        error_logs = es_client.search_by_level(
            index="mysql-error-*",
            level="ERROR",
            hours_back=1
        )
        
        print(f"Found {error_logs.get('hits', {}).get('total', {}).get('value', 0)} error logs")
        
    except Exception as e:
        logger.error(f"Error: {e}")
