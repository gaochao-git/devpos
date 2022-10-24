# -*- coding: utf-8 -*-
# @Author: Hui
# @Desc: { 项目异常模块 }
# @Date: 2021/09/24 8:14
# http://www.qb5200.com/article/405816.html


class CommonException(Exception):
    """公共异常类"""

    def __init__(self):
        self.code = 5000
        self.errmsg = 'xxxxx'
        super().__init__()


class BusinessException(CommonException):
    """业务异常类"""
    def __init__(self, msg, code=5000):
        self.code = code
        self.errmsg = msg


class APIException(CommonException):
    """接口异常类"""
    pass