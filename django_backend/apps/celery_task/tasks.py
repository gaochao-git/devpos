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
def inception_execute(params):
    """
    执行单个SQL任务
    :param params:
    :return:
    """
    execute_sql_task = ExecuteSql(params)
    execute_sql_task.task_run()


@task
def install_mysql(submit_uuid, deploy_topos, deploy_version):
    """
    执行单个SQL任务
    :param params:
    :return:
    """
    install_mysql_task = InstallMysql(submit_uuid, deploy_topos, deploy_version)
    install_mysql_task.task_run()