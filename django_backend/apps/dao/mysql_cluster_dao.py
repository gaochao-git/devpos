#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging

logger = logging.getLogger('sql_logger')


# 获取所有集群信息
def get_mysql_cluster_dao():
    sql = "select cluster_name,cluster_type,cluster_status,cluster_department from mysql_cluster"
    return db_helper.find_all(sql)


def get_mysql_cluster_ins_dao(cluster_name, ins_role):
    if cluster_name is None:
        cluster_name_condition = ''
    else:
        cluster_name_condition = 'and cluster_name="{}"'.format(cluster_name)
    if ins_role is None:
        ins_role_condition = ''
    else:
        role_value = "'" + "','".join(ins_role) + "'"
        ins_role_condition = 'and instance_role in ({})'.format(role_value)
    sql = """
        select cluster_name,instance_name,instance_role from mysql_cluster_instance
        where 1=1 {0} {1}
    """.format(cluster_name_condition, ins_role_condition)
    print(sql)
    return db_helper.find_all(sql)

# 模糊搜索集群名信息
def get_mysql_cluster_by_cluster_name_dao(cluster_name):
    where_cluster_name_conditin = 'and cluster_name like "{}%"'.format(cluster_name)
    sql = """select b.id as 'key',
                        a.instance_name,
                        a.cluster_name,
                        a.cluster_type,
                        b.host_name,
                        b.host_ip,
                        b.port,
                        b.read_only,
                        b.version,
                        b.server_charset,
                        b.bufferpool,
                        b.master_ip,
                        case b.master_port when 0 then '' else master_port end master_port,
                        case b.instance_status when 0 then '不可用' when 1 then '正常服务' when 2 then '已下线' end as instance_status 
                 from mysql_cluster_instance a inner join mysql_instance b on a.instance_name=b.instance_name where 1=1 {}
                 """.format(where_cluster_name_conditin)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows