#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
from apps.dao import web_console_dao

logger = logging.getLogger('devops')


def get_table_data(ip, port, sql, schema_name, explain):
    """
    获取数据
    :param ip:
    :param port:
    :param sql:
    :return:
    """
    return web_console_dao.get_table_data_dao(ip, port, sql, schema_name, explain)


def get_schema_list(instance_name):
    """
    获取所有库名
    :param instance_name:
    :return:
    """
    return web_console_dao.get_schema_list_dao(instance_name)

def get_db_connect(instance_name):
    """
    探活
    :param instance_name:
    :return:
    """
    return web_console_dao.get_db_connect_dao(instance_name)


def get_table_list(instance_name,schema_name):
    """
    获取库中所有表
    :param schema_name:
    :return:
    """
    return web_console_dao.get_table_list_dao(instance_name,schema_name)


def get_column_list(instance_name,schema_name,table_name):
    """
    获取表中的列
    :param instance_name:
    :param schema_name:
    :param table_name:
    :return:
    """
    return web_console_dao.get_column_list_dao(instance_name,schema_name,table_name)