# -*- coding:utf-8 -*-
import json
from app_web_console.utils.go_inception_ import MyGoInception
import traceback

import logging
logger = logging.getLogger("default")

def data_masking(instance_name, db_name, sql, sql_result):
    """
    脱敏数据
    mask_metadata_config = ['mysql.user.host', 'mysql.user.user']
    sql = 'select "1111x",concat(user,"xx"),host,authentication_string from mysql.user'
    sql_result =[{'1111x': '1111x','concat(user,"xx")':'999999', 'host': 'localhost','authentication_string': 'fffjjj'}]
    select_field_position_map_list = [{1: 'mysql.user.user'}, {2: 'mysql.user.host'}]
    :param sql:
    :param sql_result:
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
        select_field_position_map_list = []
        for i in select_list:
            index_field_map = {}
            field = i.get('schema') + '.' + i.get('table') + '.' + i.get('field')
            index_field_map[i.get('index')] = field
            select_field_position_map_list.append(index_field_map)
        # print(f'select_field_position_map_list:{select_field_position_map_list}')
        # print(f'mask_metadata_config:{mask_metadata_config}')
        # print(f'sql_result:{sql_result}')
        # 获取命中列位置
        hint_columns_position = []
        for field in select_field_position_map_list:
            for position, db_tb_col in field.items():
                if db_tb_col.lower() in mask_metadata_config:
                    hint_columns_position.append(position)
        # 脱敏列数据
        for hint_column in hint_columns_position:
            for g in sql_result:
                g.update({list(g.keys())[hint_column]: '#########'})
        print(f"加密后数据:{sql_result}")
    except Exception as msg:
        logger.warning(f"数据脱敏异常，错误信息：{traceback.format_exc()}")
    return sql_result


# if __name__ == "__main__":
#     instance = '47.104.2.74_3306'
#     db_name = 'test'
#     sql = 'select "1111x",concat(user,"xx"),host,authentication_string from mysql.user'
#     sql_result =[{'1111x': '1111x','concat(user,"xx")':'999999', 'host': 'localhost','authentication_string': 'fffjjj'}]
#     data_masking(instance, db_name, sql, sql_result)