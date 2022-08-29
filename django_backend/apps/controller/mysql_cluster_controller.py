#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from django.http import HttpResponse
import json
import logging
from apps.service import mysql_cluster
from apps.dao import mysql_cluster_dao
from apps.utils.base_view import BaseView
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length

logger = logging.getLogger('devops')


# 获取所有集群信息
def get_mysql_cluster_controller(request):
    ret = mysql_cluster.get_mysql_cluster()
    return HttpResponse(json.dumps(ret), content_type='application/json')

# 获取集群实例信息
def get_mysql_cluster_ins_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    print(request_body)
    cluster_name = request_body.get('cluster_name')
    ins_role = request_body.get('ins_role')
    print(request_body)
    ret = mysql_cluster.get_mysql_cluster_ins(cluster_name, ins_role)
    return HttpResponse(json.dumps(ret), content_type='application/json')

# 模糊搜索集群名信息
def get_mysql_cluster_by_cluster_name_controller(request):
    to_str = str(request.body, encoding="utf-8")
    cluster_name = json.loads(to_str)['cluster_name']
    ret = mysql_cluster.get_mysql_cluster_by_cluster_name(cluster_name)
    return HttpResponse(json.dumps(ret), content_type='application/json')


def get_mysql_cluster_ins_info_controller(request):
    to_str = str(request.body, encoding="utf-8")
    cluster_name = json.loads(to_str)['cluster_name']
    ret = mysql_cluster.get_mysql_cluster_ins_info(cluster_name)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


class GetSchemaListController(BaseView):
    def post(self, request):
        """
        获取所有用户
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "schema_name": [Length(2, 64)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        schema_name = request_body.get('schema_name')
        ret = mysql_cluster_dao.get_schema_list_dao(schema_name)
        return self.my_response(ret)
