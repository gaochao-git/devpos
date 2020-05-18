from django.http import HttpResponse
import json
import pymysql
from django.db import connection
import uuid
from time import gmtime, strftime
import os
import re
from apps.utils import common
from apps.service import inception


# 页面获取所有工单列表
def get_submit_sql_info_controller(request):
    token = request.META.get('HTTP_AUTHORIZATION')
    ret = inception.get_submit_sql_info(token)
    return HttpResponse(json.dumps(ret,default=str), content_type='application/json')


# 查看指定提交工单的详情
def get_apply_sql_by_uuid_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
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
               case execute_status when 1 then '未执行' when 2 then '执行中' when 3 then '执行成功' when 4 then '执行失败' when 5 then '执行成功(含警告)' when 6 then '手动执行' end as execute_status,
               master_ip,
               master_port,
               cluster_name,
               comment_info,
               submit_sql_uuid,
               (select count(*) from  sql_check_results where submit_sql_uuid='{}') as submit_sql_rows,
               (select sum(inception_affected_rows) from  sql_check_results where submit_sql_uuid='{}') as submit_sql_affect_rows,
               (select sum(inception_execute_time) from sql_execute_results where submit_sql_uuid='{}') as inception_execute_time,
               submit_sql_execute_type,
               comment_info,
               submit_sql_file_path
        from sql_submit_info
        where submit_sql_uuid='{}'
    """.format(submit_sql_uuid,submit_sql_uuid,submit_sql_uuid,submit_sql_uuid)
    print(sql)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
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


# 页面调用inception检测SQL,如果根据cluster_name则需要先获取到对应的master_ip、master_port
def check_sql_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    if request_body['params']['submit_source_db_type'] == "cluster":
        cluster_name = request_body['params']['cluster_name']
        if common.get_cluster_write_node_info(cluster_name) == "no_write_node":
            content = {'status': "error", 'message': "没有匹配到合适的写节点"}
            return HttpResponse(json.dumps(content), content_type='application/json')
        else:
            des_master_ip, des_master_port = common.get_cluster_write_node_info(cluster_name)

    else:
        des_master_ip = request_body['params']['db_ip'].strip()
        des_master_port = request_body['params']['db_port'].strip()
    check_sql_info = request_body['params']['check_sql_info']
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
        print("inception审核失败",str(e))
        message = str(e)
        if re.findall('1875', str(e)):
            message = "语法错误"
        elif re.findall('2003', str(e)):
            message = "语法检测器无法连接"
        content = {'status': "error", 'message': message}
    return HttpResponse(json.dumps(content), content_type='application/json')


# 根据输入的集群名模糊匹配已有集群名
def get_cluster_name_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    cluster_name = request_body['params']['cluster_name']
    sql = "select cluster_name from mysql_cluster where cluster_name like '{}%' limit 5".format(cluster_name)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        cluster_name_list = []
        [cluster_name_list.append(i[0]) for i in rows]
        content = {'status': "ok", 'message': "ok",'data': cluster_name_list}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print(e)
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')


# 获取master ip
def get_master_ip_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    db_master_ip_or_hostname = request_body['params']['db_master_ip_or_hostname']
    if db_master_ip_or_hostname.strip('.').isdigit():
        sql = "select server_public_ip from server where server_public_ip like '{}%' limit 5".format(db_master_ip_or_hostname)
    else:
        sql = "select server_public_ip from server where server_hostname like '{}%' limit 5".format(db_master_ip_or_hostname)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        host_list = []
        [host_list.append(i[0]) for i in rows]
        content = {'status': "ok", 'message': "ok",'data': host_list}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print(e)
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')

# 页面提交SQL工单
def submit_sql_controller(request):
    token = request.META.get('HTTP_AUTHORIZATION')
    data = login_dao.get_login_user_name_by_token_dao(token)
    login_user_name = data["username"]
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    now_date = strftime("%Y%m%d", gmtime())
    upload_path = "./upload/" + now_date
    if not os.path.isdir(upload_path):
        os.makedirs(upload_path)
    uuid_str = str(uuid.uuid4())
    file_name = "%s_%s.sql" % (login_user_name, uuid_str)
    file_path = now_date + '/' + file_name
    upfile = os.path.join(upload_path, file_name)
    sql_title = request_body['params']['title']
    sql_get_leader_qa_dba = "select b.qa_name,b.leader_name,b.dba_name from team_user a inner join team_check_role b on a.gid=b.gid where a.uname='{}'".format(login_user_name)
    cursor = connection.cursor()
    cursor.execute("%s" % sql_get_leader_qa_dba)
    rows = cursor.fetchall()
    qa_name = rows[0][0]
    leader_name = rows[0][1]
    dba_name = rows[0][2]
    # leader = request_body['params']['leader']
    # qa = request_body['params']['qa']
    check_sql = request_body['params']['check_sql']
    check_sql_results = request_body['params']['check_sql_results']
    submit_sql_execute_type = request_body['params']['submit_sql_execute_type']
    comment_info = request_body['params']['comment_info']
    print(request_body['params'])
    if (request_body['params']['submit_source_db_type'] == "cluster"):
        cluster_name = request_body['params']['cluster_name']
        print(cluster_name)
        sql = """insert into sql_submit_info(submit_sql_user,
                                     title,
                                     cluster_name,
                                     submit_sql_file_path,
                                     leader_user_name,
                                     leader_check,
                                     qa_user_name,
                                     qa_check,
                                     dba_check_user_name,
                                     dba_check,
                                     submit_sql_execute_type,
                                     comment_info,
                                     submit_sql_uuid) 
             values('{}','{}','{}','{}','{}',1,'{}',1,'{}',1,'{}','{}','{}')
        """.format(login_user_name,sql_title, cluster_name, file_path, leader_name, qa_name,dba_name,submit_sql_execute_type, comment_info, uuid_str)
        print(sql)
    else:
        db_ip = request_body['params']['db_ip'].strip()
        db_port = request_body['params']['db_port'].strip()
        sql = """insert into sql_submit_info(submit_sql_user,
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
                                     comment_info,
                                     submit_sql_uuid) 
             values('{}','{}','{}',{},'{}','{}',1,'{}',1,'{}',1,'{}','{}','{}')
    """.format(login_user_name,sql_title, db_ip, db_port, file_path, leader_name, qa_name, dba_name,submit_sql_execute_type, comment_info, uuid_str)

    # 提交的SQL写入文件
    with open(upfile,'w') as f:
        f.write(check_sql)
        f.close()
    cursor = connection.cursor()
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
        content = {'status': "ok", 'message': "提交成功"}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content), content_type='application/json')


# 页面预览指定工单提交的SQL
def get_submit_sql_by_uuid_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    sql = "select submit_sql_file_path from sql_submit_info where submit_sql_uuid='{}'".format(submit_sql_uuid)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        file_path = rows[0][0]
        with open("./upload/{}".format(file_path), "rb") as f:
            data = f.read()
            data = data.decode('utf-8')
        #f.close()
        content = {'status': "ok", 'message': "获取SQL成功",'data': data}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print(e)
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content,default=str), content_type='text/xml')


# 页面预览指定的拆分SQL
def get_submit_split_sql_by_file_path_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['params']['split_sql_file_path']
    sql = "select split_sql_file_path from sql_execute_split where split_sql_file_path='{}'".format(split_sql_file_path)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        #rows = cursor.fetchall()
        file_path = split_sql_file_path
        with open("./upload/{}".format(file_path), "rb") as f:
            data = f.read()
            data = data.decode('utf-8')
        content = {'status': "ok", 'message': "获取SQL成功",'data': data}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print(e)
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content,default=str), content_type='text/xml')


# 页面查看审核结果
def get_check_sql_results_by_uuid_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    sql = "select inception_sql,inception_stage_status,inception_error_level,inception_error_message,inception_affected_rows from sql_check_results where submit_sql_uuid='{}'".format(submit_sql_uuid)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
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


# 审核通过并拆分SQL
def pass_submit_sql_by_uuid_controller(request):
    token = request.META.get('HTTP_AUTHORIZATION')
    data = login_dao.get_login_user_name_by_token_dao(token)
    login_user_name = data["username"]
    login_user_name_role = data["title"]
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    ret = ""
    submit_sql_uuid = request_body['params']['submit_sql_uuid']
    apply_results = request_body['params']['apply_results']
    check_comment = request_body['params']['check_comment']
    check_status = 2 if apply_results == "通过" else 3
    if login_user_name_role == "leader":
        sql = "update sql_submit_info set leader_check={},leader_user_name='{}',leader_check_comment='{}' where submit_sql_uuid='{}'".format(check_status,login_user_name,check_comment,submit_sql_uuid)
    elif login_user_name_role == "qa":
        sql = "update sql_submit_info set qa_check={},qa_user_name='{}',qa_check_comment='{}' where submit_sql_uuid='{}'".format(check_status,login_user_name,check_comment,submit_sql_uuid)
    elif login_user_name_role == "dba":
        sql = "update sql_submit_info set dba_check={},dba_check_user_name='{}',dba_check_comment='{}' where submit_sql_uuid='{}'".format(check_status,login_user_name,check_comment,submit_sql_uuid)
    if apply_results == "通过":
        split_sql = """
             select 
                a.title,                
                a.submit_sql_user,                
                a.leader_user_name,                
                a.qa_user_name,                
                a.dba_check_user_name,                
                a.dba_execute_user_name,                
                case a.leader_check  when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as leader_check,                
                case a.qa_check when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as qa_check,                
                case a.dba_check when 1 then '未审核' when 2 then '通过' when 3 then '不通过' end as dba_check,                
                case a.dba_execute when 1 then '未执行' when 2 then '已执行' end as dba_execute,                
                case a.execute_status when 1 then '未执行' when 2 then '执行中' when 3 then '执行成功' when 4 then '执行失败' when 5 then '执行成功含警告' when 6 then '手动执行' end as execute_status,                
                a.master_ip,                
                a.master_port,                
                a.comment_info,                
                a.submit_sql_uuid,                
                (select count(*) from  sql_check_results where submit_sql_uuid='{}') as submit_sql_rows,                
                (select sum(inception_affected_rows) from  sql_check_results where submit_sql_uuid='{}') as submit_sql_affect_rows,                
                (select sum(inception_execute_time) from sql_execute_results where submit_sql_uuid='{}') as inception_execute_time,                
                a.submit_sql_execute_type,                             
                b.split_sql_file_path         
                from sql_submit_info a inner join sql_execute_split b on a.submit_sql_uuid=b.submit_sql_uuid where a.submit_sql_uuid='{}'
        """.format(submit_sql_uuid, submit_sql_uuid, submit_sql_uuid, submit_sql_uuid)
        #拆分SQL
        if login_user_name_role == "dba":
            ret = split_sql_func(submit_sql_uuid)
        cursor = connection.cursor()
        try:
            cursor.execute("%s" % sql)
            cursor.execute("%s" % split_sql)
            rows = cursor.fetchall()
            data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
            status = "ok"
            message = "审核成功," + ret
            content = {'status': status, 'message': message,"data": data}
        except Exception as e:
            status = "error"
            message = str(e) + ",+" + ret
            content = {'status': status, 'message': message}
            print(e)
        finally:
            cursor.close()
            connection.close()
    elif apply_results == "不通过":
        cursor = connection.cursor()
        try:
            cursor.execute("%s" % sql)
            content = {'status': "ok", 'message': "审核不通过"}
        except Exception as e:
            content = {'status': "error", 'message': str(e)}
        finally:
            cursor.close()
            connection.close()
    print(content)
    return HttpResponse(json.dumps(content, default=str), content_type='application/json')


# 页面查看inception变量配置
def get_inception_variable_config_info_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['params']['split_sql_file_path']
    sql = "select variable_name name,variable_value value,variable_description,editable from sql_inception_osc_config"
    sql_split_osc_config="select inception_osc_config from sql_execute_split where split_sql_file_path='{}'".format(split_sql_file_path)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql_split_osc_config)
        sql_split_osc_config_row = cursor.fetchall()
        if sql_split_osc_config_row[0][0] == "" or sql_split_osc_config_row[0][0]=="{}":
            cursor.execute("%s" % sql)
            rows = cursor.fetchall()
            new_data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        else:
            cursor.execute("%s" % sql)
            rows = cursor.fetchall()
            data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
            new_data = []
            for i in sql_split_osc_config_row:
                osc_config_variable_dict = json.loads(i[0])
                print(osc_config_variable_dict)
                for j in data:
                    if j["name"] in osc_config_variable_dict:
                        j["value"] = osc_config_variable_dict[j["name"]]
                        new_data.append(j)
                    else:
                        new_data.append(j)
        content = {'status': "ok", 'message': "ok",'data': new_data}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print(e)
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')


# 页面修改inception变量配置
def update_inception_variable_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['params']['split_sql_file_path']
    new_config = request_body["params"]["new_config_json"]
    request_body_json = json.dumps(new_config)
    sql = "update sql_execute_split set inception_osc_config='{}' where split_sql_file_path='{}'".format(request_body_json,split_sql_file_path)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        content = {'status': "ok", 'message': "修改inception osc参数成功"}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print(e)
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')


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
def execute_submit_sql_by_file_path_controller(request):
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
def execute_submit_sql_by_file_path_manual_controller(request):
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
def get_execute_submit_sql_results_by_uuid_controller(request):
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
        print(message)
        return message


# 开始拆分
def start_split_sql(cursor,submit_sql_uuid,master_ip, master_port, execute_sql, sql_file_path,cluster_name):
    # 拆分SQL
    sql = """/*--user=wthong;--password=fffjjj;--host={};--port={};--enable-split;*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(master_ip, master_port, execute_sql)
    try:
        conn = pymysql.connect(host='39.97.247.142', user='', passwd='', db='', port=6669, charset="utf8")  # inception服务器
        cur = conn.cursor()
        cur.execute(sql)
        sql_tuple = cur.fetchall()
        ret = write_split_sql_to_new_file(cursor,master_ip, master_port,submit_sql_uuid,sql_tuple,sql_file_path,cluster_name)
        if ret == "拆分后SQL写入新文件成功":
            message = "拆分SQL成功"
        else:
            message = "拆分SQL失败"
    except Exception as e:
        message = "拆分SQL失败"
        print(str(e))
    finally:
        cur.close()
        conn.close()
        print(message)
        return message


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
            print(9999999)
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
        message = "拆分后SQL写入新文件成功"
    except Exception as e:
        message = "拆分后SQL写入新文件失败"
        print(e)
    finally:
        print(message)
        return message


# 获取页面拆分SQL
def get_split_sql_by_uuid_controller(request):
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

