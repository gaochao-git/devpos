#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import pymysql
import uuid
from time import gmtime, strftime
import os
import json
from apps.dao import login_dao
from apps.utils import common
from apps.utils import inception
from apps.dao import audit_sql_dao
from apps.celery_task.tasks import inception_execute
from io import StringIO

import logging
logger = logging.getLogger('devops')


# 页面获取所有工单列表
def get_submit_sql_info():
    ret = audit_sql_dao.get_submit_sql_info_dao()
    return ret


def check_sql(submit_type, check_sql_info, cluster_name, instance_name):
    """
    检查SQL语法
    :param submit_type
    :param check_sql_info:
    :param cluster_name:
    :param instance_name:
    :return:
    """
    if submit_type == "cluster":
        instance_ret = common.get_cluster_node(cluster_name, 'M')
        if instance_ret['status'] !="ok":
            return instance_ret
        elif len(instance_ret['data']) ==0:
            return {"status": "error", "message":"没有获取到写节点"}
        else:
            instance_name = instance_ret['data'][0]['instance_name']
    elif submit_type == "template":
        pass
    print(instance_name)
    des_master_ip, des_master_port = instance_name.split('_')[0], instance_name.split('_')[1]
    ret = inception.check_sql(des_master_ip, des_master_port, check_sql_info)
    return ret


# 页面预览指定工单提交的SQL
def get_submit_sql_by_uuid(submit_sql_uuid):
    data = ""
    try:
        file_path_data = audit_sql_dao.get_submit_sql_by_uuid_dao(submit_sql_uuid)
        file_path = file_path_data[0]["submit_sql_file_path"]
        with open("./upload/{}".format(file_path), "rb") as f:
            data = f.read()
            data = data.decode('utf-8')
        content = {'status': "ok", 'message': "获取SQL成功",'data': data}
    except Exception as e:
        content = {'status': "error", 'message': str(e), 'data': data}
        logger.error(e)
    finally:
        return content


# 查看指定提交工单的详情
def get_apply_sql_by_uuid(submit_sql_uuid):
    data = []
    try:
        data = audit_sql_dao.get_apply_sql_by_uuid_dao(submit_sql_uuid)
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message, 'data': data}
        return content


# 获取master ip
def get_master_ip():
    ret = audit_sql_dao.get_master_ip_dao()
    return ret


# 根据输入的集群名模糊匹配已有集群名
def get_cluster_name():
    ret = audit_sql_dao.get_cluster_name_dao()
    return ret


# 页面提交SQL工单
def submit_sql(request_body):
    """
    按照这个顺序,如果提交过程中出现失败在SQL工单列表中不会给用户展示垃圾数据
    SQL写文件--->SQL审核结果写数据库--->工单信息写数据库
    :param request_body:
    :return:
    """
    ############################ SQL写文件 #############################
    # 确定文件名
    login_user_name = 'gaochao'
    now_date = strftime("%Y%m%d", gmtime())
    uuid_str = str(uuid.uuid4())
    file_name = "%s_%s.sql" % (login_user_name, uuid_str)
    # 确定存放路径
    upload_path = "./upload/" + now_date
    if not os.path.isdir(upload_path):
        os.makedirs(upload_path)
    file_path = now_date + '/' + file_name
    # 拼接文件名路径,提取提交SQL,并将SQL写入文件
    upfile = os.path.join(upload_path, file_name)
    check_sql = request_body['check_sql']
    try:
        with open(upfile, 'w') as f:
            f.write(check_sql)
            f.close()
        logger.info("提交的SQL写入文件成功")
        print("提交的SQL写入文件成功")
    except Exception as e:
        message = "提交的SQL写入文件失败:%s",str(e)
        logger.exception(message)
        return {'status': "error", 'message': message}
    # 获取工单相关人员信息
    login_user_info = common.get_login_user_info(login_user_name)
    qa_name = ''
    leader_name = ''
    dba_name = ''
    ############################ SQL审核结果写数据库 #############################
    # SQL审核结果写入数据库
    check_sql_results = request_body['check_sql_results']
    ret = audit_sql_dao.submit_sql_results(uuid_str, check_sql_results)
    if ret['status'] != "ok":
        return ret

    ############################ 工单信息写数据库 #############################
    # 页面提交的工单信息写入数据库
    sql_title = request_body['title']
    submit_sql_execute_type = request_body['submit_sql_execute_type']
    comment_info = request_body['comment_info']
    if (request_body['submit_source_db_type'] == "cluster"):
        cluster_name = request_body['current_cluster_name']
        ret = audit_sql_dao.submit_sql_by_cluster_name_dao(login_user_name, sql_title, cluster_name, file_path, leader_name, qa_name, dba_name, submit_sql_execute_type, comment_info, uuid_str)
    else:
        instance_name = request_body['instance_name']
        db_ip = instance_name.split('_')[0]
        db_port = instance_name.split('_')[1]
        ret = audit_sql_dao.submit_sql_by_ip_port_dao(login_user_name, sql_title, db_ip, db_port, file_path, leader_name, qa_name, dba_name, submit_sql_execute_type, comment_info, uuid_str)
    logger.info("页面提交的工单信息写入数据库:%s", ret['status'])
    return ret


# 页面预览指定的拆分SQL
def get_submit_split_sql_by_file_path(split_sql_file_path):
    try:
        with open("./upload/{}".format(split_sql_file_path), "rb") as f:
            data = f.read()
            data = data.decode('utf-8')
        content = {'status': "ok", 'message': "获取SQL成功",'data': data}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        logger.error(e)
    finally:
        return content


# 页面查看审核结果
def get_check_sql_results_by_uuid(submit_sql_uuid):
    data = []
    try:
        data = audit_sql_dao.get_check_sql_results_by_uuid_dao(submit_sql_uuid)
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message, 'data': data}
        return content


# 页面查看inception变量配置
def get_inception_variable_config_info(split_sql_file_path):
    data = []
    try:
        data = audit_sql_dao.get_inception_variable_config_info_dao(split_sql_file_path)
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message, 'data': data}
        return content


# 页面修改inception变量配置
def update_inception_variable(request_body_json,split_sql_file_path):
    try:
        status = audit_sql_dao.update_inception_variable_dao(request_body_json,split_sql_file_path)
        if status == "ok":
            message = "更改osc变量成功"
        else:
            message = "更改osc变量失败"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message}
        return content


class PassSubmitSql:
    def __init__(self, submit_sql_uuid, apply_results, check_comment, check_status):
        self.submit_sql_uuid = submit_sql_uuid
        self.apply_results = apply_results
        self.check_comment = check_comment
        self.check_status = check_status
        self.login_user_name = "gaochao"
        self.login_user_name_role = "dba"
        self.ticket_info = ""
        self.des_ip = ""
        self.des_port = ""
        self.cluster_name = ""
        self.split_data = ""

    def pass_submit_sql_by_uuid(self):
        try:
            self.get_ticket_info()
            self.judge_source_ip_port()
            self.split_sql()
            self.write_split_sql_to_new_file()
            self.mark_check_status()
            content = {"status": "ok", "message": "ok"}
        except Exception as e:
            logger.exception('工单%s审核失败,错误信息:%s', self.submit_sql_uuid, e)
            content = {"status": "error", "message": "审核工单出现异常:%s" % e}
        finally:
            return content

    def get_ticket_info(self):
        ticket_info = audit_sql_dao.get_submit_sql_file_path_info_dao(self.submit_sql_uuid)
        if ticket_info['status'] != "ok":
            raise Exception("获取工单信息失败")
        self.ticket_info = ticket_info['data'][0]

    def judge_source_ip_port(self):
        self.cluster_name = self.ticket_info["cluster_name"]
        if self.cluster_name:
            instance_ret = common.get_cluster_node(self.cluster_name, 'M')
            if instance_ret['status'] != "ok":
                raise Exception("获取写节点失败")
            elif len(instance_ret['data']) == 0:
                raise Exception("没有获取到写节点")
            else:
                instance_name = instance_ret['data'][0]['instance_name']
                self.des_ip, self.des_port = instance_name.split('_')[0], instance_name.split('_')[1]
        else:
            self.des_ip, self.des_port = self.ticket_info["master_ip"], self.ticket_info["master_port"]

    def mark_check_status(self):
        """
        标记审核状态
        :return:
        """
        mark_ret = audit_sql_dao.pass_submit_sql_by_uuid_dao(self.submit_sql_uuid, self.check_comment,
                                                             self.check_status, self.login_user_name,
                                                             self.login_user_name_role)
        if mark_ret['status'] != 'ok': raise Exception("审核状态异常")

    def split_sql(self):
        # 审核通过调用inception拆分DDL/DML
        try:
            # 从文件获取用户提交的SQL
            with open("./upload/{}".format(self.ticket_info["submit_sql_file_path"]), "rb") as f:
                execute_sql = f.read().decode('utf-8')
        except Exception as e:
            raise Exception("读取拆分源文件失败%s" % e)
        # 调用inception连接数据源拆分SQL
        split_ret = inception.start_split_sql(self.des_ip, self.des_port, execute_sql)
        if split_ret['status'] == 'ok':
            self.split_data = split_ret['data']
        else:
            raise Exception("审核工具拆分SQL失败%s" % split_ret['message'])

    def write_split_sql_to_new_file(self):
        """
        将审核工具返回的拆分SQL写入子文件
        将审核工具返回的拆分子工单详情写入数据库
        """
        try:
            result = []
            result_tmp = {}
            for tup in self.split_data:
                result_tmp['split_seq'] = tup['ID']
                result_tmp['sql'] = tup['sql_statement']
                result_tmp['ddlflag'] = tup['ddlflag']
                result_tmp['sql_num'] = len(self.split_data)
                result_copy = result_tmp.copy()
                result.append(result_copy)
                result_tmp.clear()
            for i in result:
                ddlflag = i["ddlflag"]
                split_seq = i["split_seq"]
                sql_num = i["sql_num"]
                sql = i["sql"]
                dir_name = self.ticket_info["submit_sql_file_path"].split('/')[0]
                file_name = self.ticket_info["submit_sql_file_path"].split('/')[1]
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
                if ret['status'] != "ok": raise Exception("拆分子工单详细信息写入数据库失败")
                else: logger.info("拆分子工单详细信息写入数据库成功:%s", upfile)
        except Exception as e:
            raise Exception("处理拆分结果出现异常:%s" % e)


# 审核通过并拆分SQL
# def pass_submit_sql_by_uuid(submit_sql_uuid,apply_results,check_comment,check_status):
#     # 标记工单审核通过或者不通过
#     login_user_name = 'gaochao'
#     login_user_name_role = 'dba'
#     mark_ret = audit_sql_dao.pass_submit_sql_by_uuid_dao(submit_sql_uuid,check_comment,check_status,login_user_name,login_user_name_role)
#     if mark_ret['status'] != "ok":
#         return mark_ret
#     # 如果是审核通过并且标记状态成功则走下面流程
#     if apply_results == "通过":
#         # 拆分SQL
#         if login_user_name_role == "dba":
#             ret = split_sql_func(submit_sql_uuid)
#             if ret['status'] !="ok":
#                 return ret
#             else:
#                 return {'status': "ok", 'message': "拆分SQL成功"}
#     elif apply_results == "不通过":
#         return {'status': "ok", 'message': "审核不通过"}


# 手动执行SQL更改工单状态
def execute_submit_sql_by_file_path_manual(token,submit_sql_uuid,split_sql_file_path):
    data = login_dao.get_login_user_name_by_token_dao(token)
    login_user_name = data["username"]
    try:
        update_status = audit_sql_dao.execute_submit_sql_by_file_path_manual_dao(submit_sql_uuid,split_sql_file_path,login_user_name)
        status = "ok"
        if update_status == "ok":
            message = "手动标记SQL为已执行，成功"
        else:
            message = "手动标记SQL为已执行，失败"
    except Exception as e:
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message}
        return content

# 查看执行结果
def get_execute_results_by_split_sql_file_path(split_sql_file_path):
    data = []
    try:
        data = audit_sql_dao.get_execute_results_by_split_sql_file_path_dao(split_sql_file_path)
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message, 'data': data}
        return content


# inception拆分SQL
# def split_sql_func(submit_sql_uuid):
#     # 查询工单信息
#     try:
#         # 获取用户提供的SQL文件路径、数据源
#         data = audit_sql_dao.get_submit_sql_file_path_info_dao(submit_sql_uuid)
#         sql_file_path = data[0]["submit_sql_file_path"]
#         cluster_name = data[0]["cluster_name"]
#         if cluster_name:
#             des_master_ip, des_master_port = common.get_cluster_node(cluster_name)
#         else:
#             des_master_ip = data[0]["master_ip"]
#             des_master_port = data[0]["master_port"]
#         # 从文件获取用户提交的SQL
#         with open("./upload/{}".format(sql_file_path), "rb") as f:
#             execute_sql = f.read()
#             execute_sql = execute_sql.decode('utf-8')
#         # 调用inception连接数据源拆分SQL
#         split_sql_ret = inception.start_split_sql(des_master_ip, des_master_port, execute_sql)
#         if split_sql_ret['status'] == 'ok':
#             process_split_sql_ret = write_split_sql_to_new_file(des_master_ip, des_master_port, submit_sql_uuid, split_sql_ret['data'], sql_file_path,cluster_name)
#             if process_split_sql_ret['status'] == "ok":
#                 status = "ok"
#                 message = "调用inception拆分sql成功,处理拆分后结果成功"
#             else:
#                 status = "error"
#                 message = "调用inception拆分sql成功,处理拆分后结果失败"
#         else:
#             status = "error"
#             message = "调用inception拆分sql失败"
#     except Exception as e:
#         status = "error"
#         message = "拆分SQL任务出现异常"
#         logger.exception(str(e))
#     finally:
#         return {"status": status, "message": message}


# 根据uuid获取sqlsha1,根据sqlsha1连接inception查看执行进度
def get_execute_process_by_uuid(split_sql_file_path):
    rows = audit_sql_dao.get_sqlsha1_by_uuid_dao(split_sql_file_path)
    sql_all_process = []
    logger.error(rows)
    for row in rows:
        sqlsha1 = row["inception_sqlsha1"]
        sql_sigle_process = {}
        if sqlsha1 == '':
            sql_sigle_process['inception_execute_percent'] = 100
            sql_sigle_process['inception_sql'] = row["inception_sql"]
            sql_all_process.append(sql_sigle_process)
        else:
            sql_sigle_process['inception_sql'] = row["inception_sql"]
            sql_sigle_process['inception_execute_percent'] = inception.get_ddl_process(sqlsha1)
            sql_all_process.append(sql_sigle_process)
        status = 'ok'
        message = 'ok'
    logger.error(sql_all_process)
    content = {'status': status, 'message': message, 'data': sql_all_process}
    return content


class ExecuteSqlByFilePath:
    # 获取SQL文件路径,调用inception执行,执行之前先判断是否已经执行过
    def __init__(self,submit_sql_uuid, file_path, exe_user_name,inc_bak, inc_war, inc_err, inc_sleep):
        self.submit_sql_uuid = submit_sql_uuid
        self.file_path = file_path
        self.exe_user_name = exe_user_name
        self.inc_bak = inc_bak
        self.inc_war = inc_war
        self.inc_err = inc_err
        self.inc_sleep = inc_sleep
        self.osc_config_sql = ""
        self.ticket_info = ""
        self.des_ip = ""
        self.des_port = ""

    def execute_submit_sql_by_file_path(self):
        try:
            self.get_ticket_info()
            self.judge_source_ip_port()
            self.pre_check()
            self.send_celery()
            content = {"status": "ok", "message": "推送任务成功"}
        except Exception as e:
            logger.exception('工单%s执行失败,错误信息:%s', self.file_path, e)
            content = {"status": "error", "message": "执行工单出现异常:%s" % e}
        finally:
            return content

    def get_ticket_info(self):
        ticket_info = audit_sql_dao.get_master_info_by_split_sql_file_path_dao(self.file_path)
        if ticket_info['status'] != "ok":
            raise Exception("获取工单信息失败")
        self.ticket_info = ticket_info['data'][0]

    def pre_check(self):
        # check1,判断任务是否已经发送到celery
        task_send_celery = self.ticket_info["task_send_celery"]
        if task_send_celery == 1:
            raise Exception("该工单已被注册到celery")
        # check2，判断工单是否已执行
        dba_execute = self.ticket_info["dba_execute"]
        execute_status = self.ticket_info["execute_status"]
        if dba_execute != 1 or execute_status != 1:
            raise Exception("该工单已执行")
        # check3,判断当前实例read_only状态
        read_only_ret = common.get_read_only(self.des_ip, self.des_port)
        if read_only_ret['status'] != 'ok':
            raise Exception("执行SQL获取read_only出现异常")
        if read_only_ret['data'][0]['read_only'] != 'OFF':
            raise Exception("read_only角色不满足")

    def judge_source_ip_port(self):
        cluster_name = self.ticket_info["cluster_name"]
        if cluster_name:
            instance_ret = common.get_cluster_node(cluster_name, 'M')
            if instance_ret['status'] != "ok":
                raise Exception("获取写节点失败")
            elif len(instance_ret['data']) == 0:
                raise Exception("没有获取到写节点")
            else:
                instance_name = instance_ret['data'][0]['instance_name']
                self.des_ip, self.des_port = instance_name.split('_')[0], instance_name.split('_')[1]
        else:
            self.des_ip, self.des_port = self.ticket_info["master_ip"], self.ticket_info["master_port"]

    def send_celery(self):
        common.audit_sql_log(self.file_path, 0, "======================begin=================")
        common.audit_sql_log(self.file_path, 0, "celery生产者发送任务")
        # 调用celery异步执行,异获取到task_id则表示任务已经放入队列，后续具体操作交给worker处理，如果当时worker没有启动，后来再启动,worker会去队列获取任务执行
        task_id = inception_execute.delay(self.des_ip, self.des_port, self.inc_bak, self.inc_war, self.inc_err,
                                          self.file_path, self.submit_sql_uuid, self.inc_sleep, self.exe_user_name)
        if task_id:
            logger.info("celery返回task_id:%s" % task_id)
            update_task_ret = audit_sql_dao.set_task_send_celery(self.file_path)
            if update_task_ret['status'] != 'ok':
                raise Exception("发送task任务成功,更新task表出现异常")
        else:
            raise Exception("发送task任务失败")
            common.audit_sql_log(self.file_path, 1, "发送celery任务失败")


# def execute_submit_sql_by_file_path(submit_sql_uuid, file_path, exe_user_name,inc_bak, inc_war, inc_err, inc_sleep):
#     # 获取执行SQL对应的master信息与osc信息
#     data = audit_sql_dao.get_master_info_by_split_sql_file_path_dao(file_path)
#     cluster_name = data[0]["cluster_name"]
#     dba_execute = data[0]["dba_execute"]
#     execute_status = data[0]["execute_status"]
#     task_send_celery = data[0]["task_send_celery"]
#     if task_send_celery == 1: return {'status': "error", 'message': "该工单已被注册到celery"}
#
#     # pre_check1,如果该SQL已执行则直接return
#     if dba_execute != 1 or execute_status != 1: return {'status': "error", 'message': "该工单已执行"}
#
#     # 确定数据源类型
#     if cluster_name:
#         instance_ret = common.get_cluster_node(cluster_name, 'M')
#         if instance_ret['status'] != "ok": return instance_ret
#         elif len(instance_ret['data']) == 0: return {"status": "error", "message": "没有获取到写节点"}
#         else: instance_name = instance_ret['data'][0]['instance_name']
#     else:
#         instance_name = data[0]['instance_name']
#     des_master_ip, des_master_port = instance_name.split('_')[0], instance_name.split('_')[1]
#
#     # pre_check2,判断当前实例read_only状态
#     read_only_ret = common.get_read_only(instance_name)
#     if read_only_ret['status'] != 'ok': return read_only_ret
#     if read_only_ret['data'][0]['read_only'] != 'OFF': return {"status": "error", "message": "节点read_only不满足"}
#     # inception执行osc配置
#     inception_osc_config = data[0]["inception_osc_config"]
#     osc_config_sql = ""
#     if inception_osc_config == "" or inception_osc_config == '{}':
#         osc_config_sql = "show databases;"
#         logger.info(osc_config_sql)
#     else:
#         osc_config_dict = json.loads(inception_osc_config)
#         osc_config_sql_list = []
#         for k in osc_config_dict:
#             osc_config_sql = "inception set session {}={};".format(k, osc_config_dict[k])
#             osc_config_sql_list.append(osc_config_sql)
#             osc_config_sql_list_str = [str(i) for i in osc_config_sql_list]
#             osc_config_sql = ''.join(osc_config_sql_list_str)
#     # 调用celery异步执行
#     try:
#         # 调用celery异步执行,异获取到task_id则表示任务已经放入队列，后续具体操作交给worker处理，如果当时worker没有启动，后来再启动,worker会去队列获取任务执行
#         row_list = audit_sql_dao.get_task_send_celery(file_path)
#         if int(row_list[0]["task_send_celery"]) == 0:
#             task_id = inception_execute.delay(des_master_ip, des_master_port, inc_bak, inc_war, inc_err,file_path,submit_sql_uuid,osc_config_sql,exe_user_name)
#             if task_id:
#                 logger.info("celery返回task_id:%s" % task_id)
#                 status = "ok"
#                 message = "推送celery成功"
#                 update_status = audit_sql_dao.set_task_send_celery(file_path)
#                 if update_status == "ok":
#                     message = message + "," + "更新task_send_celery成功"
#                 else:
#                     message = message + "," + "更新task_send_celery失败"
#             else:
#                 status = "error"
#                 message = "推送celery失败"
#         else:
#             status = "ok"
#             message = "任务已注册到celery,等待celery执行,请勿多次提交"
#     except Exception as e:
#         status = "error"
#         message = e
#         logger.error(e)
#     finally:
#         content = {'status': status, 'message': message}
#         logger.info(content)
#         return content


# 将拆分SQL写入拆分文件,并将自任务写入sql_execute_split
# def write_split_sql_to_new_file(master_ip, master_port,submit_sql_uuid,split_sql_data,sql_file_path,cluster_name):
#     """
#     拆分SQL写文件--->拆分SQL工单信息写入数据库
#     :param master_ip:
#     :param master_port:
#     :param submit_sql_uuid:
#     :param split_sql_data:
#     :param sql_file_path:
#     :param cluster_name:
#     :return:
#     """
#     try:
#         result = []
#         result_tmp = {}
#         for tup in split_sql_data:
#             result_tmp['split_seq'] = tup['ID']
#             result_tmp['sql'] = tup['sql_statement']
#             result_tmp['ddlflag'] = tup['ddlflag']
#             result_tmp['sql_num'] = len(split_sql_data)
#             result_copy = result_tmp.copy()
#             result.append(result_copy)
#             result_tmp.clear()
#         for i in result:
#             ddlflag = i["ddlflag"]
#             split_seq = i["split_seq"]
#             sql_num = i["sql_num"]
#             sql = i["sql"]
#             dir_name = sql_file_path.split('/')[0]
#             file_name = sql_file_path.split('/')[1]
#             split_file_name = str(split_seq) + '_' + file_name
#             upfile = './upload/' + dir_name + '/' + split_file_name
#             split_sql_file_path = dir_name + '/' + split_file_name
#             rerun_sequence = ""
#             rerun_seq = 0
#             inception_osc_config = ""
#             # 拆分SQL写入文件
#             with open(upfile, 'w') as f:
#                 f.write(sql)
#             logger.info("拆分SQL写入对应文件成功：%s", upfile)
#             # 拆分SQL详细信息写入数据库
#             split_sql_info_to_db_ret = audit_sql_dao.write_split_sql_to_new_file_dao(submit_sql_uuid, split_seq, split_sql_file_path, sql_num, ddlflag,master_ip, master_port, cluster_name, rerun_sequence, rerun_seq, inception_osc_config)
#             if split_sql_info_to_db_ret['status'] == "ok":
#                 logger.info("拆分SQL工单信息写入sql_execute_split表成功：%s", split_sql_file_path)
#                 status = "ok"
#                 message = "拆分SQL写入对应文件成功，拆分SQL工单信息写入sql_execute_split表成功"
#             else:
#                 status = "error"
#                 message = "拆分SQL写入对应文件成功，拆分SQL工单信息写入sql_execute_split表失败"
#                 logger.error("拆分SQL工单信息写入sql_execute_split表失败：%s", split_sql_file_path)
#     except Exception as e:
#         status = "error"
#         message = "拆分SQL写文件或者写入数据库失败:%s" % str(e)
#         logger.exception(message)
#     finally:
#         return {"status": status, "message": message}


# 获取页面拆分SQL
def get_split_sql_by_uuid(submit_sql_uuid):
    data = []
    try:
        data = audit_sql_dao.get_split_sql_by_uuid_dao(submit_sql_uuid)
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message, 'data': data}
        return content


# 工单执行失败点击生成重做数据
def recreate_sql(split_sql_file_path, recreate_sql_flag):
    recreate_sql_info = audit_sql_dao.get_recreate_sql_info_dao(split_sql_file_path)
    submit_sql_uuid = recreate_sql_info[0]['submit_sql_uuid']
    split_seq = recreate_sql_info[0]['split_seq']
    sql_num = recreate_sql_info[0]['sql_num']
    ddlflag = recreate_sql_info[0]['ddlflag']
    rerun_seq = recreate_sql_info[0]['rerun_seq']
    new_rerun_seq = int(rerun_seq) + 1
    master_ip = recreate_sql_info[0]["master_ip"]
    master_port = recreate_sql_info[0]["master_port"]
    cluster_name = recreate_sql_info[0]["cluster_name"]
    inception_osc_config = recreate_sql_info[0]["inception_osc_config"]
    rerun_sequence = submit_sql_uuid + "_" + str(split_seq) + "_" + str(new_rerun_seq)
    # 重做SQL写入文件
    rerun_file = split_sql_file_path.split('.')[0] + ".sql_{}".format(new_rerun_seq)
    rerun_file_path = "./upload/{}".format(rerun_file)
    try:
        rerun_sql_list = audit_sql_dao.recreate_sql_dao( split_sql_file_path, recreate_sql_flag)
        with open(rerun_file_path, 'w') as f:
            for row in rerun_sql_list:
                write_sql = row["inception_sql"] + ";" + "\n"
                logger.info(row["inception_sql"])
                f.write(write_sql)
        status = "ok"
        write_sql_message = "重做SQL写入文件成功"
    except Exception as e:
        logger.error(e)
        status = "error"
        write_sql_message = "重做SQL写入文件失败"
        content = {'status': status, 'message': write_sql_message}
        return content

    # 重做SQL新工单写入sql_execute_split
    audit_sql_dao.write_split_sql_to_new_file_dao(submit_sql_uuid, split_seq, rerun_file, sql_num, ddlflag,master_ip, master_port, cluster_name, rerun_sequence,new_rerun_seq, inception_osc_config)
    # 重做SQL二次检查,详细信息写入数据库sql_check_rerun_results
    if cluster_name:
        des_master_ip,des_master_port = common.get_cluster_node(cluster_name)
    with open(rerun_file_path, "rb") as f:
        check_rerun_sql = f.read()
        check_rerun_sql = check_rerun_sql.decode('utf-8')
        rerun_sql_check_ret = inception.check_sql(des_master_ip, des_master_port, check_rerun_sql)
        for item in rerun_sql_check_ret['data']:
            sql_id = item["ID"]
            sql_type = item["Command"]
            sqlsha1 = item["sqlsha1"]
            sql_detail = item["SQL"]
            insert_status = audit_sql_dao.write_recreate_sql_check_results_dao(rerun_sequence, sql_id, sql_detail, sql_type, sqlsha1)
    # 更新数据库状态
    try:
        flag = 0
        update_status = audit_sql_dao.update_recreate_sql_flag_dao(flag, split_sql_file_path)
        message = write_sql_message + "," + insert_status + "," + update_status
    except Exception as e:
        logger.error(e)
        status = "error"
        message = write_sql_message + "," + insert_status + "," + update_status
    finally:
        content = {'status': status, 'message': message}
        return content


def create_block_sql(request_body):
    try:
        mdl_sql = StringIO()
        step = 9999
        mdl_sql.write('use %s;\n' % request_body['params']['schema_name'])
        if request_body['params']['mdl_type'] == "delete":
            delete_sql = 'delete from %s where id >=%s and id <=%s'
            if request_body['params']['where_condition'] != '':
                length_single_sql = len(delete_sql) + len(request_body['params']['where_condition']) + 10
            else:
                length_single_sql = len(delete_sql) + 10
        elif request_body['params']['mdl_type'] == "update":
            update_sql = 'update %s set %s where id >=%s and id <=%s'
            if request_body['params']['where_condition'] != '':
                length_single_sql = len(update_sql) + len(request_body['params']['set_value']) + len(request_body['params']['where_condition']) + 10
            else:
                length_single_sql = len(update_sql) + len(request_body['params']['set_value']) + 10

        count = 0
        for i in range(int(request_body['params']['min_id']), int(request_body['params']['max_id']), step + 1):
            big = i + step
            if int(request_body['params']['max_id']) < i + step:
                big = request_body['params']['max_id']
            if request_body['params']['mdl_type'] == "delete":
                mdl_sql.write(delete_sql % (request_body['params']['table_name'], i, big))
            elif request_body['params']['mdl_type'] == "update":
                mdl_sql.write(
                    update_sql % (request_body['params']['table_name'], request_body['params']['set_value'], i, big))
            if request_body['params']['where_condition'] != '':
                mdl_sql.write(' and %s' % (request_body['params']['where_condition']))
            mdl_sql.write(';\n')
            count += 1
            if length_single_sql * count > 20 * 1024 * 1024:
                logger.error('超过20MB')
                content = {'status': "error", 'message': "生成sql超过20MB，请缩小范围"}
                return content
        if request_body['params']['rebuild_table'] == '重建表':
            mdl_sql.write('Alter table %s engine=innodb;\n' % request_body['params']['table_name'])
        data = mdl_sql.getvalue()
        content = {'status': "ok", 'message': "生成块SQL成功","data":data}
    except Exception as e:
        content = {'status': "error", 'message': "生成块SQL失败", "data": data}
        logger.error(str(e))
    return content