#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import pymysql
import uuid
from time import gmtime, strftime
import os
import json

import os,sys
from apps.dao import login_dao
from apps.utils import common
from apps.utils import inception
from apps.dao import audit_sql_dao
from apps.celery_task.tasks import inception_execute,inception_check,inception_split
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
    check_type = 'async'
    if submit_type == "cluster":
        instance_ret = common.get_cluster_node(cluster_name, 'M')
        if instance_ret['status'] !="ok": return instance_ret
        elif len(instance_ret['data']) ==0: return {"status": "error", "message":"没有获取到写节点"}
        else: instance_name = instance_ret['data'][0]['instance_name']
    elif submit_type == "template":
        pass
    des_ip, des_port = instance_name.split('_')[0], instance_name.split('_')[1]
    if check_type != "async":
        ret = inception.check_sql(des_ip, des_port, check_sql_info)
    else:
        check_sql_uuid = str(uuid.uuid4())
        check_user = "gaochao"
        task_res = inception_check.delay(des_ip, des_port, check_sql_uuid, check_sql_info, check_user)
        print(task_res.id)
        print(task_res.state)
        if task_res:
            common.write_celery_task(task_res.id, check_sql_uuid, 'check_sql')
            logger.info("celery发送审核任务成功返回task_id:%s,工单id:%s" % (task_res.id, check_sql_uuid))
            data = {"check_sql_uuid": check_sql_uuid, "check_sql_celery_id": task_res.id}
            ret = {"status": "ok", "message": "发送任务成功", "data": data}
        else:
            print(444444)
            ret = {"status": "error", "message": "发送任务失败"}
    return ret


def recheck_sql(submit_sql_uuid, submit_type, check_sql_info, cluster_name, instance_name):
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
        if instance_ret['status'] !="ok": return instance_ret
        elif len(instance_ret['data']) ==0: return {"status": "error", "message":"没有获取到写节点"}
        else: instance_name = instance_ret['data'][0]['instance_name']
    elif submit_type == "template":
        pass
    des_ip, des_port = instance_name.split('_')[0], instance_name.split('_')[1]
    check_sql_uuid = submit_sql_uuid
    check_user = "gaochao"
    task_id = inception_check.delay(des_ip, des_port, check_sql_uuid, check_sql_info, check_user,"recheck_sql")
    if task_id:
        write_task_ret = common.write_celery_task(task_id, check_sql_uuid, 'recheck_sql')
        if write_task_ret['status'] !="ok":return write_task_ret
        logger.info("celery发送审核任务成功返回task_id:%s,工单id:%s" % (task_id, check_sql_uuid))
        data = {"check_sql_uuid": check_sql_uuid}
        ret = {"status": "ok", "message": "发送任务成功", "data": data}
    else:
        ret = {"status": "error", "message": "发送任务失败"}
    return ret


def get_pre_check_result(check_sql_uuid):
    """
    获取预审核结果
    :param check_sql_uuid:
    :return:
    """
    ret = audit_sql_dao.get_pre_check_result_dao(check_sql_uuid)
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
    ret = audit_sql_dao.get_pre_check_result_dao(submit_sql_uuid)
    return ret



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


def submit_recheck_sql(submit_sql_uuid, is_submit):
    """
    修改工单为提交
    :param submit_sql_uuid:
    :param is_submit:
    :return:
    """
    ret = audit_sql_dao.mark_ticket_dao(submit_sql_uuid, is_submit)
    return ret


class SubmitSql:
    def __init__(self, request_body):
        self.check_sql = request_body['check_sql']
        self.check_sql_results = request_body['check_sql_results']
        self.title = request_body['title']
        self.submit_sql_execute_type = request_body['submit_sql_execute_type']
        self.comment_info = request_body['comment_info']
        self.submit_source_db_type = request_body['submit_source_db_type']
        self.instance_name = request_body['instance_name']
        self.cluster_name = request_body['cluster_name']
        self.submit_sql_uuid = ""
        self.check_sql_uuid = request_body['check_sql_uuid']
        self.login_user_name = "gaochao"

    def process_submit_sql(self):
        """
        审核通过才会拆分SQL，否则只标记状态
        :return:
        """
        try:
            if self.check_sql_uuid != "":
                self.submit_sql_uuid = self.check_sql_uuid
                self.mark_check_results()

            else:
                self.submit_sql_uuid = str(uuid.uuid4())
                self.write_check_results()
            self.write_sql_to_file()
            self.write_info_to_db()
            content = {"status": "ok", "message": "ok"}
        except Exception as e:
            logger.exception('工单%s审核失败,错误信息:%s', self.submit_sql_uuid, e)
            content = {"status": "error", "message": "审核工单出现异常:%s" % e}
        finally:
            return content

    def write_sql_to_file(self):
        """
        sql写入文件
        :return:
        """
        # 每天产生一个目录
        now_date = strftime("%Y%m%d", gmtime())
        # 确定存放路径
        upload_path = "./upload/" + now_date
        if not os.path.isdir(upload_path): os.makedirs(upload_path)
        # 确定文件名
        file_name = "%s_%s.sql" % (self.login_user_name, self.submit_sql_uuid)
        upfile = os.path.join(upload_path, file_name)
        try:
            print(upfile)
            with open(upfile, 'w') as f:
                f.write(self.check_sql)
        except Exception as e:
            raise Exception("提交的SQL写入文件失败:%s",e)

    def write_check_results(self):
        """
        sql审核结果写入数据库
        :return:
        """
        ret = audit_sql_dao.submit_sql_results_dao(self.submit_sql_uuid, self.check_sql_results, 1)
        if ret['status'] != "ok": raise Exception("sql审核结果写入数据库失败")

    def mark_check_results(self):
        """
        sql审核结果写入数据库
        :return:
        """
        ret = audit_sql_dao.mark_sql_check_results_dao(self.submit_sql_uuid)
        if ret['status'] != "ok": raise Exception("修改sql审核结果为已提交失败")

    def write_info_to_db(self):
        """
        工单信息写入数据库
        :return:
        """
        qa_name = ''
        leader_name = ''
        dba_name = ''
        # 确定存入数据库的文件路径
        now_date = strftime("%Y%m%d", gmtime())
        file_name = "%s_%s.sql" % (self.login_user_name, self.submit_sql_uuid)
        file_path = now_date + '/' + file_name
        des_ip = ""
        des_port = 0
        if self.submit_source_db_type == "master_ip_port":
            submit_source_db_type = 0
            des_ip = self.instance_name.split('_')[0]
            des_port = self.instance_name.split('_')[1]
        elif self.submit_source_db_type == "cluster":
            submit_source_db_type = 1
        else:
            raise Exception("数据源类型不合法")
        ret = audit_sql_dao.submit_sql_dao(self.login_user_name, self.title, des_ip, des_port, file_path,leader_name,
                                       qa_name, dba_name, self.submit_sql_execute_type, self.comment_info,
                                       self.submit_sql_uuid, submit_source_db_type, self.cluster_name)
        if ret['status'] != "ok": raise Exception("工单详情写入数据库失败")


class PassSubmitSql:
    # 审核工单
    def __init__(self, submit_sql_uuid, check_comment, check_status):
        self.submit_sql_uuid = submit_sql_uuid
        self.check_comment = check_comment
        self.check_status = check_status
        self.login_user_name = "gaochao"
        self.login_user_name_role = "dba"
        self.ticket_info = ""
        self.cal_des_ip = ""
        self.cal_des_port = 0
        self.cluster_name = ""
        self.split_data = ""

    def pass_submit_sql_by_uuid(self):
        """
        审核通过才会拆分SQL，否则只标记状态
        :return:
        """
        try:
            if self.check_status == 2:
                self.get_ticket_info()
                self.judge_source_ip_port()
                self.split_sql()
            else:
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
        """
        通过审核工具连接上数据源进行拆分SQL,如果是集群模式则通过集群名获取ip、port，如果是ip_port模式则用该ip_port
        :return:
        """
        self.cluster_name = self.ticket_info["cluster_name"]
        if self.ticket_info["submit_source_db_type"] == 1:
            instance_ret = common.get_cluster_node(self.cluster_name, 'M')
            if instance_ret['status'] != "ok":
                raise Exception("获取写节点失败")
            elif len(instance_ret['data']) == 0:
                raise Exception("没有获取到写节点")
            else:
                instance_name = instance_ret['data'][0]['instance_name']
                self.cal_des_ip, self.cal_des_port = instance_name.split('_')[0], instance_name.split('_')[1]
        else:
            self.cal_des_ip, self.cal_des_port = self.ticket_info["master_ip"], self.ticket_info["master_port"]


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
        task_id = inception_split.delay(self.submit_sql_uuid, self.ticket_info, self.cal_des_ip, self.cal_des_port,
                                        self.check_status,self.check_comment,self.login_user_name,
                                        self.login_user_name_role)
        if task_id:
            common.write_celery_task(task_id, self.submit_sql_uuid, "split_sql")
            logger.info("celery发送拆分任务成功返回task_id:%s" % task_id)
        else:
            raise Exception("发送拆分任务失败")


class ExecuteSqlByFilePath:
    # 执行SQL
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
        self.des_ip = 0
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