#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging
import sqlparse
from sqlparse.tokens import Keyword

logger = logging.getLogger('sql_logger')


def get_table_data_dao(ip, port, sql, schema_name, explain):
    """
    获取数据
    :param ip:
    :param port:
    :param sql:
    :return:
    """
    ret_list = []
    query_time_list = []
    sql_list = sqlparse.split(sql)
    if explain not in['yes','no']: return {"status": "error", "message": "explain参数不合法"}
    if explain == 'yes':
        new_sql_list = []
        for i in sql_list:
            explain_sql = 'explain ' + i
            new_sql_list.append(explain_sql)
        sql_list = new_sql_list
    # 处理SQL
    j = 0
    for item_sql in sql_list:
        # SQL类型检查
        check_cmd_type_ret = process_web_console_cmd_type_dao(item_sql)
        if check_cmd_type_ret['status'] != 'ok': return check_cmd_type_ret
        # limit处理
        check_limit_ret = process_web_console_limit_dao(item_sql)
        if check_limit_ret['status'] != "ok": return  check_limit_ret
        item_sql = check_limit_ret['data']
        # 组装数据
        k_v_data = {}
        k_v_time = {}
        ret = db_helper.target_source_find_all(ip, port, item_sql, db=schema_name)
        if ret['status'] !='ok':
            return ret
        k_v_data[j] = ret['data']
        k_v_time[j] = ret['query_time']
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
    black_sql_type_list = ['INSERT', 'DELETE', 'UPDATE','CREATE','DROP','ALTER']
    # 通过sqlparse进行第一场校验
    result = sqlparse.sql.Statement(token_list)
    if result.get_type() in black_sql_type_list:
        return {"status": "error", "message": "不运行DML/DDL,sql开始只允许%s" % white_sql_type_list}
    # sql类型二次检查,多检查一次防止sqlparse解析不完全
    if sql.split(' ')[0].lower() not in white_sql_type_list:
        return {"status": "error", "message": "sql开始只允许%s" % white_sql_type_list}
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
    new_token_list = []
    for tk in token_list:
        if not tk.value == ' ':
            new_token_list.append(tk)
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
                    return {"status": "error", "message": "select最多获取%d条数据" % max_limit_rows}
            token_index += 1
        status = "ok"
        message = "limit检查通过"
    except Exception as e:
        logger.exception(e)
        status = "error"
        message = "解析SQL出现异常"
    # 如果用户没有显示limit，平台给select追加limit
    if not limit_flag and result.get_type() == 'SELECT':
        sql = sql.rstrip(';') + ' limit %d;' % max_limit_rows
    return {"status": status, "message": message, "data": sql}


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
    sql = "show tables from {} like '%{}%'".format(schema_name,table_name)
    print(sql)
    ret = db_helper.target_source_find_all(ip, port, sql)
    print(ret)
    data = ret['data']
    new_data = []
    try:
        num = 0
        for i in data:
            new_data_dict = {}
            for k,v in i.items():
                new_data_dict[schema_name] = v
                new_data.append(new_data_dict)
            num = num + 1
            if num == 30: break
    except Exception as e:
        print(e)
    ret['data'] = new_data
    print(ret)
    return ret


def get_column_list_dao(instance_name,schema_name,table_name):
    """
    获取表中的列
    :param schema_name:
    :return:
    """
    ip = instance_name.split('_')[0]
    port = instance_name.split('_')[1]
    sql = "desc {}.{}".format(schema_name,table_name)
    return db_helper.target_source_find_all(ip, port, sql)