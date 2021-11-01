from apps.utils import db_helper
from django.db import connection
from apps.utils import inception
from apps.dao import audit_sql_dao
from apps.utils import common
import logging
import pymysql
import json
logger = logging.getLogger('inception_execute_logger')


class ExecuteSql:
    def __init__(self, des_ip, des_port, inc_bak, inc_war, inc_err,file_path, submit_sql_uuid, inc_sleep, exe_user_name):
        self.submit_sql_uuid = submit_sql_uuid
        self.file_path = file_path
        self.inc_backup = inc_bak
        self.inc_ignore_warn = inc_war
        self.inc_ignore_err = inc_err
        self.inc_sleep = inc_sleep
        self.exe_user_name= exe_user_name
        self.des_ip = des_ip
        self.des_port = des_port
        self.osc_config_sql = ""
        self.ticket_info = ""
        self.execute_sql = ""
        self.inc_ret_rows = ""

    def task_run(self):
        try:
            self.get_ticket_info()
            self.pre_check()
            self.osc_config()
            self.generate_sql()
            self.send_inception()
            self.process_execute_results()
        except Exception as e:
            logger.exception('工单%s执行失败,错误信息:%s', self.file_path, e)

    def pre_check(self):
        # 判断工单是否已执行
        dba_execute = self.ticket_info["dba_execute"]
        execute_status = self.ticket_info["execute_status"]
        if dba_execute != 1 or execute_status != 1: raise Exception("该工单已执行")
        else: self.mark_ticket_status(2, 2) # 更新工单状态为已执行

        # check2,判断当前实例read_only状态
        read_only_ret = common.get_read_only(self.des_ip, self.des_port)
        if read_only_ret['status'] != 'ok': raise Exception("执行SQL获取read_only出现异常")
        if read_only_ret['data'][0]['read_only'] != 'OFF': raise Exception("read_only角色不满足")

    def get_ticket_info(self):
        ticket_info = audit_sql_dao.get_master_info_by_split_sql_file_path_dao(self.file_path)
        if ticket_info['status'] != "ok":
            raise Exception("获取工单信息失败")
        self.ticket_info = ticket_info['data'][0]

    def osc_config(self):
        # inception执行osc配置
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
        try:
            with open("./upload/{}".format(self.file_path), "rb") as f:
                self.execute_sql = f.read().decode('utf-8')
            logger.info("工单%s读取SQL文件成功", self.file_path)
        except Exception as e:
            raise Exception("读取SQL文件失败")

    def send_inception(self):
        ret = inception.execute_sql(self.des_ip, self.des_port, self.inc_backup,self.inc_ignore_warn,
                                    self.inc_ignore_err, self.execute_sql, self.file_path, self.osc_config_sql)
        if ret['status'] != "ok": 
            self.mark_ticket_status(2,4)
            raise Exception(ret['message'])
        else: 
            self.inc_ret_rows = ret['data']

    # 处理inception执行结果,为了加快插入速度不用公共的db_helper
    def process_execute_results(self):
        cursor = connection.cursor()
        try:
            result_error_level_list = []
            for row in self.inc_ret_rows:
                result_error_level_list.append(row[2])
                inc_id = row[0]
                inc_stage = row[1]
                inc_error_level = row[2]
                inc_error_message = row[4]
                inc_sql = row[5]
                inc_affected_rows = row[6]
                inc_execute_time = row[9]
                sql = """insert into sql_execute_results(submit_sql_uuid,inception_id,inception_stage,inception_error_level,inception_error_message,inception_sql,inception_affected_rows,inception_execute_time,split_sql_file_path) 
                                                                                values('{}',{},'{}',{},'{}','{}',{},'{}','{}')
                """.format(self.submit_sql_uuid, inc_id, inc_stage, inc_error_level,
                           pymysql.escape_string(inc_error_message), pymysql.escape_string(inc_sql),
                           inc_affected_rows, inc_execute_time, self.file_path)
                cursor.execute(sql)
            connection.commit()
            logger.info('工单%sinception执行结果插入表中成功', self.submit_sql_uuid)
            if max(result_error_level_list) == 0: self.mark_ticket_status(2, 3)
            if max(result_error_level_list) == 1: self.mark_ticket_status(2, 5)
            if max(result_error_level_list) == 2: self.mark_ticket_status(2, 4)
        except Exception as e:
            logger.error('[工单:%s],inception执行结果插入表中失败:%s', self.submit_sql_uuid, str(e))
            self.mark_ticket_status(2, 7)
            connection.rollback()
        finally:
            cursor.close()
            connection.close()

    def mark_ticket_status(self, is_execute, execute_status):
        ret = audit_sql_dao.set_execute_status(self.submit_sql_uuid, self.file_path, is_execute, execute_status, self.exe_user_name)
        if ret['status'] != 'ok': raise Exception("更新工单状态出现异常")

