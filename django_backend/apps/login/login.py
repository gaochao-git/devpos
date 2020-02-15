from django.http import HttpResponse
import json
import pymysql
from django.db import connection
import uuid
from time import gmtime, strftime
import os
from rest_framework_jwt.views import obtain_jwt_token, refresh_jwt_token
from rest_framework_jwt.authentication import JSONWebTokenAuthentication
from rest_framework.views import exception_handler
from rest_framework_jwt.utils import jwt_decode_handler

"""
自定义jwt认证成功返回数据
:token  返回的jwt
:user   当前登录的用户信息[对象]
:request 当前本次客户端提交过来的数据
:role 角色
"""


def jwt_response_payload_handler(token, user=None, request=None, role=None):
    if user.first_name:
        name = user.first_name
    else:
        name = user.username
    return {
        "authenticated": 'true',
        'id': user.id,
        "role": role,
        'name': name,
        'username': user.username,
        'email': user.email,
        'token': token,
    }

# 登陆
def get_user_name_by_token_func(request):
    # token1 = request.META.get('HTTP_AUTHORIZATION')[4:]
    # token_user = jwt_decode_handler(token1)
    # print(999999)
    # print(token_user)
    # print(999999)
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    token = request_body['params']['token']
    status = ""
    message = ""
    sql="select username from auth_user a inner join authtoken_token b on a.id=b.user_id where `key`='{}'".format(token)
    print(sql)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        print(len(rows))
        print(rows)
        if rows:
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
    content = {'status': status, 'message': message,"data":data}
    print(content)
    return HttpResponse(json.dumps(content,default=str), content_type='application/json')