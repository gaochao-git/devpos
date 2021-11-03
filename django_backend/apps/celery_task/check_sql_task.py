from apps.utils import db_helper
from django.db import connection
from apps.utils import inception
from apps.dao import audit_sql_dao
from apps.utils import common
import logging
import pymysql
import json
logger = logging.getLogger('inception_execute_logger')


class AsyncCheckSql:
    def __init__(self, des_ip, des_port, submit_sql_uuid, check_sql, check_user_name):
        self.submit_sql_uuid = submit_sql_uuid
        self.check_user_name = check_user_name
        self.des_ip = des_ip
        self.des_port = des_port
        self.check_sql = check_sql
        self.inc_ret_rows = ""

    def task_run(self):
        # 审核SQL---->推送到celery----->获取到任务------->预检查----->发送审核工具审核----->处理审核工具返回结果----->标记工单状态
        common.mark_celery_task(self.submit_sql_uuid, 1)
        try:
            self.send_inception()
            self.v2_process_check_results()
            common.mark_celery_task(self.submit_sql_uuid, 2)
            common.audit_sql_log(self.submit_sql_uuid, 0, "任务审核完成")
        except Exception as e:
            logger.exception('工单%s审核失败,错误信息:%s', self.submit_sql_uuid, e)
            common.mark_celery_task(self.submit_sql_uuid, 3)
            common.audit_sql_log(self.submit_sql_uuid, 1, "任务审核失败:%s" % e)
        finally:
            common.audit_sql_log(self.submit_sql_uuid, 0, "======================end=================")

    def send_inception(self):
        """
        SQL发送到inception审核
        :return:
        """
        common.audit_sql_log(self.submit_sql_uuid, 0, "任务发送到审核工具审核")
        ret = inception.check_sql(self.des_ip, self.des_port, self.check_sql)
        if ret['status'] != "ok":
            raise Exception(ret['message'])
        else:
            self.inc_ret_rows = ret['data']
            common.audit_sql_log(self.submit_sql_uuid, 0, "任务发送到审核工具执行完成")

    def process_check_results(self):
        """
        处理inception审核结果,为了加快插入速度不用公共的db_helper
        :return:
        """
        cursor = connection.cursor()
        try:
            result_error_level_list = []
            for row in self.inc_ret_rows:
                result_error_level_list.append(row['errlevel'])
                inc_id = row['ID']
                inc_stage = row['stage']
                inc_error_level = row['errlevel']
                inc_error_message = pymysql.escape_string(row['errormessage'])
                inc_sql = pymysql.escape_string(row['SQL'])
                inc_affected_rows = row['Affected_rows']
                inc_stage_status = row['stagestatus']
                inc_command = row['command']
                sql = """
                        insert into sql_pre_check_results(submit_sql_uuid,inception_id,inception_stage,
                                                          inception_error_level,inception_error_message,inception_sql,
                                                           inception_affected_rows,inception_stage_status,
                                                           inception_command) 
                                                           values('{}',{},'{}',{},'{}','{}',{},'{}','{}')
                """.format(self.submit_sql_uuid, inc_id, inc_stage, inc_error_level, inc_error_message, inc_sql,
                           inc_affected_rows, inc_stage_status, inc_command)
                cursor.execute(sql)
            connection.commit()
            common.audit_sql_log(self.submit_sql_uuid, 0, "审核结果写入数据库完成")
        except Exception as e:
            connection.rollback()
            raise Exception("审核结果写入数据库出现异常:%s" % e)
        finally:
            cursor.close()
            connection.close()

    def v2_process_check_results(self):
        """
        处理inception审核结果,为了加快插入速度不用公共的db_helper
        :return:
        """
        cursor = connection.cursor()
        try:
            sql_key = """
                insert into sql_pre_check_results(submit_sql_uuid,
                                              inception_id,
                                              inception_stage,
                                              inception_error_level,
                                              inception_stage_status,
                                              inception_error_message,
                                              inception_sql,
                                              inception_affected_rows,
                                              inception_command) values
            """
            sql_values = ""
            total = len(self.inc_ret_rows)
            i = 0
            for check_sql_result in self.inc_ret_rows:
                id = check_sql_result["ID"]
                stage = check_sql_result["stage"]
                error_level = check_sql_result["errlevel"]
                stage_status = check_sql_result["stagestatus"]
                error_message = pymysql.escape_string(check_sql_result["errormessage"])
                sql = pymysql.escape_string(check_sql_result["SQL"])
                affected_rows = check_sql_result["Affected_rows"]
                command = check_sql_result["command"]
                value = """
                        ('{}',{},'{}',{},'{}','{}','{}','{}','{}') 
                    """.format(self.submit_sql_uuid, id, stage, error_level, stage_status, error_message, sql,
                               affected_rows, command)
                sql_values = sql_values + value + ','
                i = i + 1
                total = total - 1
                if i < 50 and total == 0:  # 总数小于50或者最后一批不足50
                    sql_results_insert = sql_key + sql_values.rstrip(',')
                    cursor.execute(sql_results_insert)
                elif i == 50:  # 达到50就执行一批
                    sql_results_insert = sql_key + sql_values.rstrip(',')
                    cursor.execute(sql_results_insert)
                    sql_values = ""
                    i = 0
            connection.commit()
            common.audit_sql_log(self.submit_sql_uuid, 0, "审核结果写入数据库完成")
        except Exception as e:
            connection.rollback()
            logger.exception(str(e))
            raise Exception("审核结果写入数据库出现异常:%s" % e)
        finally:
            cursor.close()
            connection.close()

    def mark_celery_status(self, execute_status):
        """
        标记审核工单状态公共方法
        :param is_execute:
        :param execute_status:
        :return:
        """
        ret = audit_sql_dao.set_celery_task_status(self.submit_sql_uuid, execute_status, self.exe_user_name)
        if ret['status'] != 'ok': raise Exception("更新工单状态出现异常")

