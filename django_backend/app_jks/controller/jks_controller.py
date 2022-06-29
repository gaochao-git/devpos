#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
from apps.utils.base_view import BaseView
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
from app_jks.service import jks

class InstallMysqlController(BaseView):
    def post(self, request):
        """
        安装数据库集群
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "deploy_topos": [Required, Length(2, 10000)],
            "mysql_version": [Required, Length(2, 64)],
            "job_name": [Required, Length(1, 64)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        deploy_type = request_body.get('deploy_type')
        deploy_version = request_body.get('mysql_version')
        deploy_topos = request_body.get('deploy_topos')
        job_name = request_body.get('job_name')
        install_ret = jks.install_mysql(job_name, deploy_type, deploy_version, deploy_topos)
        return self.my_response(install_ret)
