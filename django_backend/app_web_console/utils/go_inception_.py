#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2022/10/19 21:17 PM
# @Author  : 高超

import pymysql
import re
import json
from django.conf import settings
import logging
logger = logging.getLogger('devops')


#go_inception_host = settings.GO_INCEPTION_ADDRESS["go_inception_host"]
#go_inception_port = settings.GO_INCEPTION_ADDRESS["go_inception_port"]
go_inception_host = '47.104.2.74'
go_inception_port = 4000
inception_host = '47.104.2.74'
inception_port = 6669


class MyGoInception:
    def __init__(self, ip, port, sql, db='test'):
        self._host = ip
        self._port = port
        self._sql = sql
        self._db = db

    def parse_select_field(self):
        sql = f"""/*--user=gaochao;--password=fffjjj;--host=172.30.243.38;--masking=1;--port=3306;*/\
            inception_magic_start;
            use {self._db};
            {self._sql};
            inception_magic_commit;
        """
        conn = None
        try:
            conn = pymysql.connect(host=go_inception_host, user='', passwd='', db='', port=go_inception_port,charset="utf8")  # inception服务器
            cur = conn.cursor()
            cur.execute(sql)
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
            if conn: cur.close()
            if conn: conn.close()
            return content


