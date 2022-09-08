"""
继承Validator,封装一些常用request参数验证方法
"""

from validator import Validator
from apps.utils.common import check_ip, check_port,check_instance_name
from django import forms
from collections import namedtuple
ValidationResult = namedtuple('ValidationResult', ['valid', 'errors'])


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


def validate_ip_port(ip_port):
    """
    参数验证ip_port实例是否合法
    :param ip_port: ip_port
    :return:
    """
    if check_instance_name(ip_port)['status'] != "ok":
        raise forms.ValidationError("ip_port 不合法")


# class BaseValidator:
#     def __init__(self, request_body, rules):
#         self.request_body = request_body
#         self.rules = rules
#         self.valid = True
#         self.errors = ""
#
#     def validate(self):
#         MyClass = type("TestClass", (forms.Form,), self.rules)
#         obj = MyClass(self.request_body)
#         self.valid = obj.is_valid()
#         errors_json = obj.errors.get_json_data()
#         for k, v in errors_json.items():
#             self.errors = v[0].get('message')
#             break

def my_form_validate(request_body, rules):
    """
    用动态类封装一个参数验证公共方法
    :param request_body:
    :param rules:
    :return:
    """
    # 生成动态类 type(类名,(继承的类),属性)
    ValidateClass = type("ValidateClass", (forms.Form,), rules)
    obj = ValidateClass(request_body)
    errors = {}
    errors_json = obj.errors.get_json_data()
    for k, v in errors_json.items():
        errors[k] = v[0].get('message')
    if len(obj.errors) > 0:
        return ValidationResult(valid=False, errors=errors)
    else:
        return ValidationResult(valid=True, errors=errors)
