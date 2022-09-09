from apps.utils import db_helper
from django.db import connection
from app_audit_sql.utils import inception
from app_audit_sql.dao import audit_sql_dao
from apps.utils import common
import pymysql
import json
from django_backend.settings import upload_base_path
import logging
logger = logging.getLogger('inception_execute_logger')


class ExecuteSql:
    def __init__(self, des_ip, des_port, inc_bak, inc_war, inc_err,file_path, submit_sql_uuid, inc_sleep, exe_user_name):
        self.submit_sql_uuid = submit_sql_uuid
        self.file_path = file_path
        self.inc_backup = inc_bak
        self.inc_ignore_warn = inc_war
        self.inc_ignore_err = inc_err
        self.inc_sleep = inc_sleep
        self.exe_user_name = exe_user_name
        self.des_ip = des_ip
        self.des_port = des_port
        self.osc_config_sql = ""
        self.ticket_info = ""
        self.execute_sql = ""
        self.inc_ret_rows = ""

    def task_run(self):
        # 执行工单---->推送到celery----->获取到任务------->预检查----->发送审核工具执行----->处理审核工具返回结果----->标记工单状态
        try:
            common.audit_sql_log(self.file_path, 0, "======================执行SQL开始=================")
            audit_sql_dao.mark_ticket_stage_status(self.file_path,"get_task","finish")
            self.get_ticket_info()
            self.pre_check()
            self.osc_config()
            self.generate_sql()
            self.send_inception()
            self.process_execute_results()
            common.audit_sql_log(self.file_path, 0, "执行SQL成功")
        except Exception as e:
            common.audit_sql_log(self.file_path, 1, "执行SQL出现异常")
            raise Exception(str(e))
        finally:
            common.audit_sql_log(self.file_path, 0, "======================执行SQL结束=================")

    def pre_check(self):
        # check1,判断工单是否已执行
        audit_sql_dao.mark_ticket_stage_status(self.file_path, "precheck", "process")
        dba_execute = self.ticket_info["dba_execute"]
        execute_status = self.ticket_info["execute_status"]
        if dba_execute != 1 or execute_status != 1:
            common.audit_sql_log(self.file_path, 1, "该工单已执行")
            audit_sql_dao.mark_ticket_stage_status(self.file_path, "precheck", "error")
            raise Exception("该工单已执行")
        # check2,判断当前实例read_only状态
        read_only_ret = common.get_read_only(self.des_ip, self.des_port)
        if read_only_ret['status'] != 'ok':
            raise Exception("执行SQL获取read_only出现异常")
        if read_only_ret['data'][0]['read_only'] != 'OFF':
            raise Exception("read_only角色不满足")
        self.mark_ticket_status(2, 2)  # 更新工单状态为已执行
        audit_sql_dao.mark_ticket_stage_status(self.file_path, "precheck", "finish")
        common.audit_sql_log(self.file_path, 0, "预检查通过")

    def get_ticket_info(self):
        """
        获取工单信息
        :return:
        """
        ticket_info = audit_sql_dao.get_master_info_by_split_sql_file_path_dao(self.file_path)
        if ticket_info['status'] == "ok":
            self.ticket_info = ticket_info['data'][0]
        else:
            raise Exception("获取工单信息失败")

    def osc_config(self):
        """
        生成osc配置
        :return:
        """
        inception_osc_config = self.ticket_info["inception_osc_config"]
        if inception_osc_config == "" or inception_osc_config == '{}':
            osc_config_sql = "show databases;"
        else:
            osc_config_sql = ""
            osc_config_dict = json.loads(inception_osc_config)
            osc_config_sql_list = []
            for k in osc_config_dict:
                osc_config_sql = "inception set session {}={};".format(k, osc_config_dict[k])
                osc_config_sql_list.append(osc_config_sql)
                osc_config_sql_list_str = [str(i) for i in osc_config_sql_list]
                osc_config_sql = ''.join(osc_config_sql_list_str)
        self.osc_config_sql = osc_config_sql

    def generate_sql(self):
        """
        读取文件生成SQL
        :return:
        """
        try:
            with open("{}/{}".format(upload_base_path, self.file_path,), "rb") as f:
                self.execute_sql = f.read().decode('utf-8')
        except Exception as e:
            logger.exception(e)
            raise Exception("读取SQL文件失败")

    def send_inception(self):
        """
        SQL发送到inception执行
        :return:
        """
        common.audit_sql_log(self.file_path, 0, "任务发送到审核工具执行")
        audit_sql_dao.mark_ticket_stage_status(self.file_path, "inc_exe", "process")
        ret = inception.execute_sql(self.des_ip, self.des_port, self.inc_backup, self.inc_ignore_warn,
                                    self.inc_ignore_err, self.execute_sql, self.file_path, self.osc_config_sql,self.inc_sleep)
        if ret['status'] != "ok": 
            self.mark_ticket_status(2, 4)
            audit_sql_dao.mark_ticket_stage_status(self.file_path, "inc_exe", "error")
            common.audit_sql_log(self.file_path, 1, "任务发送到审核工具执行出现异常:%s" % ret['message'])
            raise Exception(ret['message'])
        else:
            audit_sql_dao.mark_ticket_stage_status(self.file_path, "inc_exe", "finish")
            self.inc_ret_rows = ret['data']
            common.audit_sql_log(self.file_path, 0, "任务发送到审核工具执行完成")

    # def process_execute_results_bak(self):
    #     """
    #     处理inception执行结果,为了加快插入速度不用公共的db_helper
    #     :return:
    #     """
    #     audit_sql_dao.mark_ticket_stage_status(self.file_path, "process_result", "process")
    #     cursor = connection.cursor()
    #     try:
    #         sql_key = """
    #             insert into sql_execute_results(submit_sql_uuid,
    #                                             inception_id,
    #                                             inception_stage,
    #                                             inception_error_level,
    #                                             inception_error_message,
    #                                             inception_sql,
    #                                             inception_affected_rows,
    #                                             inception_execute_time,
    #                                             inception_backup_dbname,
    #                                             inception_sqlsha1,
    #                                             inception_command,
    #                                             inception_stage_status,
    #                                             inception_sequence,
    #                                             split_sql_file_path) values
    #         """
    #         result_error_level_list = []
    #         sql_values = ""
    #         total = len(self.inc_ret_rows)
    #         i = 0
    #         for check_sql_result in self.inc_ret_rows:
    #             result_error_level_list.append(check_sql_result["errlevel"])
    #             id = check_sql_result["ID"]
    #             stage = check_sql_result["stage"]
    #             error_level = check_sql_result["errlevel"]
    #             stage_status = check_sql_result["stagestatus"]
    #             error_message = pymysql.escape_string(check_sql_result["errormessage"])
    #             sql = pymysql.escape_string(check_sql_result["SQL"])
    #             sequence = pymysql.escape_string(check_sql_result["sequence"])
    #             backup_dbnames = check_sql_result["backup_dbname"]
    #             execute_time = check_sql_result["execute_time"]
    #             sqlsha1 = check_sql_result["sqlsha1"]
    #             command = check_sql_result["command"]
    #             affected_rows = check_sql_result["Affected_rows"]
    #             value = """
    #                         ('{}',{},'{}',{},'{}','{}',{},'{}','{}','{}','{}','{}','{}','{}')
    #                     """.format(self.submit_sql_uuid, id, stage, error_level, error_message, sql, affected_rows,
    #                                execute_time, backup_dbnames, sqlsha1, command, stage_status, sequence,
    #                                self.file_path)
    #             sql_values = sql_values + value + ','
    #             i = i + 1
    #             total = total - 1
    #             if i < 50 and total == 0:  # 总数小于50或者最后一批不足50
    #                 sql_results_insert = sql_key + sql_values.rstrip(',')
    #                 cursor.execute(sql_results_insert)
    #             elif i == 50:  # 达到50就执行一批
    #                 sql_results_insert = sql_key + sql_values.rstrip(',')
    #                 cursor.execute(sql_results_insert)
    #                 sql_values = ""
    #                 i = 0
    #         common.audit_sql_log(self.file_path, 0, "执行结果写入数据库完成")
    #         if max(result_error_level_list) == 0: self.mark_ticket_status(2, 3)
    #         if max(result_error_level_list) == 1: self.mark_ticket_status(2, 5)
    #         if max(result_error_level_list) == 2: self.mark_ticket_status(2, 4)
    #         common.audit_sql_log(self.file_path, 0, "标记工单状态完成")
    #         audit_sql_dao.mark_ticket_stage_status(self.file_path, "process_result", "finish")
    #     except Exception as e:
    #         logger.exception(e)
    #         audit_sql_dao.mark_ticket_stage_status(self.file_path, "process_result", "error")
    #         common.audit_sql_log(self.file_path, 1, "处理执行结果出现异常:%s" % e)
    #         self.mark_ticket_status(2, 7)
    #     finally:
    #         cursor.close()
    #         connection.close()

    def process_execute_results(self):
        """
        处理inception执行结果,为了加快插入速度不用公共的db_helper
        :return:
        """
        audit_sql_dao.mark_ticket_stage_status(self.file_path, "process_result", "process")
        sql = """
            insert into sql_execute_results(
                submit_sql_uuid,
                inception_id,
                inception_stage,
                inception_error_level,
                inception_stage_status,
                inception_error_message,
                inception_sql,
                inception_affected_rows,
                inception_sequence,
                inception_backup_dbname,
                inception_execute_time,
                inception_sqlsha1,
                inception_command,
                split_sql_file_path) 
            values(
                %(submit_sql_uuid)s,
                %(ID)s,
                %(stage)s,
                %(errlevel)s,
                %(stagestatus)s,
                %(errormessage)s,
                %(SQL)s,
                %(Affected_rows)s,
                %(sequence)s,
                %(backup_dbname)s,
                %(execute_time)s,
                %(sqlsha1)s,
                %(command)s,
                %(split_sql_file_path)s
            )
        """
        # 收集执行结果、动态增加submit_sql_uuid、split_sql_file_path
        result_error_level_list = []
        for execute_sql_result in self.inc_ret_rows:
            result_error_level_list.append(execute_sql_result["errlevel"])
            execute_sql_result.update({'submit_sql_uuid': self.submit_sql_uuid, 'split_sql_file_path': self.file_path})
        # 获取分片
        group_list = common.list_split_group(self.inc_ret_rows, size=50)
        # 分片写入数据库
        ret_list = [db_helper.batch_insert(sql, batch).get('status') for batch in group_list]
        # 判断写入过程中有无失败
        if 'error' in ret_list:
            common.audit_sql_log(self.file_path, 1, "执行结果写入数据库出现异常")
        else:
            common.audit_sql_log(self.file_path, 0, "执行结果写入数据库完成")
        # 根据执行结果标记工单状态
        if max(result_error_level_list) == 0: self.mark_ticket_status(2, 3)
        if max(result_error_level_list) == 1: self.mark_ticket_status(2, 5)
        if max(result_error_level_list) == 2: self.mark_ticket_status(2, 4)
        common.audit_sql_log(self.file_path, 0, "标记工单状态完成")
        audit_sql_dao.mark_ticket_stage_status(self.file_path, "process_result", "finish")

    def mark_ticket_status(self, is_execute, execute_status):
        """
        标记子工单--->计算所有子工单---->标记主工单
        :param is_execute:1-->未执行,2-->已执行'
        :param execute_status:1-->未执行,2-->执行中,3-->执行成功,4-->执行失败,5-->执行成功含警告
        :return:
        """
        # 标记子工单
        audit_sql_dao.mark_ticket_stage_status(self.file_path, "mark_status", "process")
        sql = """
                update sql_execute_split 
                    set dba_execute={},execute_status={},submit_sql_execute_plat_or_manual=1 
                where split_sql_file_path='{}'
             """.format(is_execute, execute_status, self.file_path)
        ret = db_helper.dml(sql)
        if ret['status'] != 'ok':
            audit_sql_dao.mark_ticket_stage_status(self.file_path, "mark_status", "error")
            raise Exception("更新子工单状态出现异常")
        else:
            audit_sql_dao.mark_ticket_stage_status(self.file_path, "mark_status", "finish")
        # 判断所有子工单标记主工单
        get_code_sql = """
                    select distinct(execute_status) as execute_status from sql_execute_split where submit_sql_uuid='{}'
                """.format(self.submit_sql_uuid)
        get_code_ret = db_helper.find_all(get_code_sql)
        if get_code_ret['status'] != "ok": raise Exception("获取子工单执行状态出现异常")
        if len(get_code_ret['data']) == 0: raise Exception("获取子工单执行状态为空")
        code_list = []
        for i in get_code_ret['data']:
            code_list.append(i['execute_status'])
        if {4}.issubset(code_list):
            self.mark_parent_ticket_status(2, 4)
        elif {2}.issubset(code_list):
            self.mark_parent_ticket_status(2, 2)
        elif {5,1}.issubset(code_list):
            self.mark_parent_ticket_status(2, 2)
        elif {3,1}.issubset(code_list):
            self.mark_parent_ticket_status(2, 2)
        elif {5}.issubset(code_list):
            self.mark_parent_ticket_status(2, 5)
        elif {3}.issubset(code_list):
            self.mark_parent_ticket_status(2, 3)

    def mark_parent_ticket_status(self, is_execute, execute_status):
        """
        :param is_execute:1-->未执行,2-->已执行'
        :param execute_status:1-->未执行,2-->执行中,3-->执行成功,4-->执行失败,5-->执行成功含警告
        :return:
        """
        sql = """
                 update sql_submit_info 
                     set dba_execute={},execute_status={},submit_sql_execute_plat_or_manual=1,dba_execute_user_name='{}' 
                 where submit_sql_uuid='{}'
              """.format(is_execute, execute_status, self.exe_user_name, self.submit_sql_uuid)
        c_p_ret = db_helper.dml(sql)
        if c_p_ret['status'] != 'ok': raise Exception("更新工单状态出现异常")

