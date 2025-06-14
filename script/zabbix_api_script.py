#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Zabbix API 公共方法模块
用于获取监控数据

## 主要功能
- 支持通过IP地址查询监控数据
- 支持灵活的时间单位（s/m/h/d/w）
- 支持标准字符串时间格式（YYYY-MM-DD HH:MM:SS）
- 获取历史数据、问题列表、Top N统计

## 基本用法

### 1. 创建客户端
```python
from zabbix_api_script import create_zabbix_client
# 创建Zabbix客户端
zabbix = create_zabbix_client(url="http://192.168.1.100/zabbix", username="Admin", password="zabbix")
# 创建带超时设置的Zabbix客户端（10秒超时）
zabbix = create_zabbix_client(url="http://192.168.1.100/zabbix", username="Admin", password="zabbix", timeout=10)
```

### 2. 获取所有主机
```python
hosts = zabbix.get_hosts()
print(hosts)
```

### 3. 获取指定IP的主机
```python
hosts = zabbix.get_hosts(ip_addresses=["127.0.0.1"])
print(hosts)
```

### 4. 获取指定主机的监控项
```python
items = zabbix.get_items(host_ips=["127.0.0.1"])
print(items)
```

### 5. 获取监控项的历史数据
```python
if items:
    item_ids = [item["itemid"] for item in items]
    history = zabbix.get_history(host_ips=None, item_keys=["system.cpu.util[,user]"], time_back="1h")
    print(history)
```

### 6. 获取主机当前问题
```python
problems = zabbix.get_problems(host_ips=["127.0.0.1"])
print(problems)
```

### 7. 获取指定监控项的Top N IP
```python
top_ips = zabbix.get_top_ips_by_metric(item_key="system.cpu.util[,user]", limit=5, time_back="1h")
print(top_ips)
```

## 参数说明
- ip_addresses: 主机IP地址列表
- host_ips: 主机IP地址列表（用于 get_items/get_problems）
- item_keys: 监控项key列表
- item_ids: 监控项ID列表
- time_from: 开始时间（datetime对象或"YYYY-MM-DD HH:MM:SS"格式字符串）
- time_till: 结束时间（datetime对象或"YYYY-MM-DD HH:MM:SS"格式字符串）
- time_back: 时间回溯（支持s/m/h/d/w单位，如"2h", "30m", "7d"）
- limit: 历史数据条数限制

## 时间参数优先级
1. time_from + time_till（具体时间范围）
2. time_back（相对时间回溯）
3. 默认最近default_time_back时间范围数据
"""

import logging
from typing import Dict, List
from datetime import datetime, timedelta
from pyzabbix import ZabbixAPI as PyZabbixAPI, ZabbixAPIException

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 屏蔽 pyzabbix 库的 INFO 级别日志，避免打印过多无关信息
logging.getLogger("pyzabbix").setLevel(logging.WARNING)


class ZabbixAPI:
    """Zabbix API 客户端类"""
    
    def __init__(self, url: str, username: str, password: str, timeout: int = 30):
        """
        初始化Zabbix API客户端
        
        Args:
            url: Zabbix服务器URL
            username: 用户名
            password: 密码
            timeout: 请求超时时间（秒），默认30秒
        """
        self.url = url
        self.username = username
        self.password = password
        self.timeout = timeout
        self.zapi = None
        self.default_time_back = "5m"
        self.default_limit = 1000
        
    def login(self) -> bool:
        """
        登录到Zabbix
        
        Returns:
            登录是否成功
        """
        try:
            self.zapi = PyZabbixAPI(self.url, timeout=self.timeout)
            self.zapi.login(self.username, self.password)
            server_version = self.zapi.api_version()
            logger.info(f"Connected to Zabbix: {self.zapi.api_version()} (timeout: {self.timeout}s)")
            return True
        except ZabbixAPIException as e:
            logger.error(f"Login failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Connection failed (timeout or network error): {e}")
            return False
            
    def logout(self) -> bool:
        """
        登出Zabbix
        
        Returns:
            登出是否成功
        """
        try:
            if self.zapi:
                self.zapi.user.logout()
                self.zapi = None
                logger.info("Successfully logged out from Zabbix")
            return True
        except ZabbixAPIException as e:
            logger.error(f"Logout failed: {e}")
            return False
            
    def get_hosts(self, ip_addresses: List[str] = None) -> List[Dict]:
        """
        获取主机列表（仅支持IP地址）
        
        Args:
            ip_addresses: 主机IP地址列表
        Returns:
            主机信息列表
        """
        try:
            params = {
                "output": ["hostid", "host", "name", "status"],
                "selectGroups": ["groupid", "name"],
                "selectInterfaces": ["interfaceid", "ip", "dns", "port"]
            }
            all_hosts = self.zapi.host.get(**params)
            
            if not ip_addresses:
                return all_hosts
                
            matched_hosts = []
            for host in all_hosts:
                host_ip = self._get_host_ip(host)
                if host_ip in ip_addresses:
                    matched_hosts.append(host)
            return matched_hosts
        except ZabbixAPIException as e:
            logger.error(f"Failed to get hosts: {e}")
            return []

    def get_items(self, host_ips: List[str] = None, item_keys: List[str] = None) -> List[Dict]:
        """
        获取监控项列表（仅支持IP地址）
        
        Args:
            host_ips: 主机IP地址列表
            item_keys: 监控项key列表
        Returns:
            监控项信息列表
        """
        try:
            host_ids = None
            if host_ips:
                hosts = self.get_hosts(ip_addresses=host_ips)
                host_ids = [host["hostid"] for host in hosts]
                
            params = {
                "output": ["itemid", "name", "key_", "hostid", "status", "value_type", "units"],
                "selectHosts": ["hostid", "host", "name"]
            }
            if host_ids:
                params["hostids"] = host_ids
            if item_keys:
                params["filter"] = {"key_": item_keys}
            return self.zapi.item.get(**params)
        except ZabbixAPIException as e:
            logger.error(f"Failed to get items: {e}")
            return []
        
    def _resolve_time_range(self, time_from=None, time_till=None, time_back=None):
        """
        统一解析时间范围，返回 (time_from, time_till)
        """
        if not time_from and not time_till and not time_back:
            time_back = self.default_time_back
        if time_back:
            time_delta = self._parse_time_back(time_back)
            time_till = datetime.now()
            time_from = time_till - time_delta
        if not time_from:
            time_from = datetime.now() - timedelta(minutes=5)
        if not time_till:
            time_till = datetime.now()
        return time_from, time_till

    def get_history(self, host_ips: List[str], item_keys: List[str], time_from: datetime = None, time_till: datetime = None, time_back: str = None, limit: int = None) -> List[Dict]:
        """
        通过监控项key_获取历史数据（可选指定IP）
        
        Args:
            host_ips: 主机IP地址列表（可选）
            item_keys: 监控项key_列表
            time_from: 开始时间
            time_till: 结束时间
            time_back: 时间回溯（支持s/m/h/d/w单位，如"2h", "30m", "7d"）
            limit: 数据条数限制
        Returns:
            历史数据列表，每个元素包含：
            {
                "key": "监控项key",
                "time": "可读时间（YYYY-MM-DD HH:MM:SS）",
                "value": 监控值,
                "units": 单位
            }
        """
        try:
            items = self.get_items(host_ips=host_ips, item_keys=item_keys)
            item_ids = [item["itemid"] for item in items]
            if not item_ids:
                return []
                
            time_from, time_till = self._resolve_time_range(time_from, time_till, time_back)
            params = {
                "output": "extend",
                "itemids": item_ids,
                "time_from": int(time_from.timestamp()),
                "time_till": int(time_till.timestamp()),
                "sortfield": "clock",
                "sortorder": "ASC",  # 正序
                "limit": limit
            }
            raw_data = self.zapi.history.get(**params)
            
            # 创建itemid到key和单位的映射
            item_key_map = {item["itemid"]: item["key_"] for item in items}
            item_units_map = {item["itemid"]: item.get("units", "") for item in items}
            
            # 转换数据格式
            formatted_data = []
            for item in raw_data:
                formatted_data.append({
                    "key": item_key_map.get(item["itemid"], "unknown"),
                    "time": datetime.fromtimestamp(int(item["clock"])).strftime("%Y-%m-%d %H:%M:%S"),
                    "value": float(item["value"]),
                    "units": item_units_map.get(item["itemid"], "")
                })
            return formatted_data
        except ZabbixAPIException as e:
            logger.error(f"Failed to get history: {e}")
            return []
        
    def get_problems(self, host_ips: List[str] = None, severity: int = None) -> List[Dict]:
        """
        获取问题列表（仅支持IP地址）
        Args:
            host_ips: 主机IP地址列表
            severity: 问题严重程度
        Returns:
            问题列表，每个问题增加'time'字段（可读时间）和'key_'字段（监控项key）
        """
        try:
            host_ids = None
            if host_ips:
                hosts = self.get_hosts(ip_addresses=host_ips)
                host_ids = [host["hostid"] for host in hosts]
                
            params = {}
            if host_ids:
                params["hostids"] = host_ids
            if severity is not None:
                params["severities"] = [severity]
                
            problems = self.zapi.problem.get(**params)
            
            # 增加可读时间字段
            for problem in problems:
                if "clock" in problem:
                    try:
                        problem["time"] = datetime.fromtimestamp(int(problem["clock"])).strftime("%Y-%m-%d %H:%M:%S")
                    except Exception:
                        problem["time"] = problem["clock"]
                        
                # 补充key_字段
                if problem.get("object") == "0":  # trigger
                    trigger_id = problem.get("objectid")
                    if trigger_id:
                        trigger_info = self.zapi.trigger.get(
                            triggerids=[trigger_id],
                            output=["expression"],
                            selectItems=["itemid", "key_"]
                        )
                        if trigger_info and len(trigger_info) > 0:
                            # 从trigger关联的items中获取key_
                            items = trigger_info[0].get("items", [])
                            if items:
                                problem["key_"] = items[0].get("key_", "unknown")
                            else:
                                problem["key_"] = "unknown"
                        else:
                            problem["key_"] = "unknown"
                    else:
                        problem["key_"] = "unknown"
                else:
                    problem["key_"] = "unknown"
            return problems
        except ZabbixAPIException as e:
            logger.error(f"Failed to get problems: {e}")
            return []
            
    def _get_host_ip(self, host_info: Dict) -> str:
        """
        从主机信息中获取IP地址
        
        Args:
            host_info: 主机信息字典
            
        Returns:
            IP地址
        """
        # 优先使用IP地址
        if "interfaces" in host_info and host_info["interfaces"]:
            for interface in host_info["interfaces"]:
                if "ip" in interface and interface["ip"]:
                    return interface["ip"]
                    
        # 如果没有IP地址，返回主机名
        return host_info.get("host", "")
        
    def get_top_ips_by_metric(self, item_key: str, limit: int = 10, ip_addresses: List[str] = None, time_from: datetime = None, time_till: datetime = None, time_back: str = None) -> Dict[str, List[Dict]]:
        """
        获取指定监控项Top N的IP列表（可选仅在指定IP范围内）
        返回的avg和max都包含ip、value、units、key_，max还包含time（最大值对应的时间），平均值保留2位小数。
        同时返回time_from和time_till（可读时间）。
        """
        time_from, time_till = self._resolve_time_range(time_from, time_till, time_back)
        hosts = self.get_hosts(ip_addresses=ip_addresses)
        
        # 使用filter模式进行精确匹配
        items = self.zapi.item.get(
            output=["itemid", "hostid", "key_", "units", "value_type"],
            hostids=[host["hostid"] for host in hosts],
            filter={"key_": item_key}
        )
        
        if not items:
            logger.warning(f"没有找到匹配的监控项: {item_key}")
            return {
                "avg": [],
                "max": [],
                "time_from": time_from.strftime("%Y-%m-%d %H:%M:%S"),
                "time_till": time_till.strftime("%Y-%m-%d %H:%M:%S")
            }
        
        # 构建itemid到key_和units的映射
        itemid_to_info = {item["itemid"]: {"key_": item["key_"], "units": item.get("units", "") } for item in items}
        
        history = []
        for item in items:
            # 根据value_type确定history参数
            # value_type: 0=float, 1=character, 2=log, 3=unsigned, 4=text
            value_type = int(item.get('value_type', 3))
            if value_type == 0:
                history_type = 0  # numeric float
            elif value_type == 1:
                history_type = 1  # character
            elif value_type == 2:
                history_type = 2  # log
            elif value_type == 3:
                history_type = 3  # numeric unsigned
            elif value_type == 4:
                history_type = 4  # text
            else:
                history_type = 3  # 默认使用numeric unsigned
            
            item_history = self.zapi.history.get(
                output="extend",
                history=history_type,
                itemids=item["itemid"],
                time_from=int(time_from.timestamp()),
                time_till=int(time_till.timestamp()),
                sortfield="clock",
                sortorder="ASC"
            )
            
            if item_history:
                for h in item_history:
                    h["hostid"] = item["hostid"]
                    h["itemid"] = item["itemid"]
                history.extend(item_history)
        
        ip_values = {}
        for item in items:
            host_id = item["hostid"]
            host_info = next((h for h in hosts if h["hostid"] == host_id), None)
            if host_info:
                ip = self._get_host_ip(host_info)
                if ip:
                    values = [(float(h["value"]), int(h["clock"])) for h in history if h["itemid"] == item["itemid"]]
                    if values:
                        avg_value = round(sum(v[0] for v in values) / len(values), 2)
                        max_value, max_clock = max(values, key=lambda x: x[0])
                        ip_values[ip] = {
                            "avg_value": avg_value,
                            "max_value": max_value,
                            "max_clock": max_clock,
                            "key_": item["key_"],
                            "units": item.get("units", "")
                        }
        
        # 按平均值排序
        sorted_ips_avg = sorted(ip_values.items(), key=lambda x: x[1]["avg_value"], reverse=True)
        # 按最大值排序
        sorted_ips_max = sorted(ip_values.items(), key=lambda x: x[1]["max_value"], reverse=True)
        
        result_avg = [
            {
                "ip": ip,
                "value": values["avg_value"],
                "units": values["units"],
                "key_": values["key_"]
            }
            for ip, values in sorted_ips_avg[:limit]
        ]
        result_max = [
            {
                "ip": ip,
                "value": values["max_value"],
                "units": values["units"],
                "key_": values["key_"],
                "time": datetime.fromtimestamp(values["max_clock"]).strftime("%Y-%m-%d %H:%M:%S")
            }
            for ip, values in sorted_ips_max[:limit]
        ]
        
        return {
            "avg": result_avg,
            "max": result_max,
            "time_from": time_from.strftime("%Y-%m-%d %H:%M:%S"),
            "time_till": time_till.strftime("%Y-%m-%d %H:%M:%S")
        }

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

    def _get_hosts_by_identifiers(self, identifiers: List[str] = None) -> List[Dict]:
        """
        通过IP地址或主机名获取主机列表（内部方法）
        
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
            hosts_by_name = self.get_hosts(ip_addresses=host_names)
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


def create_zabbix_client(url: str, username: str, password: str, timeout: int = 30) -> ZabbixAPI:
    """
    创建Zabbix API客户端
    
    Args:
        url: Zabbix服务器URL
        username: 用户名
        password: 密码
        timeout: 请求超时时间（秒），默认30秒
        
    Returns:
        ZabbixAPI客户端实例
    """
    client = ZabbixAPI(url, username, password, timeout)
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
        # 创建客户端并测试连接（使用30秒超时）
        zabbix = create_zabbix_client(ZABBIX_URL, USERNAME, PASSWORD, timeout=30)
        
        # 新增：获取所有主机信息
        all_hosts = zabbix.get_hosts()
        print("get_hosts(全部) 测试结果:", all_hosts)
        
        # 测试 get_hosts
        hosts = zabbix.get_hosts(ip_addresses=["127.0.0.1"])
        print("get_hosts 测试结果:", hosts)
        
        # 新增：仅指定 host_ips 获取监控项
        items_by_ip = zabbix.get_items(host_ips=["127.0.0.1"])
        print("get_items(host_ips) 测试结果:", items_by_ip)
        
        # 测试 get_history
        if items_by_ip:
            item_keys = [item["key_"] for item in items_by_ip]
            history = zabbix.get_history(host_ips=["127.0.0.1"], item_keys=item_keys, time_back="1m")
            print("get_history 测试结果:", history)
        
        # 测试 get_problems
        problems = zabbix.get_problems(host_ips=["127.0.0.1"])
        print("get_problems 测试结果:", problems)
        
        # 测试 get_top_ips_by_metric
        top_ips = zabbix.get_top_ips_by_metric(item_key="system.cpu.util[,user]", limit=5, time_back="1h")
        print("get_top_ips_by_metric 测试结果:", top_ips)
        
        # 登出
        zabbix.logout()
        
    except Exception as e:
        logger.error(f"❌ 测试异常: {e}")
