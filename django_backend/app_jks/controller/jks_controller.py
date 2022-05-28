#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import time
from django.http import HttpResponse
import json
import uuid
import logging
from app_web_console.service import web_console
from  app_web_console.dao import web_console_dao
from apps.utils.base_view import BaseView
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
from apps.utils import common
import jenkins
logger = logging.getLogger('devops')


class InstallMysqlController(BaseView):
    def post(self, request):
        """
        安装数据库集群
        :param request:
        :return:
        """
        request_body = self.request_params
        deploy_topos = request_body['deploy_topos']
        idc = request_body['idc']
        deploy_version = request_body['deploy_version']
        deploy_archit = request_body['deploy_archit']
        request_body = self.request_params
        rules = {
            "idc": [Required, Length(2, 10000)],
            "deploy_topos": [Required, Length(2, 10000)],
            "deploy_version": [Required, Length(2, 64)],
            "deploy_archit": [Required, Length(1, 64)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        idc = request_body.get('idc')
        deploy_version= request_body.get('deploy_version')
        deploy_topos = request_body.get('deploy_topos')
        deploy_archit = request_body.get('deploy_archit')
        params_dict = {}
        params_dict['mysql_version'] = deploy_version
        params_dict['iplist'] = uuid.uuid4()
        print(params_dict)
        try:
            server = jenkins.Jenkins('http://47.104.2.74:8080', username='gaochao', password='gaochao417326',timeout=3)
            next_bn = server.get_job_info('test')['nextBuildNumber']
            queue_number = server.build_job('test', parameters=params_dict)
            queue_info = server.get_queue_item(queue_number)
            print("next_build_number: %s" % next_bn)
            print("current_queue_number: %s" % queue_number)
            print("current_queue_info: %s" % queue_info)
            print(server.get_job_info('test'))
        except Exception as e:
            print(e)
        ret = {"status":"ok","message":"下发任务成功"}
        return self.my_response(ret)
