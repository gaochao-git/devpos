from django.http import HttpResponse
import json
import pymysql
from django.db import connection
import uuid
from time import gmtime, strftime
import os
import re
import logging
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
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
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


# 执行SQL并将执行结果插入表中,django http请求超过30s收不到请求就会断开,inception执行SQL需要异步来处理
def execute_sql_func(cursor,submit_sql_uuid, target_db_ip, target_db_port, execute_sql):
    sql = """/*--user=wthong;--password=fffjjj;--host={};--execute=1;--port={};*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(target_db_ip, target_db_port, execute_sql)
    try:
        conn = pymysql.connect(host='39.97.247.142', user='', passwd='', db='', port=6669,charset="utf8")  # inception服务器
        cur = conn.cursor()
        cur.execute(sql)
        results = cur.fetchall()
        field_names = [i[0] for i in cur.description]
        for row in results:
            inception_id = row[0]
            inception_stage = row[1]
            inception_error_level = row[2]
            inception_error_message = row[4]
            inception_sql = row[5]
            inception_affected_rows = row[6]
            inception_execute_time = row[9]
            insert_execute_results_sql = """insert into sql_execute_results(submit_sql_uuid,
                                                                            inception_id,
                                                                            inception_stage,
                                                                            inception_error_level,
                                                                            inception_error_message,
                                                                            inception_sql,
                                                                            inception_affected_rows,
                                                                            inception_execute_time
                                                                            ) values('{}',{},'{}',{},'{}','{}',{},'{}')
            """.format(submit_sql_uuid, inception_id, inception_stage, inception_error_level,pymysql.escape_string(inception_error_message), pymysql.escape_string(inception_sql),inception_affected_rows, inception_execute_time)
            cursor.execute(insert_execute_results_sql)
        content = {'status': "ok", 'message': "执行完成"}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print(e)
    finally:
        cur.close()
        conn.close()
    return content


# 获取SQL文件路径,调用inception执行
def execute_submit_sql_by_file_path_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    status = ""
    message = ""
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    split_sql_file_path = request_body['params']['split_sql_file_path']
    inception_backup = request_body['params']['inception_backup']
    inception_check_ignore_warning = request_body['params']['inception_check_ignore_warning']
    inception_execute_ignore_error = request_body['params']['inception_execute_ignore_error']
    execute_user_name = request_body['params']["execute_user_name"]
    cursor = connection.cursor()
    try:
        cmd = "python3.5 {}/scripts/inception_execute.py '{}' {} {} {} '{}' '{}' &".format(os.getcwd(), submit_sql_uuid, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error, split_sql_file_path,execute_user_name)
        print("调用脚本执行SQL:%s" % cmd)
        ret = os.system(cmd)
        print("调用脚本执行SQL返回值(非0表示调用失败):%s" % ret)
        if ret == 0:
            status = "ok"
            message = "调用脚本成功"
        elif ret != 0:
            status = "ok"
            message = '调用脚本失败'
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message}
    return HttpResponse(json.dumps(content,default=str), content_type='text/xml')


# 手动执行SQL更改工单状态
def execute_submit_sql_by_file_path_manual_func(request):
    token = request.META.get('HTTP_AUTHORIZATION')
    data = login_dao.get_login_user_name_by_token_dao(token)
    login_user_name = data["username"]
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    split_sql_file_path = request_body['params']['split_sql_file_path']
    sql1 = "update sql_execute_split set dba_execute=2,execute_status=6,submit_sql_execute_plat_or_manual=2 where split_sql_file_path='{}'".format(split_sql_file_path)
    sql2 = "select id,submit_sql_uuid,split_sql_file_path from sql_execute_split where submit_sql_uuid='{}' and dba_execute=1".format(submit_sql_uuid)
    sql3 = "update sql_submit_info set dba_execute=2,execute_status=6,submit_sql_execute_plat_or_manual=2,dba_execute_user_name='{}' where submit_sql_uuid='{}'".format(login_user_name, submit_sql_uuid)
    cursor = connection.cursor()
    #如果所有的拆分文件均执行完在将工单文件状态改了
    try:
        cursor.execute("%s" % sql1)
        cursor.execute("%s" % sql2)
        rows = cursor.fetchall()
        if not rows:
            cursor.execute("%s" % sql3)
        content = {'status': "ok", 'message': "状态更改成功"}
    except Exception as e:
        content = {'status': "error", 'message': "状态更改失败"}
        print(e)
    finally:
        cursor.close()
        connection.close()
    print(content)
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')

# 查看执行结果
def get_execute_submit_sql_results_by_uuid_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    split_sql_file_path = request_body['params']['split_sql_file_path']
    sql = """select a.inception_id,
                    a.inception_stage,
                    case a.inception_error_level  when 0 then '执行成功' when 1 then '执行成功(含警告)' when 2 then '执行失败' end as inception_error_level,
                    a.inception_affected_rows,
                    a.inception_error_message,
                    a.inception_sql,
                    a.inception_execute_time
             from sql_execute_results a inner join sql_execute_split b on a.split_sql_file_path=b.split_sql_file_path  where b.split_sql_file_path='{}'
    """.format(split_sql_file_path)
    print(sql)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        content = {'status': "ok", 'message': "ok",'data': data}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print('get_execute_submit_sql_results_by_uuid_func', e)
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')

# 根据uuid获取sqlsha1,根据sqlsha1连接inception查看执行进度
def get_execute_process_by_uuid_controller(request):
    status = ''
    message = ''
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    print(request_body)
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    split_sql_file_path = request_body['params']['split_sql_file_path']
    get_sqlsha1_sql = "select inception_sqlsha1,inception_sql from sql_check_results where submit_sql_uuid='{}' and inception_sqlsha1!=''".format(submit_sql_uuid)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % get_sqlsha1_sql)
        rows = cursor.fetchall()
    except Exception as e:
        print(e)
    finally:
        cursor.close()
        connection.close()

    sql_all_process = []
    for row in rows:
        sqlsha1 = row[0]
        inception_get_osc_percent_sql = "inception get osc_percent '{}'".format(sqlsha1)
        sql_sigle_process = {}
        if sqlsha1 == '':
            sql_sigle_process['inception_execute_percent'] = 100
            sql_sigle_process['inception_sql'] = row[1]
            sql_all_process.append(sql_sigle_process)
        else:
            sql_sigle_process['inception_sql'] = row[1]
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
    return HttpResponse(json.dumps(content), content_type='application/json')


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
        print(20000)
        print(cluster_name)
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
        print(e)
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
def get_split_sql_by_uuid_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    split_sql = """
        select
            a.master_ip,
            a.master_port,
            a.submit_sql_uuid,
            b.split_seq,
            b.split_sql_file_path,
            case b.dba_execute when 1 then '未执行' when 2 then '已执行' end as dba_execute,
            case b.submit_sql_execute_plat_or_manual when 1 then '平台执行' when 2 then '手动执行' end as submit_sql_execute_plat_or_manual,
            case b.execute_status when 1 then '未执行' when 2 then '执行中' when 3 then '执行成功' when 4 then '执行失败' when 5 then '执行成功(含警告)' end as execute_status,
            sum(c.inception_execute_time) inception_execute_time
            from sql_submit_info a inner join sql_execute_split b on a.submit_sql_uuid=b.submit_sql_uuid left join sql_execute_results c on b.split_sql_file_path=c.split_sql_file_path where a.submit_sql_uuid='{}' group by b.split_sql_file_path order by b.split_seq
    """.format(submit_sql_uuid)
    cursor = connection.cursor()
    print(split_sql)
    try:
        cursor.execute("%s" % split_sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        content = {'status': "ok", 'message': "ok",'data': data}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print(e)
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')

