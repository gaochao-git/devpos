#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
logger = logging.getLogger('devops')
from django_backend.settings import LOGIN_TYPE
from rest_framework_jwt.utils import jwt_decode_handler
from django.contrib.auth.models import User


def get_login_user_info(request):
    """
    :param request:
    :return:
    """
    if LOGIN_TYPE == 'cloud':  # jwt token登陆认证获取用户详情
        return get_login_user_info_cloud(request)
    elif LOGIN_TYPE == 'cas_sso':  # sso登陆认证获取用户详情
        pass
    elif LOGIN_TYPE == 'ldap':  # ldap登陆认证获取用户详情
        pass


def get_login_user_info_cloud(request):
    """
    根据登陆jwt token获取用户详情
    :param request:
    :return:
    """
    bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
    token = bearer_token.split(' ')[1]
    data = []
    try:
        token_user = jwt_decode_handler(token)
        user_extra = User.objects.filter(username=token_user.get('username')).values()[0]
        token_user['user_role'] = "超级管理员" if user_extra.get('is_superuser') else "普通用户"
        token_user['name'] = user_extra.get('last_name', '') + user_extra.get('first_name', '')
        status = "ok"
        message = "获取用户信息成功"
        data.append(token_user)
    except Exception as e:
        status = "error"
        message = "获取用户信息失败"
        logger.exception(e)
    return {"status": status, "message": message, "data": data}
