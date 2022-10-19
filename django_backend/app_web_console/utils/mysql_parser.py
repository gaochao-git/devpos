#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2022/10/19 21:17 PM
# @Author  : 高超

import pymysql
from django.conf import settings
import logging
logger = logging.getLogger('devops')


mysql_parser_host = settings.MYSQL_PARSER_ADDRESS["mysql_parser_host"]
mysql_parser_port = settings.MYSQL_PARSER_ADDRESS["mysql_parser_port"]
mysql_parser_user = settings.MYSQL_PARSER_ADDRESS["mysql_parser_user"]
mysql_parser_pwd = settings.MYSQL_PARSER_ADDRESS["mysql_parser_pwd"]


class MyParser:
    def __init__(self,sql, db='test'):
        self.sql = '/*parse*/' + sql
        self.db = db

    def parse_sql(self):
        conn = None
        cur = None
        try:
            logger.info('mysql parser 开始解析')
            conn = pymysql.connect(
                host=mysql_parser_host,
                port=int(mysql_parser_port),
                user=mysql_parser_user,
                passwd=mysql_parser_pwd,
                charset='utf8',
                connect_timeout=3,
                autocommit=True
            )
            cur = conn.cursor()
            cur.execute(f"create database if not exists {self.db}")
            cur.execute(f"use {self.db}")
            cur.execute(self.sql)
            results = cur.fetchall()
            data = [dict(zip([col[0] for col in cur.description], row)) for row in results]
            content = {'status': "ok", 'message': "解析SQL完成", 'data': data[0]}
            logger.info('mysql parser 解析SQL完成')
        except Exception as e:
            content = {'status': "error", 'message': "mysql parser 解析SQL失败:%s" % str(e)}
            logger.exception(e)
        finally:
            if cur: cur.close()
            if conn: conn.close()
            return content