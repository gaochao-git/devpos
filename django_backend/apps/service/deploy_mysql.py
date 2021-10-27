#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
import uuid
from apps.dao import deploy_mysql_dao
from apps.celery_task.tasks import install_mysql


logger = logging.getLogger('devops')


def submit_install_mysql(deploy_topos, idc, deploy_version, deploy_archit):
    """
    提交部署mysql任务
    :param topo_source:
    :param port:
    :param version:
    :return:
    """
    ret = deploy_mysql_dao.submit_install_mysql_dao(deploy_topos, idc, deploy_version, deploy_archit)
    return ret
    # if ret['status'] != "ok": return ret
    # try:
    #     task_id = install_mysql.delay(topo_source, port, version)
    #     if task_id:
    #         print("推送celery成功:",task_id)
    #     else:
    #         print("推送celery失败")
    # except Exception as e:
    #     logger.exception(e)


def deploy_mysql_by_uuid(submit_uuid, deploy_topos, deploy_version):
    """
    部署mysql
    :param submit_uuid:
    :return:
    """
    try:
        task_id = install_mysql.delay(submit_uuid, deploy_topos, deploy_version)
        if task_id:
            logger.info("推送celery成功:",task_id)
            ret = deploy_mysql_dao.set_task_celery_dao(submit_uuid)
            if ret['status'] != "ok": return ret
            status = "ok"
            message = "推送celery成功"
        else:
            logger.error("推送celery失败")
            status = "error"
            message = "推送celery失败"
    except Exception as e:
        logger.exception(e)
        status = "error"
        message = "推送celery失败：%s" % str(e)
    return {"status":status, "message": message}


def get_deploy_mysql_submit_info():
    """
    获取所有工单信息
    :return:
    """
    ret = deploy_mysql_dao.get_deploy_mysql_submit_info_dao()
    return ret


def get_deploy_mysql_info_by_uuid(submit_uuid):
    """
    获取工单信息
    :param submit_uuid:
    :return:
    """
    ret = deploy_mysql_dao.get_deploy_mysql_info_by_uuid_dao(submit_uuid)
    return ret


def get_deploy_mysql_log(submit_uuid):
    """
    获取部署日志
    :param submit_uuid:
    :return:
    """
    ret = deploy_mysql_dao.get_deploy_mysql_log_dao(submit_uuid)
    return ret


def pass_submit_deploy_mysql_by_uuid(submit_uuid,check_status,check_username,check_comment):
    """
    审核部署工单
    :param submit_uuid:
    :param check_status:
    :param check_user_name:
    :param check_comment:
    :return:
    """
    ret = deploy_mysql_dao.pass_submit_deploy_mysql_by_uuid_dao(submit_uuid,check_status,check_username,check_comment)
    return ret