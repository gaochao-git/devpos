#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging

logger = logging.getLogger('sql_logger')


# 查看工单信息
def get_application_from_info_dao(search_applicant):
    if search_applicant == "":
        sql = """select id as 'key',
                    order_uuid,
                    ctime,
                    applicant,
                    case request_type when 0 then '创建新用户' when 1 then '扩展权限' when 2 then '扩展IP' when 3 then '扩展数据库' else '无效工单' end request_type,
                    department,
                    leader,
                    dba,
                    case leader_check_result when 1 then '通过' when 2 then '不通过' else '未审核' end leader_check_result,
                    case dba_check_result when 1 then '通过' when 2 then '不通过' else '未审核' end dba_check_result,
                    case status when 1 then '未执行' when 2 then '执行成功' else '执行失败' end status 
                from privilege_request_info order by ctime desc"""
    else:
        sql = """select id as 'key',
                    ctime,
                    applicant,
                    case request_type when 0 then '创建新用户' when 1 then '扩展权限' when 2 then '扩展IP' when 3 then '扩展数据库' else '无效工单' end request_type,
                    department,
                    leader,
                    dba,
                    case leader_check_result when 1 then '通过' when 2 then '不通过' else '未审核' end leader_check_result,
                    case dba_check_result when 1 then '通过' when 2 then '不通过' else '未审核' end dba_check_result,
                    case status when 1 then '未执行' when 2 then '执行成功' else '执行失败' end status 
                from privilege_request_info where applicant like '{}%' order by ctime desc""".format(search_applicant)
    rows = []
    try:
        rows = db_helper.findall(sql)
        logger.info("获取工单信息成功")
    except Exception as e:
        logger.error("获取工单失败%s",str(e))

    finally:
        return rows