#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from django.http import HttpResponse
import json
import logging
from apps.service import deploy_mysql

logger = logging.getLogger('devops')


def submit_install_mysql_controller(request):
    """
    获取数据
    :param request:
    :return:
    """
    request_body = json.loads(str(request.body, encoding="utf-8"))
    try:
        ips = request_body['ips']
        port = request_body['port']
        version = request_body['version']
        ret = deploy_mysql.submit_install_mysql(ips, port, version)
    except KeyError as e:
        logger.exception('缺少请求参数:%s' % str(e))
        ret = {"status": "error", "code":2002, "message": "参数不合法"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')
