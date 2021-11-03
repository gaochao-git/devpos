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
            self.process_check_results()
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
        审核结果写入预审核表
        :return:
        """
        ret = audit_sql_dao.submit_sql_results_dao(self.submit_sql_uuid, self.inc_ret_rows, 0)
        if ret['status'] != "ok": raise Exception(ret['message'])


