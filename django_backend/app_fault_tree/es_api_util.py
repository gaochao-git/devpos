import requests
from datetime import datetime, timedelta
import json

class ESLogFetcher:
    def __init__(self, hosts='localhost:9200'):
        """
        初始化 ES 连接
        :param hosts: ES 主机地址
        """
        self.base_url = hosts.rstrip('/')
        self.headers = {'Content-Type': 'application/json'}

    def fetch_logs(self, index_pattern, query_conditions=None, size=100, sort_field="@timestamp", sort_order="desc"):
        """
        基础查询方法
        :param index_pattern: ES索引模式
        :param query_conditions: 过滤条件
        :param size: 返回的记录数量
        :param sort_field: 排序字段
        :param sort_order: 排序顺序
        """
        # 构建查询体
        if query_conditions:
            must_conditions = []
            
            # 处理时间范围
            if "time_range" in query_conditions:
                time_range = query_conditions["time_range"]
                must_conditions.append({
                    "range": {
                        "@timestamp": {
                            "gte": time_range.get("start"),
                            "lte": time_range.get("end")
                        }
                    }
                })
            
            # 处理其他精确匹配条件
            for key, value in query_conditions.items():
                if key != "time_range" and value:
                    must_conditions.append({
                        "match": {
                            key: value
                        }
                    })
            
            query_body = {
                "query": {
                    "bool": {
                        "must": must_conditions
                    }
                },
                "size": size,
                "sort": [{sort_field: sort_order}]
            }
        else:
            query_body = {
                "query": {
                    "match_all": {}
                },
                "size": size,
                "sort": [{sort_field: sort_order}]
            }

        try:
            url = f"{self.base_url}/{index_pattern}/_search"
            response = requests.post(url, headers=self.headers, json=query_body)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def get_mysql_slow_logs(self, size=100, query_conditions=None):
        """
        获取MySQL慢查询日志
        :param size: 返回的记录数量
        :param query_conditions: 过滤条件，例如：
            {
                "user": "specific-user",
                "host": "specific-host",
                "time_range": {
                    "start": "2024-01-01",
                    "end": "2024-01-02"
                }
            }
        """
        return self.fetch_logs(
            index_pattern="mysql-slow*",
            query_conditions=query_conditions,
            size=size
        )

    def get_mysql_error_logs(self, size=100, query_conditions=None):
        """
        获取MySQL错误日志
        :param size: 返回的记录数量
        :param query_conditions: 过滤条件，例如：
            {
                "level": "Error",
                "host": "specific-host",
                "time_range": {
                    "start": "2024-01-01",
                    "end": "2024-01-02"
                }
            }
        """
        return self.fetch_logs(
            index_pattern="mysql-error*",
            query_conditions=query_conditions,
            size=size
        )

def format_slow_logs(logs):
    """
    返回慢查询日志source列表
    """
    if "error" in logs:
        return []
    
    hits = logs.get("hits", {}).get("hits", [])
    return [hit["_source"] for hit in hits]

def format_error_logs(logs):
    """
    返回错误日志source列表
    """
    if "error" in logs:
        return []
    
    hits = logs.get("hits", {}).get("hits", [])
    return [hit["_source"] for hit in hits]

# 使用示例
if __name__ == "__main__":
    es_host = "http://82.156.146.51:9200"
    fetcher = ESLogFetcher(es_host)
    
    # 示例1：查询慢查询日志
    print("\n示例1：查询最近的慢查询日志")
    slow_logs = fetcher.get_mysql_slow_logs(size=2)
    hits = format_slow_logs(slow_logs)

    # 示例2：查询错误日志
    print("\n示例2：查询最近的错误日志")
    error_logs = fetcher.get_mysql_error_logs(size=2)
    hits = format_error_logs(error_logs)
    print(hits)
