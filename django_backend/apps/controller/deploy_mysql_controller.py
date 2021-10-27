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
        topo_source = request_body['topo_source']
        port = request_body['port']
        version = request_body['version']
        ret = deploy_mysql.submit_install_mysql(topo_source, port, version)
    except KeyError as e:
        logger.exception('缺少请求参数:%s' % str(e))
        ret = {"status": "error", "code":2002, "message": "参数不合法"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


def deploy_mysql_by_uuid_controller(request):
    """
    部署mysql
    :param request:
    :return:
    """
    request_body = json.loads(str(request.body, encoding="utf-8"))
    try:
        submit_uuid = request_body['submit_uuid']
        deploy_topos = request_body['deploy_topos']
        deploy_version = request_body['deploy_version']
        ret = deploy_mysql.deploy_mysql_by_uuid(submit_uuid,deploy_topos,deploy_version)
    except KeyError as e:
        logger.exception('缺少请求参数:%s' % str(e))
        ret = {"status": "error", "code":2002, "message": "参数不合法"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


def get_deploy_mysql_submit_info_controller(request):
    ret = deploy_mysql.get_deploy_mysql_submit_info()
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


def get_deploy_mysql_info_by_uuid_controller(request):
    """
    获取工单信息
    :param request:
    :return:
    """
    request_body = json.loads(str(request.body, encoding="utf-8"))
    try:
        submit_uuid = request_body['submit_uuid']
        ret = deploy_mysql.get_deploy_mysql_info_by_uuid(submit_uuid)
    except KeyError as e:
        logger.exception('缺少请求参数:%s' % str(e))
        ret = {"status": "error", "code": 2002, "message": "参数不合法"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


def get_deploy_mysql_log_controller(request):
    """
    获取部署日志
    :param request:
    :return:
    """
    request_body = json.loads(str(request.body, encoding="utf-8"))
    try:
        submit_uuid = request_body['submit_uuid']
        ret = deploy_mysql.get_deploy_mysql_log(submit_uuid)
    except KeyError as e:
        logger.exception('缺少请求参数:%s' % str(e))
        ret = {"status": "error", "code": 2002, "message": "参数不合法"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')