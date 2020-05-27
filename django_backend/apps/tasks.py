#!/bin/envs python
#-*- coding:utf-8 -*-
# @Ctime   : 2020/04/15 上午9:50
# @Author  : gaochao
# @File    : task.py

import time
from celery import task
from apps.utils import db_helper
from django.db import connection
from apps.utils import inception
import logging
logger = logging.getLogger('inception_execute_logger')
import pymysql

@task
def sendmail(mail):
    print('sending mail to %s...' % mail['to'])
    time.sleep(100.0)
    print('mail sent.')
    return('mail sent.')

@task
def inception_execute(des_master_ip, des_master_port, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error,split_sql_file_path,submit_sql_uuid,osc_config_sql):
    logger.info("[工单:%s],开始执行......", (submit_sql_uuid))
    # 通过sql_file_path获取SQL文件并读取要执行的SQL
    try:
         with open("./upload/{}".format(split_sql_file_path), "rb") as f:
             execute_sql = f.read()
             execute_sql = execute_sql.decode('utf-8')
         logger.info("[工单:%s],读取SQL文件成功", submit_sql_uuid)
    except Exception as e:
        logger.error("[工单:%s],读取SQL文件失败:%s",submit_sql_uuid,e)
        message = "[工单:%s],读取SQL文件失败:%s".format(submit_sql_uuid,e)
        return message

    # 调用inception执行SQL
    try:
        ret = inception.execute_sql(des_master_ip, des_master_port, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error, execute_sql,submit_sql_uuid,osc_config_sql)
        logger.error('[工单:%s],调用inception.execute_sql执行SQL成功', submit_sql_uuid)
    except Exception as e:
        logger.error('[工单:%s],调用inception.execute_sql执行SQL失败:%s', submit_sql_uuid, str(e))

    # 返回值ok，只能说明inception执行完成没有异常中断，具体执行的每条SQL状态需要单独判断，更改sql_execute_split状态
    if ret["status"] == "ok":
        ret_process_results = process_execute_results(ret["data"],submit_sql_uuid,split_sql_file_path)
        if ret_process_results["status"] == "ok":
            if ret_process_results["inception_return_max_code"] == 2:
                sql_update_executing = "update sql_execute_split set execute_status=4 where split_sql_file_path='{}'".format(
                    split_sql_file_path)
            elif ret_process_results["inception_return_max_code"] == 1:
                sql_update_executing = "update sql_execute_split set execute_status=5 where split_sql_file_path='{}'".format(
                    split_sql_file_path)
            elif ret_process_results["inception_return_max_code"] == 0:
                sql_update_executing = "update sql_execute_split set execute_status=3 where split_sql_file_path='{}'".format(
                    split_sql_file_path)
            else:
                sql_update_executing = "update sql_execute_split set execute_status=999 where split_sql_file_path='{}'".format(
                    split_sql_file_path)
            try:
                sql_execute_split_status = db_helper.update(sql_update_executing)
                logger.info('[工单:%s],更改工单状态为执行完成，inception返回状态码最大值为:%s', submit_sql_uuid,
                             ret_process_results["inception_return_max_code"])
            except Exception as e:
                logger.error('[工单:%s],更改工单状态为执行完成时出现异常，工单状态为:%s', submit_sql_uuid, str(e))
        else:
            logger.error(ret_process_results["message"])
    else:
        # 更新工单状态为失败
        sql_list = []
        try:
            sql_execute_error = "update sql_submit_info set execute_status=4 where submit_sql_uuid='{}'".format(
                submit_sql_uuid)
            sql_update_executing_error = "update sql_execute_split set execute_status=4 where split_sql_file_path='{}'".format(
                split_sql_file_path)
            sql_list.append(sql_execute_error)
            sql_list.append(sql_update_executing_error)
            update_many_status = db_helper.update_many(sql_list)
            logger.info('[工单:%s],inception执行SQL异常结束,更改工单状态为失败，更改成功', submit_sql_uuid)
        except Exception as e:
            logger.error('[工单:%s],inception执行SQL异常结束,更改工单状态为失败时出现异常:%s', submit_sql_uuid, str(e))
    # 更改sql_submit_info状态
    try:
        get_all_sql_split_status = "select execute_status from sql_execute_split where submit_sql_uuid='{}'".format(submit_sql_uuid)
        rows = db_helper.findall(get_all_sql_split_status)
        sql_split_status_list = []
        for row in rows:
            sql_split_status_list.append(row["execute_status"])
        max_code = max(sql_split_status_list)
        sql_update_execute_max_code = "update sql_submit_info set execute_status={} where submit_sql_uuid='{}'".format(max_code, submit_sql_uuid)
        update_sql_submit_info_status = db_helper.update(sql_update_execute_max_code)
    except Exception as e:
        logging.error("[工单:%s],get_all_sql_split_status错误:%s",(submit_sql_uuid,str(e)))
    logger.info("[工单:%s],执行完成......", submit_sql_uuid)


# 处理inception执行结果,为了加快插入速度不用公共的db_helper
def process_execute_results(results,submit_sql_uuid,split_sql_file_path):
    cursor = connection.cursor()
    if results:
        try:
            result_error_level_list = []
            for row in results:
                print(row)
                result_error_level_list.append(row[2])
                inception_id = row[0]
                inception_stage = row[1]
                inception_error_level = row[2]
                inception_error_message = row[4]
                inception_sql = row[5]
                inception_affected_rows = row[6]
                inception_execute_time = row[9]
                insert_execute_results_sql = """insert into sql_execute_results(submit_sql_uuid,inception_id,inception_stage,inception_error_level,inception_error_message,inception_sql,inception_affected_rows,inception_execute_time,split_sql_file_path) 
                                                                                values('{}',{},'{}',{},'{}','{}',{},'{}','{}')
                """.format(submit_sql_uuid, inception_id, inception_stage, inception_error_level,pymysql.escape_string(inception_error_message), pymysql.escape_string(inception_sql),inception_affected_rows, inception_execute_time,split_sql_file_path)
                cursor.execute(insert_execute_results_sql)
            connection.commit()
            logger.info('[工单:%s],inception执行结果插入表中成功',submit_sql_uuid)
            content = {"status": "ok", "message": "ok", "inception_return_max_code": max(result_error_level_list)}
        except Exception as e:
            content = {"status": "error", "message": e}
            logger.error('[工单:%s],inception执行结果插入表中失败:%s',submit_sql_uuid,str(e))
            connection.rollback()
        finally:
            cursor.close()
            connection.close()
            return content