#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging
import sqlparse

logger = logging.getLogger('sql_logger')


def get_table_data_dao(ip, port, sql, schema_name):
    """
    获取数据
    :param ip:
    :param port:
    :param sql:
    :return:
    """
    i = 0
    ret_list = []
    query_time_list = []
    sql_list = sqlparse.split(sql)
    for item_sql in sql_list:
        k_v_data = {}
        k_v_time = {}
        ret = db_helper.target_source_find_all(ip, port, item_sql, db=schema_name)
        if ret['status'] !='ok':
            return ret
        k_v_data[i] = ret['data']
        k_v_time[i] = ret['query_time']
        i = i + 1
        ret_list.append(k_v_data)
        query_time_list.append(k_v_time)
    print(ret_list)
    return {"status":"ok","message": "所有SQL正常执行完成","data":ret_list, "query_time": query_time_list}