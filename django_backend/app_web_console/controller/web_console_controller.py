#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from django.http import HttpResponse
import json
import logging
from app_web_console.service import web_console
from  app_web_console.dao import web_console_dao
from apps.utils.base_view import BaseView
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
from apps.utils.my_validator import validate_instance_name
from apps.utils import common
from django import forms
logger = logging.getLogger('devops')


class TestForm(forms.Form):
    des_ip_port = forms.CharField(validators=[validate_instance_name])
    sql = forms.CharField(required=True, min_length=3,
                          error_messages={"required": "sql 为必填", "min_length": "sql 长度不合法"})
    schema_name = forms.CharField(required=True, min_length=3, max_length=64,
                                  error_messages={"required": "sql 为必填", "min_length": "sql 长度不合法最少为3",
                                                  "max_length": "sql 长度不合法最长为64"})

    def err_msg(self):
        """
        每次只返回一个错误,防止大量错误影响可读性
        :return:
        """
        msg = self.errors.get_json_data()
        for k, v in msg.items():
            return v[0].get('message')


class GetTableDataController(BaseView):
    def post(self, request):
        """
        获取数据
        :param request:
        :return:
        """
        request_body = self.request_params
        # 验证参数方法1
        valid_obj = TestForm(request_body)
        if not valid_obj.is_valid():
            return self.my_response({"status": "error", "message": valid_obj.err_msg()})
        # 验证参数方法2
        rules = {
            "des_ip_port": [lambda x: common.CheckValidators.check_instance_name(x)['status'] == "ok"],
            "sql": [Required, Length(2, 10000),],
            "schema_name": [Required, Length(2, 64),],
            "explain": [Required, Length(2, 100)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        des_ip_port = request_body.get('des_ip_port')
        sql = request_body.get('sql')
        explain = request_body.get('explain')
        schema_name = request_body.get('schema_name')
        if schema_name=="选择库名": schema_name=None
        ret = web_console.get_table_data(des_ip_port, sql, schema_name, explain)
        return self.my_response(ret)


class GetFavoriteController(BaseView):
    def get(self, request):
        """
        获取收藏信息
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "favorite_type": [Required, In(['db_source', 'db_sql'])],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        favorite_type = request_body.get('favorite_type')
        ret = web_console.get_favorite_data(favorite_type)
        return self.my_response(ret)


class AddFavoriteController(BaseView):
    def post(self, request):
        """
        添加收藏信息
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "favorite_type": [Required, In(['db_source', 'db_sql'])],
            "favorite_name": [Required, Length(2, 64)],
            "favorite_detail": [Required, Length(2, 10000)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        favorite_type = request_body.get('favorite_type')
        favorite_name = request_body.get('favorite_name')
        favorite_detail = request_body.get('favorite_detail')
        config_user_name = self.request_user_info.get('username')
        ret = web_console_dao.add_favorite_dao(config_user_name, favorite_type, favorite_name, favorite_detail)
        return self.my_response(ret)


class DelFavoriteController(BaseView):
    def post(self, request):
        """
        删除收藏信息
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "favorite_name": [Required, Length(2, 64)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        favorite_name = request_body.get('favorite_name')
        config_user_name = self.request_user_info.get('username')
        ret = web_console_dao.del_favorite_dao(config_user_name, favorite_name)
        return self.my_response(ret)


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


class GetDbInfoController(BaseView):
    def get(self, request):
        """
        获取收藏信息
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "des_ip_port": [lambda x: common.CheckValidators.check_instance_name(x)['status'] == "ok"],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        des_ip_port = request_body.get('des_ip_port')
        ret = web_console_dao.get_db_info_dao(des_ip_port)
        return self.my_response(ret)
