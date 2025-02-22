import requests
from datetime import datetime, timedelta
import json
from typing import List, Dict, Union, Optional

class ESLogFetcher:
    def __init__(self, hosts: Union[str, List[str]] = 'localhost:9200'):
        """
        初始化 ES 连接
        :param hosts: ES 主机地址，可以是单个字符串或地址列表
        """
        self.base_url = hosts.rstrip('/')
        self.headers = {'Content-Type': 'application/json'}

    def list_indices(self) -> List[str]:
        """
        列出所有索引
        :return: 索引列表
        """
        try:
            url = f"{self.base_url}/_cat/indices?format=json"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            indices = response.json()
            return [index['index'] for index in indices]
        except Exception as e:
            print(f"获取索引列表出错: {str(e)}")
            return []

    def fetch_logs(self,
                  index_pattern: str,
                  start_time: Optional[Union[str, datetime]] = None,
                  end_time: Optional[Union[str, datetime]] = None,
                  query_conditions: Optional[Dict] = None,
                  size: int = 100,
                  sort_field: str = "@timestamp",
                  sort_order: str = "desc",
                  fields: Optional[List[str]] = None) -> Dict:
        """
        获取日志数据
        :param index_pattern: 索引模式，如 'mysql-3306-slow-*'
        :param start_time: 开始时间，可以是datetime对象或ISO格式字符串
        :param end_time: 结束时间，可以是datetime对象或ISO格式字符串
        :param query_conditions: 额外的查询条件
        :param size: 返回的最大记录数
        :param sort_field: 排序字段
        :param sort_order: 排序方向 ('asc' 或 'desc')
        :param fields: 要返回的字段列表
        :return: 查询结果
        """
        # 构建查询体
        query_body = {
            "query": {
                "bool": {
                    "must": []
                }
            },
            "size": size,
            "sort": [{sort_field: sort_order}]
        }

        # 添加时间范围
        if start_time or end_time:
            time_range = {}
            if start_time:
                time_range["gte"] = start_time if isinstance(start_time, str) else start_time.isoformat()
            if end_time:
                time_range["lte"] = end_time if isinstance(end_time, str) else end_time.isoformat()
            query_body["query"]["bool"]["must"].append({"range": {"@timestamp": time_range}})

        # 添加额外查询条件
        if query_conditions:
            query_body["query"]["bool"]["must"].extend(query_conditions)

        # 添加字段过滤
        if fields:
            query_body["_source"] = fields

        try:
            # 执行查询
            url = f"{self.base_url}/{index_pattern}/_search"
            response = requests.post(url, headers=self.headers, json=query_body)
            response.raise_for_status()  # 如果响应状态码不是 200，抛出异常
            return response.json()
        except Exception as e:
            print(f"查询出错: {str(e)}")
            return {"error": str(e)}

    def get_mysql_slow_logs(self,
                           hours: int = 1,
                           min_query_time: float = 1.0,
                           port: str = "3306") -> Dict:
        """
        获取MySQL慢查询日志
        :param hours: 查询最近多少小时的日志
        :param min_query_time: 最小查询时间（秒）
        :param port: MySQL端口
        :return: 查询结果
        """
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)

        query_conditions = [
            {"term": {"type": "mysql-slow"}},
            {"term": {"port": port}}
        ]

        fields = [
            "@timestamp",
            "message",
            "type",
            "port",
            "host",
            "path"
        ]

        return self.fetch_logs(
            index_pattern=f"mysql-{port}-slow-*",
            start_time=start_time,
            end_time=end_time,
            query_conditions=query_conditions,
            fields=fields
        )

    def get_mysql_error_logs(self,
                            hours: int = 24,
                            error_level: str = "ERROR",
                            port: str = "3306") -> Dict:
        """
        获取MySQL错误日志
        :param hours: 查询最近多少小时的日志
        :param error_level: 错误级别
        :param port: MySQL端口
        :return: 查询结果
        """
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)

        query_conditions = [
            {"term": {"type": "mysql-error"}},
            {"term": {"port": port}}
        ]

        fields = [
            "@timestamp",
            "message",
            "type",
            "port",
            "host",
            "path"
        ]

        return self.fetch_logs(
            index_pattern=f"mysql-{port}-error-*",
            start_time=start_time,
            end_time=end_time,
            query_conditions=query_conditions,
            fields=fields
        )

def format_log_results(response: Dict) -> None:
    """
    格式化并打印日志结果
    :param response: ES查询响应
    """
    if "error" in response:
        print(f"Error: {response['error']}")
        return

    hits = response.get("hits", {}).get("hits", [])
    total = response.get("hits", {}).get("total", {}).get("value", 0)
    
    print(f"找到 {total} 条记录")
    print("-" * 80)

    for hit in hits:
        source = hit["_source"]
        print(json.dumps(source, indent=2, ensure_ascii=False))
        print("-" * 80)

# 使用示例
if __name__ == "__main__":
    # 初始化日志获取器
    es_host = "http://82.156.146.51:9200"
    mysql_port = "3306"
    fetcher = ESLogFetcher(es_host)
    
    try:
        # 首先检查可用的索引
        print("\n可用的索引列表:")
        print("-" * 80)
        indices = fetcher.list_indices()
        for index in indices:
            print(index)
        print("-" * 80)

        # 测试0：直接查询索引内容（不带时间过滤）
        print("\n0. 直接查询索引内容:")
        print("-" * 80)
        direct_logs = fetcher.fetch_logs(
            index_pattern="mysql-3306-slow-2025.02.22",
            size=5
        )
        format_log_results(direct_logs)

        direct_error_logs = fetcher.fetch_logs(
            index_pattern="mysql-3306-error-2025.02.22",
            size=5
        )
        format_log_results(direct_error_logs)

        # 测试1：获取最近1小时的慢查询日志
        print("\n1. 获取最近1小时的慢查询日志:")
        print("-" * 80)
        slow_logs = fetcher.get_mysql_slow_logs(
            hours=1,
            port=mysql_port
        )
        format_log_results(slow_logs)

        # 测试2：获取最近24小时的错误日志
        print("\n2. 获取最近24小时的错误日志:")
        print("-" * 80)
        error_logs = fetcher.get_mysql_error_logs(
            hours=24,
            port=mysql_port
        )
        format_log_results(error_logs)

        # 测试3：自定义查询 - 包含特定关键词的错误日志
        print("\n3. 查询包含'timeout'的错误日志:")
        print("-" * 80)
        timeout_logs = fetcher.fetch_logs(
            index_pattern=f"mysql-{mysql_port}-error-*",
            query_conditions=[
                {"term": {"type": "mysql-error"}},
                {"match": {"message": "timeout"}}
            ],
            fields=["@timestamp", "message", "type", "port", "host"],
            size=5
        )
        format_log_results(timeout_logs)

        # 测试4：自定义查询 - 包含特定关键词的慢查询
        print("\n4. 查询包含'SELECT'的慢查询:")
        print("-" * 80)
        select_logs = fetcher.fetch_logs(
            index_pattern=f"mysql-{mysql_port}-slow-*",
            query_conditions=[
                {"term": {"type": "mysql-slow"}},
                {"match": {"message": "SELECT"}}
            ],
            fields=["@timestamp", "message", "type", "port", "host"],
            size=5
        )
        format_log_results(select_logs)

    except Exception as e:
        print(f"执行测试时发生错误: {str(e)}")
