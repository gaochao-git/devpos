from django.http import HttpResponse
import json
from django.db import connection
import pymysql


"""
自定义jwt认证成功返回数据
:token  返回的jwt
:user   当前登录的用户信息[对象]
:request 当前本次客户端提交过来的数据
:role 角色
"""

# 登陆
def get_login_user_name_by_token_func(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    token = request_body['params']['token']
    status = ""
    message = ""
    sql="select username,email from auth_user a inner join authtoken_token b on a.id=b.user_id where `key`='{}'".format(token)
    print(sql)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
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

def get_login_user(token):
    sql="select username,email from auth_user a inner join authtoken_token b on a.id=b.user_id where `key`='{}'".format(token)
    cursor = connection.cursor()

    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        if rows:
            data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
            return data[0]
        else:
            print("token匹配用户信息失败")
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cursor.close()
        connection.close()

