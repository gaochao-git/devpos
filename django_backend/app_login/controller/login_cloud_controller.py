#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超


from apps.utils.base_view import BaseView
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
import logging
logger = logging.getLogger('devops')


class LoginCloudController(BaseView):
    def get(self, request):
        """
        平台自定义登陆
        :param request:
        :return:
        """
        pass