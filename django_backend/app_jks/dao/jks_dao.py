#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging
import sqlparse
from sqlparse.tokens import Keyword

logger = logging.getLogger('sql_logger')


def get_job_data_dao(job_name):
    """
    获取jks表里的任务
    :param job_name:
    :return:
    """
    sql = f"""
        select user_name,job_name,queue_id,job_params,create_time,update_time
        from jks_task_info
        where job_name='{job_name}'
    """
    return db_helper.find_all(sql)