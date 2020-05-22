#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import json
import pymysql
from django.db import connection
from apps.utils import common
from apps.utils import db_helper
import logging

logger = logging.getLogger('sql_logger')


# 页面获取所有工单列表
def get_submit_sql_info_dao(where_condition):
    sql = """
        SELECT 
            a.submit_sql_user,
            a.submit_sql_uuid,
            a.title,
            case a.leader_check  when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as leader_check,
            a.leader_user_name,
            case a.qa_check when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as qa_check,
            case a.dba_check when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as dba_check,
            case a.dba_execute when 1 then '未执行' when 2 then '已执行' end as dba_execute,
            case a.execute_status when 1 then '未执行' when 2 then '执行中' when 3 then '执行成功' when 4 then '执行失败' when 5 then '执行成功含警告' when 6 then '手动执行' end as execute_status,
            a.qa_user_name,
            a.dba_check_user_name,
            a.dba_execute_user_name,
            a.ctime,
            a.utime
        FROM sql_submit_info a inner join team_user b on a.submit_sql_user=b.uname where 1=1 {} order by a.ctime desc, a.utime desc
    """.format(where_condition)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


# 页面预览指定工单提交的SQL
def get_submit_sql_by_uuid_dao(submit_sql_uuid):
    sql = "select submit_sql_file_path from sql_submit_info where submit_sql_uuid='{}'".format(submit_sql_uuid)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows

# 查看指定提交工单的详情
def get_apply_sql_by_uuid_dao(submit_sql_uuid):
    sql = """
        select title,
               submit_sql_user,
               leader_user_name,
               qa_user_name,
               dba_check_user_name,
               dba_execute_user_name,
               case leader_check  when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as leader_check,
               case qa_check when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as qa_check,
               case dba_check when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as dba_check,
               case dba_execute when 1 then '未执行' when 2 then '已执行' end as dba_execute,
               case execute_status when 1 then '未执行' when 2 then '执行中' when 3 then '执行成功' when 4 then '执行失败' when 5 then '执行成功(含警告)' when 6 then '手动执行' end as execute_status,
               master_ip,
               master_port,
               cluster_name,
               comment_info,
               submit_sql_uuid,
               (select count(*) from  sql_check_results where submit_sql_uuid='{}') as submit_sql_rows,
               (select sum(inception_affected_rows) from  sql_check_results where submit_sql_uuid='{}') as submit_sql_affect_rows,
               (select sum(inception_execute_time) from sql_execute_results where submit_sql_uuid='{}') as inception_execute_time,
               submit_sql_execute_type,
               comment_info,
               submit_sql_file_path
        from sql_submit_info
        where submit_sql_uuid='{}'
    """.format(submit_sql_uuid,submit_sql_uuid,submit_sql_uuid,submit_sql_uuid)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


# 根据输入的集群名模糊匹配已有集群名
def get_cluster_name_dao(cluster_name_patten):
    rows = []
    sql = "select cluster_name from mysql_cluster where cluster_name like '{}%' limit 5".format(cluster_name_patten)
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


# 获取master ip
def get_master_ip_dao(db_master_ip_or_hostname):
    if db_master_ip_or_hostname.strip('.').isdigit():
        sql = "select server_public_ip from server where server_public_ip like '{}%' limit 5".format(db_master_ip_or_hostname)
    else:
        sql = "select server_public_ip from server where server_hostname like '{}%' limit 5".format(db_master_ip_or_hostname)
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


# 页面查看审核结果
def get_check_sql_results_by_uuid_dao(submit_sql_uuid):
    sql = "select inception_sql,inception_stage_status,inception_error_level,inception_error_message,inception_affected_rows from sql_check_results where submit_sql_uuid='{}'".format(submit_sql_uuid)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


# 页面查看inception变量配置
def get_inception_variable_config_info_dao(split_sql_file_path):
    sql = "select variable_name name,variable_value value,variable_description,editable from sql_inception_osc_config"
    sql_split_osc_config = "select inception_osc_config from sql_execute_split where split_sql_file_path='{}'".format(split_sql_file_path)
    try:
        sql_split_osc_config_row = db_helper.findall(sql_split_osc_config)
        if sql_split_osc_config_row[0]["inception_osc_config"] == "" or sql_split_osc_config_row[0]["inception_osc_config"] == "{}":
            new_data = db_helper.findall(sql)
        else:
            data = db_helper.findall(sql)
            new_data = []
            for i in sql_split_osc_config_row:
                osc_config_variable_dict = json.loads(i["inception_osc_config"])
                for j in data:
                    if j["name"] in osc_config_variable_dict:
                        j["value"] = osc_config_variable_dict[j["name"]]
                        new_data.append(j)
                    else:
                        new_data.append(j)
    except Exception as e:
        logger.error(e)
    finally:
        return new_data


# 页面修改inception变量配置
def update_inception_variable_dao(request_body_json,split_sql_file_path):
    sql = "update sql_execute_split set inception_osc_config='{}' where split_sql_file_path='{}'".format(request_body_json,split_sql_file_path)
    try:
        update_status = db_helper.update(sql)
    except Exception as e:
        update_status = "error"
        logger.error(e)
    finally:
        return update_status


# 页面提交SQL工单,类型为cluster_name
def submit_sql_by_cluster_name_dao(login_user_name,sql_title, cluster_name, file_path, leader_name, qa_name,dba_name,submit_sql_execute_type, comment_info, uuid_str):
    sql = """insert into sql_submit_info(submit_sql_user,
                                         title,
                                         cluster_name,
                                         submit_sql_file_path,
                                         leader_user_name,
                                         leader_check,
                                         qa_user_name,
                                         qa_check,
                                         dba_check_user_name,
                                         dba_check,
                                         submit_sql_execute_type,
                                         comment_info,
                                         submit_sql_uuid) 
                 values('{}','{}','{}','{}','{}',1,'{}',1,'{}',1,'{}','{}','{}')
            """.format(login_user_name, sql_title, cluster_name, file_path, leader_name, qa_name, dba_name,submit_sql_execute_type, comment_info, uuid_str)
    try:
        insert_status = db_helper.insert(sql)
    except Exception as e:
        insert_status = "error"
        logger.error(e)
    finally:
        return insert_status


# 页面提交SQL工单,类型为ip,port
def submit_sql_by_ip_port_dao(login_user_name,sql_title, db_ip, db_port, file_path, leader_name, qa_name, dba_name,submit_sql_execute_type, comment_info, uuid_str):
    sql = """insert into sql_submit_info(submit_sql_user,
                                         title,
                                         master_ip,
                                         master_port,
                                         submit_sql_file_path,
                                         leader_user_name,
                                         leader_check,
                                         qa_user_name,
                                         qa_check,
                                         dba_check_user_name,
                                         dba_check,
                                         submit_sql_execute_type,
                                         comment_info,
                                         submit_sql_uuid) 
                 values('{}','{}','{}',{},'{}','{}',1,'{}',1,'{}',1,'{}','{}','{}')
        """.format(login_user_name, sql_title, db_ip, db_port, file_path, leader_name, qa_name, dba_name,submit_sql_execute_type, comment_info, uuid_str)
    try:
        insert_status = db_helper.insert(sql)
    except Exception as e:
        insert_status = "error"
        logger.error(e)
    finally:
        return insert_status


# SQL审核结果写入数据库
def submit_sql_results(uuid_str, check_sql_results):
    # SQL审核结果写入数据库
    try:
        for check_sql_result in check_sql_results:
            inception_id = check_sql_result["ID"]
            inception_stage = check_sql_result["Stage"]
            inception_error_level = check_sql_result["Error_Level"]
            inception_stage_status = check_sql_result["Stage_Status"]
            inception_error_message = pymysql.escape_string(check_sql_result["Error_Message"])
            inception_sql = pymysql.escape_string(check_sql_result["SQL"])
            inception_affected_rows = check_sql_result["Affected_rows"]
            inception_sequence = check_sql_result["Sequence"]
            inception_backup_dbnames = check_sql_result["Backup_Dbnames"]
            inception_execute_time = check_sql_result["Execute_Time"]
            inception_sqlsha1 = check_sql_result["sqlsha1"]
            inception_command = check_sql_result["Command"]
            sql_results_insert = """
                    insert into sql_check_results(submit_sql_uuid,
                                                  inception_id,
                                                  inception_stage,
                                                  inception_error_level,
                                                  inception_stage_status,
                                                  inception_error_message,
                                                  inception_sql,
                                                  inception_affected_rows,
                                                  inception_sequence,
                                                  inception_backup_dbnames,
                                                  inception_execute_time,
                                                  inception_sqlsha1,
                                                  inception_command)
                    values('{}',{},'{}',{},'{}','{}','{}','{}',{},'{}','{}','{}','{}') 
                """.format(uuid_str, inception_id, inception_stage, inception_error_level, inception_stage_status,
                           inception_error_message, inception_sql, inception_affected_rows, inception_sequence,
                           inception_backup_dbnames, inception_execute_time,
                           inception_sqlsha1, inception_command)
            db_helper.insert(sql_results_insert)
        insert_status = "ok"
    except Exception as e:
        logger.error(str(e))
        insert_status = 'error'
    finally:
        return insert_status


# 标记工单为审核通过或者不通过
def pass_submit_sql_by_uuid_dao(submit_sql_uuid,check_comment,check_status,login_user_name,login_user_name_role):
    if login_user_name_role == "leader":
        sql = "update sql_submit_info set leader_check={},leader_user_name='{}',leader_check_comment='{}' where submit_sql_uuid='{}'".format(check_status,login_user_name,check_comment,submit_sql_uuid)
    elif login_user_name_role == "qa":
        sql = "update sql_submit_info set qa_check={},qa_user_name='{}',qa_check_comment='{}' where submit_sql_uuid='{}'".format(check_status,login_user_name,check_comment,submit_sql_uuid)
    elif login_user_name_role == "dba":
        sql = "update sql_submit_info set dba_check={},dba_check_user_name='{}',dba_check_comment='{}' where submit_sql_uuid='{}'".format(check_status,login_user_name,check_comment,submit_sql_uuid)
    try:
        update_status = db_helper.update(sql)
    except Exception as e:
        update_status = "error"
        logger.error(e)
    finally:
        return update_status

# 获取拆分后的每条SQL信息
def get_split_sql_info_dao(submit_sql_uuid):
    sql = """
                 select 
                    a.title,                
                    a.submit_sql_user,                
                    a.leader_user_name,                
                    a.qa_user_name,                
                    a.dba_check_user_name,                
                    a.dba_execute_user_name,                
                    case a.leader_check  when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as leader_check,                
                    case a.qa_check when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as qa_check,                
                    case a.dba_check when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as dba_check,                
                    case a.dba_execute when 1 then '未执行' when 2 then '已执行' end as dba_execute,                
                    case a.execute_status when 1 then '未执行' when 2 then '执行中' when 3 then '执行成功' when 4 then '执行失败' when 5 then '执行成功含警告' when 6 then '手动执行' end as execute_status,                
                    a.master_ip,                
                    a.master_port,                
                    a.comment_info,                
                    a.submit_sql_uuid,                
                    (select count(*) from  sql_check_results where submit_sql_uuid='{}') as submit_sql_rows,                
                    (select sum(inception_affected_rows) from  sql_check_results where submit_sql_uuid='{}') as submit_sql_affect_rows,                
                    (select sum(inception_execute_time) from sql_execute_results where submit_sql_uuid='{}') as inception_execute_time,                
                    a.submit_sql_execute_type,                             
                    b.split_sql_file_path         
                    from sql_submit_info a inner join sql_execute_split b on a.submit_sql_uuid=b.submit_sql_uuid where a.submit_sql_uuid='{}'
            """.format(submit_sql_uuid, submit_sql_uuid, submit_sql_uuid, submit_sql_uuid)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows

# 手动执行SQL更改工单状态
def execute_submit_sql_by_file_path_manual_dao(submit_sql_uuid,split_sql_file_path,login_user_name):
    sql1 = "update sql_execute_split set dba_execute=2,execute_status=6,submit_sql_execute_plat_or_manual=2 where split_sql_file_path='{}'".format(split_sql_file_path)
    sql2 = "select id,submit_sql_uuid,split_sql_file_path from sql_execute_split where submit_sql_uuid='{}' and dba_execute=1".format(submit_sql_uuid)
    sql3 = "update sql_submit_info set dba_execute=2,execute_status=6,submit_sql_execute_plat_or_manual=2,dba_execute_user_name='{}' where submit_sql_uuid='{}'".format(login_user_name, submit_sql_uuid)
    #如果所有的拆分文件均执行完在将工单文件状态改了
    try:
        db_helper.update(sql1)
        rows = db_helper.findall(sql2)
        if not rows:
            db_helper.update(sql3)
        update_status = "ok"
    except Exception as e:
        update_status = "error"
        logger.error(e)
    finally:
        return update_status

# 查看执行结果
def get_execute_results_by_split_sql_file_path_dao(split_sql_file_path):
    sql = """select a.inception_id,
                    a.inception_stage,
                    case a.inception_error_level  when 0 then '执行成功' when 1 then '执行成功(含警告)' when 2 then '执行失败' end as inception_error_level,
                    a.inception_affected_rows,
                    a.inception_error_message,
                    a.inception_sql,
                    a.inception_execute_time
             from sql_execute_results a inner join sql_execute_split b on a.split_sql_file_path=b.split_sql_file_path  where b.split_sql_file_path='{}'
    """.format(split_sql_file_path)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


# 根据uuid获取sqlsha1
def get_sqlsha1_by_uuid_dao(submit_sql_uuid):
    sql = "select inception_sqlsha1,inception_sql from sql_check_results where submit_sql_uuid='{}' and inception_sqlsha1!=''".format(submit_sql_uuid)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


# 获取页面拆分SQL
def get_split_sql_by_uuid_dao(submit_sql_uuid):
    sql = """
        select
            a.master_ip,
            a.master_port,
            a.submit_sql_uuid,
            b.split_seq,
            b.split_sql_file_path,
            case b.dba_execute when 1 then '未执行' when 2 then '已执行' end as dba_execute,
            case b.submit_sql_execute_plat_or_manual when 1 then '平台执行' when 2 then '手动执行' end as submit_sql_execute_plat_or_manual,
            case b.execute_status when 1 then '未执行' when 2 then '执行中' when 3 then '执行成功' when 4 then '执行失败' when 5 then '执行成功(含警告)' end as execute_status,
            sum(c.inception_execute_time) inception_execute_time
            from sql_submit_info a inner join sql_execute_split b on a.submit_sql_uuid=b.submit_sql_uuid left join sql_execute_results c on b.split_sql_file_path=c.split_sql_file_path where a.submit_sql_uuid='{}' group by b.split_sql_file_path order by b.split_seq
    """.format(submit_sql_uuid)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


# 获取执行SQL需要的目的ip、port、claster_name、osc配置
def get_master_info_by_split_sql_file_path_dao(split_sql_file_path):
    sql = "select a.master_ip,a.master_port,a.cluster_name,b.inception_osc_config from sql_submit_info a inner join sql_execute_split b on a.submit_sql_uuid =b.submit_sql_uuid where split_sql_file_path='{}'".format(
        split_sql_file_path)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows

# 工单执行失败点击生成重做数据
def recreate_sql_dao(submit_sql_uuid, split_sql_file_path, recreate_sql_flag):
    if recreate_sql_flag == "include_error_sql":
        sql = "select submit_sql_uuid,inception_id,inception_sql,inception_stage,inception_error_level from sql_execute_results where split_sql_file_path='{}' and (inception_stage !='EXECUTED' or inception_error_level !=0)".format(
        split_sql_file_path)
    elif recreate_sql_flag == "ignore_error_sql":
        sql = "select submit_sql_uuid,inception_id,inception_sql,inception_stage,inception_error_level from sql_execute_results  where split_sql_file_path='{}' and inception_stage !='EXECUTED'".format(
        split_sql_file_path)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows

# 重做SQL状态重制
def reset_execute_status_dao(split_sql_file_path,split_sql_file_path_target):
    sql_1 = "update sql_execute_split set dba_execute=1,execute_status=1 where split_sql_file_path='{}'".format(split_sql_file_path)
    sql_2 = "update sql_execute_split set split_sql_file_path='{}' where split_sql_file_path='{}'".format(split_sql_file_path_target, split_sql_file_path)
    try:
        update_status = db_helper.update(sql_1)
        update_status = db_helper.update(sql_2)
    except Exception as e:
        update_status = "error"
        logger.error(e)
    finally:
        return update_status

# 拆分SQL结果入库
def write_split_sql_to_new_file_dao(submit_sql_uuid, split_seq, split_sql_file_path, sql_num, ddlflag,master_ip, master_port, cluster_name):
    sql = """insert into sql_execute_split(
                                        submit_sql_uuid,
                                        split_seq,
                                        split_sql_file_path,
                                        sql_num,
                                        ddlflag,
                                        master_ip,
                                        master_port,
                                        cluster_name
                                        ) values('{}',{},'{}',{},{},'{}',{},'{}')
                                    """.format(submit_sql_uuid, split_seq, split_sql_file_path, sql_num, ddlflag,master_ip, master_port, cluster_name)
    try:
        insert_status = db_helper.update(sql)
    except Exception as e:
        insert_status = "error"
        logger.error(e)
    finally:
        return insert_status

# 获取执工单基础新
def get_submit_sql_file_path_info_dao(submit_sql_uuid):
    sql = "select master_ip,master_port,cluster_name,submit_sql_file_path from sql_submit_info where submit_sql_uuid='{}'".format(submit_sql_uuid)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows