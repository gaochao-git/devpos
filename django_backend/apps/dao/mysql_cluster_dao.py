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


def get_mysql_cluster_instance_dao(cluster_name):
    sql = f"""
        select a.cluster_name,b.instance_name,b.instance_role,b.instance_var 
        from mysql_cluster a inner join mysql_cluster_instance b  
        on a.cluster_name=b.cluster_name
        where cluster_name='{cluster_name}'
    """
    ret = db_helper.find_all(sql)
    if ret['status'] == 'error': return ret
    format_ins_list = []
    format_dict = {}
    for i in ret['data']:
        i.get('instance_var')
        format_dict['cluster_name'] = i.get('cluster_name')
        format_dict['instance_name'] = i.get('instance_name')
        format_dict['instance_role'] = i.get('instance_role')
        format_dict['read_only'] = eval(i.get('instance_var')).get('read_only')
        format_dict['innodb_fast_shutdown'] = eval(i.get('instance_var')).get('innodb_fast_shutdown')
        format_ins_list.append(format_dict)
    return {"status": "ok", "message": "获取数据成功","data": format_ins_list}


def get_mysql_cluster_ins_info_dao(cluster_name):
    sql = f"""
        select 
            a.cluster_name,
            b.instance_name,
            b.instance_role,
            b.instance_var,
            b.instance_status,
            b.instance_slave_status,
            b.instance_connection,
            b.update_time
            from mysql_cluster a inner join mysql_cluster_instance b 
            on a.cluster_name=b.cluster_name
        where a.cluster_name='{cluster_name}'
    """
    ret = db_helper.find_all(sql)
    assert ret['status'] == 'ok'
    format_list = []
    for i in ret['data']:
        print(i.get('instance_slave_status'))
        format_dict = {}
        instance_var = eval(i.get('instance_var'))
        instance_status = eval(i.get('instance_status'))
        instance_slave_status = eval(i.get('instance_slave_status'))
        instance_connection = eval(i.get('instance_connection'))
        # 连接数
        format_dict['conn_threads'] = instance_connection.get('conn_threads')
        format_dict['active_threads'] = instance_connection.get('active_threads')
        # 全局变量
        format_dict['cluster_name'] = i.get('cluster_name')
        format_dict['instance_name'] = i.get('instance_name')
        format_dict['instance_role'] = i.get('instance_role')
        format_dict['update_time'] = i.get('update_time')
        format_dict['read_only'] = instance_var.get('read_only')
        format_dict['innodb_fast_shutdown'] = instance_var.get('innodb_fast_shutdown')
        format_dict['version'] = instance_var.get('version')
        format_dict['character_set_server'] = instance_var.get('character_set_server')
        format_dict['rpl_semi_sync_master_enabled'] = instance_var.get('rpl_semi_sync_master_enabled')
        format_dict['rpl_semi_sync_slave_enabled'] = instance_var.get('rpl_semi_sync_slave_enabled')
        format_dict['rpl_semi_sync_master_timeout'] = instance_var.get('rpl_semi_sync_master_timeout')

        # 全局status
        format_dict['Rpl_semi_sync_master_clients'] = instance_status.get('Rpl_semi_sync_master_clients')
        format_dict['Rpl_semi_sync_master_status'] = instance_status.get('Rpl_semi_sync_master_status')

        # 复制信息
        format_dict['Slave_IO_Running'] = instance_slave_status.get('Slave_IO_Running')
        format_dict['Slave_SQL_Running'] = instance_slave_status.get('Slave_SQL_Running')
        format_dict['Seconds_Behind_Master'] = instance_slave_status.get('Seconds_Behind_Master')
        format_dict['Master_Host'] = instance_slave_status.get('Master_Host')
        format_dict['Master_Port'] = instance_slave_status.get('Master_Port')

        format_list.append(format_dict)
    return {"status": "ok", "message": "获取数据成功", "data": format_list}