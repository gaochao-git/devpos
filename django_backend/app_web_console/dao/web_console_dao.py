#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import json
import logging
import sqlparse
from sqlparse.tokens import Keyword
from apps.utils.error_code import err_goto_exit
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
        rewrite_item_sql = process_audit_sql(item_sql, schema_name)
        # 组装数据
        k_v_data = {}
        k_v_time = {}
        ret = db_helper.target_source_find_all(ip, port, rewrite_item_sql, db=schema_name)
        if ret['status'] != 'ok': return ret
        k_v_data[j] = ret['data']
        k_v_time[j] = ret['execute_time']
        j = j + 1
        ret_list.append(k_v_data)
        query_time_list.append(k_v_time)
    return {"status":"ok","message": "所有SQL正常执行完成","data":ret_list, "query_time": query_time_list}


def process_audit_sql(item_sql, schema_name):
    """
    SQL处理规则
    :param item_sql:
    :param schema_name:
    :return:
    """
    # 连接mysql parser 解析SQL
    parser_obj = MyParser(item_sql, db=schema_name)
    parser_ret = parser_obj.parse_sql()
    if parser_ret['status'] != 'ok': err_goto_exit(parser_ret['message'])
    parse_tree_node = parser_ret['data']
    logger.info("query_tree_node: %s", parse_tree_node)
    sql_type = parse_tree_node.get('command_type')
    # SQL类型检查
    process_cmd_type(sql_type)
    # select 阻断、改写
    if sql_type == 'SQLCOM_SELECT':
        item_sql = process_select_limit(item_sql, parse_tree_node)
    return item_sql


def process_cmd_type(sql_type):
    """
    校验web sql 类型是否满足需求
    :param sql_type:
    :return:
    """
    # sql类型白名单,后续用表配置
    white_sql_type_list = ['SQLCOM_SELECT', 'SQLCOM_SHOW_TABLES']
    if sql_type not in white_sql_type_list:
        err_goto_exit("sql开始只允许%s" % white_sql_type_list, err_code=2002)
    return {"status": "ok", "message": "sql类型检查通过"}


def process_select_limit(sql, parse_tree_node):
    """
    对返回数据量做处理,如果用户显示加了limit则判断limit返回数量,如果没有加则平台自动增加限制
    :param sql:
    :param parse_tree_node:
    :return:
    """
    tree_dict = json.loads(parse_tree_node.get('query_tree'))
    sql_limit = tree_dict.get('limit')
    max_limit_rows = 200
    # 如果用户没有显示limit，平台给select追加limit
    if sql_limit is None:
        sql = sql.rstrip(';') + ' limit %d;' % max_limit_rows
    elif int(sql_limit) > max_limit_rows:
        err_goto_exit(f"limit 数量超过最大限制:{max_limit_rows}")
    return sql


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