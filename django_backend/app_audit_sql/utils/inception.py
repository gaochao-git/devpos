#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import pymysql
import re
import logging
from django.conf import settings
logger = logging.getLogger('devops')

inception_host = settings.INCEPTION_ADDRESS["inception_host"]
inception_port = settings.INCEPTION_ADDRESS["inception_port"]


class MyInception:
    def __init__(self, ip, port, sql):
        self._host = ip
        self._port = int(port)
        self._sql = sql

    def _base_engine(self, base_sql, osc_config_sql=None):
        conn = None
        cur = None
        content = {"status": "error", "message": "inception 调用出现异常"}
        try:
            conn = pymysql.connect(host=inception_host, user='', passwd='', db='', port=inception_port,charset="utf8")  # inception服务器
            cur = conn.cursor()
            if osc_config_sql is None:
                cur.execute(base_sql)
                results = cur.fetchall()
            else:
                cur.execute(osc_config_sql)
                cur.execute(base_sql)
                results = cur.fetchall()
            data = [dict(zip([col[0] for col in cur.description], row)) for row in results]
            content = {'status': "ok", 'inception审核完成': "ok", 'data': data}
        except Exception as e:
            logger.exception("inception审核失败:%s", str(e))
            message = "调用inception出现异常"
            if re.findall('1875', str(e)):
                message = "语法错误"
            elif re.findall('2003', str(e)):
                message = "语法检测器无法连接"
            content = {'status': "error", 'message': message}
        finally:
            if cur: cur.close()
            if conn: conn.close()
            return content

    def check_sql(self):
        """
        sql检查
        :param check_sql_info:
        :return:
        """
        base_sql = f"""
            /*--user=gaochao;--password=fffjjj;--host={self._host};--check=1;--port={self._port};*/
           inception_magic_start;
           {self._sql}
           inception_magic_commit;
        """
        return self._base_engine(base_sql)

    def split_sql(self):
        """
        拆分SQL
        :return:
        """
        base_sql = f"""
            /*--user=gaochao;--password=fffjjj;--host={self._host};--port={self._port};--enable-split;*/
           inception_magic_start;
           {self._sql}
           inception_magic_commit;
        """
        return self._base_engine(base_sql)

    def execute_sql(self, inc_backup, inc_ignore_warn, inc_ignore_err, split_sql_file_path, osc_config_sql, inc_sleep):
        """
        执行SQL
        :param inc_backup:
        :param inc_ignore_warn:
        :param inc_ignore_err:
        :param split_sql_file_path:
        :param osc_config_sql:
        :param inc_sleep:
        :return:
        """
        logger.info("工单:%s调用inception开始执行SQL", split_sql_file_path)
        base_sql = f"""
            /*--user=gaochao;--password=fffjjj;--host={self._host};--port={self._port};--execute=1;--enable-remote-backup={inc_backup};--enable-ignore-warnings={inc_ignore_warn};--enable-force={inc_ignore_err};--sleep={inc_sleep}*/
            inception_magic_start;
            {self._sql}
            inception_magic_commit;
        """
        if osc_config_sql == "": osc_config_sql = None
        return self._base_engine(base_sql, osc_config_sql=osc_config_sql)

    def get_ddl_process(self, sqlsha1):
        """
        获取ddl进度
        :param sqlsha1:
        :return:
        """
        base_sql = f"inception get osc_percent '{sqlsha1}'"
        return self._base_engine(base_sql)

#
# # 页面调用inception检测SQL,如果根据cluster_name则需要先获取到对应的master_ip、master_port
# def check_sql(des_master_ip, des_master_port, check_sql_info):
#     sql = """/*--user=gaochao;--password=fffjjj;--host={};--check=1;--port={};*/\
#         inception_magic_start;
#         {}
#         inception_magic_commit;""".format(des_master_ip, des_master_port, check_sql_info)
#     conn = None
#     try:
#         conn = pymysql.connect(host=inception_host, user='', passwd='', db='', port=inception_port, charset="utf8")  # inception服务器
#         cur = conn.cursor()
#         cur.execute(sql)
#         results = cur.fetchall()
#         data = [dict(zip([col[0] for col in cur.description], row)) for row in results]
#         content = {'status': "ok", 'inception审核完成': "ok",'data': data}
#     except Exception as e:
#         logger.exception("inception审核失败:%s",str(e))
#         message = "调用inception出现异常"
#         if re.findall('1875', str(e)):
#             message = "语法错误"
#         elif re.findall('2003', str(e)):
#             message = "语法检测器无法连接"
#         content = {'status': "error", 'message': message}
#     finally:
#         if conn: cur.close()
#         if conn: conn.close()
#         return content
#
#
# # inception开始拆分
# def start_split_sql(master_ip, master_port, execute_sql):
#     # 拆分SQL
#     sql = """/*--user=gaochao;--password=fffjjj;--host={};--port={};--enable-split;*/\
#         inception_magic_start;
#         {}
#         inception_magic_commit;""".format(master_ip, master_port,execute_sql)
#     conn = None
#     try:
#         conn = pymysql.connect(host=inception_host, user='', passwd='', db='', port=inception_port, charset="utf8")  # inception服务器
#         cur = conn.cursor()
#         cur.execute(sql)
#         results = cur.fetchall()
#         data = [dict(zip([col[0] for col in cur.description], row)) for row in results]
#         content = {'status': "ok", 'inception审核完成': "ok", 'data': data}
#     except Exception as e:
#         logger.exception("inception拆分失败", str(e))
#         content = {'status': "error", 'message': str(e)}
#     finally:
#         if conn: cur.close()
#         if conn: conn.close()
#         return content
#
#
# # inception获取DDL执行进度
# def get_ddl_process(sqlsha1):
#     conn = None
#     try:
#         conn = pymysql.connect(host=inception_host, user='', passwd='', db='', port=inception_port,charset="utf8")  # inception服务器
#         cur = conn.cursor()
#         inception_get_osc_percent_sql = "inception get osc_percent '{}'".format(sqlsha1)
#         logger.info(inception_get_osc_percent_sql)
#         cur.execute(inception_get_osc_percent_sql)
#         results = cur.fetchall()
#         if results:
#             data = [dict(zip([col[0] for col in cur.description], row)) for row in results]
#             inception_execute_percent = data[0]['Percent']
#         else:
#             inception_execute_percent = 0
#         cur.close()
#         conn.close()
#     except Exception as e:
#         logger.error(str(e))
#     finally:
#         if conn: cur.close()
#         if conn: conn.close()
#         logger.info(inception_execute_percent)
#         return inception_execute_percent
#
#
# # inception执行SQL
# def execute_sql(des_ip, des_port, inc_backup,inc_ignore_warn, inc_ignore_err, execute_sql, split_sql_file_path, osc_config_sql,inc_sleep):
#     logger.info("工单:%s调用inception开始执行SQL", split_sql_file_path)
#     sql = """/*--user=gaochao;--password=fffjjj;--host={};--port={};--execute=1;--enable-remote-backup={};--enable-ignore-warnings={};--enable-force={};--sleep={}*/\
#         inception_magic_start;
#         {}
#         inception_magic_commit;""".format(des_ip, des_port, inc_backup, inc_ignore_warn, inc_ignore_err,inc_sleep, execute_sql)
#     conn = None
#     try:
#         conn = pymysql.connect(host=inception_host, user='', passwd='', db='', port=inception_port,charset="utf8")  # inception服务器
#         cur = conn.cursor()
#         if osc_config_sql == "":
#             cur.execute(sql)
#             results = cur.fetchall()
#         else:
#             cur.execute(osc_config_sql)
#             cur.execute(sql)
#             results = cur.fetchall()
#         data = [dict(zip([col[0] for col in cur.description], row)) for row in results]
#         content = {"status": "ok", "message": "ok", "data":data}
#         logger.info("工单%s调用inception执行SQL正常结束", split_sql_file_path)
#     except Exception as e:
#         content = {"status":"error", "message":e}
#         logger.error("工单%s调用inception执行SQL异常结束", split_sql_file_path)
#     finally:
#         if conn: cur.close()
#         if conn: conn.close()
#         return content