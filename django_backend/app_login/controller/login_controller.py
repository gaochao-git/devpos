#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超


from apps.utils.base_view import BaseView
import logging
logger = logging.getLogger('devops')
from app_login.service.login import get_login_user_info


class GetLoginUserInfoController(BaseView):
    def post(self, request):
        """
        获取用户登陆信息
        :param request:
        :return:
        """
        ret = get_login_user_info(request)
        return self.my_response(ret)
