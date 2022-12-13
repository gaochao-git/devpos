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
import json
from app_jks.utils.jks_util import MyJenkins,job_builds_dict

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



class AddJksConfigController(BaseView):
    def post(self, request):
        """
        增加jks任务配置
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "jks_job_name": [Required, Length(2, 100)],
            "jks_job_comment": [Required, Length(2, 10000)],
            "jks_job_params_kv": [Required, InstanceOf(list)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        user_name = self.request_user_info.get('username')
        jks_job_name = self.request_params.get('jks_job_name')
        jks_job_comment = self.request_params.get('jks_job_comment')
        jks_job_params_kv = self.request_params.get('jks_job_params_kv')
        jks_job_params_kv = json.dumps(jks_job_params_kv, ensure_ascii=False)
        ret = jks_dao.add_jks_config_dao(user_name, jks_job_name,jks_job_comment,jks_job_params_kv)
        return self.my_response(ret)


class GetJksJobConfigListController(BaseView):
    def post(self, request):
        """
        获取所有任务配置
        :param request:
        :return:
        """
        ret = jks_dao.get_jks_config_list_dao()
        return self.my_response(ret)


class GetJksJobConfigDetailController(BaseView):
    def post(self, request):
        """
        获取任务详情
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "jks_job_name": [Required, Length(2, 100)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        jks_job_name = self.request_params.get('jks_job_name')
        ret = jks_dao.get_jks_config_detail_dao(jks_job_name)
        return self.my_response(ret)


class ModifyJksConfigController(BaseView):
    def post(self, request):
        """
        修改jks任务配置
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "jks_job_name": [Required, Length(2, 100)],
            "jks_job_comment": [Required, Length(2, 10000)],
            "jks_job_params_kv": [Required, InstanceOf(list)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        user_name = self.request_user_info.get('username')
        jks_job_name = self.request_params.get('jks_job_name')
        jks_job_comment = self.request_params.get('jks_job_comment')
        jks_job_params_kv = self.request_params.get('jks_job_params_kv')
        jks_job_params_kv = json.dumps(jks_job_params_kv, ensure_ascii=False)
        ret = jks_dao.modify_jks_config_dao(user_name, jks_job_name,jks_job_comment,jks_job_params_kv)
        return self.my_response(ret)


class DelJksConfigController(BaseView):
    def post(self, request):
        """
        删除jks任务配置
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "jks_job_name": [Required, Length(2, 100)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        jks_job_name = self.request_params.get('jks_job_name')
        ret = jks_dao.del_jks_config_dao(jks_job_name)
        return self.my_response(ret)

class DispatchJksJobController(BaseView):
    def post(self, request):
        """
        执行jks任务
        :param request:
        :return:
        """
        user_name = self.request_user_info.get('username')
        request_body = self.request_params
        rules = {
            "jks_job_name": [Required, Length(2, 100)],
            "jks_job_params": [Required, InstanceOf(list)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        jks_job_name = self.request_params.get('jks_job_name')
        jks_job_params = self.request_params.get('jks_job_params')
        # 组装jks格式参数
        params_dict = {}
        for i in jks_job_params: params_dict[i['params_name']] = i['params_value']
        # 调用JKS
        print(params_dict)
        jks_engine = MyJenkins()
        queue_ret = jks_engine.run_job(user_name, request_body, **params_dict)
        print(queue_ret)
        if queue_ret['status'] != "ok": return self.my_response(queue_ret)
        ret = {"status": "ok", "message": "下发任务成功", "data": queue_ret.get('queue_id')}
        return self.my_response(ret)


