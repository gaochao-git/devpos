#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Zabbix API 公共方法模块
用于获取监控数据
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

    def get_monitoring_data(self, host_names: List[str] = None, item_keys: List[str] = None,
                          hours_back: int = 1) -> Dict[str, Any]:
        """
        获取综合监控数据
        
        Args:
            host_names: 主机名称列表
            item_keys: 监控项key列表
            hours_back: 获取多少小时前的数据
            
        Returns:
            综合监控数据
        """
        try:
            # 获取主机信息
            hosts = self.get_hosts(host_names=host_names)
            if not hosts:
                return {"error": "No hosts found"}
                
            host_ids = [host["hostid"] for host in hosts]
            
            # 获取监控项
            items = self.get_items(host_ids=host_ids, item_keys=item_keys)
            if not items:
                return {"error": "No items found"}
                
            item_ids = [item["itemid"] for item in items]
            
            # 获取历史数据
            time_from = datetime.now() - timedelta(hours=hours_back)
            history_data = self.get_history(item_ids, time_from=time_from)
            
            # 获取问题
            problems = self.get_problems(host_ids=host_ids)
            
            return {
                "hosts": hosts,
                "items": items,
                "history": history_data,
                "problems": problems,
                "timestamp": datetime.now().isoformat()
            }
            
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


# 使用示例
if __name__ == "__main__":
    # 配置信息
    ZABBIX_URL = "http://82.156.146.51/zabbix"
    USERNAME = "Admin"
    PASSWORD = "zabbix"
    
    try:
        # 创建客户端
        zabbix = create_zabbix_client(ZABBIX_URL, USERNAME, PASSWORD)
        
        # 获取监控数据
        data = zabbix.get_monitoring_data(
            host_names=["zabbix_server"],
            item_keys=["system.cpu.util", "vm.memory.util"],
            hours_back=2
        )
        
        print("综合监控数据:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        # 获取CPU使用率Top10 IP
        print("\n获取CPU空闲时间Top10 IP:")
        top_cpu_ips = zabbix.get_top_ips_by_metric(
            item_key="system.cpu.util[,idle]",
            limit=10,
            hours_back=1
        )
        
        if top_cpu_ips:
            print("CPU空闲时间Top10:")
            for i, ip_info in enumerate(top_cpu_ips, 1):
                print(f"  {i}. IP: {ip_info['ip']} ({ip_info['display_name']})")
                print(f"     平均空闲: {ip_info['avg_value']}%, 最大: {ip_info['max_value']}%")
        else:
            print("未找到CPU空闲时间数据")
        
        # 获取可用内存Top10 IP
        print("\n获取可用内存Top10 IP:")
        top_memory_ips = zabbix.get_top_ips_by_metric(
            item_key="vm.memory.size[available]",
            limit=10,
            hours_back=1
        )
        
        if top_memory_ips:
            print("可用内存Top10:")
            for i, ip_info in enumerate(top_memory_ips, 1):
                print(f"  {i}. IP: {ip_info['ip']} ({ip_info['display_name']})")
                print(f"     平均可用: {ip_info['avg_value']:.0f}B, 最大: {ip_info['max_value']:.0f}B")
        else:
            print("未找到可用内存数据")
        
        # 登出
        zabbix.logout()
        
    except Exception as e:
        logger.error(f"Error: {e}")
