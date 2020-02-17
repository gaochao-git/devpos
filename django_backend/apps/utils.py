from django.db import connection


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

