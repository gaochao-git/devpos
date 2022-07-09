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

logger = logging.getLogger('devops')


# 页面获取所有工单列表
def get_submit_sql_info_dao():
    where_condition = None
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
            a.utime,
            case a.is_submit when 0 then '暂不提交' when 1 then '提交' end as is_submit
        FROM sql_submit_info a inner join team_user b on a.submit_sql_user=b.uname where 1=1  order by a.ctime desc, a.utime desc
    """
    params = (where_condition)
    return db_helper.find_all(sql, params)


# 页面预览指定工单提交的SQL
def get_view_sql_by_uuid_dao(submit_sql_uuid):
    sql = "select submit_sql_file_path, user_offer_rollback_sql_file_path from sql_submit_info where submit_sql_uuid='{}'".format(submit_sql_uuid)
    return db_helper.find_all(sql)

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
               (select count(*) from  sql_check_results where submit_sql_uuid='{0}') as submit_sql_rows,
               (select sum(inception_affected_rows) from  sql_check_results where submit_sql_uuid='{0}') as submit_sql_affect_rows,
               (select sum(inception_execute_time) from sql_execute_results where submit_sql_uuid='{0}') as inception_execute_time,
               (select group_concat(distinct(inception_command) separator '、') from sql_check_results where submit_sql_uuid='{0}' group by submit_sql_uuid) as sql_command_type,
               (select max(inception_error_level) from sql_check_results where submit_sql_uuid='{0}') as inception_error_level,
               submit_sql_execute_type,
               comment_info,
               submit_sql_file_path,
               case is_submit when 0 then '暂不提交' when 1 then '提交' end as is_submit,
               user_offer_rollback_sql_file_path,
               review_ticket
        from sql_submit_info
        where submit_sql_uuid='{0}'
    """.format(submit_sql_uuid)
    return db_helper.find_all(sql)


# 获取所有实例名
def get_master_ip_dao():
    sql = "select instance_name from mysql_cluster_instance"
    return db_helper.find_all(sql)



# 页面查看审核结果
# def get_check_sql_results_by_uuid_dao(submit_sql_uuid):
#     sql = "select inception_id,inception_sql,inception_stage_status,inception_error_level,inception_error_message,inception_affected_rows from sql_check_results where submit_sql_uuid='{}'".format(submit_sql_uuid)
#     return db_helper.find_all(sql)

def remove_last_results_dao(submit_sql_uuid):
    """
    删除历史审核结果
    :param submit_sql_uuid:
    :return:
    """
    sql = "delete from sql_check_results where submit_sql_uuid='{}'".format(submit_sql_uuid)
    return db_helper.dml(sql)


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
        update_status = db_helper.dml(sql)
    except Exception as e:
        update_status = "error"
        logger.error(e)
    finally:
        return update_status


def submit_sql_dao(login_user_name,sql_title, db_ip, db_port, file_path, leader_name, qa_name, dba_name,
                   submit_sql_execute_type, comment_info, uuid_str,submit_source_db_type,cluster_name,
                   user_offer_rollback_sql_file_path):
    """
    将工单详情写入工单表
    :param login_user_name:
    :param sql_title:
    :param db_ip:
    :param db_port:
    :param file_path:
    :param leader_name:
    :param qa_name:
    :param dba_name:
    :param submit_sql_execute_type:
    :param comment_info:
    :param uuid_str:
    :param submit_source_db_type:
    :param cluster_name:
    :param user_offer_rollback_sql_file_path:用户提供的回滚SQL
    :return:
    """
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
                                         submit_sql_uuid,
                                         submit_source_db_type,
                                         cluster_name,
                                         user_offer_rollback_sql_file_path,review_ticket) 
                 values(%(p1)s,%(p2)s,%(p3)s,%(p4)s,%(p5)s,%(p6)s,1,%(p7)s,1,%(p8)s,1,%(p9)s,%(p10)s,%(p11)s,%(p12)s,%(p13)s,%(p14)s,%(p15)s)
        """
    params = {
        'p1': login_user_name,
        'p2': sql_title,
        'p3': db_ip,
        'p4': db_port,
        'p5': file_path,
        'p6': leader_name,
        'p7': qa_name,
        'p8': dba_name,
        'p9': submit_sql_execute_type,
        'p10': comment_info,
        'p11': uuid_str,
        'p12': submit_source_db_type,
        'p13': cluster_name,
        'p14': user_offer_rollback_sql_file_path,
        'p15': '{"submit_team_review":"finish","execute_team_review":"wait"}'
    }
    return db_helper.dml(sql, params)


def submit_sql_results_dao(uuid_str, check_sql_results, is_submit):
    """
    将提交的审核结果写入数据库,使用db_helper会创建多次连接,效率太低
    如果uuid_str是None，说明是用的同步审核同步提交，需要将审核结果写入数据库,is_submit为1
    如果uuid_str不是None，说明采用的是异步审核同步提交，is_submit为0，确认工单提交时会改为1
    :param uuid_str:
    :param check_sql_results:
    :param table_name:
    :return:
    """
    # SQL审核结果写入数据库
    cursor = connection.cursor()
    try:
        sql_key = """
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
                           inception_command,
                           is_submit) values
        """
        sql_values = ""
        total = len(check_sql_results)
        i = 0
        for check_sql_result in check_sql_results:
            id = check_sql_result["ID"]
            stage = check_sql_result["stage"]
            error_level = check_sql_result["errlevel"]
            stage_status = check_sql_result["stagestatus"]
            error_message = pymysql.escape_string(check_sql_result["errormessage"])
            sql = pymysql.escape_string(check_sql_result["SQL"])
            affected_rows = check_sql_result["Affected_rows"]
            sequence = pymysql.escape_string(check_sql_result["sequence"])
            backup_dbnames = check_sql_result["backup_dbname"]
            execute_time = check_sql_result["execute_time"]
            sqlsha1 = check_sql_result["sqlsha1"]
            command = check_sql_result["command"]
            value = """
                    ('{}',{},'{}',{},'{}','{}','{}','{}','{}','{}','{}','{}','{}',{}) 
                """.format(uuid_str, id, stage, error_level, stage_status,error_message, sql,
                           affected_rows, sequence, backup_dbnames, execute_time, sqlsha1, command, is_submit)
            sql_values = sql_values + value + ','
            i = i + 1
            total = total - 1
            if i < 50 and total == 0:  # 总数小于50或者最后一批不足50
                sql_results_insert = sql_key + sql_values.rstrip(',')
                cursor.execute(sql_results_insert)
            elif i == 50: # 达到50就执行一批
                sql_results_insert = sql_key + sql_values.rstrip(',')
                cursor.execute(sql_results_insert)
                sql_values = ""
                i = 0
        status = "ok"
        message = "审核结果写入数据库成功"
    except Exception as e:
        logger.exception(str(e))
        status = 'error'
        message = "审核结果写入数据库失败"
    finally:
        cursor.close()
        connection.close()
        return {"status": status, "message": message}


# 标记工单为审核通过或者不通过
def pass_submit_sql_by_uuid_dao(submit_sql_uuid,check_comment,check_status,login_user_name,login_user_name_role):
    if login_user_name_role == "leader":
        sql = "update sql_submit_info set leader_check={},leader_user_name='{}',leader_check_comment='{}' where submit_sql_uuid='{}'".format(check_status,login_user_name,check_comment,submit_sql_uuid)
    elif login_user_name_role == "qa":
        sql = "update sql_submit_info set qa_check={},qa_user_name='{}',qa_check_comment='{}' where submit_sql_uuid='{}'".format(check_status,login_user_name,check_comment,submit_sql_uuid)
    elif login_user_name_role == "dba":
        sql = "update sql_submit_info set dba_check={},dba_check_user_name='{}',dba_check_comment='{}' where submit_sql_uuid='{}'".format(check_status,login_user_name,check_comment,submit_sql_uuid)
    return db_helper.dml(sql)

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
                    from sql_submit_info a inner join sql_execute_split b on a.submit_sql_uuid=b.submit_sql_uuid
                    where a.submit_sql_uuid='{}'
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
        db_helper.dml(sql1)
        rows = db_helper.findall(sql2)
        if not rows:
            db_helper.dml(sql3)
        update_status = "ok"
    except Exception as e:
        update_status = "error"
        logger.error(e)
    finally:
        return update_status


def mark_ticket_stage_status(split_sql_file_path, stage_name, stage_value):
    """
    标记状态
    :return:
    """
    get_info_sql = "select ticket_stage_status from sql_execute_split where split_sql_file_path='{}'".format(split_sql_file_path)
    ret = db_helper.find_all(get_info_sql)
    ticket_stage_status = json.loads(ret['data'][0]['ticket_stage_status'])
    ticket_stage_status[stage_name] = stage_value
    ticket_stage_status = json.dumps(ticket_stage_status)
    sql = "update sql_execute_split set ticket_stage_status='{}' where split_sql_file_path='{}'".format(ticket_stage_status, split_sql_file_path)
    return db_helper.dml(sql)


# 查看执行结果
def get_execute_results_dao(split_sql_file_path):
    sql = """select a.inception_id as ID,
                    a.inception_stage as stage,
                    a.inception_error_level as errlevel,
                    a.inception_affected_rows as Affected_rows,
                    a.inception_error_message as errormessage,
                    a.inception_sql as `SQL`,
                    a.inception_execute_time,
                    a.inception_stage_status as stagestatus,
                    a.inception_command as command
             from sql_execute_results a inner join sql_execute_split b 
             on a.split_sql_file_path=b.split_sql_file_path  where b.split_sql_file_path='{}'
    """.format(split_sql_file_path)
    return db_helper.find_all(sql)


# 根据uuid获取sqlsha1
def get_sqlsha1_by_uuid_dao(split_sql_file_path):
    sql = "select rerun_sequence from sql_execute_split where split_sql_file_path='{}'".format(split_sql_file_path)
    rows = []
    try:
        rerun_sequence_ret = db_helper.findall(sql)
        if not rerun_sequence_ret[0]["rerun_sequence"]:
            sql_1 = "select inception_sqlsha1,inception_sql from sql_check_results a inner join sql_execute_split b on a.submit_sql_uuid=b.submit_sql_uuid where b.split_sql_file_path='{}' and a.inception_sqlsha1!=''".format(
                split_sql_file_path)
        else:
            rerun_sequence = rerun_sequence_ret[0]["rerun_sequence"]
            sql_1 = "select inception_sqlsha1,inception_sql from sql_check_rerun_results where rerun_sequence='{}'".format(
                rerun_sequence)
        rows = db_helper.findall(sql_1)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


# 获取页面拆分SQL
def get_split_sql_dao(submit_sql_uuid):
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
            sum(c.inception_execute_time) inception_execute_time,
            b.rerun_flag
            from sql_submit_info a inner join sql_execute_split b on a.submit_sql_uuid=b.submit_sql_uuid left join sql_execute_results c on b.split_sql_file_path=c.split_sql_file_path where a.submit_sql_uuid='{}' group by b.split_sql_file_path order by b.split_seq,b.split_sql_file_path
    """.format(submit_sql_uuid)
    return db_helper.find_all(sql)


# 获取执行SQL需要的目的ip、port、claster_name、osc配置
def get_master_info_by_split_sql_file_path_dao(split_sql_file_path):
    sql = """
            select 
                a.master_ip,
                a.master_port,
                a.cluster_name,
                b.inception_osc_config,
                b.dba_execute,
                b.execute_status,
                b.task_send_celery 
            from sql_submit_info a inner join sql_execute_split b 
            on a.submit_sql_uuid = b.submit_sql_uuid 
            where split_sql_file_path='{}'
         """.format(split_sql_file_path)
    return db_helper.find_all(sql)


# 工单执行失败点击生成重做数据
def recreate_sql_dao(split_sql_file_path, recreate_sql_flag):
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


# 拆分SQL结果入库
def write_split_sql_to_new_file_dao(submit_sql_uuid, split_seq, split_sql_file_path, sql_num, ddlflag,master_ip, master_port, cluster_name, rerun_sequence,rerun_seq, inception_osc_config):
    ticket_stage_status = {"get_task": "wait", "precheck":"wait", "inc_exe":"wait", "process_result":"wait", "mark_status":"wait"}
    ticket_stage_status = json.dumps(ticket_stage_status)
    sql = """insert into sql_execute_split(
                                        submit_sql_uuid,
                                        split_seq,
                                        split_sql_file_path,
                                        sql_num,
                                        ddlflag,
                                        master_ip,
                                        master_port,
                                        cluster_name,
                                        rerun_sequence,
                                        rerun_seq,
                                        inception_osc_config,
                                        ticket_stage_status
                                        ) values('{}',{},'{}',{},{},'{}',{},'{}','{}',{},'{}','{}')
                                    """.format(submit_sql_uuid, split_seq, split_sql_file_path, sql_num, ddlflag,master_ip, master_port, cluster_name, rerun_sequence,rerun_seq, inception_osc_config,ticket_stage_status)
    return db_helper.dml(sql)


# 获取执工单基础新
def get_submit_sql_file_path_info_dao(submit_sql_uuid):
    sql = "select master_ip,master_port,cluster_name,submit_source_db_type,submit_sql_file_path from sql_submit_info where submit_sql_uuid='{}'".format(submit_sql_uuid)
    return db_helper.find_all(sql)

# 获取重做数据需要的信息
def get_recreate_sql_info_dao(split_sql_file_path):
    sql = "select submit_sql_uuid,rerun_seq,split_seq,ddlflag,sql_num,submit_source_db_type,cluster_name,master_ip,master_port,inception_osc_config,inception_check_ignore_warning,inception_execute_ignore_error from sql_execute_split where split_sql_file_path='{}'".format(split_sql_file_path)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


# 重做SQL检查结果写入sql_check_rerun_results
def write_recreate_sql_check_results_dao(rerun_sequence, sql_id, inception_sql, sql_type, inception_sqlsha1):
    sql = "insert into sql_check_rerun_results(rerun_sequence, sql_id, inception_sql, sql_type, inception_sqlsha1) values('{}',{},'{}','{}','{}')".format(rerun_sequence, sql_id, inception_sql, sql_type, inception_sqlsha1)
    try:
        insert_status = db_helper.dml(sql)
    except Exception as e:
        insert_status = "error"
        logger.error(e)
    finally:
        return insert_status

# 重做SQL生成是否成功标记
def update_recreate_sql_flag_dao(flag, split_sql_file_path):
    sql = "update sql_execute_split set rerun_flag={} where split_sql_file_path='{}'".format(flag, split_sql_file_path)
    try:
        update_status = db_helper.dml(sql)
    except Exception as e:
        update_status = "error"
        logger.error(e)
    finally:
        return update_status


# 查看该SQL文件是否已经下发给celery
def get_task_send_celery(split_sql_file_path):
    sql = "select task_send_celery from sql_execute_split where split_sql_file_path='{}'".format(split_sql_file_path)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    finally:
        return rows


def set_task_send_celery(split_sql_file_path):
    sql = "update sql_execute_split set task_send_celery=1  where split_sql_file_path='{}'".format(split_sql_file_path)
    return db_helper.dml(sql)


def get_pre_check_result_dao(check_sql_uuid):
    """
    获取预审核结果
    :param check_sql_uuid:
    :return:
    """
    sql = """
        select 
            inception_id as ID,
            inception_stage as stage,
            inception_error_level as errlevel,
            inception_stage_status as stagestatus,
            inception_error_message as errormessage,
            inception_sql as `SQL`,
            inception_affected_rows as Affected_rows,
            inception_command as command,
            inception_executed_time as execute_time,
            inception_sequence as sequence,
            inception_sqlsha1 as sqlsha1,
            inception_backup_dbnames as backup_dbname
        from sql_check_results
        where submit_sql_uuid = '{}'
    """.format(check_sql_uuid)
    return db_helper.find_all(sql)


def mark_sql_check_results_dao(submit_sql_uuid):
    """
    修改SQL审核结果状态为已提交
    :param submit_sql_uuid:
    :return:
    """
    sql = "update sql_check_results set is_submit=1 where submit_sql_uuid='{}'".format(submit_sql_uuid)
    return db_helper.dml(sql)


def mark_ticket_dao(submit_sql_uuid, is_submit):
    """
    标记工单为提交或不提交，主要是用来处理用户修改已经提交的SQL
    :param submit_sql_uuid:0不提交,1提交
    :param is_submit:
    :return:
    """
    sql = "update sql_submit_info set is_submit={} where submit_sql_uuid='{}'".format(is_submit, submit_sql_uuid)
    return db_helper.dml(sql)


def get_ticket_stage_status_dao(split_sql_file_path):
    """
    获取各阶段状态
    :param split_sql_file_path:
    :return:
    """
    sql = "select ticket_stage_status from sql_execute_split where split_sql_file_path='{}'".format(split_sql_file_path)
    print(sql)
    return db_helper.find_all(sql)