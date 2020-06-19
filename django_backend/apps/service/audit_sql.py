#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import pymysql
from django.db import connection
import uuid
from time import gmtime, strftime
import os
import json
from apps.dao import login_dao
from apps.utils import common
from apps.utils import inception
from apps.dao import audit_sql_dao
from apps.tasks import inception_execute
from io import StringIO

import logging
logger = logging.getLogger('devops')

# 页面获取所有工单列表
def get_submit_sql_info(token):
    data_login_user = login_dao.get_login_user_name_by_token_dao(token)
    login_user_name = data_login_user["username"]
    login_user_name_role = data_login_user["title"]
    if login_user_name_role == 'dba':
        where_condition = ""
    elif login_user_name_role == 'leader' or login_user_name_role == 'qa':
        where_condition = "and b.title!=4"            #DBA提交的SQL,不用暴露给其他人,DBA经常需要维护数据库例如清理表碎片,不需要别人审核
    else:
        where_condition = "and submit_sql_user='{}'".format(login_user_name)
    data = []
    try:
        data = audit_sql_dao.get_submit_sql_info_dao(where_condition)
        status = "ok"
        message = "ok"
        logger.info("获取所有工单成功")
    except Exception as e:
        status = "error"
        message = e
        logger.error("获取所有工单失败%s",str(e))
    finally:
        content = {'status': status, 'message': message,'data': data}
        return content


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
def get_master_ip(db_master_ip_or_hostname):
    ip_list = []
    try:
        rows = audit_sql_dao.get_master_ip_dao(db_master_ip_or_hostname)
        [ip_list.append(i["server_public_ip"]) for i in rows]
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = str(e)
        logger.error(e)
    finally:
        content = {'status': status, 'message': message, 'data': ip_list}
        return content


# 根据输入的集群名模糊匹配已有集群名
def get_cluster_name(cluster_name_patten):
    cluster_name_list = []
    try:
        rows = audit_sql_dao.get_cluster_name_dao(cluster_name_patten)
        [cluster_name_list.append(i["cluster_name"]) for i in rows]
        content = {'status': "ok", 'message': "ok",'data': cluster_name_list}
    except Exception as e:
        content = {'status': "error", 'message': str(e),'data': cluster_name_list}
        logger.error(e)
    finally:
        return content


# 页面提交SQL工单
def submit_sql(token, request_body):
    #确定文件名
    data = login_dao.get_login_user_name_by_token_dao(token)
    login_user_name = data["username"]
    now_date = strftime("%Y%m%d", gmtime())
    uuid_str = str(uuid.uuid4())
    file_name = "%s_%s.sql" % (login_user_name, uuid_str)
    #确定存放路径
    upload_path = "./upload/" + now_date
    if not os.path.isdir(upload_path):
        os.makedirs(upload_path)
    file_path = now_date + '/' + file_name
    #拼接文件名路径,提取提交SQL,并将SQL写入文件
    upfile = os.path.join(upload_path, file_name)
    check_sql = request_body['params']['check_sql']
    try:
        with open(upfile, 'w') as f:
            f.write(check_sql)
            f.close()
        logger.info("提交的SQL写入文件成功")
        print("提交的SQL写入文件成功")
    except Exception as e:
        logger.error("提交的SQL写入文件失败")
        content = {'status': "error", 'message': str(e)}
        return content

    check_sql_results = request_body['params']['check_sql_results']
    sql_title = request_body['params']['title']
    login_user_info = common.get_login_user_info(login_user_name)
    qa_name = login_user_info[0]["qa_name"]
    leader_name = login_user_info[0]["leader_name"]
    dba_name = login_user_info[0]["dba_name"]
    submit_sql_execute_type = request_body['params']['submit_sql_execute_type']
    comment_info = request_body['params']['comment_info']

    # 页面提交的工单信息写入数据库
    if (request_body['params']['submit_source_db_type'] == "cluster"):
        cluster_name = request_body['params']['cluster_name']
        insert_status = audit_sql_dao.submit_sql_by_cluster_name_dao(login_user_name, sql_title, cluster_name, file_path, leader_name, qa_name, dba_name, submit_sql_execute_type, comment_info, uuid_str)
    else:
        db_ip = request_body['params']['db_ip'].strip()
        db_port = request_body['params']['db_port'].strip()
        insert_status = audit_sql_dao.submit_sql_by_ip_port_dao(login_user_name, sql_title, db_ip, db_port, file_path, leader_name, qa_name, dba_name, submit_sql_execute_type, comment_info, uuid_str)
    logger.info("页面提交的工单信息写入数据库:%s",insert_status)
    if insert_status != "ok":
        message = "页面提交的工单信息写入数据库异常"
        content = {'status': "error", 'message': message}
        return content

    # SQL审核结果写入数据库
    try:
        insert_status = audit_sql_dao.submit_sql_results(uuid_str, check_sql_results)
        content = {'status': "ok", 'message': insert_status}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
    finally:
        return content


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

# 审核通过并拆分SQL
def pass_submit_sql_by_uuid(token,submit_sql_uuid,apply_results,check_comment,check_status):
    # 标记工单审核通过或者不通过
    data = login_dao.get_login_user_name_by_token_dao(token)
    login_user_name = data["username"]
    login_user_name_role = data["title"]
    mark_status = audit_sql_dao.pass_submit_sql_by_uuid_dao(submit_sql_uuid,check_comment,check_status,login_user_name,login_user_name_role)

    # 如果是审核通过并且标记状态成功则走下面流程
    if apply_results == "通过" and mark_status == "ok":
        #获取拆分后SQL详细信息
        split_sql_data = audit_sql_dao.get_split_sql_info_dao(submit_sql_uuid)
        #拆分SQL
        ret = "拆分失败"
        if login_user_name_role == "dba":
            ret = split_sql_func(submit_sql_uuid)
        try:
            status = "ok"
            message = "审核成功," + ret
            content = {'status': status, 'message': message,"data": split_sql_data}
        except Exception as e:
            status = "error"
            message = str(e) + ",+" + ret
            content = {'status': status, 'message': message}
            logger.error(e)
    elif apply_results == "不通过":
        try:
            content = {'status': "ok", 'message': "审核不通过"}
        except Exception as e:
            content = {'status': "error", 'message': str(e)}
    return content


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
def split_sql_func(submit_sql_uuid):
    # 查询工单信息
    try:
        data = audit_sql_dao.get_submit_sql_file_path_info_dao(submit_sql_uuid)
        sql_file_path = data[0]["submit_sql_file_path"]
        cluster_name = data[0]["cluster_name"]
        if cluster_name:
            des_master_ip, des_master_port = common.get_cluster_write_node_info(cluster_name)
        else:
            des_master_ip = data[0]["master_ip"]
            des_master_port = data[0]["master_port"]
        with open("./upload/{}".format(sql_file_path), "rb") as f:
            execute_sql = f.read()
            execute_sql = execute_sql.decode('utf-8')
        split_sql_ret = inception.start_split_sql(des_master_ip, des_master_port, execute_sql)
        ret = write_split_sql_to_new_file(des_master_ip, des_master_port, submit_sql_uuid, split_sql_ret, sql_file_path,cluster_name)
        if ret == "拆分SQL成功":
            message = "拆分任务成功"
        else:
            message = "拆分任务失败"
    except Exception as e:
        message = "拆分任务失败"
        logger.error(str(e))
    finally:
        return message


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


# 获取SQL文件路径,调用inception执行,执行之前先判断是否已经执行过
def execute_submit_sql_by_file_path(submit_sql_uuid, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error, split_sql_file_path, execute_user_name):
    # 获取执行SQL对应的master信息与osc信息
    data = audit_sql_dao.get_master_info_by_split_sql_file_path_dao(split_sql_file_path)
    logger.info(data)
    inception_osc_config = data[0]["inception_osc_config"]
    cluster_name = data[0]["cluster_name"]
    dba_execute = data[0]["dba_execute"]
    execute_status = data[0]["execute_status"]
    # 如果该SQL已执行则直接return
    if dba_execute != 1 or execute_status != 1:
        content = {'status': "error", 'message': "该工单已执行"}
        return content
    if cluster_name:
        des_master_ip,des_master_port = common.get_cluster_write_node_info(cluster_name)
        logger.info(des_master_ip)
        logger.info(des_master_port)
        if des_master_ip == "no_write_node":
            content = {'status': "error", 'message': "根据集群名没有获取到写节点"}
            return content
    else:
        des_master_ip = data[0]["master_ip"]
        des_master_port = data[0]["master_port"]

    # 判断当前实例read_only状态
    try:
        target_connection = pymysql.connect(host='39.97.247.142', port=des_master_port, user='wthong',
                                            password='fffjjj', charset='utf8')
        target_cursor = target_connection.cursor()
        target_cursor.execute("show global variables like 'read_only'")
        row = target_cursor.fetchone()
        read_only_value = row[1]
    except Exception as e:
        logging.error(str(e))
    finally:
        target_cursor.close()
        target_connection.close()
    logging.info("工单:%s,获取master信息成功:%s_%s,read_only:%s", submit_sql_uuid, des_master_ip, des_master_port,
                 read_only_value)
    if read_only_value != "OFF":
        logging.error("当前实例read_only是on,退出执行")
        content = {'status': "error", 'message': "当前实例read_only是on,退出执行"}
        return content
    osc_config_sql = ""
    if inception_osc_config == "" or inception_osc_config == '{}':
        osc_config_sql = "show databases;"
        logger.info(osc_config_sql)
    else:
        osc_config_dict = json.loads(inception_osc_config)
        osc_config_sql_list = []
        for k in osc_config_dict:
            osc_config_sql = "inception set session {}={};".format(k, osc_config_dict[k])
            osc_config_sql_list.append(osc_config_sql)
            osc_config_sql_list_str = [str(i) for i in osc_config_sql_list]
            osc_config_sql = ''.join(osc_config_sql_list_str)
    try:
        # 调用celery异步执行,异获取到task_id则表示任务已经放入队列，后续具体操作交给worker处理，如果当时worker没有启动，后来再启动,worker会去队列获取任务执行
        row_list = audit_sql_dao.get_task_send_celery(split_sql_file_path)
        print(row_list)
        if int(row_list[0]["task_send_celery"]) == 0:
            task_id = inception_execute.delay(des_master_ip, des_master_port, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error,split_sql_file_path,submit_sql_uuid,osc_config_sql,execute_user_name)
            if task_id:
                logger.info("celery返回task_id:%s" % task_id)
                status = "ok"
                message = "推送celery成功"
                update_status = audit_sql_dao.set_task_send_celery(split_sql_file_path)
                if update_status == "ok":
                    message = message + "," + "更新task_send_celery成功"
                else:
                    message = message + "," + "更新task_send_celery失败"
            else:
                status = "error"
                message = "推送celery失败"
        else:
            status = "ok"
            message = "任务已注册到celery,等待celery执行,请勿多次提交"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message}
        logger.info(content)
        return content


# 将拆分SQL写入拆分文件,并将自任务写入sql_execute_split
def write_split_sql_to_new_file(master_ip, master_port,submit_sql_uuid,sql_tuple,sql_file_path,cluster_name):
    try:
        result = []
        result_tmp = {}
        for tup in sql_tuple:
            result_tmp['split_seq'] = tup[0]
            result_tmp['sql'] = tup[1]
            result_tmp['ddlflag'] = tup[2]
            result_tmp['sql_num'] = tup[3]
            result_copy = result_tmp.copy()
            result.append(result_copy)
            result_tmp.clear()
        for i in result:
            ddlflag = i["ddlflag"]
            split_seq = i["split_seq"]
            sql_num = i["sql_num"]
            sql = i["sql"]
            dir_name = sql_file_path.split('/')[0]
            file_name = sql_file_path.split('/')[1]
            split_file_name = str(split_seq) + '_' + file_name
            upfile = './upload/' + dir_name + '/' + split_file_name
            split_sql_file_path = dir_name + '/' + split_file_name
            rerun_sequence = ""
            rerun_seq = 0
            inception_osc_config = ""
            # 拆分SQL写入文件
            with open(upfile, 'w') as f:
                f.write(sql)
            # 拆分SQL详细信息写入数据库
            audit_sql_dao.write_split_sql_to_new_file_dao(submit_sql_uuid, split_seq, split_sql_file_path, sql_num, ddlflag,master_ip, master_port, cluster_name, rerun_sequence, rerun_seq, inception_osc_config)
        message = "拆分SQL成功"
    except Exception as e:
        message = "拆分SQL失败"
        logger.error(str(e))
    finally:
        return message


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
        des_master_ip,des_master_port = common.get_cluster_write_node_info(cluster_name)
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