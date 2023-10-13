#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import pymysql
import json
import logging
import sqlparse
import re
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
        # 直接在原始数据进行脱敏,脱敏成功则脱敏,否则放行
        data_mask.data_masking(des_ip_port, schema_name, item_sql, ret['data'])
        k_v_data[j] = ret['data']
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
        pass
        # raise BusinessException(f"不允许跨库查询:{db_list}")
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
    tables_ret = db_helper.find_all(sql)
    assert tables_ret['status'] == "ok"
    hint_data = {}
    if len(tables_ret['data']) > 0:
        table_tuple = ""
        for table in tables_ret['data']: table_tuple = table_tuple + "'" + table['TABLE_NAME'] + "',"
        table_tuple = table_tuple.strip(',')
        sql_col = f"""
            select TABLE_NAME, group_concat(COLUMN_NAME) as COLUMN_NAME
            from information_schema.columns
            where TABLE_SCHEMA = '{schema_name}' and TABLE_NAME in ({table_tuple})
            group by TABLE_NAME
        """
        cols_ret = db_helper.target_source_find_all(ip,port,sql_col)
        assert cols_ret['status'] == "ok"
        hint_data = {row['TABLE_NAME']: row['COLUMN_NAME'].split(',') for row in cols_ret['data']}
    return {"status": "ok", "message": "ok","data": {"table_info_list": tables_ret['data'], "hint_data": hint_data}}


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


def save_design_table_snap_shot_dao(table_name, data_source, index_source, table_engine, table_charset, table_comment, user_name):
    """
    暂存表设计信息
    :param table_name:
    :param data_source:
    :param index_source:
    :param table_engine:
    :param table_charset:
    :param table_comment:
    :param use_name:
    :return:
    """
    data_source = pymysql.escape_string(data_source)
    sql = f"""
        insert into web_console_design_table_info(user_name, table_name,data_source,index_source, table_engine, table_charset, table_comment)
        values('{user_name}','{table_name}','{data_source}','{index_source}','{table_engine}','{table_charset}','{table_comment}')
    """
    return db_helper.dml(sql)


def get_design_table_snap_shot_dao(use_name):
    """
    获取自身已保存的设计表信息
    :param use_name:
    :return:
    """
    sql = f"""
        select table_name, data_source,index_source, table_engine, table_charset, table_comment,create_time,update_time
        from web_console_design_table_info where user_name='{use_name}' order by create_time desc
    """
    return db_helper.find_all(sql)


# def get_target_table_info_dao(ip,port,des_schema_name,des_table_name):
#     """
#     获取目标表表结构信息
#     dataSource = [{"key": 1, "name": "id", "type": "bigint", "length": 20, "point": 0, "not_null": true, "default_value": "", "comment": "主键id", "primary_key": true, "extra_info": ["无符号", "自增"]}]
#     indexSource = [{"key": 1, "index_name": "idx_create_time", "index_column": "create_time", "index_type": "normal", "index_column_detail": [{"key": 1, "column_name": "create_time", "length": 0}]}]
#     :param ip:
#     :param port:
#     :param des_schema_name:
#     :param des_table_name:
#     :return:
#     """
#     # 依据数据库中存的默认值进行一些格式化,便于前端展示
#     def get_default(column_info):
#         """
#         处理默认值,注意default '-1'在前端展示会丢失单引号
#         这些默认值都要做额外处理:NULL，"''",'1','xxx',表达式
#         这些字段类型要做特殊处理
#             text类字段不应该有默认值,mysql该字段默认给的是NULL,需要转为''
#         如果为not null但是无默认值需要额外处理
#         最好的方法是将mysql函数都识别出来,这部分布包裹引号,其他都包裹引号
#         :param default_value:
#         :param name:
#         :return:
#         """
#         default_func_list = ['CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP(1)', 'CURRENT_TIMESTAMP(2)', 'CURRENT_TIMESTAMP(3)', 'CURRENT_TIMESTAMP(4)', 'CURRENT_TIMESTAMP(5)', 'CURRENT_TIMESTAMP(6)']
#         text_type_list = ['tinytext', 'text', 'mediumtext', 'longtext', 'tinyblob', 'blob', 'mediumblob', 'longblob']
#         default_value = column_info.get('COLUMN_DEFAULT')
#         is_nullable = column_info.get('IS_NULLABLE')
#         column_type = column_info.get('DATA_TYPE')
#         # 默认值为''
#         if default_value == "": return "''"
#         # 默认值为NULL
#         if default_value is None:
#             if is_nullable == "NO": return ""             # 字段为not null，但是无默认值，mysql这个字段默认为NULL，需要额外处理
#             if column_type in text_type_list: return ''   # 字段为text字段处理
#             return "NULL"
#         # 默认值为'1','-1'
#         if default_value.isdigit(): return f"'{default_value}'"
#         if default_value[0] == '-' and default_value[1:].isdigit(): return f"'{default_value}'"
#         # 断默认值为表达式
#         if default_value in default_func_list: return default_value   # 减少数据库探测
#         default_check_ret = db_helper.find_all(f"select {default_value} as ret_value")
#         if default_check_ret['status'] != "ok": return f"'{default_value}'"  # 肯定不是函数
#         # 默认值为'xxxxx'
#         if default_check_ret['data'][0]['ret_value'] == default_value: return f"'{default_value}'"  # 应该不是函数
#         # 没有考虑到的场景
#         return default_value
#
#     def get_length(item):
#         """
#         依据数据库中存的长度值进行一些格式化,便于前端展示
#         注意:整型类展示占位宽度,长度无需展示,因为是固定的
#         :param item:
#         :return:
#         """
#         if item.get('DATA_TYPE') in ['datetime', 'time']: return item.get('DATETIME_PRECISION')
#         if item.get('DATA_TYPE') in ['char', 'varchar']: return item.get('CHARACTER_MAXIMUM_LENGTH')
#         if item.get('DATA_TYPE') in ['tinyint', 'smallint', 'int', 'bigint']: return re.findall("\d+", item.get('COLUMN_TYPE'))[0]
#         return item.get('NUMERIC_PRECISION')
#
#     def get_extra_info(columns, column_name):
#         """
#         获取自增、无符号、自动更新属性
#         [extra_info_map[i.get('EXTRA')]] if i.get('EXTRA') else []
#         :param item:
#         :return:
#         """
#         extra_info_map = {"on update CURRENT_TIMESTAMP": "自动更新", "auto_increment": "自增"}
#         extra_info_list = []
#         for col in columns:
#             # 获取每一列额外属性
#             if col.get('COLUMN_NAME') == column_name:
#                 if col.get('EXTRA'): extra_info_list.append(extra_info_map[col.get('EXTRA')])
#                 # 如果该列有无符号属性,要加进去
#                 if re.findall("unsigned", col.get('COLUMN_TYPE')): extra_info_list.append('无符号')
#         return extra_info_list
#     # 获取列信息,这里进行基础加工,后面还需要对默认值、主键进行再次加工
#     sql_col = f"""
#         select
#             ORDINAL_POSITION,
#             COLUMN_NAME,
#             DATA_TYPE,
#             COLUMN_TYPE,
#             DATETIME_PRECISION,
#             CHARACTER_MAXIMUM_LENGTH,
#             NUMERIC_PRECISION,
#             NUMERIC_SCALE,
#             COLUMN_DEFAULT,
#             IS_NULLABLE,
#             COLUMN_COMMENT,
#             EXTRA
#         from information_schema.COLUMNS
#         where TABLE_SCHEMA='{des_schema_name}' and TABLE_NAME='{des_table_name}'
#         order by ORDINAL_POSITION
#     """
#     table_columns_ret = db_helper.find_all(sql_col)
#     format_data_source = []
#     for i in table_columns_ret['data']:
#         column_obj = {}
#         column_obj['key'] = i.get('ORDINAL_POSITION')
#         column_obj['name'] = i.get('COLUMN_NAME')
#         column_obj['type'] = i.get('DATA_TYPE')
#         column_obj['length'] = get_length(i)
#         column_obj['point'] = i.get('NUMERIC_SCALE')
#         column_obj['default_value'] = get_default(i)
#         column_obj['not_null'] = False if i.get('IS_NULLABLE') == "YES" else True
#         column_obj['comment'] = i.get('COLUMN_COMMENT')
#         column_obj['primary_key'] = False  # 给一个初始值,后面计算索引进行覆盖
#         column_obj['extra_info'] = get_extra_info(table_columns_ret['data'], i.get('COLUMN_NAME'))
#         format_data_source.append(column_obj)
#     # 获取索引
#     sql_idx = f"show index from `{des_schema_name}`.`{des_table_name}`"
#     index_ret = db_helper.find_all(sql_idx)
#     # 将主键信息填充到列里面，如果是主键,将主键的NULL去掉
#     for j in index_ret['data']:
#         if j['Key_name'] == 'PRIMARY':
#             for k in format_data_source:
#                 if j['Column_name'] == k['name']:
#                     k.update({'primary_key': True})
#                     if k.get("default_value") == 'NULL':
#                         k.update({"default_value": ""})
#     # 组装index_source,不能用set去重复,这个索引名列表需要排序
#     index_name_list = []
#     for m in index_ret['data']:
#         if m['Key_name'] != 'PRIMARY':
#             if m['Key_name'] not in index_name_list: index_name_list.append(m['Key_name'])
#     format_index_source = []
#     pos = 0
#     for n in index_name_list:
#         column_obj = {}
#         pos = pos + 1
#         column_obj['key'] = pos
#         column_obj['index_name'] = n
#         column_names = ""
#         pos1 = 0
#         index_column_detail = []
#         for m in index_ret['data']:
#             if m.get('Key_name') == n:
#                 column_obj['index_type'] = "unique" if m.get('Non_unique') == 0 else "normal"
#                 column_names = f"{column_names}`{m.get('Column_name')}`," if m.get('Sub_part') is None else f"{column_names}`{m.get('Column_name')}`({m.get('Sub_part')}),"
#                 pos1 = pos1 + 1
#                 index_column_dict = {"key": pos1}
#                 index_column_dict["column_name"] = m.get('Column_name')
#                 index_column_dict["length"] = m.get('Sub_part') or 0
#                 index_column_detail.append(index_column_dict)
#         column_obj['index_column_detail'] = index_column_detail
#         column_obj['index_column'] = column_names.rstrip(',')
#         format_index_source.append(column_obj)
#     # 获取表属性信息
#     sql_table_attributes = f"show create table `{des_schema_name}`.`{des_table_name}`"
#     table_info_ret = db_helper.find_all(sql_table_attributes)
#     table_info = table_info_ret['data'][0]['Create Table']
#     table_match_info_1 = re.findall("ENGINE=(\S+).*", table_info)
#     table_match_info_2 = re.findall("ENGINE=InnoDB.* DEFAULT CHARSET=(\S+).*", table_info)
#     table_match_info_3 = re.findall("ENGINE=InnoDB.* AUTO_INCREMENT=(\S+).*", table_info)
#     table_match_info_4 = re.findall("ENGINE=InnoDB.* COMMENT=(\S+).*", table_info)
#     table_engine = table_match_info_1[0]
#     table_charset = table_match_info_2[0]
#     table_auto_increment = table_match_info_3[0] if table_match_info_3 else ""
#     table_comment = table_match_info_4[0] if table_match_info_4 else ""
#     # 组装数据
#     table_detail = {
#         'data_source': json.dumps(format_data_source),
#         'index_source': json.dumps(format_index_source),
#         'table_name': des_table_name,
#         'table_engine': table_engine,
#         'table_charset': table_charset,
#         'table_comment': table_comment[1: len(table_comment) - 1],  # 去除首尾引号
#         'table_auto_increment': table_auto_increment
#     }
#     return {"status": "ok", "message": "获取成功", "data": table_detail}


class TableInfo:
    def __init__(self, ip, port, des_schema_name, des_table_name):
        self.ip = ip
        self.port = port
        self.des_schema_name = des_schema_name
        self.des_table_name = des_table_name
        self.default_func_list = ['CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP(1)', 'CURRENT_TIMESTAMP(2)', 'CURRENT_TIMESTAMP(3)', 'CURRENT_TIMESTAMP(4)', 'CURRENT_TIMESTAMP(5)', 'CURRENT_TIMESTAMP(6)']
        self.text_type_list = ['tinytext', 'text', 'mediumtext', 'longtext', 'tinyblob', 'blob', 'mediumblob', 'longblob']
        # 获取列信息,这里进行基础加工,后面还需要对默认值、主键进行再次加工
        self.sql_col = f"""
                select ORDINAL_POSITION,COLUMN_NAME,DATA_TYPE,COLUMN_TYPE,DATETIME_PRECISION,CHARACTER_MAXIMUM_LENGTH,
                       NUMERIC_PRECISION,NUMERIC_SCALE,COLUMN_DEFAULT,IS_NULLABLE,COLUMN_COMMENT,EXTRA
                from information_schema.COLUMNS 
                where TABLE_SCHEMA='{des_schema_name}' and TABLE_NAME='{des_table_name}' 
                order by ORDINAL_POSITION
            """
        # 获取索引
        self.sql_idx = f"show index from `{des_schema_name}`.`{des_table_name}`"
        # 获取表属性信息
        self.sql_table_attributes = f"show create table `{des_schema_name}`.`{des_table_name}`"


    def _get_extra_info(self, columns, column_name):
        """
        获取自增、无符号、自动更新属性
        [extra_info_map[i.get('EXTRA')]] if i.get('EXTRA') else []
        :param self:
        :param columns:
        :param column_name:
        :return:
        """
        extra_info_map = {"on update CURRENT_TIMESTAMP": "自动更新", "auto_increment": "自增"}
        extra_info_list = []
        for col in columns:
            # 获取每一列额外属性
            if col.get('COLUMN_NAME') == column_name:
                if col.get('EXTRA'): extra_info_list.append(extra_info_map[col.get('EXTRA')])
                # 如果该列有无符号属性,要加进去
                if re.findall("unsigned", col.get('COLUMN_TYPE')): extra_info_list.append('无符号')
        return extra_info_list

    def _get_col_detail(self):
        """
        dataSource = [{"key": 1, "name": "id", "type": "bigint", "length": 20, "point": 0, "not_null": true, "default_value": "", "comment": "主键id", "primary_key": true, "extra_info": ["无符号", "自增"]}]
        indexSource = [{"key": 1, "index_name": "idx_create_time", "index_column": "create_time", "index_type": "normal", "index_column_detail": [{"key": 1, "column_name": "create_time", "length": 0}]}]
        获取列信息,这里进行基础加工,后面还需要对默认值、主键进行再次加工
        :param self:
        :return:
        """
        table_columns_ret = db_helper.find_all(self.sql_col)
        format_data_source = []
        for i in table_columns_ret['data']:
            column_obj = {}
            column_obj['key'] = i.get('ORDINAL_POSITION')
            column_obj['name'] = i.get('COLUMN_NAME')
            column_obj['type'] = i.get('DATA_TYPE')
            column_obj['length'] = common_get_col_length(i)
            column_obj['point'] = i.get('NUMERIC_SCALE')
            column_obj['default_value'] = common_get_default(i)
            column_obj['not_null'] = False if i.get('IS_NULLABLE') == "YES" else True
            column_obj['comment'] = i.get('COLUMN_COMMENT')
            column_obj['primary_key'] = False  # 给一个初始值,后面计算索引进行覆盖
            column_obj['extra_info'] = self._get_extra_info(table_columns_ret['data'], i.get('COLUMN_NAME'))
            format_data_source.append(column_obj)
        # 获取索引
        index_ret = db_helper.find_all(self.sql_idx)
        # 将主键信息填充到列里面，如果是主键,将主键的NULL去掉
        for j in index_ret['data']:
            if j['Key_name'] == 'PRIMARY':
                for k in format_data_source:
                    if j['Column_name'] == k['name']:
                        k.update({'primary_key': True})
                        if k.get("default_value") == 'NULL':
                            k.update({"default_value": ""})
        # 组装index_source,不能用set去重复,这个索引名列表需要排序
        index_name_list = []
        for m in index_ret['data']:
            if m['Key_name'] != 'PRIMARY':
                if m['Key_name'] not in index_name_list: index_name_list.append(m['Key_name'])
        format_index_source = []
        pos = 0
        for n in index_name_list:
            column_obj = {}
            pos = pos + 1
            column_obj['key'] = pos
            column_obj['index_name'] = n
            column_names = ""
            pos1 = 0
            index_column_detail = []
            for m in index_ret['data']:
                if m.get('Key_name') == n:
                    column_obj['index_type'] = "unique" if m.get('Non_unique') == 0 else "normal"
                    column_names = f"{column_names}`{m.get('Column_name')}`," if m.get(
                        'Sub_part') is None else f"{column_names}`{m.get('Column_name')}`({m.get('Sub_part')}),"
                    pos1 = pos1 + 1
                    index_column_dict = {"key": pos1}
                    index_column_dict["column_name"] = m.get('Column_name')
                    index_column_dict["length"] = m.get('Sub_part') or 0
                    index_column_detail.append(index_column_dict)
            column_obj['index_column_detail'] = index_column_detail
            column_obj['index_column'] = column_names.rstrip(',')
            format_index_source.append(column_obj)
        return format_data_source, format_index_source

    def _get_table_att_detail(self):
        """获取表属性信息"""
        table_info_ret = db_helper.find_all(self.sql_table_attributes)
        table_info = table_info_ret['data'][0]['Create Table']
        table_match_info_1 = re.findall("ENGINE=(\S+).*", table_info)
        table_match_info_2 = re.findall("ENGINE=InnoDB.* DEFAULT CHARSET=(\S+).*", table_info)
        table_match_info_3 = re.findall("ENGINE=InnoDB.* AUTO_INCREMENT=(\S+).*", table_info)
        table_match_info_4 = re.findall("ENGINE=InnoDB.* COMMENT=(\S+).*", table_info)
        table_engine = table_match_info_1[0]
        table_charset = table_match_info_2[0]
        table_comment = table_match_info_4[0] if table_match_info_4 else ""
        table_auto_increment = table_match_info_3[0] if table_match_info_3 else ""
        return table_engine, table_charset, table_comment, table_auto_increment

    def get_table_meta(self):
        try:
            data_source, index_source = self._get_col_detail()
            table_engine, table_charset, table_comment, table_auto_increment = self._get_table_att_detail()
        except Exception as e:
            logger.exception(e)
            return {"status": "error", "message": f"获取元数据失败请联系DBA"}
        # 组装数据
        table_detail = {
            'data_source': json.dumps(data_source),
            'index_source': json.dumps(index_source),
            'table_name': self.des_table_name,
            'table_engine': table_engine,
            'table_charset': table_charset,
            'table_comment': table_comment[1: len(table_comment) - 1],  # 去除首尾引号
            'table_auto_increment': table_auto_increment
        }
        return {"status": "ok", "message": "获取成功", "data": table_detail}


def common_get_default(column_info):
    """
    处理默认值,注意default '-1'在前端展示会丢失单引号
    这些默认值都要做额外处理:NULL，"''",'1','xxx',表达式
    这些字段类型要做特殊处理
        text类字段不应该有默认值,mysql该字段默认给的是NULL,需要转为''
    如果为not null但是无默认值需要额外处理
    最好的方法是将mysql函数都识别出来,这部分布包裹引号,其他都包裹引号
    :param default_value:
    :param name:
    :return:
    """
    default_func_list = ['CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP(1)', 'CURRENT_TIMESTAMP(2)',
                         'CURRENT_TIMESTAMP(3)', 'CURRENT_TIMESTAMP(4)', 'CURRENT_TIMESTAMP(5)',
                         'CURRENT_TIMESTAMP(6)']
    text_type_list = ['tinytext', 'text', 'mediumtext', 'longtext', 'tinyblob', 'blob', 'mediumblob',
                      'longblob']
    default_value = column_info.get('COLUMN_DEFAULT')
    is_nullable = column_info.get('IS_NULLABLE')
    column_type = column_info.get('DATA_TYPE')
    # 默认值为''
    if default_value == "": return "''"
    # 默认值为NULL
    if default_value is None:
        if is_nullable == "NO": return ""  # 字段为not null，但是无默认值，mysql这个字段默认为NULL，需要额外处理
        if column_type in text_type_list: return ''  # 字段为text字段处理
        return "NULL"
    # 默认值为'1','-1'
    if default_value.isdigit(): return f"'{default_value}'"
    if default_value[0] == '-' and default_value[1:].isdigit(): return f"'{default_value}'"
    # 断默认值为表达式
    if default_value in default_func_list: return default_value  # 减少数据库探测
    default_check_ret = db_helper.find_all(f"select {default_value} as ret_value")
    if default_check_ret['status'] != "ok": return f"'{default_value}'"  # 肯定不是函数
    # 默认值为'xxxxx'
    if default_check_ret['data'][0]['ret_value'] == default_value: return f"'{default_value}'"  # 应该不是函数
    # 没有考虑到的场景
    return default_value

def common_get_col_length(db_col_info):
    """
    依据数据库中存的长度值进行一些格式化,便于前端展示
    注意:整型类展示占位宽度,长度无需展示,因为是固定的依据数据库中存的长度值进行一些格式化,便于前端展示
    注意:整型类展示占位宽度,长度无需展示,因为是固定的
    :param db_col_info:
    :return:
    """
    if db_col_info.get('DATA_TYPE') in ['datetime', 'time']: return db_col_info.get('DATETIME_PRECISION')
    if db_col_info.get('DATA_TYPE') in ['char', 'varchar']: return db_col_info.get('CHARACTER_MAXIMUM_LENGTH')
    if db_col_info.get('DATA_TYPE') in ['tinyint', 'smallint', 'int', 'bigint']: return re.findall("\d+", db_col_info.get('COLUMN_TYPE'))[0]
    return db_col_info.get('NUMERIC_PRECISION')

class GetRecommandDbCol:
    def __init__(self, search_col_content):
        self.sql = f"""
            select 
                column_name as COLUMN_NAME,
                column_default as COLUMN_DEFAULT,
                is_nullable as IS_NULLABLE,
                data_type as DATA_TYPE,
                character_maxmum_length as CHARACTER_MAXIMUM_LENGTH,
                numeric_precision as NUMERIC_PRECISION,
                numeric_scale as NUMERIC_SCALE,
                datetime_precision as DATETIME_PRECISION,
                column_type as COLUMN_TYPE,
                extra as EXTRA,
                column_comment
            from db_columns
            where column_name like '%{search_col_content}%' and column_comment like '%{search_col_content}%'
        """

    def _get_extra_info(self, db_col_info):
        """
        获取自增、无符号、自动更新属性
        :param db_col_info:
        :return:
        """
        extra_info_map = {"on update CURRENT_TIMESTAMP": "自动更新", "auto_increment": "自增"}
        if db_col_info.get('EXTRA'): return extra_info_map[db_col_info.get('EXTRA')]
        if re.findall("unsigned", db_col_info.get('COLUMN_TYPE')): return '无符号'
        return []

    def get_db_col_dao(self):
        """
        获取推荐列
        :return:
        """
        ret = db_helper.find_all(self.sql)
        assert ret['status'] == 'ok'
        data = []
        for row in ret['data']:
            format_row = {
                "name": row.get('COLUMN_NAME'),
                "default_value": common_get_default(row),
                "not_null": False if row.get('IS_NULLABLE') == "YES" else True,
                "type": row.get('DATA_TYPE'),
                "length": common_get_col_length(row),
                "point":row.get('NUMERIC_SCALE'),
                "comment": row.get('column_comment'),
                "extra": self._get_extra_info(row)
            }
            data.append(format_row)
        format_ret = {"status": "ok", "message":"ok", "data":data}
        return format_ret