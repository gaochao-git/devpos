#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
from apps.utils.base_view import BaseView
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
from app_jks.service import jks
from app_jks.dao import jks_dao
from app_jks.utils.jks_util import job_builds_dict


class JobListController(BaseView):
    def post(self, request):
        """
        列出指定job任务
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "job_name": [Required, Length(1, 64)],
            # "user_name": [Required, Length(1, 64)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        job_name = request_body.get('job_name')
        job_db_data_ret = jks_dao.get_job_data_dao(job_name)
        assert job_db_data_ret['status'] == "ok"
        job_db_data = job_db_data_ret['data']
        jks_data = job_builds_dict(job_name,100)
        for queue_data in job_db_data:
            if jks_data.get(queue_data["queue_id"]):
                queue_data.update(**jks_data[queue_data["queue_id"]])

        ret = {"status":"ok","message":"ok","data":job_db_data}
        print(ret)
        return self.my_response(ret)



class JobLogController(BaseView):
    def post(self, request):
        """
        查看任务日志
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "job_name": [Required, Length(1, 64)],
            "job_number": [Required, InstanceOf(int)],
            "job_queue_id": [Required, InstanceOf(int)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        job_name = request_body.get('job_name')
        job_number = request_body.get('job_number')
        job_queue_id = request_body.get('job_queue_id')
        job_log = jks.job_log(job_name, job_number, job_queue_id)

        ret = {"status":"ok","message":"ok","data":job_log}
        print(ret)
        return self.my_response(ret)



class JobStopController(BaseView):
    def post(self, request):
        """
        停止任务
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "job_name": [Required, Length(1, 64)],
            "job_number": [Required, InstanceOf(int)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        job_name = request_body.get('job_name')
        job_number = request_body.get('job_number')
        ret = jks.job_stop(job_name, job_number)
        return self.my_response(ret)

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
        user_name = self.request_user_info.get('username')
        install_ret = jks.install_mysql(user_name, request_body)
        return self.my_response(install_ret)
