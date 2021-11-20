import pymysql
from apps.utils import inception
from apps.dao import audit_sql_dao
from apps.utils import common
import logging
logger = logging.getLogger('devops')


class AsyncCheckSql:
    def __init__(self, task,des_ip, des_port, submit_sql_uuid, check_sql, check_user_name, check_type,user_offer_rollback_sql):
        """
        异步检查SQL
        :param des_ip:
        :param des_port:
        :param submit_sql_uuid:
        :param check_sql:
        :param check_user_name:
        :param check_type: check_sql|recheck_sql
        :param user_offer_rollback_sql:
        """
        self.submit_sql_uuid = submit_sql_uuid
        self.check_user_name = check_user_name
        self.des_ip = des_ip
        self.des_port = des_port
        self.check_sql = check_sql
        self.rollback_sql = user_offer_rollback_sql
        self.check_type = check_type
        self.inc_ret_rows = ""
        self.task = task

    def task_run(self):
        """
        发送审核SQL---->推送到celery----->celery获取到任务----->发送审核工具审核----->审核工具返回结果写入数据库
        raise会将失败信息传送给celery做为返回值info
        :return:
        """
        try:
            common.audit_sql_log(self.submit_sql_uuid, 0, "======================检查SQL开始=================")
            self.send_inception()
            if self.check_type == "check_sql": self.process_check_results()
            elif self.check_type == "recheck_sql": self.process_recheck_results()
            else:
                common.audit_sql_log(self.submit_sql_uuid, 1, "检查类型不存在")
                raise Exception("检查类型不存在")
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
        common.audit_sql_log(self.submit_sql_uuid, 0, "任务发送到工具检查")
        ret = inception.check_sql(self.des_ip, self.des_port, self.check_sql)
        if ret['status'] != "ok":
            raise Exception(ret['message'])
        else:
            self.inc_ret_rows = ret['data']
            common.audit_sql_log(self.submit_sql_uuid, 0, "任务发送到工具检查完成")

    def process_check_results(self):
        """
        审核结果写入预审核表，预审核结果is_submit=0
        :return:
        """
        self.task.update_state(state="write_results_to_db")
        ret = audit_sql_dao.submit_sql_results_dao(self.submit_sql_uuid, self.inc_ret_rows, 0)
        if ret['status'] != "ok": raise Exception("预检查结果写入数据库失败")

    def process_recheck_results(self):
        """
        标记工单为不提交========>重写审核结果========>删除历史审核记录=======>重写SQL文件
        SQL写入之前的SQL文件，采用覆盖方式
        审核结果写入数据库，覆盖之前审核结果，is_submit=1
        :return:
        """
        # 标记工单为不提交
        ret = audit_sql_dao.mark_ticket_dao(self.submit_sql_uuid, 0)
        if ret['status'] != "ok": raise Exception("标记工单为不提交失败")
        # 删除历史审核记录
        ret = audit_sql_dao.remove_last_results_dao(self.submit_sql_uuid)
        if ret['status'] != "ok": raise Exception("删除历史检查记录失败")
        # 重写审核结果(放在写文件之前可以避免审核结果为一个事物提交避免大事物,如果写失败则不写文件肯定能发现)
        ret = audit_sql_dao.submit_sql_results_dao(self.submit_sql_uuid, self.inc_ret_rows, 1)
        if ret['status'] != "ok": raise Exception("检查结果写入数据库失败")
        # 重写SQL文件,使用数据库里面存放的SQL文件路径
        ret = audit_sql_dao.get_view_sql_by_uuid_dao(self.submit_sql_uuid)
        if ret['status'] != "ok": raise Exception("获取源SQL文件路径出现异常")
        try:
            sql_file_path = ret['data'][0]["submit_sql_file_path"]
            rollback_sql_file_path = ret['data'][0]["user_offer_rollback_sql_file_path"]
            with open("./upload/{}".format(sql_file_path), "w") as f1:
                f1.write(self.check_sql)
            with open("./upload/{}".format(rollback_sql_file_path), "w") as f2:
                f2.write(self.rollback_sql)
        except Exception as e:
            logger.exception(e)
            raise Exception("修改后SQL写入文件失败")



