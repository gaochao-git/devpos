from django.db import connection
import json
from django.http import HttpResponse
# 根据登陆token获取用户信息
def get_login_user(token):
    sql="""select a.username,
	              a.email,
	              case c.title when 0 then '前端开发' when 1 then '后端开发' when 2 then 'qa' when 3 then 'leader' when 4 then 'dba' end title
	           from auth_user a inner join authtoken_token b on a.id=b.user_id 
	           inner join team_user c on a.username=c.uname
               where `key`='{}'
    """.format(token)
    print(sql)
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
        print(e)
    finally:
        cursor.close()
        connection.close()


# 获取master ip
def get_master_ip_func(request):
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