#!/usr/bin/env python
# -*- coding: utf-8 -*-

from django.http import HttpResponse
import json
from apps.service import server_info
import logging
logger = logging.getLogger('devops')
from rest_framework.decorators import api_view
from apps.utils.common import CheckValidators


class GetRbacUser:
    """获取所有用户"""
    pass


class GetRbacRole:
    """获取所有角色"""
    pass


class GetRbacResource:
    """获取所有资源"""
    pass