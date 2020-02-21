# coding=utf-8

from django.shortcuts import render
from django.http import HttpResponse
import json
from django.db import connection
import pymysql
import uuid

# 查看工单信息
def get_private_user_info_func(request):
    cursor = connection.cursor()
    print(request.method)
    if request.method == 'GET':
        sql = """select id as 'key',
                    order_uuid,
                    ctime,
                    person_name,
                    case request_type when 0 then '创建新用户' when 1 then '扩展权限' when 2 then '扩展IP' when 3 then '扩展数据库' else '无效工单' end request_type,
                    department,
                    leader,
                    dba,
                    case leader_check_result when 1 then '通过' when 2 then '不通过' else '未审核' end leader_check_result,
                    case dba_check_result when 1 then '通过' when 2 then '不通过' else '未审核' end dba_check_result,
                    case status when 1 then '未执行' when 2 then '执行成功' else '执行失败' end status 
                from privilege_request_info order by ctime desc"""
    elif request.method == 'POST':
        to_str = str(request.body, encoding="utf-8")
        user_name = json.loads(to_str)['user_name'].strip()
        where_user_name_condition = 'and user_name like "{}%"'.format(user_name)
        #print(where_user_name_condition)
        sql = """select id as 'key',
                    ctime,
                    person_name,
                    case request_type when 0 then '创建新用户' when 1 then '扩展权限' when 2 then '扩展IP' when 3 then '扩展数据库' else '无效工单' end request_type,
                    department,
                    leader,
                    dba,
                    case leader_check_result when 1 then '通过' when 2 then '不通过' else '未审核' end leader_check_result,
                    case dba_check_result when 1 then '通过' when 2 then '不通过' else '未审核' end dba_check_result,
                    case status when 1 then '未执行' when 2 then '执行成功' else '执行失败' end status 
                from privilege_request_info where 1=1 {} order by ctime desc""".format(where_user_name_condition)
    cursor.execute("%s" % sql)
    rows = cursor.fetchall()
    print(rows)
    data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
    #print(data)
    return HttpResponse(json.dumps(data,default=str),content_type = 'application/json')

# 创建新用户工单提交
def privileges_create_user_info_func(request):
    status = ""
    message = ""
    cursor = connection.cursor()
    if request.method == 'POST':
        to_str = str(request.body, encoding="utf-8")
        request_body = json.loads(to_str)
        print(request_body['params'])
        grant_db_master_ip = request_body['params']["grant_db_master_ip"].strip()             # 主库ip
        grant_db_master_port = request_body['params']["grant_db_master_port"].strip()         # 主库port
        grant_user_name = request_body['params']['grant_user_name'].strip()                   # 用户名
        grant_user_host = request_body['params']['grant_user_host'].strip()                   # 用户ip
        grant_database = request_body['params']['grant_database'].strip()                     # 申请数据库
        grant_table = request_body['params']['grant_table'].strip()                           # 申请表
        grant_privileges = request_body['params']['grant_privileges'].strip()                 # 申请权限
        grant_dev_name = request_body['params']['grant_dev_name'].strip()                     # 申请人
        grant_request_type = 0  # 工单类型为创建新用户

        #查询出当前用户的所在部门、领导和DBA信息
        user_info_sql = "select department,leader_name,dba_name from devops.team_user where uname='{}'".format(grant_dev_name)
        cursor.execute(user_info_sql)
        user_info = cursor.fetchall()

        grant_department = user_info[0][0]  # 部门
        grant_leader = user_info[0][1]  # 领导
        grant_dba = user_info[0][2]  # DBA

        print(request_body['params'])
        try:
            # 连接需要创建账号的数据库
            conn = pymysql.connect(host=grant_db_master_ip, port=int(grant_db_master_port), user="dba_devpos", password="fffjjj",charset="utf8",connect_timeout=3)
            cur = conn.cursor()
            select_user_sql = "select user,host from mysql.user where user='{}' and host='{}'".format(grant_user_name, grant_user_host)
            cur.execute(select_user_sql)
            if not cur.fetchall():
                str_order_uuid = str(uuid.uuid4())
                add_user_info_sql = """insert into devops.privilege_request_info(order_uuid,
                                person_name,
                                request_type,
                                department,
                                leader,
                                dba,
                                leader_check_result,
                                dba_check_result,
                                db_master_ip,
                                db_master_port,
                                user_name,
                                user_host,
                                privileges,
                                db_name,
                                tb_name,
                                status,
                                ctime,
                                utime) 
                            values ('{}','{}','{}','{}','{}','{}',0,0,'{}',{},'{}','{}','{}','{}','{}',1,now(),now())""".format(str_order_uuid,grant_dev_name,int(grant_request_type),grant_department,grant_leader,grant_dba,grant_db_master_ip,int(grant_db_master_port),grant_user_name,grant_user_host,grant_privileges,grant_database,grant_table)
                print(add_user_info_sql)
                cursor.execute(add_user_info_sql)
                status = "ok"
                message = "执行成功"
                cur.close()
                conn.close()
            else:
                print("{}@{}已存在".format(grant_user_name,grant_user_host))
                status = "ok"
                message = "用户已存在"
        except Exception as e:
            print(e)
            status = "error"
            message = str(e)
        finally:
            cursor.close()
            connection.close()
        content = {"status": status, "message": message}
        return HttpResponse(json.dumps(content), content_type='application/json')


# 创建新用户工单执行
def execute_order_func(request):
    status = ""
    message = ""
    cursor = connection.cursor()
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    print(request_body['params'])
    order_uuid = request_body['params']["order_uuid"]
    create_user_info_sql = """select db_master_ip, 
                                db_master_port, 
                                user_name, 
                                user_host, 
                                privileges, 
                                db_name, 
                                tb_name 
                              from privilege_request_info where order_uuid = '{}'""".format(order_uuid)
    print(create_user_info_sql)
    cursor.execute(create_user_info_sql)
    rows = cursor.fetchall()
    print(rows)
    grant_db_master_ip = rows[0][0]
    grant_db_master_port = rows[0][1]
    grant_user_name = rows[0][2]
    grant_user_host_list = rows[0][3].split(',')
    grant_user_password = 'fffjjj'
    grant_privileges = rows[0][4]
    grant_database = rows[0][5]
    grant_table = rows[0][6]

    try:
        # 连接需要创建账号的主库
        conn = pymysql.connect(host=grant_db_master_ip, port=int(grant_db_master_port), user="dba_devpos",password="fffjjj", charset="utf8", connect_timeout=3)
        cur = conn.cursor()
        for user_host in grant_user_host_list:
            create_user_sql = "create user '{}'@'{}' identified by '{}'".format(grant_user_name, user_host,grant_user_password)
            print(create_user_sql)
            grant_user_sql = "grant {} on {}.{} to '{}'@'{}'".format(grant_privileges, grant_database, grant_table,grant_user_name, user_host)
            print(grant_user_sql)
            cur.execute(create_user_sql)
            cur.execute(grant_user_sql)
        order_status_sql = "update privilege_request_info set status=2 where order_uuid='{}'".format(order_uuid)    #更新工单状态为执行成功
        print(order_status_sql)
        cursor.execute(order_status_sql)
        status = "ok"
        message = "执行成功"
        cur.close()
        conn.close()

    except Exception as e:
        print(e)
        order_status_sql = "update privilege_request_info set status=3 where order_uuid='{}'".format(order_uuid)
        print(order_status_sql)
        cursor.execute(order_status_sql)
        status = "error"
        message = "执行失败" + str(e)
    finally:
        cursor.close()
        connection.close()
    content = {"status": status, "message": message}
    return HttpResponse(json.dumps(content), content_type='application/json')


#根据order_uuid获取工单信息
def get_order_info_func(request):
    cursor = connection.cursor()
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    print(request_body)
    print(request_body['params'])
    order_uuid = request_body['params']["order_uuid"]
    sql = """select id as 'key',
                    user_name,
                    ctime,
                    utime,
                    user_host,
                    db_name,
                    tb_name,
                    db_master_ip,
                    db_master_port,
                    person_name,
                    privileges,
                    case request_type when 0 then '创建新用户' when 1 then '扩展权限' when 2 then '扩展IP' when 3 then '扩展数据库' else '无效工单' end request_type,
                    department,
                    leader,
                    dba,
                    case leader_check_result when 1 then '通过' when 2 then '不通过' else '未审核' end leader_check_result,
                    case dba_check_result when 1 then '通过' when 2 then '不通过' else '未审核' end dba_check_result,
                    case status when 1 then '未执行' when 2 then '执行成功' else '执行失败' end status  
                from privilege_request_info where order_uuid='{}'""".format(order_uuid)
    print(sql)
    cursor.execute("%s" % sql)
    rows = cursor.fetchall()
    print(rows)
    data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
    print(data)
    return HttpResponse(json.dumps(data,default=str), content_type='application/json')

#审核工单
def check_order_func(request):
    cursor = connection.cursor()
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    print(request_body)
    print(request_body['params'])
    order_uuid = request_body['params']["order_uuid"]
    check_result = request_body['params']["check_result"]
    login_user_name_role = request_body['params']["login_user_name_role"]

    if check_result=='通过'and login_user_name_role=='leader':
        sql = "update privilege_request_info set leader_check_result=1 where order_uuid='{}'".format(order_uuid)
    elif check_result=='不通过'and login_user_name_role=='leader':
        sql = "update privilege_request_info set leader_check_result=2 where order_uuid='{}'".format(order_uuid)
    elif check_result=='通过'and login_user_name_role=='dba':
        sql = "update privilege_request_info set dba_check_result=1 where order_uuid='{}'".format(order_uuid)
    elif check_result=='不通过'and login_user_name_role=='dba':
        sql = "update privilege_request_info set dba_check_result=2 where order_uuid='{}'".format(order_uuid)
    try:

        print(sql)
        cursor.execute(sql)
        status = "ok"
        message = "执行成功"
    except Exception as e:
        print(e)
        status = "error"
        message = str(e)
    finally:
        cursor.close()
        connection.close()
    content = {"status": status, "message": message}
    return HttpResponse(json.dumps(content), content_type='application/json')


# 权限扩展工单提交
def privileges_extend_info_func(request):
    status = ""
    message = ""
    cursor = connection.cursor()
    if request.method == 'POST':
        to_str = str(request.body, encoding="utf-8")
        request_body = json.loads(to_str)
        print(request_body['params'])
        grant_db_master_ip = request_body['params']["grant_db_master_ip"].strip()                 #主库ip
        grant_db_master_port = request_body['params']["grant_db_master_port"].strip()             #主库port
        grant_user_name = request_body['params']['grant_user_name'].strip()                       # 用户名
        grant_dev_name = request_body['params']['grant_dev_name'].strip()                         # 申请人
        grant_privileges = request_body['params']['grant_privileges'].strip()                     # 权限
        grant_request_type = 1                                                                    # 工单类型为扩展权限

        # 查询出当前用户的所在部门、领导和DBA信息
        user_info_sql = "select department,leader_name,dba_name from devops.team_user where uname='{}'".format(grant_dev_name)
        cursor.execute(user_info_sql)
        user_info = cursor.fetchall()

        grant_department = user_info[0][0]                                                         # 部门
        grant_leader = user_info[0][1]                                                             # 领导
        grant_dba = user_info[0][2]                                                                # DBA
        print(request_body['params'])

        try:
            # 连接需要扩展权限的user所在实例
            conn = pymysql.connect(host=grant_db_master_ip, port=int(grant_db_master_port), user="dba_devpos", password="fffjjj",charset="utf8",connect_timeout=3)
            cur = conn.cursor()
            select_user_sql = "select user,host from mysql.user where user='{}'".format(grant_user_name)
            print(select_user_sql)
            cur.execute(select_user_sql)
            rows = cur.fetchall()
            print(rows)
            if rows:
                ip_list = []
                database_list = []
                for row in rows:
                    print(row)
                    user_name = row[0]
                    select_user_host = row[1]
                    user_grants_db_sql = "select db from mysql.db where user='{}' and host='{}'".format(user_name,select_user_host)
                    print(user_grants_db_sql)
                    cur.execute(user_grants_db_sql)
                    result = cur.fetchall()
                    print(result)
                    ip_list.append(row[1])
                    database_list.append(result[0][0])
                str_ip_list = ','.join(ip_list)
                str_database_list = ','.join(database_list)
                str_order_uuid = str(uuid.uuid4())
                add_order_info_sql = """insert into devops.privilege_request_info(order_uuid,
                                            person_name,
                                            request_type,
                                            department,
                                            leader,
                                            dba,
                                            leader_check_result,
                                            dba_check_result,
                                            db_master_ip,
                                            db_master_port,
                                            user_name,
                                            user_host,
                                            privileges,
                                            db_name,
                                            tb_name,
                                            status,
                                            ctime,
                                            utime) 
                                        values ('{}','{}','{}','{}','{}','{}',0,0,'{}',{},'{}','{}','{}','{}','*',1,now(),now())""".format(str_order_uuid,grant_dev_name,int(grant_request_type),grant_department,grant_leader,grant_dba,grant_db_master_ip,int(grant_db_master_port),grant_user_name,str_ip_list,grant_privileges,str_database_list)
                print(add_order_info_sql)
                cursor.execute(add_order_info_sql)
                status = "ok"
                message = "执行成功"
                cur.close()
                conn.close()
            else:
                print("{}不存在".format(grant_user_name))
                status = "ok"
                message = "用户不存在"
        except Exception as e:
            print(e)
            status = "error"
            message = str(e)
        finally:
            cursor.close()
            connection.close()
        content = {"status": status, "message": message}
        return HttpResponse(json.dumps(content), content_type='application/json')


#获取用户原有权限信息
def privileges_original_info_func(request):
    cursor = connection.cursor()
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    print(request_body)
    order_uuid = request_body['params']["order_uuid"]
    sql = """select id as 'key',
                    user_name,
                    db_master_ip,
                    db_master_port
                from privilege_request_info where order_uuid='{}'""".format(order_uuid)
    print(sql)
    cursor.execute("%s" % sql)
    rows = cursor.fetchall()
    print(rows)
    grant_db_master_ip = rows[0][2]
    grant_db_master_port = rows[0][3]
    grant_user_name = rows[0][1]

    try:
        conn = pymysql.connect(host=grant_db_master_ip, port=int(grant_db_master_port), user="dba_devpos", password="fffjjj",charset="utf8",connect_timeout=3)
        cur = conn.cursor()
        select_user_sql = "select user,host,authentication_string from mysql.user where user='{}'".format(grant_user_name)
        print(select_user_sql)
        cur.execute(select_user_sql)
        rows = cur.fetchall()
        print(rows)
        if rows:
            for row in rows:
                print(row)
                user_name = row[0]
                select_user_host = row[1]
                user_grants_db_sql = """select b.user,b.host,b.authentication_string,a.db,concat(
                    case when a.Select_priv='Y' then 'Select,' else '' end,
                    case when a.Insert_priv='Y' then 'Insert,' else '' end,
                    case when a.Update_priv='Y' then 'Update,' else '' end,
                    case when a.Delete_priv='Y' then 'Delete,' else '' end,
                    case when a.Create_priv='Y' then 'Create,' else '' end,
                    case when a.Drop_priv='Y' then 'Drop,' else '' end,
                    case when a.Grant_priv='Y' then 'Grant,' else '' end,
                    case when a.References_priv='Y' then 'References,' else '' end,
                    case when a.Index_priv='Y' then 'Index,' else '' end,
                    case when a.Alter_priv='Y' then 'Alter,' else '' end,
                    case when a.Create_tmp_table_priv='Y' then 'Create_tmp_table,' else '' end,
                    case when a.Lock_tables_priv='Y' then 'Lock_tables,' else '' end,
                    case when a.Create_view_priv='Y' then 'Create_view,' else '' end,
                    case when a.Show_view_priv='Y' then 'Show_view,' else '' end,
                    case when a.Create_routine_priv='Y' then 'Create_routine,' else '' end,
                    case when a.Alter_routine_priv='Y' then 'Alter_routine,' else '' end,
                    case when a.Execute_priv='Y' then 'Execute,' else '' end,
                    case when a.Event_priv='Y' then 'Event,' else '' end,
                    case when a.Trigger_priv='Y' then 'Trigger,' else '' end
                ) as privi
                from mysql.db as a inner join mysql.user as b on a.user=b.user where a.user='{}' and a.host='{}'""".format(user_name,select_user_host)

                cur.execute(user_grants_db_sql)
                result = cur.fetchall()
                print(result)

    except Exception as e:
        print(e)
        status = "error"
        message = str(e)
    finally:
        cursor.close()
        connection.close()

    data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
    print(data)
    return HttpResponse(json.dumps(data,default=str), content_type='application/json')


#获取用户原有权限信息
def privilege_view_user_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    print(request_body['params'])
    grant_db_master_ip = request_body['params']["grant_db_master_ip"].strip()  # 主库ip
    grant_db_master_port = request_body['params']["grant_db_master_port"].strip()  # 主库port
    grant_user_name = request_body['params']['grant_user_name'].strip()  # 用户名

    try:
        conn = pymysql.connect(host=grant_db_master_ip, port=int(grant_db_master_port), user="dba_devpos", password="fffjjj",charset="utf8",connect_timeout=3)
        cur = conn.cursor()
        select_user_sql = "select user,host,authentication_string from mysql.user where user='{}'".format(grant_user_name)
        print(select_user_sql)
        cur.execute(select_user_sql)
        rows = cur.fetchall()
        print(rows)
        if rows:
            for row in rows:
                print(row)
                user_name = row[0]
                select_user_host = row[1]
                user_grants_db_sql = """select b.user,b.host,b.authentication_string,a.db,concat(
                    case when a.Select_priv='Y' then 'Select,' else '' end,
                    case when a.Insert_priv='Y' then 'Insert,' else '' end,
                    case when a.Update_priv='Y' then 'Update,' else '' end,
                    case when a.Delete_priv='Y' then 'Delete,' else '' end,
                    case when a.Create_priv='Y' then 'Create,' else '' end,
                    case when a.Drop_priv='Y' then 'Drop,' else '' end,
                    case when a.Grant_priv='Y' then 'Grant,' else '' end,
                    case when a.References_priv='Y' then 'References,' else '' end,
                    case when a.Index_priv='Y' then 'Index,' else '' end,
                    case when a.Alter_priv='Y' then 'Alter,' else '' end,
                    case when a.Create_tmp_table_priv='Y' then 'Create_tmp_table,' else '' end,
                    case when a.Lock_tables_priv='Y' then 'Lock_tables,' else '' end,
                    case when a.Create_view_priv='Y' then 'Create_view,' else '' end,
                    case when a.Show_view_priv='Y' then 'Show_view,' else '' end,
                    case when a.Create_routine_priv='Y' then 'Create_routine,' else '' end,
                    case when a.Alter_routine_priv='Y' then 'Alter_routine,' else '' end,
                    case when a.Execute_priv='Y' then 'Execute,' else '' end,
                    case when a.Event_priv='Y' then 'Event,' else '' end,
                    case when a.Trigger_priv='Y' then 'Trigger,' else '' end
                ) as privilege
                from mysql.db as a inner join mysql.user as b on a.user=b.user where a.user='{}' and a.host='{}'""".format(user_name,select_user_host)

                cur.execute(user_grants_db_sql)
                result = cur.fetchall()
                print(result)

    except Exception as e:
        print(e)
        status = "error"
        message = str(e)
    finally:
        cur.close()
        conn.close()

    data = [dict(zip([col[0] for col in cur.description], row)) for row in result]
    print(data)
    return HttpResponse(json.dumps(data,default=str), content_type='application/json')