#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import re
import json
import logging
import sqlparse
from app_web_console.utils import data_mask
from utils.exceptions import BusinessException
from utils.go_inception_ import MyGoInception
from app_web_console.utils.mysql_parser import MyParser

logger = logging.getLogger('devops')


def get_table_data_dao(des_ip_port, sql, schema_name, explain):
    """
    获取数据
    :param ip:
    :param port:
    :param sql:
    :return:
    """
    ip = des_ip_port.split('_')[0]
    port = des_ip_port.split('_')[1]
    ret_list = []
    query_time_list = []
    sql_list = sqlparse.split(sql)
    while '' in sql_list:sql_list.remove('')
    if len(sql_list) > 10: return {"status": "error", "message": "最多10条"}
    if explain not in['yes', 'no']: return {"status": "error", "message": "explain参数不合法"}
    if explain == 'yes': sql_list = ['explain ' + i for i in sql_list]
    # 处理SQL
    j = 0
    for item_sql in sql_list:
        # SQL规则处理
        rewrite_item_sql = process_audit_sql(ip, port, item_sql, schema_name)
        # 组装数据
        k_v_data = {}
        k_v_time = {}
        ret = db_helper.target_source_find_all(ip, port, rewrite_item_sql, db=schema_name)
        if ret['status'] != 'ok': return ret
        data = data_mask.data_masking(des_ip_port, schema_name, item_sql, ret['data'])
        k_v_data[j] = data
        k_v_time[j] = ret['execute_time']
        j = j + 1
        ret_list.append(k_v_data)
        query_time_list.append(k_v_time)
    return {"status":"ok","message": "所有SQL正常执行完成","data":ret_list, "query_time": query_time_list}


def process_audit_sql(ip, port, item_sql, schema_name):
    """
    SQL处理规则
    :param ip:
    :param port:
    :param item_sql:
    :param schema_name:
    :return:
    """
    # mysql_parser解析结果
    parser_obj = MyParser(item_sql, db=schema_name)
    parser_ret = parser_obj.parse_sql()
    if parser_ret['status'] != 'ok': raise BusinessException(parser_ret['message'])
    parse_tree_node = parser_ret['data']
    # SQL类型白名单检查
    audit_sql_type_by_mysql_parser(parse_tree_node)
    # SQL检查
    execute_sql = audit_sql(ip, port, item_sql, schema_name, parse_tree_node)
    return execute_sql


def audit_sql(ip, port, item_sql, schema_name, parse_tree_node):
    """
    检查、审计、阻断、改写SQL
    :param ip:
    :param port:
    :param item_sql:
    :param schema_name:
    :param parse_tree_node:
    :return:
    """
    command_type = parse_tree_node.get('command_type')
    # select 阻断、改写
    if command_type == 'SQLCOM_SELECT':
        item_sql = audit_select_by_go_inception(ip, port, item_sql, schema_name)
    return item_sql


def audit_sql_type_by_mysql_parser(parse_tree_node):
    """
    校验web sql 类型是否满足需求
    :param parse_tree_node:
    :return:
    """
    command_type = parse_tree_node.get('command_type')
    # sql类型白名单,后续用表配置
    white_sql_type_list = ['SQLCOM_SELECT', 'SQLCOM_SHOW_TABLES','SQLCOM_SHOW_DATABASES','SQLCOM_SHOW_CREATE']
    if command_type not in white_sql_type_list:
        raise BusinessException("SQL类型:%s不允许执行" % command_type, code=2002)
    return {"status": "ok", "message": "sql类型检查通过"}


def audit_select_by_go_inception(ip, port, item_sql, schema_name):
    """
    对返回数据量做处理,如果用户显示加了limit则判断limit返回数量,如果没有加则平台自动增加限制
    :param ip:
    :param port:
    :param item_sql:
    :param schema_name:
    :return:
    """
    max_limit_rows = 200
    inception_engine = MyGoInception(ip, port, item_sql, db=schema_name)
    parse_ret = inception_engine.parse_query_tree()
    assert isinstance(parse_ret, dict)
    limit_offset = parse_ret.get('limit_offset')
    # 如果用户没有显示limit，平台给select追加limit,如果用户输入limit则判断是否超限制
    if limit_offset.get('limit') is None:
        item_sql = item_sql.rstrip(';') + ' limit %d;' % max_limit_rows
    elif limit_offset.get('limit') > max_limit_rows:
        raise BusinessException(f"limit 数量超过最大限制:{max_limit_rows}")
    # 跨库select检查
    tables = parse_ret.get('tables')
    db_list = [table.get('schema') for table in tables if table.get('schema') is not None]
    if len(db_list) > 1 or schema_name not in db_list:
        raise BusinessException(f"不允许跨库查询:{db_list}")
    return item_sql


def get_schema_list_dao(instance_name):
    """
    获取所有库名
    :param instance_name:
    :return:
    """
    ip = instance_name.split('_')[0]
    port = instance_name.split('_')[1]
    sql = "show databases where `database` not in('mysql','information_schema','performance_schema','sys')"
    return db_helper.target_source_find_all(ip,port,sql)


def get_db_connect_dao(instance_name):
    """
    探活
    :param instance_name:
    :return:
    """
    sql = "select 1"
    ip = instance_name.split('_')[0]
    port = instance_name.split('_')[1]
    return db_helper.target_source_find_all(ip,port,sql)

def get_table_list_dao(instance_name,schema_name,table_name):
    """
    获取所有表
    :param schema_name:
    :return:
    """
    ip = instance_name.split('_')[0]
    port = instance_name.split('_')[1]
    # sql = "show tables from {} like '%{}%'".format(schema_name,table_name)
    sql = f"""
        select 
            TABLE_SCHEMA,
            TABLE_NAME,
            ENGINE,
            CREATE_TIME,
            TABLE_COMMENT,
            AUTO_INCREMENT,
            AVG_ROW_LENGTH,
            DATA_LENGTH,
            DATA_FREE,
            INDEX_LENGTH,
            TABLE_ROWS
        from information_schema.TABLES
        where TABLE_SCHEMA='{schema_name}' and TABLE_NAME like '%{table_name}%' limit 100
    """
    return db_helper.target_source_find_all(ip, port, sql)


def get_column_list_dao(instance_name,schema_name,table_name):
    """
    获取表中的列
    :param schema_name:
    :return:
    """
    ip = instance_name.split('_')[0]
    port = instance_name.split('_')[1]
    # sql = "desc {}.{}".format(schema_name,table_name)
    sql = f"""
        select 
            COLUMN_NAME,
            COLUMN_TYPE,
            IS_NULLABLE,
            COLUMN_KEY,
            case when COLUMN_DEFAULT='' then '空' when COLUMN_DEFAULT is null then 'Null' else COLUMN_DEFAULT end as COLUMN_DEFAULT,
            EXTRA,
            COLUMN_COMMENT 
        from information_schema.columns
        where TABLE_SCHEMA='{schema_name}' and TABLE_NAME='{table_name}'
    """
    return db_helper.target_source_find_all(ip, port, sql)


def get_favorite_data_dao(favorite_type):
    """
    获取收藏信息
    :param favorite_type:
    :return:
    """
    sql = """
        select favorite_name,favorite_detail from web_console_favorite where favorite_type='{}'
    """.format(favorite_type)
    return db_helper.find_all(sql)


def get_db_info_dao(des_ip_port):
    """
    获取当前数据库基本信息
    :param des_ip_port:
    :return:
    """
    ip = des_ip_port.split('_')[0]
    port = des_ip_port.split('_')[1]
    sql = """
        select 
            @@version '版本',
            @@character_set_server 'Server字符集',
            case @@read_only when 0 then 'OFF' else 'ON' end '只读状态',
            @@default_storage_engine '存储引擎',
            @@innodb_flush_log_at_trx_commit 'Redo log刷盘',
            @@sync_binlog 'Binlog刷盘' ,
            @@long_query_time '慢查询阀值',
            @@max_connections '最大连接数'
    """
    return db_helper.target_source_find_all(ip,port,sql)


def add_favorite_dao(config_user_name, favorite_type, favorite_name, favorite_detail):
    """
    添加收藏信息
    :param config_user_name:
    :param favorite_type:
    :param favorite_name:
    :param favorite_detail:
    :return:
    """
    check_sql = """
        select 1 from web_console_favorite where user_name='{}' and favorite_name='{}'
    """.format(config_user_name,favorite_name)
    check_ret = db_helper.find_all(check_sql)
    assert check_ret['status'] == "ok"
    if len(check_ret['data']) != 0: return {"status": "error", "message": "该名称已经存在"}
    sql = """
        insert into web_console_favorite(user_name,favorite_type,favorite_name,favorite_detail,create_time,update_time) 
        values('{}','{}','{}','{}',now(),now())
    """.format(config_user_name, favorite_type, favorite_name, favorite_detail)
    return db_helper.dml(sql)



def del_favorite_dao(config_user_name, favorite_name):
    """
    删除收藏
    :param config_user_name:
    :param favorite_name:
    :return:
    """
    check_sql = """
            select 1 from web_console_favorite where user_name='{}' and favorite_name='{}'
        """.format(config_user_name, favorite_name)
    check_ret = db_helper.find_all(check_sql)
    assert check_ret['status'] == "ok"
    if len(check_ret['data']) == 0: return {"status": "error", "message": "该名称不存在"}
    sql = """
            delete from web_console_favorite where user_name='{}' and favorite_name='{}'
        """.format(config_user_name, favorite_name)
    return db_helper.dml(sql)