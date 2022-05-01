#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper


def get_task_info_dao():
    """
    获取所有定时任务
    :return:
    """
    sql = """
        select 
            name,task,args,kwargs,queue,exchange,routing_key,expires,
            enabled,last_run_at,total_run_count,date_changed,
            description,crontab_id,interval_id 
        from djcelery_periodictask"""
    return db_helper.find_all(sql)

