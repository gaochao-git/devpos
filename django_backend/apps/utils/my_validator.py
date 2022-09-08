"""
继承Validator,封装一些常用request参数验证方法
"""

from validator import Validator
from apps.utils.common import check_ip, check_port,check_instance_name
from django import forms


class Ipv4(Validator):
    """
    # Example:
        validations = {
            "field": [Ipv4()]
        }
        passes = {"field":'127.0.0.1'}
        fails  = {"field":'127.0.0.256'}

    """

    def __init__(self):
        self.err_message = "must be ip format"
        self.not_message = "must be ip format"

    def __call__(self, value):
        try:
            return True if check_ip(value)['status'] == "ok" else False
        except Exception:
            return False


class Ipv4List(Validator):
    """
    # Example:
        validations = {
            "field": [Ipv4List()]
        }
        passes = {"field":'127.0.0.1\n172.16.1.216'}
        fails  = {"field":'127.0.0\n123'}

    """

    def __init__(self):
        self.err_message = "must be ip format"
        self.not_message = "must be ip format"

    def __call__(self, value):
        try:
            return self._check_ipv4(value)
        except Exception as e:
            return False

    def _check_ipv4(self,value):
        ip_list = value.split('\n')
        ip_list = filter(lambda x : x, ip_list)  # 去除空字符串
        for ip in ip_list:
            self.err_message = "%s must be ip format" % ip
            self.not_message = "%s must be ip format" % ip
            if check_ip(value)['status'] != "ok": return False
        return True


class Port(Validator):
    """
    # Example:
        validations = {
            "field": [Port()]
        }
        passes = {"field":'3306'}
        fails  = {"field":'33333333'}

    """

    def __init__(self):
        self.err_message = "must be 0～65535"
        self.not_message = "must be 0～65535"

    def __call__(self, value):
        try:
            return True if check_port(value)['status'] == "ok" else False
        except Exception:
            return False


class IpPort(Validator):
    """
    # Example:
        validations = {
            "field": [IpPort()]
        }
        passes = {"field":'127.0.0.1_3306'}
        fails  = {"field":'127.0.0.1'}

    """

    def __init__(self):
        self.err_message = "must be ip_port format"
        self.not_message = "must be ip_port format"

    def __call__(self, value):
        try:
            return True if check_instance_name(value)['status'] == "ok" else False
        except Exception:
            return False


class IpPortList(Validator):
    """
    # Example:
        validations = {
            "field": [IpPortList()]
        }
        passes = {"field":'127.0.0.1_3306\n172.16.1.216_3306'}
        fails  = {"field":'127.0.0.256\n123'}

    """

    def __init__(self):
        self.err_message = "must be ip_port format"
        self.not_message = "must be ip_port format"

    def __call__(self, value):
        try:
            return self._check_ip_port(value)
        except Exception as e:
            return False

    def _check_ip_port(self,value):
        ip_port_list = value.split('\n')
        ip_port_list = filter(lambda x : x, ip_port_list)  # 去除空字符串
        for ins in ip_port_list:
            self.err_message = "%s must be ip_port format" % ins
            self.not_message = "%s must be ip_port format" % ins
            if check_instance_name(ins)['status'] != "ok": return False
        return True


def validate_instance_name(ins):
    if check_instance_name(ins)['status'] == "ok":
        raise forms.ValidationError("ip_port 不合法")