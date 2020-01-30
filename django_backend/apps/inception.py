from django.http import HttpResponse
import json
import pymysql
from django.db import connection
import uuid
from time import gmtime, strftime
import os
import sys


# 页面获取所有工单列表
def get_submit_sql_info_func(request):
    status = ""
    message = ""
    data = []
    cursor = connection.cursor()
    if request.method == 'GET':
        sql = """
            SELECT submit_sql_user,
                submit_sql_uuid,
                title,
                case leader_check  when 1 then '未审核' when 2 then '审核通过' when 3 then '审核不通过' end as leader_check,
                leader_user_name,
                case qa_check when 1 then '未审核' when 2 then '审核通过' when 3 then '审核不通过' end as qa_check,
                case dba_check when 1 then '未审核' when 2 then '审核通过' when 3 then '审核不通过' end as dba_check,
                case dba_execute when 1 then '未执行' when 2 then '已执行' end as dba_execute,
                qa_user_name,
                dba_check_user_name,
                dba_execute_user_name,
                ctime,
                utime
            FROM sql_execute order by utime desc
        """
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message,'data': data}
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')


# 查看指定提交工单的详情
def get_apply_sql_by_uuid_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    status = ""
    message = ""
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    sql = """
        select title,
               submit_sql_user,
               leader_user_name,
               qa_user_name,
               dba_check_user_name,
               dba_execute_user_name,
               case leader_check  when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as leader_check,
               case qa_check when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as qa_check,
               case dba_check when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as dba_check,
               case dba_execute when 1 then '未执行' when 2 then '已执行' end as dba_execute,
               case execute_status when 1 then '未执行' when 2 then '执行中' when 3 then '执行成功' when 4 then '执行失败' end as execute_status,
               master_ip,
               master_port,
               comment_info,
               submit_sql_uuid,
               (select count(*) from  sql_check_results where submit_sql_uuid='{}') as submit_sql_rows,
               (select sum(inception_affected_rows) from  sql_check_results where submit_sql_uuid='{}') as submit_sql_affect_rows,
               (select sum(inception_execute_time) from sql_execute_results where submit_sql_uuid='{}') as inception_execute_time,
               submit_sql_execute_type,
               comment_info,
               submit_sql_file_path
        from sql_execute 
        where submit_sql_uuid='{}'
    """.format(submit_sql_uuid,submit_sql_uuid,submit_sql_uuid,submit_sql_uuid)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message,'data': data}
    print(content)
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')


# 页面调用inception检测SQL
def check_sql_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    db_ip = request_body['params']['db_ip'].strip()
    db_port = request_body['params']['db_port'].strip()
    check_sql_info = request_body['params']['check_sql_info']
    sql = """/*--user=wthong;--password=fffjjj;--host={};--check=1;--port={};*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(db_ip, db_port, check_sql_info)
    status = ""
    message = ""
    try:
        conn = pymysql.connect(host='39.97.247.142', user='', passwd='', db='', port=6669, charset="utf8")  # inception服务器
        cur = conn.cursor()
        cur.execute(sql)
        result = cur.fetchall()
        #field_names = [i[0] for i in cur.description]
        data = [dict(zip([col[0] for col in cur.description], row)) for row in result]
        cur.close()
        conn.close()
        status = "ok"
        message = "inception审核完成"
    except Exception as e:
        print("Mysql Error %d: %s" % (e.args[0], e.args[1]))
        status = "error"
        message = "inception审核失败"
    content = {'status': status, 'message': message, 'data': data}
    print(content)
    return HttpResponse(json.dumps(content), content_type='application/json')


# 页面提交SQL工单
def submit_sql_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    status = ""
    message = ""
    now_date = strftime("%Y%m%d", gmtime())
    upload_path = "./upload/" + now_date
    if not os.path.isdir(upload_path):
        os.makedirs(upload_path)
    uuid_str = str(uuid.uuid4())
    file_name = "%s_%s.sql" % ('gaochao', uuid_str)
    file_path = now_date + '/' + file_name
    upfile = os.path.join(upload_path, file_name)
    cursor = connection.cursor()
    if request.method == 'POST':
        sql_title = request_body['params']['title']
        db_ip = request_body['params']['db_ip'].strip()
        db_port = request_body['params']['db_port'].strip()
        leader = request_body['params']['leader']
        qa = request_body['params']['qa']
        check_sql = request_body['params']['check_sql']
        check_sql_results = request_body['params']['check_sql_results']
        submit_sql_execute_type = request_body['params']['submit_sql_execute_type']
        comment_info = request_body['params']['comment_info']
        sql = """insert into sql_execute(submit_sql_user,
                                         title,
                                         master_ip,
                                         master_port,
                                         submit_sql_file_path,
                                         leader_user_name,
                                         leader_check,
                                         qa_user_name,
                                         qa_check,
                                         dba_check_user_name,
                                         dba_check,
                                         submit_sql_execute_type,
                                         dba_execute_user_name,
                                         comment_info,
                                         submit_sql_uuid) 
                 values('gaochao','{}','{}',{},'{}','{}',1,'{}',1,'gaochao',1,'{}','gaochao','{}','{}')
        """.format(sql_title, db_ip, db_port, file_path, leader, qa, submit_sql_execute_type, comment_info, uuid_str)
        # 提交的SQL写入文件
        with open(upfile,'w') as f:
            f.write(check_sql)
            f.close()
    try:
        cursor.execute("%s" % sql)
        for check_sql_result in check_sql_results:
            inception_id = check_sql_result["ID"]
            inception_stage = check_sql_result["Stage"]
            inception_error_level = check_sql_result["Error_Level"]
            inception_stage_status = check_sql_result["Stage_Status"]
            inception_error_message = check_sql_result["Error_Message"]
            inception_sql = check_sql_result["SQL"]
            inception_affected_rows = check_sql_result["Affected_rows"]
            inception_sequence = check_sql_result["Sequence"]
            inception_backup_dbnames = check_sql_result["Backup_Dbnames"]
            inception_execute_time = check_sql_result["Execute_Time"]
            inception_sqlsha1 = check_sql_result["sqlsha1"]
            inception_command = check_sql_result["Command"]
            sql_results_insert = """
                insert into sql_check_results(submit_sql_uuid,
                                              inception_id,
                                              inception_stage,
                                              inception_error_level,
                                              inception_stage_status,
                                              inception_error_message,
                                              inception_sql,
                                              inception_affected_rows,
                                              inception_sequence,
                                              inception_backup_dbnames,
                                              inception_execute_time,
                                              inception_sqlsha1,
                                              inception_command)
                values('{}',{},'{}',{},'{}','{}','{}','{}',{},'{}','{}','{}','{}') 
            """.format(uuid_str, inception_id, inception_stage, inception_error_level, inception_stage_status, pymysql.escape_string(inception_error_message), pymysql.escape_string(inception_sql), inception_affected_rows, inception_sequence, inception_backup_dbnames, inception_execute_time ,inception_sqlsha1, inception_command)
            cursor.execute("%s" % sql_results_insert)
        status = "ok"
        message = "提交成功"
    except Exception as e:
        status = "error"
        message = e
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message}
    return HttpResponse(json.dumps(content), content_type='application/json')


# 页面预览指定工单提交的SQL
def get_submit_sql_by_uuid_func(request):
    to_str = str(request.body, encoding="utf-8")
    data = json.loads(to_str)
    status = ""
    message = ""
    submit_sql_uuid = data['params']['submit_sql_uuid']
    sql = "select submit_sql_file_path from sql_execute where submit_sql_uuid='{}'".format(submit_sql_uuid)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        file_path = rows[0][0]
        with open("./upload/{}".format(file_path), "rb") as f:
            data = f.read()
            data = data.decode('utf-8')
        status = "ok"
        message = "获取SQL成功"
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cursor.close()
        connection.close()
        f.close()
    content = {'status': status, 'message': message,'data': data}
    print(content)
    return HttpResponse(json.dumps(content,default=str), content_type='text/xml')


# 页面查看审核结果
def get_check_sql_results_by_uuid_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    status = ""
    message = ""
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    sql = "select inception_sql,inception_stage_status,inception_error_level,inception_error_message,inception_affected_rows from sql_check_results where submit_sql_uuid='{}'".format(submit_sql_uuid)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message,'data': data}
    print(content)
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')


# 审核通过
def pass_submit_sql_by_uuid_func(request):
    to_str = str(request.body, encoding="utf-8")
    data = json.loads(to_str)
    status = ""
    message = ""
    submit_sql_uuid = data['params']['submit_sql_uuid']
    apply_results = data['params']['apply_results']
    if apply_results == "通过":
        sql = "update sql_execute set leader_check=2,qa_check=2,dba_check=2 where submit_sql_uuid='{}'".format(submit_sql_uuid)
    elif apply_results == "不通过":
        sql = "update sql_execute set leader_check=3,qa_check=3,dba_check=3 where submit_sql_uuid='{}'".format(submit_sql_uuid)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        status = "ok"
        message = "执行成功"
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message}
    print(content)
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')


# 页面查看inception变量配置
def get_inception_variable_config_info_func(request):
    status = ""
    message = ""
    sql = "select variable_name name,variable_value value,variable_description,editable from inception_variable_config"
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message,'data': data}
    print(content)
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')

# 页面修改inception变量配置
def update_inception_variable_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    new_config = request_body["params"]["new_config_json"]
    request_body_json = json.dumps(new_config)
    status = ""
    message = ""
    sql = "update sql_execute set inception_osc_config='{}'".format(request_body_json)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message}
    print(content)
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')
# 执行SQL并将执行结果插入表中,django http请求超过30s收不到请求就会断开,inception执行SQL需要异步来处理
def execute_sql_func(cursor,submit_sql_uuid, target_db_ip, target_db_port, execute_sql):
    sql = """/*--user=wthong;--password=fffjjj;--host={};--execute=1;--port={};*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(target_db_ip, target_db_port, execute_sql)
    status = ""
    message = ""
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
        status = "ok"
        message = "执行完成"
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cur.close()
        conn.close()
    content = {'status': status, 'message': message}
    print(content)
    return content


# 获取SQL文件路径,调用inception执行
def execute_submit_sql_by_uuid_func(request):
    to_str = str(request.body, encoding="utf-8")
    data = json.loads(to_str)
    status = ""
    message = ""
    submit_sql_uuid = data['params']['submit_sql_uuid']
    # sql_select = "select master_ip, master_port, submit_sql_file_path ,inception_osc_config from sql_execute where submit_sql_uuid='{}'".format(submit_sql_uuid)
    # sql_update_executing = "update sql_execute set dba_execute=2,execute_status=2 where submit_sql_uuid='{}'".format(submit_sql_uuid)
    cursor = connection.cursor()
    try:
        # cursor.execute("%s" % sql_select)
        # rows = cursor.fetchall()
        # data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        # file_path = data[0]["submit_sql_file_path"]
        # inception_osc_config = data[0]["inception_osc_config"]
        # db_ip = data[0]["master_ip"]
        # db_port = data[0]["master_port"]
        # if inception_osc_config == "" or inception_osc_config == '{}':
        #     inception_osc_config = "empty"
        # cursor.execute("%s" % sql_update_executing)
        # cmd = "/anaconda2/envs/py35/bin/python3.5 /Users/gaochao/gaochao-git/gaochao_repo/devops/django_backend/scripts/inception_execute.py '{}' '{}' {} '{}' '{}' &".format(submit_sql_uuid, db_ip, db_port, file_path, inception_osc_config)
        cmd = "/anaconda2/envs/py35/bin/python3.5 /Users/gaochao/gaochao-git/gaochao_repo/devops/django_backend/scripts/inception_execute.py '{}' &".format(submit_sql_uuid)
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


# 查看执行结果
def get_execute_submit_sql_results_by_uuid_func(request):
    to_str = str(request.body, encoding="utf-8")
    data = json.loads(to_str)
    status = ""
    message = ""
    submit_sql_uuid = data['params']['submit_sql_uuid']
    sql = """select inception_id,
                    inception_stage,
                    case inception_error_level  when 0 then '执行成功' when 1 then '执行成功(含警告)' when 2 then '执行失败' end as inception_error_level,
                    inception_affected_rows,
                    inception_error_message,
                    inception_sql,
                    inception_execute_time
             from sql_execute_results where submit_sql_uuid='{}'
    """.format(submit_sql_uuid)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        print('get_execute_submit_sql_results_by_uuid_func', e)
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message,'data': data}
    print(content)
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')

# 根据uuid获取sqlsha1,根据sqlsha1连接inception查看执行进度
def get_execute_process_by_uuid_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    get_sqlsha1_sql = "select inception_sqlsha1,inception_sql from sql_check_results where submit_sql_uuid='{}'".format(submit_sql_uuid)
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
                    sql_sigle_process['inception_execute_percent'] = 100
                cur.close()
                conn.close()
                sql_all_process.append(sql_sigle_process)
            except Exception as e:
                print("Mysql Error %d: %s" % (e.args[0], e.args[1]))
        status = 'ok'
        message = 'ok'
        content = {'status': status, 'message': message, 'data': sql_all_process}
    return HttpResponse(json.dumps(content), content_type='application/json')