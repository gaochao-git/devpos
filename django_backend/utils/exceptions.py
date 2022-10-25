#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超
# 项目自定义Exception

class BusinessException(Exception):
    """业务异常类"""
    def __init__(self, msg, code=5000):
        self.code = code
        self.errmsg = msg
        super().__init__()