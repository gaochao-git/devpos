from pyzabbix import ZabbixAPI
from typing import Dict, List, Any, Optional
from typing_extensions import Literal
from datetime import datetime

zabbix_url = 'http://82.156.146.51/zabbix/'
ZABBIX_USER = 'Admin'
ZABBIX_PASSWORD = 'zabbix'
class ZabbixClient:
    def __init__(self, url, user, password):
        """初始化Zabbix客户端"""
        self.url = url
        self.user = user
        self.password = password
        self.zapi = None
        self.connect()

    def connect(self):
        """连接到Zabbix服务器"""
        try:
            self.zapi = ZabbixAPI(self.url)
            self.zapi.login(self.user, self.password)
            print(f"Connected to Zabbix API Version {self.zapi.api_version()}")
        except Exception as e:
            print(f"Failed to connect to Zabbix: {str(e)}")
            raise

    def get_hosts(self):
        """获取所有主机"""
        try:
            hosts = self.zapi.host.get(output=['hostid', 'host', 'name'])
            return hosts
        except Exception as e:
            print(f"Failed to get hosts: {str(e)}")
            return []

    def get_history(self, itemids, time_from=None, time_till=None, limit: int = 10000):
        """
        获取历史数据
        Args:
            itemids: 指标ID
            time_from: 开始时间
            time_till: 结束时间
            limit: 返回的数据条数，默认100条
        """
        try:
            # 获取item的value_type
            items = self.zapi.item.get(itemids=itemids,output=['value_type', 'units'])
            if not items:
                print(f"No items found for itemids: {itemids}")
                return []
            
            value_type = int(items[0]['value_type'])
            units = items[0]['units']
            
            params = {
                'history': value_type,
                'itemids': itemids,
                'sortfield': 'clock',
                'sortorder': 'DESC',
                'output': 'extend',
                'limit': limit
            }
            
            if time_from: params['time_from'] = time_from
            if time_till: params['time_till'] = time_till
            
            history = self.zapi.history.get(**params)
            return history
        
        except Exception as e:
            print(f"Failed to get history: {str(e)}")
            return []

    def close(self):
        """关闭连接"""
        if self.zapi:
            self.zapi = None

    def get_metrics_values(
        self, 
        host_ip: str, 
        metric_name: str, 
        time_from: Optional[int] = None,
        time_till: Optional[int] = None,
        match_type: Literal['filter', 'search'] = 'filter',
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        获取指标数据
        Args:
            host_ip: 主机IP
            metric_name: 指标名称列表
            time_from: 开始时间戳
            time_till: 结束时间戳
            match_type: 匹配方式
            limit: 返回的历史数据条数
        """
        try:
            host_id = self.find_host_by_ip(host_ip)
            if not host_id:
                return {'status': 'error','msg': f'No host found with IP: {host_ip}','data': None}
            
            # 构建查询参数
            params = {
                'hostids': host_id,
                'output': ['itemid', 'name', 'key_', 'lastvalue', 'units', 'value_type', 'lastclock'],
            }
            params[match_type] = {'key_': metric_name}
            # 获取当前数据
            items = self.zapi.item.get(**params)
            if not items:
                return {'status': 'error','msg': f'No metrics found for {metric_name}','data': None}

            # 添加value和clock字段，保持与历史数据格式一致
            for item in items:
                if 'lastvalue' in item:
                    item['value'] = item['lastvalue']
                if 'lastclock' in item:
                    item['clock'] = item['lastclock']
                    item['metric_time'] = datetime.fromtimestamp(int(item['clock'])).strftime('%Y-%m-%d %H:%M:%S')
            
            # 获取并返回历史数据
            if time_from and time_till:
                it_ids = [item['itemid'] for item in items]
                history = self.get_history(itemids=it_ids, time_from=time_from, time_till=time_till, limit=limit)
                # 为每条历史记录添加units
                for record in history:
                    record['key_'] = metric_name
                    record['units'] = items[0]['units']
                    record['value_type'] = items[0]['value_type']
                    record['metric_time'] = datetime.fromtimestamp(int(record['clock'])).strftime('%Y-%m-%d %H:%M:%S')
                return {'status': 'success','msg': 'Historical data retrieved successfully','data': history}
            # 返回当前数据
            return {'status': 'success','msg': 'Current data retrieved successfully','data': items}
        except Exception as e:
            return {
                'status': 'error',
                'msg': str(e),
                'data': None
            }

    def find_host_by_ip(self, ip: str) -> Optional[str]:
        """
        通过IP地址查找主机ID
        Args:
            ip: 主机IP地址
        Returns:
            str: 主机ID，如果未找到返回None
        """
        try:
            hosts = self.zapi.hostinterface.get(output=['hostid'],filter={'ip': ip})
            return hosts[0]['hostid'] if hosts else None
        except Exception as e:
            print(f"Error finding host by IP: {str(e)}")
            return None

    def get_discovery_rules(
        self,
        host_ip: str,
        rule_key: Optional[str] = None,
        status: str = '0'  # '0' 表示启用的规则
    ) -> Dict[str, Any]:
        """
        获取主机的自动发现规则
        Args:
            host_ip: 主机IP
            rule_key: 规则key，可选，用于筛选特定规则
            status: 规则状态，默认为'0'（启用）
        Returns:
            Dict: 包含规则信息的字典
        """
        try:
            # 获取主机ID
            host_id = self.find_host_by_ip(host_ip)
            if not host_id:
                return {
                    'status': 'error',
                    'msg': f'No host found with IP: {host_ip}',
                    'data': None
                }

            # 构建查询参数
            params = {
                'output': ['itemid', 'key_', 'name', 'delay', 'status', 'state', 'lastclock'],
                'hostids': host_id,
                'filter': {'status': status}
            }

            # 如果指定了rule_key，添加到过滤条件
            if rule_key:
                params['filter']['key_'] = rule_key

            # 获取发现规则
            rules = self.zapi.discoveryrule.get(**params)
            
            if not rules:
                return {
                    'status': 'warning',
                    'msg': f'No discovery rules found for host {host_ip}',
                    'data': []
                }

            # 为每个规则添加最后发现的数据
            for rule in rules:
                try:
                    # 获取规则的最新数据
                    items = self.zapi.item.get(
                        itemids=rule['itemid'],
                        output=['lastvalue', 'lastclock']
                    )
                    if items and items[0].get('lastvalue'):
                        rule['discovered_data'] = items[0]['lastvalue']
                        rule['metric_time'] = datetime.fromtimestamp(
                            int(items[0]['lastclock'])
                        ).strftime('%Y-%m-%d %H:%M:%S')
                except Exception as e:
                    rule['discovered_data'] = None
                    rule['error'] = str(e)

            return {
                'status': 'success',
                'msg': 'Discovery rules retrieved successfully',
                'data': rules
            }

        except Exception as e:
            return {
                'status': 'error',
                'msg': str(e),
                'data': None
            }

    def get_discovery_prototypes(
        self,
        host_ip: str,
        discovery_rule_id: Optional[str] = None,
        status: str = '0'
    ) -> Dict[str, Any]:
        """
        获取自动发现规则的原型配置
        Args:
            host_ip: 主机IP
            discovery_rule_id: 发现规则ID，可选
            status: 原型状态，默认为'0'（启用）
        Returns:
            Dict: 包含原型信息的字典
        """
        try:
            # 获取主机ID
            host_id = self.find_host_by_ip(host_ip)
            if not host_id:
                return {
                    'status': 'error',
                    'msg': f'No host found with IP: {host_ip}',
                    'data': None
                }

            # 构建基本查询参数
            params = {
                'output': 'extend',  # 获取所有字段
                'hostids': host_id,
                'selectDiscoveryRule': 'extend'  # 包含发现规则信息
            }

            # 如果指定了discovery_rule_id
            if discovery_rule_id:
                params['discoveryids'] = discovery_rule_id

            # 获取原型列表
            try:
                prototypes = self.zapi.itemprototype.get(**params)
            except Exception as e:
                # 尝试替代方法
                params['discoveryids'] = [discovery_rule_id] if discovery_rule_id else None
                prototypes = self.zapi.itemprototype.get(**params)

            if not prototypes:
                return {
                    'status': 'warning',
                    'msg': f'No item prototypes found for host {host_ip}',
                    'data': []
                }

            # 处理返回数据
            formatted_prototypes = []
            for prototype in prototypes:
                formatted_prototype = {
                    'itemid': prototype['itemid'],
                    'name': prototype['name'],
                    'key_': prototype['key_'],
                    'delay': prototype.get('delay', ''),
                    'units': prototype.get('units', ''),
                    'description': prototype.get('description', ''),
                    'type': prototype.get('type', ''),
                    'status': prototype.get('status', '')
                }
                
                # 添加发现规则信息
                if 'discoveryRule' in prototype:
                    formatted_prototype['discovery_rule'] = {
                        'itemid': prototype['discoveryRule']['itemid'],
                        'name': prototype['discoveryRule']['name'],
                        'key_': prototype['discoveryRule']['key_']
                    }
                
                formatted_prototypes.append(formatted_prototype)

            return {
                'status': 'success',
                'msg': 'Item prototypes retrieved successfully',
                'data': formatted_prototypes
            }

        except Exception as e:
            return {
                'status': 'error',
                'msg': str(e),
                'data': None
            }

    def get_all_metrics(self, host_ip):
        """
        获取主机的所有已启用的监控项
        Args:
            host_ip: 主机IP地址
        Returns:
            Dict: 包含所有监控项信息的字典
        """
        try:
            # 获取主机ID
            host_id = self.find_host_by_ip(host_ip)
            if not host_id:
                return {
                    'status': 'error',
                    'msg': f'No host found with IP: {host_ip}',
                    'data': None
                }

            # 获取所有已启用的监控项（status=0 表示启用）
            items = self.zapi.item.get(
                hostids=host_id,
                output=['itemid', 'name', 'key_', 'lastvalue', 'units', 'value_type', 'lastclock', 'description'],
                filter={'status': '0'},  # 只获取已启用的监控项
                sortfield='name'
            )

            if not items:
                return {
                    'status': 'warning',
                    'msg': f'No active metrics found for host {host_ip}',
                    'data': []
                }

            return {
                'status': 'success',
                'msg': 'Active metrics retrieved successfully',
                'data': items
            }

        except Exception as e:
            return {
                'status': 'error',
                'msg': str(e),
                'data': None
            }

def get_zabbix_metrics(
    host_ip: str,
    metric_name: str,
    time_from: Optional[int] = None,
    time_till: Optional[int] = None,
    match_type: Literal['filter', 'search'] = 'filter',
    limit: int = 100
) -> Dict[str, Any]:
    """
    获取Zabbix指标的封装方法
    Args:
        host_ip: 主机IP地址
        metric_name: 指标名称
        time_from: 开始时间戳（秒）
        time_till: 结束时间戳（秒）
        match_type: 匹配类型（filter/search）
        limit: 返回的历史数据条数，默认100条
    """
    client = ZabbixClient(
        url=zabbix_url,
        user=ZABBIX_USER,
        password=ZABBIX_PASSWORD
    )
    try:
        return client.get_metrics_values(host_ip, metric_name, time_from, time_till, match_type=match_type, limit=limit)
    finally:
        client.close()

def get_zabbix_discovery_rules(
    host_ip: str,
    rule_key: Optional[str] = None,
    status: str = '0'
) -> Dict[str, Any]:
    """
    获取Zabbix自动发现规则的封装方法
    Args:
        host_ip: 主机IP地址
        rule_key: 规则key，可选，用于筛选特定规则
        status: 规则状态，默认为'0'（启用）
    Returns:
        Dict: 包含规则信息的字典
    """
    client = ZabbixClient(
        url=zabbix_url,
        user=ZABBIX_USER,
        password=ZABBIX_PASSWORD
    )
    try:
        return client.get_discovery_rules(host_ip, rule_key, status)
    finally:
        client.close()

def get_zabbix_discovery_prototypes(
    host_ip: str,
    discovery_rule_id: Optional[str] = None,
    status: str = '0'
) -> Dict[str, Any]:
    """
    获取Zabbix自动发现规则原型的封装方法
    Args:
        host_ip: 主机IP地址
        discovery_rule_id: 发现规则ID，可选
        status: 原型状态，默认为'0'（启用）
    Returns:
        Dict: 包含原型信息的字典
    """
    client = ZabbixClient(
        url=zabbix_url,
        user=ZABBIX_USER,
        password=ZABBIX_PASSWORD
    )
    try:
        return client.get_discovery_prototypes(host_ip, discovery_rule_id, status)
    finally:
        client.close()

def get_disk_free_space(host_ip: str) -> Dict[str, Any]:
    """
    获取指定主机的所有磁盘剩余空间
    Args:
        host_ip: 主机IP地址
    Returns:
        Dict: 包含磁盘空间信息的字典
    """
    client = ZabbixClient(
        url=zabbix_url,
        user=ZABBIX_USER,
        password=ZABBIX_PASSWORD
    )
    try:
        # 1. 首先获取主机ID
        host_id = client.find_host_by_ip(host_ip)
        if not host_id:
            return {
                'status': 'error',
                'msg': f'No host found with IP: {host_ip}',
                'data': None
            }

        # 2. 使用item.get直接查询磁盘空间相关的监控项
        items = client.zapi.item.get(
            hostids=host_id,
            search={'key_': 'vfs.fs.size'},
            searchWildcardsEnabled=True,
            output=['itemid', 'name', 'key_', 'lastvalue', 'units', 'lastclock']
        )

        if not items:
            return {
                'status': 'error',
                'msg': f'No disk space metrics found for host: {host_ip}',
                'data': None
            }

        # 3. 处理返回数据，只保留剩余空间的指标
        disk_data = []
        for item in items:
            if 'free' in item['key_'].lower():
                item['metric_time'] = datetime.fromtimestamp(
                    int(item['lastclock'])
                ).strftime('%Y-%m-%d %H:%M:%S')
                disk_data.append(item)

        return {
            'status': 'success',
            'msg': 'Disk space data retrieved successfully',
            'data': disk_data
        }

    except Exception as e:
        return {
            'status': 'error',
            'msg': str(e),
            'data': None
        }
    finally:
        client.close()

def get_prototype_metrics(host_ip: str, discovery_rule_name: Optional[str] = None) -> Dict[str, Any]:
    """
    获取主机所有原型对应的监控数据
    Args:
        host_ip: 主机IP地址
        discovery_rule_name: 发现规则名称，可选（例如："Disk device discovery"）
    Returns:
        Dict: 包含监控数据的字典
    """
    client = ZabbixClient(
        url=zabbix_url,
        user=ZABBIX_USER,
        password=ZABBIX_PASSWORD
    )
    try:
        # 1. 如果指定了规则名称，先获取对应的规则ID
        discovery_rule_id = None
        if discovery_rule_name:
            rules_result = client.get_discovery_rules(host_ip)
            if rules_result['status'] == 'success' and rules_result['data']:
                for rule in rules_result['data']:
                    if discovery_rule_name.lower() in rule['name'].lower():
                        discovery_rule_id = rule['itemid']
                        break
                
                if not discovery_rule_id:
                    return {
                        'status': 'error',
                        'msg': f'No discovery rule found with name: {discovery_rule_name}',
                        'data': None
                    }

        # 2. 依据发现规则id获取下面的原型
        prototypes_result = client.get_discovery_prototypes(host_ip, discovery_rule_id)
        if prototypes_result['status'] != 'success' or not prototypes_result['data']:
            return {
                'status': 'error',
                'msg': f'No prototypes found for host: {host_ip}',
                'data': None
            }

        # 3. 获取主机ID
        host_id = client.find_host_by_ip(host_ip)
        if not host_id:
            return {
                'status': 'error',
                'msg': f'No host found with IP: {host_ip}',
                'data': None
            }

        # 4. 获取所有已发现的监控项
        items = client.zapi.item.get(
            hostids=host_id,
            selectItemDiscovery='extend',
            output=['itemid', 'name', 'key_', 'lastvalue', 'units', 'lastclock']
        )

        # 5. 组织数据，按原型分组
        prototype_metrics = {}
        for prototype in prototypes_result['data']:
            prototype_id = prototype['itemid']
            prototype_metrics[prototype_id] = {
                'prototype': prototype,
                'discovered_items': []
            }

        # 6. 将监控项与原型关联
        for item in items:
            if 'itemDiscovery' in item and item['itemDiscovery']:
                parent_id = item['itemDiscovery'].get('parent_itemid')
                if parent_id in prototype_metrics:
                    # 添加时间戳
                    item['metric_time'] = datetime.fromtimestamp(
                        int(item['lastclock'])
                    ).strftime('%Y-%m-%d %H:%M:%S')
                    prototype_metrics[parent_id]['discovered_items'].append(item)

        return {
            'status': 'success',
            'msg': 'Prototype metrics retrieved successfully',
            'data': prototype_metrics
        }

    except Exception as e:
        return {
            'status': 'error',
            'msg': str(e),
            'data': None
        }
    finally:
        client.close()

def get_all_host_metrics(host_ip):
    """
    获取主机所有监控项的封装方法
    Args:
        host_ip: 主机IP地址
    Returns:
        Dict: 包含所有监控项信息的字典
    """
    client = ZabbixClient(
        url=zabbix_url,
        user=ZABBIX_USER,
        password=ZABBIX_PASSWORD
    )
    try:
        return client.get_all_metrics(host_ip)
    finally:
        client.close()

# 使用示例
if __name__ == "__main__":

    # 获取最新数据
    host_ip = "127.0.0.1"
    # result = get_zabbix_metrics(host_ip=host_ip, metric_name='system.cpu.util[,iowait]')
    # print("--------------Latest data:", result)
    # result = get_zabbix_metrics(host_ip=host_ip, metric_name='vm.memory.size[available]')
    # print("--------------Latest data:", result)
    # result = get_zabbix_metrics(host_ip=host_ip, metric_name='vfs.fs.size[/,free]')
    # print("--------------Latest data:", result)
    # result = get_zabbix_metrics(host_ip=host_ip, metric_name='disk.io.util[vda]')
    # print("--------------Latest data:", result)

    # # 获取某个时间范围的历史数据
    # time_till = int(time.time())
    # time_from = time_till - 3600
    # limit = 1000
    # result = get_zabbix_metrics(
    #     host_ip=host_ip,
    #     metric_name='system.cpu.util',
    #     time_from=time_from,
    #     time_till=time_till,
    #     limit=limit,
    #     match_type='search'
    # )
    # print("--------value in last hour:", result)

    # # 获取发现规则示例
    # print("\n--------------Discovery Rules:")
    # # 获取所有发现规则
    # result = get_zabbix_discovery_rules(host_ip="127.0.0.1")
    # print("All discovery rules:", result)
    
    # # 获取特定的发现规则
    # result = get_zabbix_discovery_rules(
    #     host_ip="127.0.0.1",
    #     rule_key="vfs.fs.discovery"
    # )
    # print("\nFilesystem discovery rule:", result)

    # # 获取发现规则原型示例
    # print("\n--------------Discovery Rule Prototypes:")
    # # 获取所有原型
    # result = get_zabbix_discovery_prototypes(host_ip="127.0.0.1")
    # print("All prototypes:", result)
    
    # # 获取特定发现规则的原型
    # # 首先获取发现规则ID
    # rules = get_zabbix_discovery_rules(
    #     host_ip="127.0.0.1",
    #     rule_key="vfs.fs.discovery"
    # )
    # if rules['status'] == 'success' and rules['data']:
    #     rule_id = rules['data'][0]['itemid']
    #     # 然后获取该规则的原型
    #     result = get_zabbix_discovery_prototypes(
    #         host_ip="127.0.0.1",
    #         discovery_rule_id=rule_id
    #     )
    #     print("\nFilesystem prototypes:", result)

    # # 获取磁盘剩余空间
    # disk_space = get_disk_free_space(host_ip)
    # print("Disk free space:", disk_space)

    # # 通过发现规则名称获取数据
    # metrics = get_prototype_metrics(host_ip, "Disk device discovery")
    # print("Disk device metrics:", metrics)
    
    # # 获取文件系统发现规则的数据
    # metrics = get_prototype_metrics(host_ip, "Mounted filesystem discovery")
    # print("Filesystem metrics:", metrics)
    
    # # 获取网络接口发现规则的数据
    # metrics = get_prototype_metrics(host_ip, "Network interface discovery")
    # print("Network interface metrics:", metrics)

    # 获取所有指标名称
    metrics = get_all_host_metrics(host_ip)
    print("All metrics:", metrics)
    print(len(metrics['data']))