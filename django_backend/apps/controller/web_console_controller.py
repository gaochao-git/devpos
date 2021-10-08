#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from django.http import HttpResponse
import json
import logging
from apps.service import web_console

logger = logging.getLogger('devops')


def get_table_data_controller(request):
    """
    获取数据
    :param request:
    :return:
    """
    request_body = json.loads(str(request.body, encoding="utf-8"))
    try:
        ip = request_body['params']['ip']
        port = request_body['params']['port']
        sql = request_body['params']['sql']
        schema_name = request_body['params']['schema_name']
        ret = web_console.get_table_data(ip, port, sql, schema_name)
    except keyError as e:
        logger.exception('缺少请求参数:%s' % str(e))
        ret = {"status": "error", "code":2002, "message": "参数不合法"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')
