#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
from app_jks.utils.ansible_parse import ini2json
import jenkins
from app_jks.utils.jks_util import MyJenkins,job_builds_dict
from apps.utils.common import CheckValidators
logger = logging.getLogger('devops')


def job_list(job_name):
    """
    列出指定job任务
    :param job_name:
    :return:
    """
    ret = job_builds_dict("install_mysql")
    print(ret)


def install_mysql(user_name, request_body):
    """
    安装mysql
    :param user_name:
    :param job_name:
    :param deploy_type:
    :param deploy_version:
    :param deploy_topos:
    :return:
    """
    deploy_topos = request_body.get('deploy_topos')
    hosts_info = ini2json(deploy_topos)
    for k, v in hosts_info.items():
        ip = k
        port = v.get('port')
        instance_name = ip + '_' + str(port)
        cluster_name = v.get('cluster_name')
        cluster_group_name = v.get('cluster_group_name')
        ha_type = v.get('ha_type')
        if CheckValidators.check_ip(ip)['status'] != "ok": return {"status":"error", "message": "%s ip不合法" % ip}
        if CheckValidators.check_port(port)['status'] != 'ok': return {"status":"error", "message": "%s port不合法" % ip}
    params_dict = {'topos':deploy_topos}
    server = MyJenkins()
    queue_ret = server.run_job(user_name, request_body, **params_dict)
    if queue_ret['status'] != "ok": return queue_ret
    return {"status": "ok", "message": "下发任务成功","data": queue_ret.get('queue_id')}


def job_log(job_name, job_number, job_queue_id):
    """
    从jenkins获取执行日志
    :param job_name:
    :param job_number:
    :param job_queue_id:
    :return:
    """
    req_params = {
        "job_name": job_name,
        "job_number": job_number,
        "job_queue_id": job_queue_id
    }
    server = MyJenkins()
    data = server.dynamic_job_info(**req_params)
    return data


def job_stop(job_name, job_number):
    """
    停止任务
    :param job_name:
    :param job_number:
    :return:
    """
    server = MyJenkins()
    try:
        server.stop_build(job_name, job_number)
        ret = {"status":"ok", "message":"下发停止任务成功"}
    except Exception as e:
        ret = {"status": "error", "message": "停止任务失败%s" % str(e)}
    return ret