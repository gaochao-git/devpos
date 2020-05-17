#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from django.http import HttpResponse
import json
from apps.utils import db_helper
import logging

logger = logging.getLogger('devops')


# 获取所有集群信息
def get_mysql_cluster_dao():
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
             from mysql_cluster_instance a inner join mysql_instance b on a.instance_name=b.instance_name
             """
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.info(e)
    finally:
        return rows

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
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.info(e)
    finally:
        return rows