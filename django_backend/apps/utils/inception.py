#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import pymysql
import re
import logging
from django_backend.settings import INCEPTION_ADDRESS
logger = logging.getLogger('inception_execute_logger')

inception_host = INCEPTION_ADDRESS["inception_host"]
inception_port = INCEPTION_ADDRESS["inception_port"]


# 页面调用inception检测SQL,如果根据cluster_name则需要先获取到对应的master_ip、master_port
def check_sql(des_master_ip, des_master_port, check_sql_info):
    sql = """/*--user=wthong;--password=fffjjj;--host={};--check=1;--port={};*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(des_master_ip, des_master_port, check_sql_info)
    try:
        conn = pymysql.connect(host=inception_host, user='', passwd='', db='', port=inception_port, charset="utf8")  # inception服务器
        cur = conn.cursor()
        cur.execute(sql)
        result = cur.fetchall()
        data = [dict(zip([col[0] for col in cur.description], row)) for row in result]
        cur.close()
        conn.close()
        content = {'status': "ok", 'inception审核完成': "ok",'data': data}
    except Exception as e:
        logger.error("inception审核失败",str(e))
        message = str(e)
        if re.findall('1875', str(e)):
            message = "语法错误"
        elif re.findall('2003', str(e)):
            message = "语法检测器无法连接"
        content = {'status': "error", 'message': message}
    logger.error(content)
    return content


# inception开始拆分
def start_split_sql(master_ip, master_port, execute_sql):
    # 拆分SQL
    sql = """/*--user=wthong;--password=fffjjj;--host={};--port={};--enable-split;*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(master_ip, master_port, execute_sql)
    try:
        conn = pymysql.connect(host=inception_host, user='', passwd='', db='', port=inception_port, charset="utf8")  # inception服务器
        cur = conn.cursor()
        cur.execute(sql)
        sql_tuple = cur.fetchall()
    except Exception as e:
        logger.error(str(e))
    finally:
        cur.close()
        conn.close()
        return sql_tuple


# inception获取DDL执行进度
def get_ddl_process(sqlsha1):
    try:
        conn = pymysql.connect(host=inception_host, user='', passwd='', db='', port=inception_port,charset="utf8")  # inception服务器
        cur = conn.cursor()
        inception_get_osc_percent_sql = "inception get osc_percent '{}'".format(sqlsha1)
        logger.info(inception_get_osc_percent_sql)
        cur.execute(inception_get_osc_percent_sql)
        result = cur.fetchall()
        if result:
            data = [dict(zip([col[0] for col in cur.description], row)) for row in result]
            inception_execute_percent = data[0]['Percent']
        else:
            inception_execute_percent = 0
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(str(e))
    logger.info(inception_execute_percent)
    return inception_execute_percent


# inception执行SQL
def execute_sql(des_master_ip, des_master_port, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error, execute_sql,submit_sql_uuid,osc_config_sql):
    logger.info("[工单:%s],调用inception开始执行SQL", submit_sql_uuid)
    sql = """/*--user=wthong;--password=fffjjj;--host={};--port={};--execute=1;--enable-remote-backup={};--enable-ignore-warnings={};--enable-force={};*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(des_master_ip, des_master_port, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error, execute_sql)
    try:
        conn = pymysql.connect(host=inception_host, user='', passwd='', db='', port=inception_port,charset="utf8")  # inception服务器
        cur = conn.cursor()
        if osc_config_sql == "":
            cur.execute(sql)
            results = cur.fetchall()
        else:
            cur.execute(osc_config_sql)
            cur.execute(sql)
            results = cur.fetchall()
        content = {"status": "ok", "message": "ok", "data":results}
        logger.info("[工单:%s],调用inception执行SQL正常结束", submit_sql_uuid)
    except Exception as e:
        content = {"status":"error", "message":e}
        logger.error("[工单:%s],调用inception执行SQL异常结束", submit_sql_uuid)
    finally:
        cur.close()
        conn.close()
        return content