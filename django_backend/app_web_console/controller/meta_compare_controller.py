#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from django.http import HttpResponse
import json
import logging
from app_web_console.service import web_console
from  app_web_console.dao import meta_compare_dao
from apps.utils.base_view import BaseView
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
from apps.utils import common
logger = logging.getLogger('devops')


class CompareTableController(BaseView):
    def post(self, request):
        """
        对比表结构
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "source_info": [Required, Length(2, 10000)],
            "target_info": [Required, Length(2, 10000)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        source_info = request_body.get('source_info')
        target_info = request_body.get('target_info')
        ret = meta_compare_dao.compare_table_meta_dao(source_info, target_info)
        return self.my_response(ret)


class GetSourceTargetTableMetaController(BaseView):
    def post(self, request):
        """
        获取源与目标表结构
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "source_info": [Required, Length(2, 10000)],
            "target_info": [Required, Length(2, 10000)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        source_info = request_body.get('source_info')
        target_info = request_body.get('target_info')
        ret = meta_compare_dao.get_source_target_table_meta_dao(source_info, target_info)
        return self.my_response(ret)
