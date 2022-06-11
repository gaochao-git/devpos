#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging
from multiprocessing.dummy import Pool as ThreadPool
import re
import hashlib

logger = logging.getLogger('sql_logger')


def compare_table_meta_dao(source_info, target_info):
    """
    对比表结构
    :param source_info:
    :param target_info:
    :return:
    """
    # 获取源表md5
    source_ip = source_info.split(':')[0].split('_')[0]
    source_port = source_info.split(':')[0].split('_')[1]
    source_db = source_info.split(':')[1].split('.')[0]
    source_tb = source_info.split(':')[1].split('.')[1]
    source_tb_md5_ret = get_tb_md5(source_ip,source_port,source_db,source_tb)
    assert source_tb_md5_ret['status'] == "ok"
    source_tb_md5 = source_tb_md5_ret['tb_md5']
    # 初始化返回结果空列表
    compare_list = []
    # 预处理目标对象
    target_list = target_info.split('\n')
    while '' in target_list: target_list.remove('')
    # 依次处理每个目标对象
    for item_target in target_list:
        target_ip = item_target.split(':')[0].split('_')[0]
        target_port = item_target.split(':')[0].split('_')[1]
        target_db = item_target.split(':')[1].split('.')[0]
        target_tb_prefix = item_target.split(':')[1].split('.')[1]
        # 获取匹配到的所有表
        target_tb_list_ret = get_tb_list(target_ip, target_port, target_db, target_tb_prefix)
        target_tb_list = target_tb_list_ret['data']
        # 组装可迭代对象
        need_compare_list = []
        for table_dict in target_tb_list:
            table_compare_dict = {
                "source_info": source_info,
                "source_tb_md5": source_tb_md5,
                "target_ip": target_ip,
                "target_port": target_port,
                "target_db": target_db,
                "target_tb": list(table_dict.values())[0]
            }
            need_compare_list.append(table_compare_dict)
        # 可迭代对象丢给线程池并发执行
        pool = ThreadPool(20)
        item_tables_compare_list = pool.map(compare_tables, need_compare_list)
        pool.close()
        pool.join()
        compare_list = compare_list + item_tables_compare_list
    return {"status":"ok","message": "所有SQL正常执行完成","data":compare_list}


def compare_tables(do_compare_dict):
    """
    对比target_item中匹配到的所有表
    :param do_compare_dict:
    :return:
    """
    # 获取目标表结构md5
    target_ip = do_compare_dict['target_ip']
    target_port = do_compare_dict['target_port']
    target_db = do_compare_dict['target_db']
    target_tb = do_compare_dict['target_tb']
    target_tb_md5_ret = get_tb_md5(target_ip, target_port, target_db, target_tb)
    target_tb_md5 = target_tb_md5_ret['tb_md5']
    # 组装对比结果
    source_tb_md5 = do_compare_dict['source_tb_md5']
    source_info = do_compare_dict['source_info']
    target_do_info = target_ip + '_' + target_port + ':' + target_db + '.' + target_tb
    compare_ret_dict = {
        "compare_ret": "ok" if source_tb_md5 == target_tb_md5 else "error",
        "source": source_info,
        "source_tb_md5": source_tb_md5,
        "target": target_do_info,
        "target_tb_md5": target_tb_md5
    }
    return compare_ret_dict


def get_tb_list(target_ip, target_port, target_db, target_tb_prefix):
    """
    获取模糊匹配表结构
    :param target_ip:
    :param target_port:
    :param target_db:
    :param target_tb_prefix:
    :return:
    """
    sql = "show tables from {} like '{}%'".format(target_db, target_tb_prefix)
    ret = db_helper.target_source_find_all(target_ip, target_port, sql)
    return ret


def get_tb_md5(ip, port, db, tb):
    """
    连接数据库获取表的md5摘要
    :param source:
    :return:
    """
    sql = "show create table {}.{}".format(db, tb)
    ret = db_helper.target_source_find_all(ip, port, sql)
    if ret['status'] != "ok":return {"status": "error", "tb_md5": "error"}
    table_info = ret['data'][0]['Create Table']
    table_digest = re.sub("(CREATE TABLE `.*?`)", "CREATE TABLE ? ", table_info)
    table_digest = re.sub("( AUTO_INCREMENT=[0-9]+)", "", table_digest)
    md5 = hashlib.md5()
    md5.update(table_digest.encode(encoding='utf-8'))
    table_digest_md5 = md5.hexdigest()
    tb_md5_ret = {"status": "ok", "tb_md5": table_digest_md5}
    return tb_md5_ret


def get_source_target_table_meta_dao(source_info, target_info):
    """
    对比表结构
    :param source_info:
    :param target_info:
    :return:
    """

    source_ip = source_info.split(':')[0].split('_')[0]
    source_port = source_info.split(':')[0].split('_')[1]
    source_db = source_info.split(':')[1].split('.')[0]
    source_tb = source_info.split(':')[1].split('.')[1]
    source_sql = "show create table {}.{}".format(source_db,source_tb)
    source_ret = db_helper.target_source_find_all(source_ip,source_port,source_sql)
    for k, v in source_ret['data'][0].items():
        source_table = v
    target_ip = target_info.split(':')[0].split('_')[0]
    target_port = target_info.split(':')[0].split('_')[1]
    target_db = target_info.split(':')[1].split('.')[0]
    target_tb = target_info.split(':')[1].split('.')[1]
    target_sql = "show create table {}.{}".format(target_db,target_tb)
    target_ret = db_helper.target_source_find_all(target_ip, target_port, target_sql)
    for k, v in target_ret['data'][0].items():
        target_table = v
    data = {'source_table_meta': source_table, 'target_table_meta': target_table}
    return {"status": "ok", "message": "所有SQL正常执行完成", "data": data}