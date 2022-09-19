import requests
import json
import time


class ZabbixApi:
    def __init__(self, *args, **kwargs):
        self._zbx_url = "http://47.104.2.74/zabbix/api_jsonrpc.php"
        self._headers = {'Content-Type': 'application/json-rpc'}
        self._auth_token = self._zabbix_auth()

    def _request(self,data):
        """
        request 接口
        :param data:
        :return:
        """
        try:
            ret = requests.post(self._zbx_url, data=json.dumps(data), headers=self._headers)
            ret_dict = json.loads(ret.text)
            if len(ret_dict) != 0:
                return ret_dict
            else:
                return None
        except Exception as e:
            print(e)
            return None

    def _zabbix_auth(self):
        """
        获取登陆token
        :return:
        """
        data = {
            "jsonrpc": "2.0",
            "method": "user.login",
            "params": {
                "user": "Admin",
                "password": "zabbix"
            },
            "id": 1
        }
        ret = self._request(data)
        if ret is not None:
            return ret.get('result')
        else:
            return None

    def get_host_id(self, host_ip):
        """
        获取服务器hostid
        :param host_ip:
        :return:hostid
        """
        data = {
            "jsonrpc": "2.0",
            "method": "hostinterface.get",
            "params": {
                # output表示输出结果包含参数有哪些
                "output": ["hostid"],
                # 筛选条件
                "filter": {
                    "ip": "%s" % host_ip,
                },
            },
            "auth": self._auth_token,  # 这里的auth就是登录后获取的token
            'id': '1'  # 这个id可以随意
        }
        ret = self._request(data)
        if ret is not None:
            host_id = ret['result'][0]['hostid']
            return host_id
        else:
            return None

    def get_host_info(self, host_ip):
        """
        获取监控主机信息
        :param host_ip:
        :return:
        """
        data = {
            "jsonrpc": "2.0",
            "method": "host.get",
            "params": {
                # output表示输出结果包含参数有哪些
                # "output": "extend",
                "output": ["hostid", "name", "host","hostip","status", "available", "maintenanceid", "maintenance_status"],
                # 筛选条件
                "filter": {
                    "ip": host_ip
                },
            },
            "auth": self._auth_token,  # 这里的auth就是登录后获取的token
            'id': '1'  # 这个id可以随意
        }
        ret = self._request(data)
        if ret is not None:
            print(ret['result'])
            item = ret['result'][0]
            # 增加ip信息
            item['host_ip'] = host_ip
            # status
            if item['status'] == "0":
                item.update(status="enable")
            elif item['status'] == "1":
                item.update(status="disable")
            else:
                item.update(status="unknown")
            # available
            if item['available'] == "1":
                item.update(available="available")
            elif item['available'] == "2":
                item.update(available="unavailable")
            else:
                item.update(available="unknown")
            # maintenance
            if item['maintenance_status'] == "0":
                item.update(maintenance_status="not_maintenance")
            else:
                item.update(maintenance_status="maintenance")
            print(ret['result'])
            return ret['result']
        else:
            return None

    def maintenance_create(self, host_ip_list, period=31536000):
        """
        创建维护组
        :param host_ip_list:
        :param period:
        :return:
        """
        start_time = int(time.time())
        end_time = start_time + period
        host_id_list = [self.get_host_id(host_ip) for host_ip in host_ip_list]
        data = {
            "jsonrpc": "2.0",
            "method": "maintenance.create",
            "params": {
                "name": "xx",
                "active_since": start_time,  # 维护模式生效的时刻，期间timeperiods设置的规则生效
                "active_till": end_time,     # 维护模式失效的时刻，期间timeperiods设置的规则生效
                "hostids": host_id_list,     # host id list
                "tags_evaltype": 0,    # Problem tag evaluation method: 0: And/Or,2:Or.
                "maintenance_type": 0,  # 0:关闭报警,收集数据,1:关闭报警,不收集数据
                "timeperiods": [
                    {
                        "timeperiod_type": 0,   # 期间类型 0:one time only, 2:daily, 3:weekly, 4:monthly.
                        "start_date": start_time,  # 规则生效时间
                        "period": period  # 维护期间长度
                    }
                ]
            },
            "auth": self._auth_token,
            "id": 1
        }
        ret = self._request(data)
        print(data)
        print(ret)


    def zabbix_xx(self):
        data = {
            "jsonrpc": "2.0",
            "method": "trigger.get",
            "params": {
                # output表示输出结果包含参数有哪些
                "output": [
                    "triggerid",
                    "description",
                    "status",
                    "value",
                    "priority",
                    "lastchange",
                    "recovery_mode",
                    "hosts",
                    "state",
                ],
                "selectHosts": "hosts",  # 需包含主机ID信息，以便于根据主机ID查询主机信息
                "selectItems": "items",
                "filter": {
                    # 筛选条件
                    "value": 1,  # value值为1表示有问题
                    "status": 0  # status为0表示已启用的trigger
                },
            },
            "auth": self._auth_token,  # 这里的auth就是登录后获取的token
            'id': '1'  # 这个id可以随意
        }
        # 将查询数据发送到zabbix-server
        ret = requests.post(self._zbx_url, data=json.dumps(data), headers=self._headers)
        respone_result = ret.json()['result']  # 对结果进行json序列化
        print(respone_result)


if __name__ == '__main__':
    zabbix_obj = ZabbixApi()
    zabbix_obj.get_host_id('127.0.0.1')
    zabbix_obj.get_host_info('127.0.0.1')
    zabbix_obj.maintenance_create(['127.0.0.1'])