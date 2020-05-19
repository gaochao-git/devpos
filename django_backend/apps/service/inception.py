#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import pymysql
from django.db import connection
import uuid
from time import gmtime, strftime
import os
import re
import logging
import json
from apps.dao import login_dao
from apps.utils import common
from apps.dao import inception_dao

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
        data = inception_dao.get_submit_sql_info_dao(where_condition)
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
        file_path_data = inception_dao.get_submit_sql_by_uuid_dao(submit_sql_uuid)
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
        data = inception_dao.get_apply_sql_by_uuid_dao(submit_sql_uuid)
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
        rows = inception_dao.get_master_ip_dao(db_master_ip_or_hostname)
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
        rows = inception_dao.get_cluster_name_dao(cluster_name_patten)
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
        insert_status = inception_dao.submit_sql_by_cluster_name_dao(login_user_name, sql_title, cluster_name, file_path, leader_name, qa_name, dba_name, submit_sql_execute_type, comment_info, uuid_str)
    else:
        db_ip = request_body['params']['db_ip'].strip()
        db_port = request_body['params']['db_port'].strip()
        insert_status = inception_dao.submit_sql_by_ip_port_dao(login_user_name, sql_title, db_ip, db_port, file_path, leader_name, qa_name, dba_name, submit_sql_execute_type, comment_info, uuid_str)
    logger.info("页面提交的工单信息写入数据库:%s",insert_status)
    if insert_status != "ok":
        message = "页面提交的工单信息写入数据库异常"
        content = {'status': "error", 'message': message}
        return content

    # SQL审核结果写入数据库
    try:
        insert_status = inception_dao.submit_sql_results(uuid_str, check_sql_results)
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
        data = inception_dao.get_check_sql_results_by_uuid_dao(submit_sql_uuid)
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
        data = inception_dao.get_inception_variable_config_info_dao(split_sql_file_path)
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
        status = inception_dao.update_inception_variable_dao(request_body_json,split_sql_file_path)
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
    mark_status = inception_dao.pass_submit_sql_by_uuid_dao(submit_sql_uuid,check_comment,check_status,login_user_name,login_user_name_role)

    # 如果是审核通过并且标记状态成功则走下面流程
    if apply_results == "通过" and mark_status == "ok":
        #获取拆分后SQL详细信息
        split_sql_data = inception_dao.get_split_sql_info_dao(submit_sql_uuid)
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
        update_status = inception_dao.execute_submit_sql_by_file_path_manual_dao(submit_sql_uuid,split_sql_file_path,login_user_name)
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
        data = inception_dao.get_execute_results_by_split_sql_file_path_dao(split_sql_file_path)
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message, 'data': data}
        return content


# 页面调用inception检测SQL,如果根据cluster_name则需要先获取到对应的master_ip、master_port
def check_sql(des_master_ip, des_master_port, check_sql_info):
    sql = """/*--user=wthong;--password=fffjjj;--host={};--check=1;--port={};*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(des_master_ip, des_master_port, check_sql_info)
    try:
        conn = pymysql.connect(host='39.97.247.142', user='', passwd='', db='', port=6669, charset="utf8")  # inception服务器
        cur = conn.cursor()
        cur.execute(sql)
        result = cur.fetchall()
        data = [dict(zip([col[0] for col in cur.description], row)) for row in result]
        cur.close()
        conn.close()
        content = {'status': "ok", 'inception审核完成': "ok",'data': data}
    except Exception as e:
        logger.error("inception审核失败",str(e))
        message = str(e)
        if re.findall('1875', str(e)):
            message = "语法错误"
        elif re.findall('2003', str(e)):
            message = "语法检测器无法连接"
        content = {'status': "error", 'message': message}
    return content


# inception拆分SQL
def split_sql_func(submit_sql_uuid):
    # 查询工单信息
    try:
        cursor = connection.cursor()
        sql_select = "select master_ip,master_port,cluster_name,submit_sql_file_path from sql_submit_info where submit_sql_uuid='{}'".format(submit_sql_uuid)
        cursor.execute("%s" % sql_select)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        print(data)
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
        ret = start_split_sql(cursor,submit_sql_uuid,des_master_ip, des_master_port, execute_sql, sql_file_path,cluster_name)
        if ret == "拆分SQL成功":
            message = "拆分任务成功"
        else:
            message = "拆分任务失败"
    except Exception as e:
        message = "拆分任务失败"
        logger.error(str(e))
    finally:
        cursor.close()
        connection.close()
        return message

# 开始拆分
def start_split_sql(cursor,submit_sql_uuid,master_ip, master_port, execute_sql, sql_file_path,cluster_name):
    # 拆分SQL
    sql = """/*--user=wthong;--password=fffjjj;--host={};--port={};--enable-split;*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(master_ip, master_port, execute_sql)
    split_sql_ret = ""
    try:
        conn = pymysql.connect(host='39.97.247.142', user='', passwd='', db='', port=6669, charset="utf8")  # inception服务器
        cur = conn.cursor()
        cur.execute(sql)
        sql_tuple = cur.fetchall()
        split_sql_ret = write_split_sql_to_new_file(cursor,master_ip, master_port,submit_sql_uuid,sql_tuple,sql_file_path,cluster_name)
    except Exception as e:
        logger.error(str(e))
    finally:
        cur.close()
        conn.close()
        return split_sql_ret


# 根据uuid获取sqlsha1,根据sqlsha1连接inception查看执行进度
def get_execute_process_by_uuid(submit_sql_uuid):
    rows = inception_dao.get_sqlsha1_by_uuid_dao(submit_sql_uuid)
    sql_all_process = []
    for row in rows:
        sqlsha1 = row["inception_sqlsha1"]
        inception_get_osc_percent_sql = "inception get osc_percent '{}'".format(sqlsha1)
        sql_sigle_process = {}
        if sqlsha1 == '':
            sql_sigle_process['inception_execute_percent'] = 100
            sql_sigle_process['inception_sql'] = row["inception_sql"]
            sql_all_process.append(sql_sigle_process)
        else:
            sql_sigle_process['inception_sql'] = row["inception_sql"]
            try:
                conn = pymysql.connect(host='39.97.247.142', user='', passwd='', db='', port=6669,charset="utf8")  # inception服务器
                cur = conn.cursor()
                cur.execute(inception_get_osc_percent_sql)
                result = cur.fetchall()
                if result:
                    data = [dict(zip([col[0] for col in cur.description], row)) for row in result]
                    sql_sigle_process['inception_execute_percent'] = data[0]['Percent']
                else:
                    sql_sigle_process['inception_execute_percent'] = 0
                cur.close()
                conn.close()
                sql_all_process.append(sql_sigle_process)
            except Exception as e:
                print("Mysql Error %d: %s" % (e.args[0], e.args[1]))
        status = 'ok'
        message = 'ok'
    content = {'status': status, 'message': message, 'data': sql_all_process}
    return content


# 获取SQL文件路径,调用inception执行
def execute_submit_sql_by_file_path(submit_sql_uuid, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error, split_sql_file_path,execute_user_name):
    # 获取执行SQL对应的master信息与osc信息
    data = inception_dao.get_master_info_by_split_sql_file_path_dao(split_sql_file_path)
    logger.info(data)
    inception_osc_config = data[0]["inception_osc_config"]
    cluster_name = data[0]["cluster_name"]
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
        cmd = "python3.5 {}/scripts/inception_execute.py '{}' {} {} {} '{}' '{}' '{}' {} '{}' &".format(os.getcwd(), submit_sql_uuid, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error, split_sql_file_path,execute_user_name, des_master_ip, des_master_port, osc_config_sql)
        logger.info("调用脚本执行SQL:%s" % cmd)
        ret = os.system(cmd)
        logger.info("调用脚本执行SQL返回值(非0表示调用失败):%s" % ret)
        if ret == 0:
            status = "ok"
            message = "调用脚本成功"
        elif ret != 0:
            status = "ok"
            message = '调用脚本失败'
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message}
        return content


# 将拆分SQL写入拆分文件,并将自任务写入sql_execute_split
def write_split_sql_to_new_file(cursor,master_ip, master_port,submit_sql_uuid,sql_tuple,sql_file_path,cluster_name):
    try:
        result = []
        result_tmp = {}
        result_copy = {}
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
            with open(upfile, 'w') as f:
                f.write(sql)
            insert_split_sql = """insert into sql_execute_split(
                                    submit_sql_uuid,
                                    split_seq,
                                    split_sql_file_path,
                                    sql_num,
                                    ddlflag,
                                    master_ip,
                                    master_port,
                                    cluster_name
                                    ) values('{}',{},'{}',{},{},'{}',{},'{}')
                                """.format(submit_sql_uuid,split_seq,split_sql_file_path,sql_num,ddlflag,master_ip, master_port,cluster_name)
            print(insert_split_sql)
            cursor.execute(insert_split_sql)
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
        data = inception_dao.get_split_sql_by_uuid_dao(submit_sql_uuid)
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message, 'data': data}
        return content

