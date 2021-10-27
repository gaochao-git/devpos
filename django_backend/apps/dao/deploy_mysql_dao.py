#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper
import logging
import uuid
logger = logging.getLogger('sql_logger')


def submit_install_mysql_dao(deploy_topos, idc, deploy_version, deploy_archit):
    """
    提交部署mysql任务工单
    :param topo_source:
    :param version:
    :return:
    """
    submit_uuid = str(uuid.uuid4())
    sql = """
            insert into deploy_mysql_submit_info(submit_uuid,submit_user,idc,deploy_topos,deploy_version,deploy_archit,
                                                 deploy_other_param,submit_check,submit_check_comment,submit_execute,
                                                 deploy_status,create_time,update_time,submit_check_username,
                                                 submit_execute_username,task_send_celery) 
                                           values('{0}','{1}','{2}','{3}','{4}','{5}','{6}',1,'审核内容',1,1,now(),now(),'高超','高超',0)
          """.format(submit_uuid,'gaochao', idc, deploy_topos, deploy_version,deploy_archit, '其他参数')
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
                  case submit_check  when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as submit_check,
                  case submit_execute when 1 then '未执行' when 2 then '已执行' end as submit_execute,
                  case deploy_status when 1 then '未执行' when 2 then '执行中' when 3 then '执行成功' when 4 then '执行失败' end as deploy_status,
                  submit_check_comment,
                  submit_check_username,
                  submit_execute_username,
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
                  case submit_check  when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as submit_check,
                  case submit_execute when 1 then '未执行' when 2 then '已执行' end as submit_execute,
                  case deploy_status when 1 then '未执行' when 2 then '执行中' when 3 then '执行成功' when 4 then '执行失败' end as deploy_status,
                  submit_check_username,
                  submit_execute_username,
                  submit_check_comment,
                  create_time,
                  update_time 
              from deploy_mysql_submit_info
              where submit_uuid='{}'
          """.format(submit_uuid)
    return db_helper.find_all(sql)


def get_deploy_mysql_log_dao(submit_uuid):
    """
    获取部署日志
    :param submit_uuid:
    :return:
    """
    sql = "select concat('[',create_time,'] ',deploy_log)  as deploy_log from deploy_mysql_log where submit_uuid='{}'".format(submit_uuid)
    ret = db_helper.find_all(sql)
    if ret['status'] != "ok": return ret
    data = ""
    for item in ret['data']:
        data = data + item['deploy_log'] + '\n'
    return {"status": "ok","message":"获取日志成功", "data": data}


def pass_submit_deploy_mysql_by_uuid_dao(submit_uuid,check_status,check_username,check_comment):
    """
    审核部署工单
    :param submit_uuid:
    :param check_status:
    :param check_username:
    :param check_comment:
    :return:
    """
    sql = """
            update deploy_mysql_submit_info 
            set submit_check={0},submit_check_username='{1}',submit_check_comment='{2}'
            where submit_uuid='{3}'
          """.format(check_status,check_username,check_comment,submit_uuid)
    return db_helper.dml(sql)


def set_task_celery_dao(submit_uuid):
    """
    更新工单是否推送celery状态
    :param submit_uuid:
    :return:
    """
    sql = "update deploy_mysql_submit_info set task_send_celery=1 where submit_uuid='{}'".format(submit_uuid)
    return db_helper.dml(sql)