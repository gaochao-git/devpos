#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging
import pymysql

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


def add_jks_config_dao(user_name, jks_job_name, jks_job_comment, jks_job_params_kv):
    """
    增加jks任务配置
    :param user_name:
    :param jks_job_name:
    :param jks_job_comment:
    :param jks_job_params_kv:
    :return:
    """
    jks_job_comment = pymysql.escape_string(jks_job_comment)
    jks_job_params_kv = pymysql.escape_string(str(jks_job_params_kv))
    print(jks_job_name, jks_job_comment, jks_job_params_kv)
    sql = f"""
        insert into jks_task_config(jks_job_name,jks_job_params,jks_job_comment,create_by,update_by) 
        values('{jks_job_name}','{jks_job_params_kv}','{jks_job_comment}','{user_name}','{user_name}')
    """
    return db_helper.dml(sql)


def get_jks_config_list_dao():
    """
    获取所有jks任务配置
    :return:
    """
    sql = """
        select  jks_job_name,jks_job_params,jks_job_comment,create_by,update_by,create_time,update_time
        from jks_task_config
    """
    return db_helper.find_all(sql)


def get_jks_config_detail_dao(jks_job_name):
    """
    获取jks任务配置详情
    :param jks_job_name:
    :return:
    """
    sql = f"""
            select  jks_job_name,jks_job_params,jks_job_comment,create_by,update_by,create_time,update_time
            from jks_task_config where jks_job_name='{jks_job_name}'
        """
    return db_helper.find_all(sql)


def modify_jks_config_dao(user_name, jks_job_name,jks_job_comment,jks_job_params_kv):
    """
    修改任务配置
    :param user_name:
    :param jks_job_name:
    :param jks_job_comment:
    :param jks_job_params_kv:
    :return:
    """
    check_sql = f"select 1 from jks_task_config where jks_job_name='{jks_job_name}'"
    check_ret = db_helper.find_all(check_sql)
    if len(check_ret['data']) == 0: return {"status":"error","message":"任务不存在"}
    sql = f"""
        update jks_task_config 
        set jks_job_params='{jks_job_params_kv}',jks_job_comment='{jks_job_comment}',update_by='{user_name}'
        where jks_job_name='{jks_job_name}'
    """
    return db_helper.dml(sql)


def del_jks_config_dao(jks_job_name):
    """
    删除配置任务
    :param jks_job_name:
    :return:
    """
    check_sql = f"select 1 from jks_task_config where jks_job_name='{jks_job_name}'"
    check_ret = db_helper.find_all(check_sql)
    if len(check_ret['data']) == 0: return {"status": "error", "message": "任务不存在"}
    sql = f"""
            delete from jks_task_config where jks_job_name='{jks_job_name}'            
        """
    return db_helper.dml(sql)