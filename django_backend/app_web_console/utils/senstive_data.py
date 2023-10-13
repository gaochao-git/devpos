# -*- coding: utf-8 -*-
# @Time    : 2012/10/22 13:17
# @Author  : 高超

import json
import re
from phone import Phone
from id_validator import validator
import logging
logger = logging.getLogger("devops")


def web_console_sensitive_data_detect(data):
    """
    银行卡敏感四要素中的银行卡号、身份证好、电话号码识别
    自定义规则的敏感数据识别
    :param data:
    :return:
    """
    for obj in data:
        for k, v in obj.items():
            detect_data = str(v)
            if validate_id_number(detect_data): print({"status": "error", "message": f"匹配到身份证号敏感数据:{k}: {v}"})
            if validate_phone_number(detect_data): print({"status": "error", "message": f"匹配到电话号敏感数据:{k}: {v}"})


def validate_id_number(str_info):
    """
    验证身份证号码是否合法
    参考：https://www.python100.com/html/85796.html
    """
    # 校验码字符集
    check_code_list = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
    # 身份证号码共18位
    if len(str_info) != 18: return False
    # 前17位必须都是数字
    if not str_info[:17].isdigit(): return False
    # 校验码计算
    check_sum = sum([int(str_info[i]) * (2**(17-i)) for i in range(17)])
    check_code = check_code_list[check_sum % 11]
    # 比较校验码
    if check_code != str_info[-1]: return False
    return True


def validate_phone_number(str_info):
    """
    校验是否为手机号
    :param str_info:
    :return:
    """
    obj = Phone()
    try:
        info = obj.find(str_info)
        print(info)
        return True
    except Exception as e:
        print(e)
        return False
