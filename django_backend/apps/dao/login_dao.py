from django.db import connection
import logging
from apps.utils import db_helper

logger = logging.getLogger('sql_logger')


# 根据登陆token获取用户信息
def get_login_user_name_by_token_dao(token):
    data = ""
    sql="""select a.username,
                  a.email,
                  case c.title when 0 then '前端开发' when 1 then '后端开发' when 2 then 'qa' when 3 then 'leader' when 4 then 'dba' end title
               from auth_user a inner join authtoken_token b on a.id=b.user_id 
               inner join team_user c on a.username=c.uname
               where b.`key`='{}'""".format(token)
    try:
        rows = db_helper.findall(sql)
        data = rows[0]
    except Exception as e:
        logger.error(e)
    finally:
        return data
