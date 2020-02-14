from django.http import HttpResponse
import json
import pymysql
from django.db import connection
import uuid
from time import gmtime, strftime
import os


# 登陆
def login_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    user_name = request_body['params']['user_name']
    user_pass = request_body["params"]["password"]
    status = ""
    message = ""
    sql = "select count(*) from team_user where uname='{}' and upass='{}'".format(user_name,user_pass)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        if len(rows)>0:
            status = "ok"
            message = "验证成功"
        else:
            status = "ok"
            message = "验证失败"
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