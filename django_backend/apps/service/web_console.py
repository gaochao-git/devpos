#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
from apps.dao import web_console_dao

logger = logging.getLogger('devops')


def get_table_data(ip, port, sql):
    """
    获取数据
    :param ip:
    :param port:
    :param sql:
    :return:
    """
    return web_console_dao.get_table_data_dao(ip, port, sql)
