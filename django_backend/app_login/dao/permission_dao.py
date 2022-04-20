#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper


def get_role_info_dao():
    sql = "select role_name,create_by,update_by,create_time,update_time from cloud_rbac_role"
    return db_helper.find_all(sql)


def add_role_name_dao(role_name, config_user):
    """
    增加指定角色
    :param role_name:
    :param config_user:
    :return:
    """
    check_sql = "select 1 from cloud_rbac_role where role_name ='{}'".format(role_name)
    check_sql_ret = db_helper.find_all(check_sql)
    assert check_sql_ret['status'] == "ok"
    if len(check_sql_ret['data']) != 0: return {"status":"error", "message": "角色已存在"}
    sql = """
        insert into cloud_rbac_role(role_name,create_by,update_by,create_time,update_time) 
        values ('{0}','{1}','{1}',now(),now())""".format(role_name,config_user)
    return db_helper.dml(sql)


def del_role_name_dao(role_name):
    """
    删除指定角色
    :param role_name:
    :return:
    """
    check_sql = "select 1 from cloud_rbac_role where role_name ='{}'".format(role_name)
    check_sql_ret = db_helper.find_all(check_sql)
    assert check_sql_ret['status'] == "ok"
    if len(check_sql_ret['data']) == 0: return {"status":"error", "message": "删除的角色不存在"}
    sql = "delete from cloud_rbac_role where role_name ='{}'".format(role_name)
    return db_helper.dml(sql)