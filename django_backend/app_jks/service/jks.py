#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
from app_jks.utils.ansible_parse import ini2json
import jenkins
from apps.utils.common import CheckValidators

logger = logging.getLogger('devops')


def install_mysql(job_name, deploy_type, deploy_version, deploy_topos):
    """
    安装mysql
    :param job_name:
    :param deploy_type:
    :param deploy_version:
    :param deploy_topos:
    :return:
    """
    hosts_info = ini2json(deploy_topos)
    print(hosts_info)
    for k, v in hosts_info.items():
        ip = k
        port = v.get('port')
        instance_name = ip + '_' + str(port)
        cluster_name = v.get('cluster_name')
        cluster_group_name = v.get('cluster_group_name')
        ha_type = v.get('ha_type')
        if CheckValidators.check_ip(ip)['status'] != "ok": return {"status":"error", "message": "%s ip不合法" % ip}
        if CheckValidators.check_port(port)['status'] != 'ok': return {"status":"error", "message": "%s port不合法" % ip}
    params_dict = {}
    params_dict['topos'] = deploy_topos
    try:
        server = jenkins.Jenkins('http://47.104.2.74:8080', username='gaochao', password='gaochao417326', timeout=3)
        next_bn = server.get_job_info(job_name)['nextBuildNumber']
        queue_number = server.build_job(job_name, parameters=params_dict)
        queue_info = server.get_queue_item(queue_number)
        print("next_build_number: %s" % next_bn)
        print("current_queue_number: %s" % queue_number)
        print("current_queue_info: %s" % queue_info)
        print(server.get_job_info(job_name))
        return {"status": "ok", "message": "下发任务成功","data": queue_number}
    except Exception as e:
        print(e)
        return {"status": "error", "message": "下发任务失败"}