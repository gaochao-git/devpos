#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超
# 项目自定义middleware

import threading
import json
import jwt
import re
from django.shortcuts import HttpResponse
from rest_framework_jwt.utils import jwt_decode_handler
from django_backend.settings import LOGIN_TYPE
from utils.error_code import StatusCode
from django.utils.deprecation import MiddlewareMixin
from django_cas_ng.signals import cas_user_authenticated,cas_user_logout
from django.dispatch import receiver
from utils.exceptions import BusinessException
local = threading.local()
import logging
logger = logging.getLogger('devops')


class MyAuthMiddleware(MiddlewareMixin):
    """
    登陆验证中间件,除了登陆接口所有接口均需要验证
    """
    def process_request(self, request):
        if LOGIN_TYPE == "cloud":
            return auth_cloud(request)
        elif LOGIN_TYPE == "sso":
            pass
        elif LOGIN_TYPE == "ldap":
            pass

    def process_response(self, request, response):
        # 基于请求响应
        return response

    def process_exception(self, request, exception):
        """
        正常代码不论错误还是正确不会用到这个异常，除非一些异常没有被捕获到就会被这个异常捕获并处理
        :param request:
        :param exception:
        :return:
        """
        if isinstance(exception, BusinessException):    # 手动抛出异常需要有BusinessException标识
            message = exception.errmsg
            code = exception.code
        else:
            message = '后端服务异常'
            code = StatusCode.ERR_COMMON.code
            logger.exception("非预期异常%s,%s", request, exception)
        content = {"status": "error", "message": message, "code": code}
        return HttpResponse(json.dumps(content), content_type='application/json')


def auth_cloud(request):
    """
    cloud登陆方式认证
    jwt认证,有过期时间
    token不通过触发异常
    token验证通过返回用户信息:{'user_id': 1, 'username': 'gaochao', 'exp': 1635680388, 'email': ''}
    :param request:
    :return:
    """
    if len(re.findall('/admin/', request.path)) != 0:
        pass
    else:
        ret = {"status": "error", "message": StatusCode.ERR_NO_LOGIN.msg, "code": StatusCode.ERR_NO_LOGIN.code}
        auth_ignore_path = ['/api/login/v1/auth_api/', '/api/login/v1/auth_web/', '/api/login/v1/auth_refresh/','/api/fault_tree/v1/get_all_metric_names_by_ip/','/api/fault_tree/v1/get_metric_history_by_ip/']
        # if request.path not in auth_ignore_path:
        #     try:
        #         bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
        #         token = bearer_token.split(' ')[1]
        #         token_user_info = jwt_decode_handler(token)
        #         ret = {"status": "ok", "message": "验证成功", "data": token_user_info}
        #     except jwt.ExpiredSignatureError as e:
        #         ret = {"status": "error", "message": StatusCode.ERR_LOGIN_EXPIRE.msg,"code": StatusCode.ERR_LOGIN_EXPIRE.code}
        #         logger.error("login expires")
        #     except Exception as e:
        #         logger.exception(e)
        #         ret = {"status": "error", "message": StatusCode.ERR_LOGIN_FAIL.msg,"code": StatusCode.ERR_LOGIN_FAIL.code}
        #     finally:
        #         if ret['status'] != "ok": return HttpResponse(json.dumps(ret), content_type='application/json')
        #         request.user = ret['data']
        #         assert request.user.get('user_id') > 0


@receiver(cas_user_authenticated)
def cas_user_authenticated_callback(sender, **kwargs):
    """
    sso登陆成功回调,可以获取用户的SSO信息，进行平台相关处理
    :param sender:
    :param kwargs:
    :return:
    """
    attributes = kwargs('attributes')
    print("sso登陆成功,用户信息写入数据库")


@receiver(cas_user_logout)
def cas_user_logout_callback(sender, **kwargs):
    """
    sso登出回调
    :param sender:
    :param kwargs:
    :return:
    """
    print("sso登出")
