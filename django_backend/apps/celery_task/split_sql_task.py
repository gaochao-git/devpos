from apps.utils import db_helper
from django.db import connection
from apps.utils import inception
from apps.dao import audit_sql_dao
from apps.utils import common
import logging
import pymysql
import json
logger = logging.getLogger('inception_execute_logger')


class AsyncSplitSql:
    """
    cal_des_ip,cal_des_port是通过集群名实时计算出来的
    des_ip,des_port是工单提交时指定的
    """
    def __init__(self, submit_sql_uuid, ticket_info, cal_des_ip, cal_des_port):
        self.submit_sql_uuid = submit_sql_uuid
        self.des_ip = ticket_info['master_ip']
        self.des_port = ticket_info['master_port']
        self.cal_des_ip = cal_des_ip
        self.cal_des_port = cal_des_port
        self.cluster_name = ticket_info['cluster_name']
        self.submit_sql_file_path = ticket_info['submit_sql_file_path']
        self.inc_ret_rows = ""
        self.exe_user_name = "gaochao"
        self.task_type = "split_sql"

    def task_run(self):
        # 发送拆分任务---->推送到celery----->获取到任务------->发送审核工具拆分----->处理审核工具拆分结果----->标记任务状态
        common.mark_celery_task(self.submit_sql_uuid, self.task_type, 1)
        common.audit_sql_log(self.submit_sql_uuid, 0, "======================开始拆分SQL=================")
        try:
            self.send_inception()
            self.write_split_sql_to_new_file()
            common.mark_celery_task(self.submit_sql_uuid, self.task_type, 2)
            common.audit_sql_log(self.submit_sql_uuid, 0, "任务拆分完成")
        except Exception as e:
            logger.exception('工单%s拆分失败,错误信息:%s', self.submit_sql_uuid, e)
            common.mark_celery_task(self.submit_sql_uuid, self.task_type, 3)
            common.audit_sql_log(self.submit_sql_uuid, 1, "任务拆分失败:%s" % e)
        finally:
            common.audit_sql_log(self.submit_sql_uuid, 0, "======================拆分SQL结束=================")

    def send_inception(self):
        """
        SQL发送到inception拆分
        :return:
        """
        # 审核通过调用inception拆分DDL/DML
        common.audit_sql_log(self.submit_sql_uuid, 0, "任务发送到审核工具拆分")
        try:
            # 从文件获取用户提交的SQL
            with open("./upload/{}".format(self.submit_sql_file_path), "rb") as f:
                split_sql = f.read().decode('utf-8')
        except Exception as e:
            raise Exception("读取拆分源文件失败%s" % e)
        # 调用inception连接数据源拆分SQL
        split_ret = inception.start_split_sql(self.cal_des_ip, self.cal_des_port, split_sql)
        if split_ret['status'] == 'ok':
            self.inc_ret_rows = split_ret['data']
            common.audit_sql_log(self.submit_sql_uuid, 0, "任务发送到审核工具拆分完成")
        else:
            raise Exception("任务发送到审核工具拆分失败%s" % split_ret['message'])

    def write_split_sql_to_new_file(self):
        """
        将审核工具返回的拆分SQL写入子文件
        将审核工具返回的拆分子工单详情写入数据库
        数据源保持原始工单数据源，不能动态获取
        """
        try:
            result = []
            result_tmp = {}
            for tup in self.inc_ret_rows:
                result_tmp['split_seq'] = tup['ID']
                result_tmp['sql'] = tup['sql_statement']
                result_tmp['ddlflag'] = tup['ddlflag']
                result_tmp['sql_num'] = len(self.inc_ret_rows)
                result_copy = result_tmp.copy()
                result.append(result_copy)
                result_tmp.clear()
            for i in result:
                ddlflag = i["ddlflag"]
                split_seq = i["split_seq"]
                sql_num = i["sql_num"]
                sql = i["sql"]
                dir_name = self.submit_sql_file_path.split('/')[0]
                file_name = self.submit_sql_file_path.split('/')[1]
                split_file_name = str(split_seq) + '_' + file_name
                upfile = './upload/' + dir_name + '/' + split_file_name
                split_sql_file_path = dir_name + '/' + split_file_name
                rerun_sequence = ""
                rerun_seq = 0
                inception_osc_config = ""
                # 拆分SQL写入文件
                with open(upfile, 'w') as f:
                    f.write(sql)
                logger.info("拆分SQL写入对应文件成功：%s", upfile)
                # 拆分SQL详细信息写入数据库
                ret = audit_sql_dao.write_split_sql_to_new_file_dao(self.submit_sql_uuid, split_seq,split_sql_file_path,
                                                                    sql_num, ddlflag, self.des_ip, self.des_port,
                                                                    self.cluster_name, rerun_sequence, rerun_seq,
                                                                    inception_osc_config)
                if ret['status'] != "ok":
                    raise Exception("拆分子工单详细信息写入数据库失败")
                else:
                    logger.info("拆分子工单详细信息写入数据库成功:%s", upfile)
            common.audit_sql_log(self.submit_sql_uuid, 0, "拆分SQL处理成功(拆分DDL/DML文件，拆分DDL/DML子工单)")
        except Exception as e:
            common.audit_sql_log(self.submit_sql_uuid, 1, "拆分SQL处理失败(拆分DDL/DML文件，拆分DDL/DML子工单)")
            raise Exception("处理拆分结果出现异常:%s" % e)

    # def mark_celery_status(self, execute_status):
    #     """
    #     标记审核工单状态公共方法
    #     :param is_execute:
    #     :param execute_status:
    #     :return:
    #     """
    #     ret = audit_sql_dao.set_celery_task_status(self.submit_sql_uuid, execute_status, self.exe_user_name)
    #     if ret['status'] != 'ok': raise Exception("更新工单状态出现异常")

