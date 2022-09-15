#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超
# 给日志增加request_id便于日志排查

import logging
import threading
import uuid

from django.utils.deprecation import MiddlewareMixin
local = threading.local()


class TraceInfoFilter(logging.Filter):
    """
    This is a filter which injects contextual information into the log.
    """

    def filter(self, record):
        record.request_id = getattr(local, 'request_id', "none")
        return True


class RequestIDMiddleware(MiddlewareMixin):
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