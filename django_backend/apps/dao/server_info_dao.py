#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超


from apps.utils import db_helper
import logging

logger = logging.getLogger('sql_logger')


def get_server_info_dao(search_server_name):
    if search_server_name is None:
        sql = """select id as 'key',
                server_public_ip,
                server_private_ip,
                server_hostname,
                case server_usage when 1 then 'MySQL' when 2 then 'Redis' when 3 then '混合' end server_usage,
                case server_type when 1 then '云主机' when 2 then '物理机' end server_type,
                memory/1024 as memory,
                server_os,
                disk_capacity,
                case disk_type when 'system' then '系统盘' when 'data' then '数据盘' end disk_type,
                network_type,
                public_network_bandwidth,
                private_network_bandwidth,
                cpu_size,
                deadline,
                case status when 0 then '不可用' when 1 then '可用' end status
          from server order by server_hostname"""
    else :
        sql = """select id as 'key',
                server_public_ip,
                server_private_ip,
                server_hostname,
                case server_usage when 1 then 'MySQL' when 2 then 'Redis' when 3 then '混合' end server_usage,
                case server_type when 1 then '云主机' when 2 then '物理机' end server_type,
                memory/1024 as memory,
                server_os,
                disk_capacity,
                case disk_type when 'system' then '系统盘' when 'data' then '数据盘' end disk_type,
                network_type,
                public_network_bandwidth,
                private_network_bandwidth,
                cpu_size,
                deadline,
                case status when 0 then '不可用' when 1 then '可用' end status
          from server where server_public_ip like "{}%" order by server_hostname""".format(search_server_name)
    return db_helper.find_all(sql)