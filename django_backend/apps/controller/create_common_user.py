# coding=utf-8

from django.shortcuts import render
from django.http import HttpResponse
import json
from django.db import connection
import datetime
import pymysql

class DateEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(obj, datetime.date):
            return obj.strftime("%Y-%m-%d")
        else:
            return json.JSONEncoder.default(self, obj)


# 自助服务-->公共账号管理-->获取用户信息-->使用common_user表
def get_user_info_func(request):
    cursor = connection.cursor()
    print(request.method)
    if request.method == 'GET':
        sql = "select id as 'key',user_name,user_password,user_host,privileges,db_name,tb_name,case status when 1 then '有效' else '无效' end status from common_user order by user_name"
    elif request.method == 'POST':
        to_str = str(request.body, encoding="utf-8")
        user_name = json.loads(to_str)['user_name'].strip()
        where_user_name_condition = 'and user_name like "{}%"'.format(user_name)
        print(where_user_name_condition)
        sql = "select id as 'key',user_name,user_password,user_host,privileges,db_name,tb_name,case status when 1 then '有效' else '无效' end status from common_user where 1=1 {} order by user_name".format(where_user_name_condition)
    cursor.execute("%s" % sql)
    rows = cursor.fetchall()
    data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
    print(data)
    return HttpResponse(json.dumps(data),content_type = 'application/json')

# 创建公共用户并授权
def create_and_grant_func(request):
    cursor = connection.cursor()
    print(request.method)
    to_str = str(request.body, encoding="utf-8")
    print(to_str)
    request_body = json.loads(to_str)
    print(request_body)
    grant_user_name = request_body['params']['grant_user_name'].strip()  # 申请者填写
    grant_user_host = request_body['params']['grant_user_host'].strip()  # 申请者填写
    grant_database = request_body['params']['grant_database'].strip()  # 申请者填写
    grant_table = request_body['params']['grant_table'].strip()  # 申请者填写
    grant_privileges = request_body['params']['grant_privileges'].strip()  # 申请者填写
    user_password = 'fffjjj'        # DBA动态生成
# 创建用户
    create_user_sql = "create user '{}'@'{}' identified by '{}'".format(grant_user_name, grant_user_host, user_password)
    print(create_user_sql)
    grant_user_sql = "grant {} on {}.{} to '{}'@'{}'".format(grant_privileges, grant_database, grant_table,grant_user_name, grant_user_host)
    print(grant_user_sql)
    add_user_info_sql = "insert into devops.common_user(user_name,user_password,user_host,privileges,db_name,tb_name,status,ctime,utime) values('{}','{}','{}','{}','{}','{}',1,now(),now());".format(grant_user_name, user_password, grant_user_host, grant_privileges, grant_database, grant_table)
    print(add_user_info_sql)

    try:
        cursor.execute(create_user_sql)
        cursor.execute(grant_user_sql)
        cursor.execute(add_user_info_sql)
        # cursor.commit()
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
