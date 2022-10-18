#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging
import sqlparse
from sqlparse.tokens import Keyword
from apps.utils.error_code import err_goto_exit

logger = logging.getLogger('sql_logger')


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
        # SQL类型检查
        process_web_console_cmd_type_dao(item_sql)
        # limit追加或改写
        rewrite_item_sql = process_web_console_limit_dao(item_sql)
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


def process_web_console_cmd_type_dao(sql):
    """
    校验web sql 类型是否满足需求
    :param sql:
    :return:
    """
    parsed = sqlparse.parse(sql)
    token_list = parsed[0].tokens
    # sql类型白名单
    white_sql_type_list = ['select', 'show', 'explain']
    # 通过sqlparse进行第一次校验
    result = sqlparse.sql.Statement(token_list)
    if result.get_type().lower() not in white_sql_type_list:
        err_goto_exit("sql开始只允许%s" % white_sql_type_list, err_code=2002)
    return {"status": "ok", "message": "sql类型检查通过"}


def process_web_console_limit_dao(sql):
    """
    对返回数据量做处理,如果用户显示加了limit则判断limit返回数量,如果没有加则平台自动增加限制
    :param sql:
    :return:
    """
    parsed = sqlparse.parse(sql)
    token_list = parsed[0].tokens
    max_limit_rows = 200
    token_index = 0
    limit_flag = False
    result = sqlparse.sql.Statement(token_list)
    # 处理原始token列表,过滤掉空白字符产生新列表用于后续分析
    new_token_list = [tk for tk in token_list if not tk.value == ' ']
    print(new_token_list)
    try:
        for token in new_token_list:
            """
            limit 1           取1行
            limit 5,2         从5开始取2行
            limit 2 offset 5  从5开始取2行
            """
            if token.ttype is Keyword and token.value.lower() == 'limit':
                limit_flag = True
                if new_token_list[token_index + 1].value.isdigit():
                    limit_rows = int(new_token_list[token_index + 1].value)
                    if new_token_list[token_index + 2].value == 'offset':
                        logger.info('limit x offset y格式')
                    else:
                        logger.info('limit x格式')
                else:
                    logger.info('limit x,y格式')
                    limit_rows = int(new_token_list[token_index + 1].value.split(',')[1].strip(''))
                if limit_rows > max_limit_rows:
                    err_goto_exit("select最多获取%d条数据" % max_limit_rows)
            token_index += 1
    except Exception as e:
        logger.exception(e)
        err_goto_exit("解析SQL limit 出现异常")
    # 如果用户没有显示limit，平台给select追加limit
    if not limit_flag and result.get_type() == 'SELECT':
        sql = sql.rstrip(';') + ' limit %d;' % max_limit_rows
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
    ret = db_helper.target_source_find_all(ip, port, sql)
    return ret


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