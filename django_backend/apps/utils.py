from django.db import connection


# 根据登陆token获取用户信息
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
        print(e)
    finally:
        cursor.close()
        connection.close()

