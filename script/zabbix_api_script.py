#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Zabbix API 公共方法模块
用于获取监控数据

## 主要功能
- 支持通过IP地址或主机名查询监控数据
- 支持灵活的时间单位（s/m/h/d/w）
- 支持标准字符串时间格式（YYYY-MM-DD HH:MM:SS）
- 获取历史数据、问题列表、Top N统计

## 基本用法

### 1. 创建客户端
```python
from zabbix_api_script import create_zabbix_client

# 创建Zabbix客户端
zabbix = create_zabbix_client(
    url="http://your-zabbix-server/zabbix",
    username="Admin", 
    password="zabbix"
)
```

### 2. 时间单位支持
```python
# 支持多种时间单位
data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_back="2h"      # 最近2小时
)

# 其他时间单位示例
time_back="30s"     # 30秒
time_back="15m"     # 15分钟  
time_back="6h"      # 6小时
time_back="7d"      # 7天
time_back="2w"      # 2周
time_back="1.5h"    # 1.5小时
```

### 3. 字符串时间格式
```python
# 使用标准字符串时间格式
data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_from="2025-06-12 09:00:00",
    time_till="2025-06-12 17:00:00"
)
```

### 4. 主机识别（IP地址或主机名）
```python
# 通过主机名查询
data = zabbix.get_monitoring_data(
    host_identifiers=["zabbix_server", "web_server"],
    item_keys=["vm.memory.util"]
)

# 通过IP地址查询
data = zabbix.get_monitoring_data(
    host_identifiers=["192.168.1.100", "10.0.0.50"],
    item_keys=["system.cpu.util"]
)

# 混合查询
data = zabbix.get_monitoring_data(
    host_identifiers=["server1", "192.168.1.100"],
    item_keys=["system.cpu.util"]
)
```

### 5. Top N 统计
```python
# 获取CPU使用率Top 10主机
top_hosts = zabbix.get_top_hosts_by_metric(
    item_key="system.cpu.util",
    limit=10,
    hours_back=1
)

# 获取内存使用率Top 10 IP
top_ips = zabbix.get_top_ips_by_metric(
    item_key="vm.memory.util", 
    limit=10,
    hours_back=2
)
```

### 6. 完整示例
```python
# 获取综合监控数据
data = zabbix.get_monitoring_data(
    host_identifiers=["web_server", "192.168.1.100"],
    item_keys=["system.cpu.util", "vm.memory.util"],
    time_back="4h",
    limit=500
)

# 处理返回结果
if "error" not in data:
    print(f"查询到 {len(data['hosts'])} 台主机")
    print(f"获取 {len(data['history'])} 条历史数据")
    print(f"发现 {len(data['problems'])} 个问题")
    
    # 查询信息
    query_info = data['query_info']
    print(f"时间范围: {query_info['time_range_hours']}小时")
    print(f"数据条数: {query_info['history_count']}")
else:
    print(f"查询失败: {data['error']}")

# 记得登出
zabbix.logout()
```

## 参数说明
- host_identifiers: 主机标识列表（IP地址或主机名）
- item_keys: 监控项key列表
- time_from: 开始时间（datetime对象或"YYYY-MM-DD HH:MM:SS"格式字符串）
- time_till: 结束时间（datetime对象或"YYYY-MM-DD HH:MM:SS"格式字符串）
- time_back: 时间回溯（支持s/m/h/d/w单位，如"2h", "30m", "7d"）
- limit: 历史数据条数限制

## 时间参数优先级
1. time_from + time_till（具体时间范围）
2. time_back（相对时间回溯）
3. 默认最近1小时
"""

import json
import requests
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ZabbixAPI:
    """Zabbix API 客户端类"""
    
    def __init__(self, url: str, username: str, password: str):
        """
        初始化Zabbix API客户端
        
        Args:
            url: Zabbix服务器URL
            username: 用户名
            password: 密码
        """
        self.url = url.rstrip('/') + '/api_jsonrpc.php'
        self.username = username
        self.password = password
        self.auth_token = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json-rpc',
            'User-Agent': 'Zabbix API Client'
        })
        
    def _make_request(self, method: str, params: Dict = None) -> Dict:
        """
        发送API请求
        
        Args:
            method: API方法名
            params: 请求参数
            
        Returns:
            API响应数据
        """
        request_data = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": 1
        }
        
        if self.auth_token and method != "user.login":
            request_data["auth"] = self.auth_token
            
        try:
            response = self.session.post(self.url, json=request_data, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            if "error" in result:
                raise Exception(f"Zabbix API Error: {result['error']}")
                
            return result.get("result", {})
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            raise
            
    def login(self) -> bool:
        """
        登录到Zabbix
        
        Returns:
            登录是否成功
        """
        try:
            result = self._make_request("user.login", {
                "user": self.username,
                "password": self.password
            })
            
            self.auth_token = result
            logger.info("Successfully logged in to Zabbix")
            return True
            
        except Exception as e:
            logger.error(f"Login failed: {e}")
            return False
            
    def logout(self) -> bool:
        """
        登出Zabbix
        
        Returns:
            登出是否成功
        """
        try:
            if self.auth_token:
                self._make_request("user.logout")
                self.auth_token = None
                logger.info("Successfully logged out from Zabbix")
            return True
            
        except Exception as e:
            logger.error(f"Logout failed: {e}")
            return False
            
    def get_hosts(self, group_names: List[str] = None, host_names: List[str] = None) -> List[Dict]:
        """
        获取主机列表
        
        Args:
            group_names: 主机组名称列表
            host_names: 主机名称列表
            
        Returns:
            主机信息列表
        """
        params = {
            "output": ["hostid", "host", "name", "status"],
            "selectGroups": ["groupid", "name"],
            "selectInterfaces": ["interfaceid", "ip", "dns", "port"]
        }
        
        if group_names:
            params["filter"] = {"groups": group_names}
        if host_names:
            params["filter"] = params.get("filter", {})
            params["filter"]["host"] = host_names
            
        return self._make_request("host.get", params)
        
    def get_items(self, host_ids: List[str] = None, item_keys: List[str] = None) -> List[Dict]:
        """
        获取监控项列表
        
        Args:
            host_ids: 主机ID列表
            item_keys: 监控项key列表
            
        Returns:
            监控项信息列表
        """
        params = {
            "output": ["itemid", "name", "key_", "hostid", "status", "value_type", "units"],
            "selectHosts": ["hostid", "host", "name"]
        }
        
        if host_ids:
            params["hostids"] = host_ids
        if item_keys:
            params["filter"] = {"key_": item_keys}
            
        return self._make_request("item.get", params)
        
    def get_history(self, item_ids: List[str], time_from: datetime = None, 
                   time_till: datetime = None, limit: int = 1000) -> List[Dict]:
        """
        获取历史数据
        
        Args:
            item_ids: 监控项ID列表
            time_from: 开始时间
            time_till: 结束时间
            limit: 数据条数限制
            
        Returns:
            历史数据列表
        """
        if not time_from:
            time_from = datetime.now() - timedelta(hours=1)
        if not time_till:
            time_till = datetime.now()
            
        params = {
            "output": "extend",
            "itemids": item_ids,
            "time_from": int(time_from.timestamp()),
            "time_till": int(time_till.timestamp()),
            "sortfield": "clock",
            "sortorder": "DESC",
            "limit": limit
        }
        
        return self._make_request("history.get", params)
        
    def get_trends(self, item_ids: List[str], time_from: datetime = None,
                  time_till: datetime = None) -> List[Dict]:
        """
        获取趋势数据
        
        Args:
            item_ids: 监控项ID列表
            time_from: 开始时间
            time_till: 结束时间
            
        Returns:
            趋势数据列表
        """
        if not time_from:
            time_from = datetime.now() - timedelta(days=1)
        if not time_till:
            time_till = datetime.now()
            
        params = {
            "output": "extend",
            "itemids": item_ids,
            "time_from": int(time_from.timestamp()),
            "time_till": int(time_till.timestamp()),
            "sortfield": "clock",
            "sortorder": "DESC"
        }
        
        return self._make_request("trend.get", params)
        
    def get_problems(self, host_ids: List[str] = None, severity: int = None) -> List[Dict]:
        """
        获取问题列表
        
        Args:
            host_ids: 主机ID列表
            severity: 严重程度 (0-5)
            
        Returns:
            问题列表
        """
        params = {
            "output": "extend",
            "selectAcknowledges": "extend",
            "selectTags": "extend",
            "recent": "true",
            "sortfield": ["eventid"],
            "sortorder": "DESC"
        }
        
        if host_ids:
            params["hostids"] = host_ids
        if severity is not None:
            params["severities"] = [severity]
            
        return self._make_request("problem.get", params)
        
    def get_top_hosts_by_metric(self, item_key: str, limit: int = 10, 
                               hours_back: int = 1) -> List[Dict]:
        """
        获取某个指标的Top N主机
        
        Args:
            item_key: 监控项key (如 'system.cpu.util', 'vm.memory.util')
            limit: 返回主机数量限制
            hours_back: 获取多少小时前的数据
            
        Returns:
            按指标值排序的主机列表
        """
        try:
            # 获取所有主机
            hosts = self.get_hosts()
            if not hosts:
                return []
                
            host_ids = [host["hostid"] for host in hosts]
            
            # 获取指定监控项
            items = self.get_items(host_ids=host_ids, item_keys=[item_key])
            if not items:
                return []
                
            # 获取历史数据
            item_ids = [item["itemid"] for item in items]
            time_from = datetime.now() - timedelta(hours=hours_back)
            history_data = self.get_history(item_ids, time_from=time_from, limit=1000)
            
            # 按主机聚合数据并计算平均值
            host_metrics = {}
            for record in history_data:
                item_id = record.get("itemid")
                value = float(record.get("value", 0))
                
                # 找到对应的主机信息
                item_info = next((item for item in items if item["itemid"] == item_id), None)
                if not item_info:
                    continue
                    
                host_id = item_info["hostid"]
                host_info = next((host for host in hosts if host["hostid"] == host_id), None)
                if not host_info:
                    continue
                    
                host_key = f"{host_info['host']}_{host_info['name']}"
                
                if host_key not in host_metrics:
                    host_metrics[host_key] = {
                        "host_id": host_id,
                        "host_name": host_info["host"],
                        "display_name": host_info["name"],
                        "ip": self._get_host_ip(host_info),
                        "item_key": item_key,
                        "item_name": item_info["name"],
                        "values": [],
                        "avg_value": 0,
                        "max_value": 0,
                        "min_value": float('inf')
                    }
                
                host_metrics[host_key]["values"].append(value)
                host_metrics[host_key]["max_value"] = max(host_metrics[host_key]["max_value"], value)
                host_metrics[host_key]["min_value"] = min(host_metrics[host_key]["min_value"], value)
            
            # 计算平均值
            for host_key in host_metrics:
                values = host_metrics[host_key]["values"]
                if values:
                    host_metrics[host_key]["avg_value"] = sum(values) / len(values)
                    host_metrics[host_key]["data_points"] = len(values)
                else:
                    host_metrics[host_key]["avg_value"] = 0
                    host_metrics[host_key]["data_points"] = 0
                    
                # 清理values数组以节省内存
                del host_metrics[host_key]["values"]
            
            # 按平均值排序并返回Top N
            sorted_hosts = sorted(
                host_metrics.values(), 
                key=lambda x: x["avg_value"], 
                reverse=True
            )
            
            return sorted_hosts[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get top hosts by metric: {e}")
            return []
            
    def _get_host_ip(self, host_info: Dict) -> str:
        """
        获取主机IP地址
        
        Args:
            host_info: 主机信息
            
        Returns:
            主机IP地址
        """
        interfaces = host_info.get("interfaces", [])
        if interfaces:
            # 优先返回IP地址，其次返回DNS名称
            for interface in interfaces:
                ip = interface.get("ip", "")
                if ip and ip != "0.0.0.0":
                    return ip
                dns = interface.get("dns", "")
                if dns:
                    return dns
        return "Unknown"
        
    def get_top_ips_by_metric(self, item_key: str, limit: int = 10, 
                             hours_back: int = 1) -> List[Dict]:
        """
        获取某个指标的Top N IP地址
        
        Args:
            item_key: 监控项key
            limit: 返回IP数量限制
            hours_back: 获取多少小时前的数据
            
        Returns:
            按指标值排序的IP列表
        """
        top_hosts = self.get_top_hosts_by_metric(item_key, limit, hours_back)
        
        # 转换为IP格式的结果
        top_ips = []
        for host in top_hosts:
            top_ips.append({
                "ip": host["ip"],
                "host_name": host["host_name"],
                "display_name": host["display_name"],
                "metric_name": host["item_name"],
                "metric_key": host["item_key"],
                "avg_value": round(host["avg_value"], 2),
                "max_value": round(host["max_value"], 2),
                "min_value": round(host["min_value"], 2),
                "data_points": host["data_points"]
            })
            
        return top_ips

    def _is_ip_address(self, identifier: str) -> bool:
        """
        判断字符串是否为IP地址
        
        Args:
            identifier: 待判断的字符串
            
        Returns:
            True if IP地址, False if 主机名
        """
        import re
        # IPv4地址正则表达式
        ipv4_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
        # IPv6地址正则表达式（简化版）
        ipv6_pattern = r'^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$'
        
        return bool(re.match(ipv4_pattern, identifier) or re.match(ipv6_pattern, identifier))

    def get_hosts_by_ip_or_name(self, identifiers: List[str] = None) -> List[Dict]:
        """
        通过IP地址或主机名获取主机列表（自动识别类型）
        
        Args:
            identifiers: IP地址或主机名列表
            
        Returns:
            主机信息列表
        """
        if not identifiers:
            return self.get_hosts()
            
        # 分离IP地址和主机名
        ip_addresses = []
        host_names = []
        
        for identifier in identifiers:
            if self._is_ip_address(identifier):
                ip_addresses.append(identifier)
                logger.info(f"识别为IP地址: {identifier}")
            else:
                host_names.append(identifier)
                logger.info(f"识别为主机名: {identifier}")
        
        matched_hosts = []
        
        # 如果有主机名，直接通过API查询（更高效）
        if host_names:
            logger.info(f"通过主机名查询: {host_names}")
            hosts_by_name = self.get_hosts(host_names=host_names)
            matched_hosts.extend(hosts_by_name)
        
        # 如果有IP地址，需要获取所有主机然后匹配IP
        if ip_addresses:
            logger.info(f"通过IP地址查询: {ip_addresses}")
            all_hosts = self.get_hosts()
            
            for host in all_hosts:
                host_ip = self._get_host_ip(host)
                if host_ip in ip_addresses:
                    matched_hosts.append(host)
                    logger.info(f"IP {host_ip} 匹配到主机: {host.get('host', 'Unknown')}")
        
        # 去重（避免同一主机被多次添加）
        unique_hosts = []
        seen_host_ids = set()
        for host in matched_hosts:
            if host['hostid'] not in seen_host_ids:
                unique_hosts.append(host)
                seen_host_ids.add(host['hostid'])
                
        logger.info(f"最终匹配到 {len(unique_hosts)} 台主机")
        return unique_hosts

    def _parse_time_back(self, time_back: str) -> timedelta:
        """
        解析时间回溯参数，支持多种时间单位
        
        Args:
            time_back: 时间回溯字符串，格式如 "2h", "30m", "7d", "1w"
            
        Returns:
            timedelta对象
        """
        import re
        
        if isinstance(time_back, (int, float)):
            # 兼容旧的数字格式，默认为小时
            return timedelta(hours=time_back)
        
        if not isinstance(time_back, str):
            raise ValueError("time_back must be a string or number")
        
        # 正则表达式匹配数字和单位
        pattern = r'^(\d+(?:\.\d+)?)\s*([smhdw]?)$'
        match = re.match(pattern, time_back.lower().strip())
        
        if not match:
            raise ValueError(f"Invalid time_back format: {time_back}. Use format like '2h', '30m', '7d', '1w'")
        
        value = float(match.group(1))
        unit = match.group(2) or 'h'  # 默认单位为小时
        
        unit_mapping = {
            's': 'seconds',      # 秒
            'm': 'minutes',      # 分钟
            'h': 'hours',        # 小时
            'd': 'days',         # 天
            'w': 'weeks'         # 周
        }
        
        if unit not in unit_mapping:
            raise ValueError(f"Unsupported time unit: {unit}. Supported units: s, m, h, d, w")
        
        kwargs = {unit_mapping[unit]: value}
        return timedelta(**kwargs)

    def _parse_datetime(self, dt_input) -> datetime:
        """
        解析时间输入，支持datetime对象和标准字符串格式
        
        Args:
            dt_input: datetime对象或时间字符串（格式：YYYY-MM-DD HH:MM:SS）
            
        Returns:
            datetime对象
        """
        if dt_input is None:
            return None
            
        if isinstance(dt_input, datetime):
            return dt_input
            
        if isinstance(dt_input, str):
            # 只支持标准格式：YYYY-MM-DD HH:MM:SS
            try:
                parsed_dt = datetime.strptime(dt_input.strip(), "%Y-%m-%d %H:%M:%S")
                logger.info(f"成功解析时间字符串 '{dt_input}' -> {parsed_dt}")
                return parsed_dt
            except ValueError:
                raise ValueError(f"时间字符串格式错误: '{dt_input}'. 请使用格式: 'YYYY-MM-DD HH:MM:SS'，例如: '2025-06-12 09:00:00'")
        
        raise ValueError(f"时间参数类型不支持: {type(dt_input)}. 请使用datetime对象或字符串格式 'YYYY-MM-DD HH:MM:SS'")

    def get_monitoring_data(self, host_identifiers: List[str] = None, item_keys: List[str] = None,
                          time_from = None, time_till = None, 
                          time_back: str = None, limit: int = 1000) -> Dict[str, Any]:
        """
        获取综合监控数据（支持IP地址或主机名，支持灵活的时间范围）
        
        Args:
            host_identifiers: 主机标识列表（可以是IP地址或主机名）
            item_keys: 监控项key列表
            time_from: 开始时间（datetime对象或字符串格式"YYYY-MM-DD HH:MM:SS"）
            time_till: 结束时间（datetime对象或字符串格式"YYYY-MM-DD HH:MM:SS"）
            time_back: 时间回溯（支持多种单位：s秒/m分钟/h小时/d天/w周，如"2h", "30m", "7d"）
            limit: 历史数据条数限制
            
        Returns:
            综合监控数据
        """
        try:
            # 解析时间参数
            time_from_parsed = self._parse_datetime(time_from)
            time_till_parsed = self._parse_datetime(time_till)
            
            # 参数验证和时间处理
            if time_from_parsed and time_till_parsed and time_back:
                logger.warning("同时指定了time_from/time_till和time_back，将忽略time_back参数")
                time_back = None
            
            if not time_from_parsed and not time_till_parsed and not time_back:
                time_back = "1h"  # 默认获取最近1小时数据
                
            if time_back:
                time_delta = self._parse_time_back(time_back)
                time_till_parsed = datetime.now()
                time_from_parsed = time_till_parsed - time_delta
                logger.info(f"使用time_back参数: 获取最近{time_back}的数据")
            elif time_from_parsed and not time_till_parsed:
                time_till_parsed = datetime.now()
                logger.info(f"未指定结束时间，使用当前时间: {time_till_parsed}")
            elif time_till_parsed and not time_from_parsed:
                time_from_parsed = time_till_parsed - timedelta(hours=1)
                logger.info(f"未指定开始时间，默认获取结束时间前1小时的数据")
                
            # 计算时间范围
            time_range_seconds = (time_till_parsed - time_from_parsed).total_seconds()
            time_range_hours = time_range_seconds / 3600
            logger.info(f"查询时间范围: {time_from_parsed} 到 {time_till_parsed} (共{time_range_hours:.1f}小时)")
            
            # 通过IP地址或主机名获取主机信息
            hosts = self.get_hosts_by_ip_or_name(host_identifiers)
            if not hosts:
                return {"error": "No hosts found"}
                
            host_ids = [host["hostid"] for host in hosts]
            
            # 获取监控项
            items = self.get_items(host_ids=host_ids, item_keys=item_keys)
            if not items:
                return {"error": "No items found"}
                
            item_ids = [item["itemid"] for item in items]
            
            # 获取历史数据
            history_data = self.get_history(item_ids, time_from=time_from_parsed, time_till=time_till_parsed, limit=limit)
            
            # 获取问题（仅获取当前问题，不受时间范围限制）
            problems = self.get_problems(host_ids=host_ids)
            
            # 构建返回结果
            result = {
                "hosts": hosts,
                "items": items,
                "history": history_data,
                "problems": problems,
                "query_info": {
                    "time_from": time_from_parsed.isoformat(),
                    "time_till": time_till_parsed.isoformat(),
                    "time_range_hours": round(time_range_hours, 2),
                    "time_range_seconds": int(time_range_seconds),
                    "history_count": len(history_data),
                    "limit": limit,
                    "time_back_used": time_back if time_back else None,
                    "time_from_input": str(time_from) if time_from else None,
                    "time_till_input": str(time_till) if time_till else None
                },
                "timestamp": datetime.now().isoformat()
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get monitoring data: {e}")
            return {"error": str(e)}


def create_zabbix_client(url: str, username: str, password: str) -> ZabbixAPI:
    """
    创建Zabbix API客户端
    
    Args:
        url: Zabbix服务器URL
        username: 用户名
        password: 密码
        
    Returns:
        ZabbixAPI客户端实例
    """
    client = ZabbixAPI(url, username, password)
    if client.login():
        return client
    else:
        raise Exception("Failed to login to Zabbix")


# 简单测试示例
if __name__ == "__main__":
    """
    简单的功能测试，验证API是否正常工作
    详细用法请参考上面的文档注释
    """
    # 配置信息
    ZABBIX_URL = "http://82.156.146.51/zabbix"
    USERNAME = "Admin"
    PASSWORD = "zabbix"
    
    try:
        # 创建客户端并测试连接
        zabbix = create_zabbix_client(ZABBIX_URL, USERNAME, PASSWORD)
        
        # 简单测试：获取最近1小时的内存数据
        data = zabbix.get_monitoring_data(
            host_identifiers=["zabbix_server"],
            item_keys=["vm.memory.size[available]"],
            time_back="1h",
            limit=5
        )
        
        # 检查结果
        if "error" not in data:
            query_info = data.get('query_info', {})
            print(f"✅ API测试成功")
            print(f"   主机数量: {len(data.get('hosts', []))}")
            print(f"   数据条数: {query_info.get('history_count', 0)}")
            print(f"   时间范围: {query_info.get('time_range_hours', 0):.1f}小时")
        else:
            print(f"❌ API测试失败: {data['error']}")
        
        # 登出
        zabbix.logout()
        
    except Exception as e:
        logger.error(f"❌ 测试异常: {e}")
