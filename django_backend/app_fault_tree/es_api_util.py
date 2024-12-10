import requests
import json
from datetime import datetime, timedelta
import time
from typing import Dict, Any, Optional, List

class ESClient:
    def __init__(self, host: str = 'localhost', port: int = 9200):
        """初始化ES客户端"""
        self.base_url = f"http://{host}:{port}"
        self.session = requests.Session()
        self.test_connection()

    def test_connection(self):
        """测试ES连接"""
        try:
            response = self.session.get(self.base_url)
            if response.status_code == 200:
                print("Connected to Elasticsearch successfully")
            else:
                raise ConnectionError(f"Failed to connect: {response.text}")
        except Exception as e:
            print(f"Connection error: {str(e)}")
            raise

    def get_metrics(
        self,
        index: str,
        host_ip: str,
        metric_name: str,
        time_from: Optional[int] = None,
        time_till: Optional[int] = None,
        size: int = 100
    ) -> Dict[str, Any]:
        """
        获取指定主机的指标数据
        Args:
            index: 索引名称
            host_ip: 主机IP
            metric_name: 指标名称
            time_from: 开始时间戳（毫秒）
            time_till: 结束时间戳（毫秒）
            size: 返回结果数量
        """
        try:
            # 构建查询体
            query = {
                "bool": {
                    "must": [
                        {"term": {"host.ip": host_ip}},
                        {"term": {"metric.name": metric_name}}
                    ]
                }
            }

            # 添加时间范围过滤
            if time_from or time_till:
                time_range = {}
                if time_from:
                    time_range["gte"] = time_from
                if time_till:
                    time_range["lte"] = time_till
                
                query["bool"]["must"].append({
                    "range": {"@timestamp": time_range}
                })

            body = {
                "query": query,
                "size": size,
                "sort": [{"@timestamp": {"order": "desc"}}]
            }

            # 发送请求
            response = self.session.post(
                f"{self.base_url}/{index}/_search",
                json=body
            )
            
            if response.status_code != 200:
                return {
                    "status": "error",
                    "msg": f"Search failed: {response.text}",
                    "data": None
                }

            result = response.json()
            hits = result.get("hits", {}).get("hits", [])
            
            return {
                "status": "success",
                "msg": "Data retrieved successfully",
                "total": result.get("hits", {}).get("total", {}).get("value", 0),
                "data": [hit["_source"] for hit in hits]
            }

        except Exception as e:
            return {
                "status": "error",
                "msg": str(e),
                "data": None
            }

def get_es_metrics(
    index: str,
    host_ip: str,
    metric_name: str,
    time_from: Optional[int] = None,
    time_till: Optional[int] = None,
    size: int = 100
) -> Dict[str, Any]:
    """
    获取ES指标的封装方法
    Args:
        index: 索引名称
        host_ip: 主机IP
        metric_name: 指标名称
        time_from: 开始时间戳（毫秒）
        time_till: 结束时间戳（毫秒）
        size: 返回结果数量
    """
    client = ESClient()
    return client.get_metrics(index, host_ip, metric_name, time_from, time_till, size)

# 使用示例
if __name__ == "__main__":
    # 获取最近一小时的数据
    current_time = int(time.time() * 1000)  # 当前时间（毫秒）
    one_hour_ago = current_time - (60 * 60 * 1000)  # 一小时前
    
    result = get_es_metrics(
        index="metrics-*",
        host_ip="192.168.1.100",
        metric_name="cpu.usage",
        time_from=one_hour_ago,
        time_till=current_time,
        size=100
    )
    print(json.dumps(result, indent=2))

    # 获取最新数据
    result = get_es_metrics(
        index="metrics-*",
        host_ip="192.168.1.100",
        metric_name="memory.usage",
        size=1  # 只获取最新一条
    )
    print(json.dumps(result, indent=2))