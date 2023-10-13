# -*- coding: utf-8 -*-
# @Time    : 2012/10/22 13:17
# @Author  : 高超


from phone import Phone
from id_validator import validator
from stdnum import luhn
from app_web_console.utils.card_bin import BANK_BIN
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
            if validate_bank_number(detect_data): print({"status": "error", "message": f"匹配到电话号敏感数据:{k}: {v}"})


def validate_id_number(str_info):
    """
    验证身份证号码是否合法
    """
    return validator.is_valid(str_info)


def validate_phone_number(str_info):
    """
    校验是否为手机号
    :param str_info:
    :return:
    """
    obj = Phone()
    try:
        info = obj.find(str_info)  # 手机号详情
        return True
    except Exception as e:
        logger.exception(f"手机号校验失败{str(e)}")
        return False


def validate_bank_number(str_info):
    """
    校验是否为银行卡号
    采用luhn/mod10算法,可能会误判
    :param str_info:
    :return:
    """
    try:
        str_prefix = str_info[0:6]
        if luhn.is_valid(str_info) and str_prefix in BANK_BIN:
            bank_info = BANK_BIN[str_prefix]  # 银行卡号详情
            return True
        else:
            return False
    except Exception as e:
        logger.exception(f"手机号校验失败{str(e)}")
        return False

