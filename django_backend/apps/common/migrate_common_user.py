# coding=utf-8

from django.shortcuts import render
from django.http import HttpResponse
import json
from django.db import connection
import pymysql
import datetime


def migrate_common_user_func(request):
    status = ""
    message = ""
    cursor = connection.cursor()
    if request.method == 'POST':
        to_str = str(request.body, encoding="utf-8")
        request_body = json.loads(to_str)
        des_master_ip = request_body['params']['des_master_ip'].strip()  # 申请者填写
        des_master_port = request_body['params']['des_master_port'].strip()  # 申请者填写
        sql = "select user_name,user_host,user_password,db_name,tb_name,privileges from common_user where status=1"   #查出公共账号表中需要同步的数据
    try:
        cursor.execute(sql)
        rows = cursor.fetchall()
        status = "ok"
        message = "ok"
    except Exception as e:
        print(e)
        status = "error"
        message = e
    print(des_master_ip, des_master_port)
    if rows:
        try:
            # 连接需要同步账号的新实例
            conn = pymysql.connect(host=des_master_ip, port=int(des_master_port), user="dba_devpos", password="fffjjj",charset="utf8",connect_timeout=3)
            cur = conn.cursor()
            for row in rows:
                print(row[0])
                grant_user_name = row[0]
                grant_user_host = row[1]
                user_password = row[2]
                grant_database = row[3]
                grant_table = row[4]
                grant_privileges = row[5]
                create_user_sql = "create user '{}'@'{}' identified by '{}'".format(grant_user_name, grant_user_host,user_password)
                print(create_user_sql)
                grant_user_sql = "grant {} on {}.{} to '{}'@'{}'".format(grant_privileges, grant_database, grant_table,grant_user_name, grant_user_host)
                print(grant_user_sql)
                select_user_sql = "select user,host from mysql.user where user='{}' and host='{}'".format(grant_user_name, grant_user_host)
                cur.execute(select_user_sql)
                if not cur.fetchall():
                    cur.execute(create_user_sql)
                    cur.execute(grant_user_sql)
                else:
                    print("{}@{}已存在".format(grant_user_name,grant_user_host))
            status = "ok"
            message = "执行成功"
        except Exception as e:
            print(e)
            status = "error"
            message = e
        finally:
            cur.close()
            conn.close()
    content = {"status": status, "message": message}
    return HttpResponse(json.dumps(content), content_type='application/json')