#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging

logger = logging.getLogger('sql_logger')


def get_table_data_dao(ip, port, sql):
    """
    获取数据
    :param ip:
    :param port:
    :param sql:
    :return:
    """
    return db_helper.target_source_find_all(ip, port, sql)