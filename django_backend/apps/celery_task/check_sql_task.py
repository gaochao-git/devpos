import pymysql
from apps.utils import inception
from apps.dao import audit_sql_dao
from apps.utils import common
import logging
logger = logging.getLogger('devops')


class AsyncCheckSql:
    def __init__(self, des_ip, des_port, submit_sql_uuid, check_sql, check_user_name, check_type):
        self.submit_sql_uuid = submit_sql_uuid
        self.check_user_name = check_user_name
        self.des_ip = des_ip
        self.des_port = des_port
        self.check_sql = check_sql
        self.inc_ret_rows = ""
        self.task_type = check_type       # check_sql|recheck_sql


    def task_run(self):
        """
        发送审核SQL---->推送到celery----->celery获取到任务----->发送审核工具审核----->处理审核工具返回结果----->标记celery任务状态
        raise会将失败信息传送给celery做为返回值info
        :return:
        """
        try:
            common.audit_sql_log(self.submit_sql_uuid, 0, "======================检查SQL开始=================")
            self.send_inception()
            if self.task_type == "check_sql": self.process_check_results()
            elif self.task_type == "recheck_sql": self.process_recheck_results()
            else:
                common.audit_sql_log(self.submit_sql_uuid, 1, "审核类型不存在")
                raise Exception("审核类型不存在")
        except Exception as e:
            common.audit_sql_log(self.submit_sql_uuid, 1, str(e))
            raise Exception(str(e))
        finally:
            common.audit_sql_log(self.submit_sql_uuid, 0, "======================检查SQL结束=================")

    def send_inception(self):
        """
        SQL发送到inception审核
        :return:
        """
        common.audit_sql_log(self.submit_sql_uuid, 0, "任务发送到审核工具审核")
        ret = inception.check_sql(self.des_ip, self.des_port, self.check_sql)
        if ret['status'] != "ok": raise Exception(ret['message'])
        else:
            self.inc_ret_rows = ret['data']
            common.audit_sql_log(self.submit_sql_uuid, 0, "任务发送到审核工具审核完成")

    def process_check_results(self):
        """
        审核结果写入预审核表，预审核结果is_submit=0
        :return:
        """
        ret = audit_sql_dao.submit_sql_results_dao(self.submit_sql_uuid, self.inc_ret_rows, 0)
        if ret['status'] != "ok": raise Exception("预审核结果写入数据库失败")

    def process_recheck_results(self):
        """
        标记工单为不提交=======>重写SQL文件========>删除历史审核记录========>重写审核结果
        SQL写入之前的SQL文件，采用覆盖方式
        审核结果写入数据库，覆盖之前审核结果，is_submit=1
        :return:
        """
        # 标记工单为不提交
        ret = audit_sql_dao.mark_ticket_dao(self.submit_sql_uuid, 0)
        if ret['status'] != "ok": raise Exception("标记工单为不提交失败")
        # 删除历史审核记录
        ret = audit_sql_dao.remove_last_results_dao(self.submit_sql_uuid)
        if ret['status'] != "ok": raise Exception("删除历史审核记录失败")
        # 重写SQL文件
        try:
            file_path_data = audit_sql_dao.get_submit_sql_by_uuid_dao(self.submit_sql_uuid)
            file_path = file_path_data[0]["submit_sql_file_path"]
            with open("./upload/{}".format(file_path), "w") as f:
                f.write(self.check_sql)
            common.audit_sql_log(self.submit_sql_uuid, 0, "修改后SQL写入文件成功")
        except Exception as e:
            logger.exception(e)
            raise Exception("修改后SQL写入文件失败")
        # 重写审核结果
        ret = audit_sql_dao.submit_sql_results_dao(self.submit_sql_uuid, self.inc_ret_rows, 1)
        if ret['status'] != "ok": raise Exception("审核结果写入数据库失败")



