#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from django.http import HttpResponse
import json
import logging
from app_web_console.service import web_console
from apps.utils.base_view import BaseView
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
from apps.utils import common
logger = logging.getLogger('devops')


class GetaTableDataController(BaseView):
    def post(self, request):
        """
        获取数据
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "des_ip_port": [lambda x: common.CheckValidators.check_instance_name(x)['status'] == "ok"],
            "sql": [Required, Length(2, 10000)],
            "schema_name": [Required, Length(2, 64)],
            "explain": [Required, Length(2, 100)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        des_ip_port = request_body.get('des_ip_port')
        sql = request_body.get('sql')
        schema_name = request_body.get('schema_name')
        explain = request_body.get('explain')
        ret = web_console.get_table_data(des_ip_port, sql, schema_name, explain)
        return self.my_response(ret)


# def get_table_data_controller(request):
#     """
#     获取数据
#     :param request:
#     :return:
#     """
#     request_body = json.loads(str(request.body, encoding="utf-8"))
#     try:
#         des_ip_port = request_body('ip')
#         sql = request_body('sql')
#         schema_name = request_body('schema_name')
#         explain = request_body.get('explain')
#         ret = web_console.get_table_data(des_ip_port, sql, schema_name, explain)
#     except keyError as e:
#         logger.exception('缺少请求参数:%s' % str(e))
#         ret = {"status": "error", "code":2002, "message": "参数不合法"}
#     return HttpResponse(json.dumps(ret, default=str), 'application/json')



def get_schema_list_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    instance_name = request_body['instance_name']
    ret = web_console.get_schema_list(instance_name)
    return HttpResponse(json.dumps(ret, default=str), 'application/json')


def get_db_connect_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    instance_name = request_body['instance_name']
    ret = web_console.get_db_connect(instance_name)
    return HttpResponse(json.dumps(ret, default=str), 'application/json')

def get_table_list_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    instance_name = request_body['instance_name']
    schema_name = request_body['schema_name']
    table_name = request_body['table_name']
    ret = web_console.get_table_list(instance_name,schema_name,table_name)
    print(ret)
    return HttpResponse(json.dumps(ret, default=str), 'application/json')


def get_column_list_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    instance_name = request_body['instance_name']
    schema_name = request_body['schema_name']
    table_name = request_body['table_name']
    ret = web_console.get_column_list(instance_name,schema_name,table_name)
    return HttpResponse(json.dumps(ret, default=str), 'application/json')