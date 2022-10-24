# -*- coding: utf-8 -*-
# @Time    : 2012/10/22 13:17
# @Author  : 高超

import json
from utils.go_inception_ import MyGoInception

import logging
logger = logging.getLogger("devops")


def data_masking(instance_name, db_name, sql, sql_result):
    """
    脱敏数据
    sql = 'select "1111x",concat(user,"xx"),host,authentication_string from mysql.user'
    mask_metadata_config = ['mysql.user.host', 'mysql.user.user']
    sql_result =[{'1111x': '1111x','concat(user,"xx")':'999999', 'host': 'localhost','authentication_string': 'fffjjj'}]
    :param instance_name:数据库ip_port
    :param db_name:数据库名
    :param sql:执行的SQL
    :param sql_result:执行SQL对应的结果
    :return:[{'1111x': '1111x', 'concat(user,"xx")': '#########', 'host': '#########', 'authentication_string': 'fffjjj'}]
    """
    mask_metadata_config = ['mysql.user.host', 'mysql.user.user']
    host, port = instance_name.split('_')[0], instance_name.split('_')[1]
    try:
        # 通过goInception获取select list
        inception_engine = MyGoInception(host, port, sql, db=db_name)
        parse_ret = inception_engine.parse_select_field()
        assert parse_ret['status'] == 'ok'
        select_list = json.loads(parse_ret['data'][0]['query_tree'])
        # 获取select检索列名及所在查询位置列表: [{1: 'mysql.user.user'}, {2: 'mysql.user.host'}]
        select_field_position_map_list = [{i.get('index'): i.get('schema') + '.' + i.get('table') + '.' + i.get('field')} for i in select_list]
        # 获取命中脱敏配置列位置: [1,2]
        hint_columns_position = []
        for field in select_field_position_map_list:
            for position, db_tb_col in field.items():
                if db_tb_col.lower() in mask_metadata_config:
                    hint_columns_position.append(position)
        # 脱敏列数据,直接在原始结果中进行脱敏
        for hint_column in hint_columns_position:
            for g in sql_result:
                g.update({list(g.keys())[hint_column]: '脱敏****'})
    except Exception as msg:
        logger.exception(f"数据脱敏异常，错误信息：{msg}")
    return sql_result