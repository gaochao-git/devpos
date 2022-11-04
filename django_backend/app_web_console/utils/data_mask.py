# -*- coding: utf-8 -*-
# @Time    : 2012/10/22 13:17
# @Author  : 高超

import json
import re
from utils.go_inception_ import MyGoInception

import logging
logger = logging.getLogger("devops")


def data_masking(instance_name, db_name, sql, sql_result):
    """
    采取异常捕获,脱敏失败不阻断查询，这个依据不同公司要就自己决定是阻断还是放行
    脱敏数据案例
      sql = 'select "1111x",concat(user,"xx"),host,authentication_string from mysql.user'
      mask_metadata_config = ['mysql.user.host', 'mysql.user.user']
      sql_result =[{'1111x': '1111x','concat(user,"xx")':'999999', 'host': 'localhost','authentication_string': 'fffjjj'}]
    一些常用脱敏规则
      .*\..*\..*: 所有库、所有表、所有列
      test[00-32]*\.emp*\.name: test_00库到test_32库、emp开头的表、name列
    :param instance_name:数据库ip_port
    :param db_name:数据库名
    :param sql:执行的SQL
    :param sql_result:执行SQL对应的结果
    :return:[{'1111x': '1111x', 'concat(user,"xx")': '#########', 'host': '#########', 'authentication_string': 'fffjjj'}]
    """
    mask_rule_config = ['test[00-32]*\.emp*\.name', '.*\..*\..*']  # 正则减少分库分表场景配置
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
                if any(re.match(r"%s" % rule, db_tb_col.lower(), re.I) for rule in mask_rule_config):
                    hint_columns_position.append(position)
        # 脱敏列数据,直接在原始结果中进行脱敏
        for hint_column in hint_columns_position:
            for g in sql_result:
                g.update({list(g.keys())[hint_column]: '脱敏****'})
    except Exception as msg:
        logger.exception(f"数据脱敏异常，错误信息：{msg}")
    return sql_result