# -*- coding: utf-8 -*-
# @Time    : 2012/10/22 13:17
# @Author  : 高超


from phone import Phone
from id_validator import validator
from stdnum import luhn
from app_web_console.utils.card_bin import BANK_BIN
import logging
logger = logging.getLogger("devops")

"""
敏感数据分类：
    1.姓名
    2.企业户名
    3.身份证号
    4.护照号
    5.地址
    6.车牌号
    7.联系电话(固定电话)
    8.联系电话(手机号码)
    9.日期时间
    10.电子邮箱
    11.密码
    12.金融账号
    13.银行卡号
    14.存折账号
    15.增值税税号
    16.增值税账号
数据脱敏：
    数据脱敏是指从原始环境想目标环境进行敏感数据交换时，通过一定的方法消除原始环境中数据的敏感性，并保留目标环境业务所需的数据特性或内容的处理过程。
脱敏基本规则：
    1.消除敏感信息
    2.平衡脱敏花费代价
    3.平衡使用放的需求
数据脱敏方法：
    1.泛化技术
        数据截断，如电话号码保留7位
        偏移取整，时间增加秒数、金额取整
    2.抑制技术（隐藏技术）
        掩码屏蔽，保留部分信息，其他用通配符进行统一替换，如手机号13133090789替换位131****0789
    3.扰乱技术
        重排，如1234替换为4321
        加密，对称、非堆成加密
        替换，从随即表中照数据进行替换
        散列，用散列函数替换原始值
        重写，参考原始数据特征重新生成数据
        固定偏移，将数值增加n个固定偏移量
        唯一值映射，将数据映射为唯一值,允许通过映射值找回原值
    4.有损技术（所有数据汇总后才能形成敏感数据）
        限制行数
        限制列数
"""


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
            if validate_bank_number(detect_data): print({"status": "error", "message": f"匹配到银行卡号敏感数据:{k}: {v}"})


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

