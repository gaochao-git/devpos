#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging
logger = logging.getLogger('sql_logger')


def submit_install_mysql_dao(uuid_str, topo_source, port, version):
    """
    提交部署mysql任务工单
    :param uuid_str:
    :param topo_source:
    :param port:
    :param version:
    :return:
    """
    sql = """
            insert into deploy_mysql_submit_info(submit_uuid,submit_user,idc,deploy_topos,deploy_version,deploy_archit,
                                                 deploy_other_param,submit_check,submit_check_comment,submit_execute,
                                                 deploy_status,create_time,update_time) 
                                           values('{0}','{1}','{2}','{3}','{4}','{5}','{6}',1,'审核内容',1,1,now(),now())
          """.format(uuid_str,'gaochao','test_idc',topo_source,version,'ms','其他参数')
    return db_helper.dml(sql)


def get_deploy_mysql_submit_info_dao():
    """
    获取所有部署工单任务
    :return:
    """
    sql = """
              select 
                  submit_uuid,
                  submit_user,
                  idc,
                  deploy_topos,
                  deploy_version,
                  deploy_archit,
                  deploy_other_param,
                  submit_check,
                  submit_check_comment,
                  submit_execute,
                  deploy_status,
                  create_time,
                  update_time 
              from deploy_mysql_submit_info
              order by create_time desc
          """
    return db_helper.find_all(sql)


def get_deploy_mysql_info_by_uuid_dao(submit_uuid):
    """
    获取工单信息
    :param submit_uuid:
    :return:
    """
    sql = """
              select 
                  submit_uuid,
                  submit_user,
                  idc,
                  deploy_topos,
                  deploy_version,
                  deploy_archit,
                  deploy_other_param,
                  submit_check,
                  submit_check_comment,
                  submit_execute,
                  deploy_status,
                  create_time,
                  update_time 
              from deploy_mysql_submit_info
              where submit_uuid='{}'
          """.format(submit_uuid)
    return db_helper.find_all(sql)


def get_deploy_mysql_log_dao(submit_uuid):
    sql = "select concat('[',create_time,'] ',deploy_log)  as deploy_log from deploy_mysql_log where submit_uuid='{}'".format(submit_uuid)
    ret = db_helper.find_all(sql)
    if ret['status'] != "ok": return ret
    data = ""
    for item in ret['data']:
        data = data + item['deploy_log'] + '\n'
    return {"status": "ok","message":"获取日志成功", "data": data}