#!/bin/envs python
#-*- coding:utf-8 -*-
# @Ctime   : 2020/04/15 上午9:50
# @Author  : gaochao
# @File    : task.py

import time
from celery import task
from apps.celery_task.install_mysql import InstallMysql
from apps.celery_task.cron_collect_mysql_info import CollectMysql


# ======================================= 定时任务================================
@task(time_limit=90, expires=5)
def sendmail(mail):
    time.sleep(20)
    print('sending mail to %s...' % mail)
    return('mail sent.')


# ======================================= 异步任务================================
@task
def install_mysql(submit_uuid, deploy_topos, deploy_version):
    """
    执行单个SQL任务
    :param params:
    :return:
    """
    install_mysql_task = InstallMysql(submit_uuid, deploy_topos, deploy_version)
    install_mysql_task.task_run()


@task
def collect_mysql():
    pool_count = 20
    collect_mysql_task = CollectMysql(pool_count)
    collect_mysql_task.task_run()