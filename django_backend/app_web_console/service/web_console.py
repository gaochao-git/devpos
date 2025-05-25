#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
import pymysql
from app_web_console.dao import web_console_dao
from utils.go_inception_ import MyGoInception

logger = logging.getLogger('devops')


def get_table_data(des_ip_port, sql, schema_name, type):
    """
    获取数据
    :param ip:
    :param port:
    :param sql:
    :return:
    """
    return web_console_dao.get_table_data_dao(des_ip_port, sql, schema_name, type)


def get_favorite_data(favorite_type):
    """
    获取收藏信息
    :param favorite_type:
    :return:
    """
    return web_console_dao.get_favorite_data_dao(favorite_type)

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


def get_table_list(instance_name,schema_name,table_name):
    """
    获取库中所有表
    :param schema_name:
    :return:
    """
    return web_console_dao.get_table_list_dao(instance_name,schema_name,table_name)


def get_column_list(instance_name,schema_name,table_name):
    """
    获取表中的列
    :param instance_name:
    :param schema_name:
    :param table_name:
    :return:
    """
    return web_console_dao.get_column_list_dao(instance_name,schema_name,table_name)


def check_generate_sql(des_ip_port, des_schema_name, generate_sql):
    """
    调用inception校验语法
    :param des_ip_port:
    :param des_schema_name:
    :param generate_sql:
    :return:
    """
    ip = '47.95.3.120'
    port = 3306
    generate_sql = f'use {des_schema_name};' + '\n' + generate_sql
    inception_engine = MyGoInception(ip, port, generate_sql)
    parse_ret = inception_engine.check_sql_go_to_c()
    return parse_ret


def save_design_table_snap_shot(generate_sql, data_source, index_source, table_engine, table_charset, table_comment):
    """
    将设计表信息暂存
    :param generate_sql: 
    :param data_source: 
    :param index_source: 
    :param table_engine: 
    :param table_charset: 
    :param table_comment: 
    :return: 
    """
    ret = web_console_dao.save_design_table_snap_shot_dao(generate_sql, data_source, index_source, table_engine, table_charset, table_comment)
    return ret