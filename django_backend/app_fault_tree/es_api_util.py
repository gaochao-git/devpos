import requests
import json

ES_SERVER_URL = "http://82.156.146.51:9200"
INDEX_PATTEN_SLOW_LOG = "mysql-slow*"
INDEX_PATTEN_ERROR_LOG = "mysql-error*"
ENV = 'chinax'

class ESLogFetcher:
    def __init__(self, hosts='http://localhost:9200'):
        """
        初始化 ES 连接
        :param hosts: ES 主机地址
        """
        self.base_url = hosts.rstrip('/')
        self.headers = {'Content-Type': 'application/json', 'kbn-xsrf': '1'}

    def fetch_logs(self, index_pattern, query_conditions=None, size=100, sort_field="@timestamp", sort_order="desc"):
        """
        基础查询方法
        :param index_pattern: ES索引模式
        :param query_conditions: 过滤条件,[]
        :param size: 返回的记录数量
        :param sort_field: 排序字段
        :param sort_order: 排序顺序
        """
        # 构建查询体
        if query_conditions:
            # 处理查询条件列表
            must_conditions = []
            
            for condition in query_conditions:
                field = condition.get("field")
                operator = condition.get("operator")
                value = condition.get("value")

                if not all([field, operator, value]):
                    continue

                # 特殊处理时间字段
                if field == "@timestamp" or field == "timestamp":
                    if operator == "between":
                        must_conditions.append({
                            "range": {
                                "@timestamp": {
                                    "gte": value.get("min").replace(" ", "T") + "Z",
                                    "lte": value.get("max").replace(" ", "T") + "Z"
                                }
                            }
                        })
                    continue

                # 处理其他字段
                if operator == "in":
                    must_conditions.append({
                        "terms": {
                            field: value
                        }
                    })
                elif operator == "between":
                    must_conditions.append({
                        "range": {
                            field: {
                                "gte": value.get("min"),
                                "lte": value.get("max")
                            }
                        }
                    })
                else:
                    # 处理其他操作符（=, >, <, etc.）
                    must_conditions.append({
                        "match": {
                            field: value
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
            print(url)
            print(query_body)
            response = requests.post(url, headers=self.headers, json=query_body)
            print(response.json())
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    # def get_mysql_slow_logs(self, size=100, query_conditions=None):
    #     """
    #     获取MySQL慢查询日志
    #     :param size: 返回的记录数量
    #     :param query_conditions: 过滤条件，例如：
    #         {
    #             "user": "specific-user",
    #             "host": "specific-host",
    #             "time_range": {
    #                 "start": "2024-01-01",
    #                 "end": "2024-01-02"
    #             }
    #         }
    #     """
    #     return self.fetch_logs(
    #         index_pattern=INDEX_PATTEN_SLOW_LOG,
    #         query_conditions=query_conditions,
    #         size=size
    #     )

    # def get_mysql_error_logs(self, size=100, query_conditions=None):
    #     """
    #     获取MySQL错误日志
    #     :param size: 返回的记录数量
    #     :param query_conditions: 过滤条件，例如：
    #         {
    #             "level": "Error",
    #             "host": "specific-host",
    #             "time_range": {
    #                 "start": "2024-01-01",
    #                 "end": "2024-01-02"
    #             }
    #         }
    #     """
    #     return self.fetch_logs(
    #         index_pattern=INDEX_PATTEN_ERROR_LOG,
    #         query_conditions=query_conditions,
    #         size=size
    #     )

    def get_index_fields(self, index_pattern):
        """
        获取索引的字段映射信息
        :param index_pattern: ES索引模式
        :return: 字段列表，每个字段包含名称、类型和描述
        """
        try:
            url = f"{self.base_url}/{index_pattern}/_mapping"
            response = requests.get(url, headers=self.headers)
            mapping = response.json()
            
            fields = []
            if mapping:
                # 获取第一个索引的映射信息
                first_index = list(mapping.keys())[0]
                if ENV == 'china':  # 解决'slowlog.ip'、'error.ip'这种字段命名,及maping路径不一样问题
                    PROPERTY_MAP = {INDEX_PATTEN_SLOW_LOG: "mysqlerror", INDEX_PATTEN_ERROR_LOG: "mysqlslow"}
                    property_name = PROPERTY_MAP.get(index_pattern)
                    properties = mapping[first_index]['mappings'].get(property_name, {}).get('properties', {})
                    for field_name, field_info in properties.items():
                        field_type = field_info.get('type', 'unknown')
                        # 处理特殊字段
                        if field_name in ["error", "slowlog"]:
                            for field_name_sub, field_info_sub in field_info.get('properties', {}).items():
                                field_type_sub = field_info_sub.get('type', 'unknown')
                                fields.append({
                                    'field': f"{field_name}.{field_name_sub}",
                                    'type': field_type_sub,
                                    'description': ''
                                })
                        fields.append({
                            'field': field_name,
                            'type': field_type,
                            'description': field_name
                        })
                else: # 标准字段命名
                    properties = mapping[first_index]['mappings'].get('properties', {})
                    for field_name, field_info in properties.items():
                        field_type = field_info.get('type', 'unknown')
                        fields.append({
                            'field': field_name,
                            'type': field_type,
                            'description': field_name
                        })
            return fields
        except Exception as e:
            print(f"获取索引字段映射失败: {str(e)}")
            return []

def format_logs(logs):
    """
    返回慢查询日志source列表
    """
    if "error" in logs:
        return []
    
    hits = logs.get("hits", {}).get("hits", [])
    return [hit["_source"] for hit in hits]


def get_es_metrics(host_ip, index_pattern, query_conditions=None, size=100):
    """
    获取ES指标的封装方法
    """
    print(host_ip, index_pattern, query_conditions, size)
    fetcher = ESLogFetcher(ES_SERVER_URL)
    return fetcher.fetch_logs(index_pattern, size=size, query_conditions=query_conditions)
    # if index_pattern == "mysql-slow*":
    #     return fetcher.get_mysql_slow_logs(size=size, query_conditions=query_conditions)
    # elif index_pattern == "mysql-error*":
    #     return fetcher.get_mysql_error_logs(size=size, query_conditions=query_conditions)

def get_es_index_fields(index_pattern):
    """
    获取ES索引字段的封装方法
    :param index_pattern: 索引模式
    :return: 字段列表
    """
    fetcher = ESLogFetcher(ES_SERVER_URL)
    return fetcher.get_index_fields(index_pattern)

# 使用示例
if __name__ == "__main__":
    fetcher = ESLogFetcher(ES_SERVER_URL)
    
    print("===================== 示例1：查询最近的慢查询日志 =====================")
    slow_logs = fetcher.get_mysql_slow_logs(size=2)
    slow_list = format_logs(slow_logs)
    print("\n慢查询日志数据:")
    print(json.dumps(slow_list, indent=2, ensure_ascii=False))
    print(f"获取到 {len(slow_list)} 条慢查询记录")
    
    print("\n===================== 示例2：查询最近的错误日志 =====================")
    error_logs = fetcher.get_mysql_error_logs(size=2)
    error_list = format_logs(error_logs)
    print("\n错误日志数据:")
    print(json.dumps(error_list, indent=2, ensure_ascii=False))
    print(f"获取到 {len(error_list)} 条错误记录")

    print("\n===================== 示例3：查询指定时间范围和IP的日志 =====================")
    query_conditions = {
        "time_range": {
            "start": "2025-02-23 01:00:00",
            "end": "2025-02-23 11:00:00"
        },
        "ip": "82.156.146.51"
    }
    
    print("\n指定条件的错误日志:")
    error_logs = fetcher.get_mysql_error_logs(size=2, query_conditions=query_conditions)
    error_list = format_logs(error_logs)
    print(json.dumps(error_list, indent=2, ensure_ascii=False))
    print(f"获取到 {len(error_list)} 条错误记录")
    
    print("\n指定条件的慢查询日志:")
    slow_logs = fetcher.get_mysql_slow_logs(size=2, query_conditions=query_conditions)
    slow_list = format_logs(slow_logs)
    print(json.dumps(slow_list, indent=2, ensure_ascii=False))
    print(f"获取到 {len(slow_list)} 条慢查询记录")
    
    print("\n===================== 示例结束 =====================")
