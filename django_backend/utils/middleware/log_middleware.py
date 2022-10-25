#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超
# 项目自定义middleware

import threading
import uuid
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


# ============================ 日志 ===================================
class TraceInfoFilter(logging.Filter):
    """
    给日志增加request_id便于日志排查,filter
    """

    def filter(self, record):
        record.request_id = getattr(local, 'request_id', "none")
        return True


class MyLogMiddleware(MiddlewareMixin):
    """
    给日志增加request_id便于日志排查,middleware
    """
    def process_request(self, request):
        trace_id = str(uuid.uuid4())
        local.request_id = trace_id

    def process_response(self, request, response):
        if hasattr(request, 'request_id'):
            response['X-Request-ID'] = local.request_id
        try:
            del local.request_id
        except AttributeError:
            pass
        return response