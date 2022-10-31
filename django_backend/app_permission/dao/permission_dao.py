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


def get_all_user_info(user_name):
    """
    获取用哦那个户信息
    :param user_name:
    :return:
    """
    sql = "select country_name,company_name,department_name,group_name,username,display_username from cloud_rbac_user"
    return db_helper.find_all(sql)


def get_schema_permisson_dao(cluster_name, schema_name):
    """
    获取库名有哪些权限
    :param cluster_name:
    :param schema_name:
    :return:
    """
    sql = f"""
        select cluster_name,schema_name,concat(b.department_name,'-',b.group_name,'-',b.username) user 
        from database_resource_config a inner join cloud_rbac_user b 
        on a.user_name=b.username 
        where cluster_name='{cluster_name}' and schema_name='{schema_name}'
    """
    return db_helper.find_all(sql)


def change_schema_permisson_dao(cluster_name, schema_name, permission_user):
    """
    更改库权限
    :param cluster_name:
    :param schema_name:
    :param permission_user:
    :return:
    """
    sql_list = []
    sql1 = f"delete from database_resource_config where cluster_name='{cluster_name}' and schema_name='{schema_name}'"
    sql_list.append(sql1)
    if len(permission_user) > 0:
        sql2 = "insert into database_resource_config(cluster_name,  schema_name, user_name) values"
        for user in permission_user:
            value = f"('{cluster_name}', '{schema_name}','{user}')"
            sql2 = sql2 + value + ','
        sql_list.append(sql2.rstrip(','))
    print(sql_list)
    return db_helper.dml(sql_list)