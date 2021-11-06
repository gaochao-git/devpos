#!/bin/envs python
#-*- coding:utf-8 -*-
# @Ctime   : 2020/04/15 上午9:50
# @Author  : gaochao
# @File    : task.py

import time
from celery import task
from apps.utils import db_helper
from django.db import connection
from apps.utils import inception
from apps.dao import audit_sql_dao
from apps.celery_task.execute_sql_task import ExecuteSql
from apps.celery_task.check_sql_task import AsyncCheckSql
from apps.celery_task.split_sql_task import AsyncSplitSql
from apps.celery_task.install_mysql import InstallMysql
import logging
logger = logging.getLogger('inception_execute_logger')
import pymysql
# ======================================= 定时任务================================
@task
def sendmail(mail):
    print('sending mail to %s...' % mail['to'])
    time.sleep(100.0)
    print('mail sent.')
    return('mail sent.')


# ======================================= 异步任务================================
@task
def inception_execute(des_ip, des_port, inc_bak, inc_war, inc_err,file_path, submit_sql_uuid, inc_sleep, exe_user_name):
    """
    执行单个SQL文件任务
    :param des_ip:
    :param des_port:
    :param inc_bak:
    :param inc_war:
    :param inc_err:
    :param file_path:
    :param submit_sql_uuid:
    :param osc_config_sql:
    :param inc_sleep:
    :param exe_user_name:
    :return:
    """
    execute_sql_task = ExecuteSql(des_ip, des_port, inc_bak, inc_war, inc_err,file_path, submit_sql_uuid,
                                  inc_sleep, exe_user_name)
    execute_sql_task.task_run()

@task(track_started=True)
def inception_check(des_ip, des_port, submit_sql_uuid,check_sql, check_user_name,check_type="check_sql"):
    """
    异步审核SQL
    :param des_ip:
    :param des_port:
    :param submit_sql_uuid:
    :param check_sql:
    :param check_user_name:
    :return:
    """
    print(check_type)
    check_sql_task = AsyncCheckSql(des_ip, des_port, submit_sql_uuid,check_sql, check_user_name,check_type)
    check_sql_task.task_run()


@task
def inception_split(submit_sql_uuid, ticket_info, cal_des_ip, cal_des_port, check_status, check_comment,
                    login_user_name, login_user_name_role):
    """
    异步拆分SQL并标记工单审核状态
    :param submit_sql_uuid: 
    :param ticket_info: 
    :param cal_des_ip: 
    :param cal_des_port: 
    :param check_status: 
    :param check_comment: 
    :param login_user_name: 
    :param login_user_name_role: 
    :return: 
    """"""
    """
    split_sql_task = AsyncSplitSql(submit_sql_uuid, ticket_info, cal_des_ip, cal_des_port, check_status, check_comment,
                                   login_user_name, login_user_name_role)
    split_sql_task.task_run()


@task
def install_mysql(submit_uuid, deploy_topos, deploy_version):
    """
    执行单个SQL任务
    :param params:
    :return:
    """
    install_mysql_task = InstallMysql(submit_uuid, deploy_topos, deploy_version)
    install_mysql_task.task_run()