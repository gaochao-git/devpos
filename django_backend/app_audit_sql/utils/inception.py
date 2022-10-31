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