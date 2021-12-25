#!/bin/envs python
#-*- coding:utf-8 -*-
# @Ctime   : 2020/04/15 上午9:50
# @Author  : gaochao
# @File    : task.py

import time
from celery import task
from audit_sql.celery_task.check_sql_task import AsyncCheckSql
from audit_sql.celery_task.execute_sql_task import ExecuteSql
from audit_sql.celery_task.split_sql_task import AsyncSplitSql
import logging
logger = logging.getLogger('inception_execute_logger')
from apps.celery_task.callback import MyTaskCallback
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

@task(track_started=True, base=MyTaskCallback, bind=True)
def inception_check(task, des_ip, des_port, check_sql_uuid, check_sql_info, check_user,check_type,user_offer_rollback_sql):
    """
    异步审核SQL
    track_started=False:任务状态为pengding--->success|fail
    track_started=True:任务状态为pengding--->started--->success|fail
    如果使用bind=True,则异步方法第一个参数是task任务本身
    :param des_ip:
    :param des_port:
    :param check_sql_uuid:
    :param check_sql_info:
    :param check_user:
    :param check_type:
    :return:
    """
    task.update_state(state="recivied")
    check_sql_task = AsyncCheckSql(task,des_ip, des_port, check_sql_uuid, check_sql_info, check_user,check_type,user_offer_rollback_sql)
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