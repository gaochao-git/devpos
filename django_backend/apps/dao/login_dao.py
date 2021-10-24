from django.db import connection
import logging
from apps.utils import db_helper

logger = logging.getLogger('sql_logger')


def get_login_user_name_by_token_dao(token):
    """
    根据登陆token获取用户详情
    :param token:
    :return:
    """
    sql="""select a.username,
                  a.email,
                  case c.title when 0 then '前端开发' when 1 then '后端开发' when 2 then 'qa' when 3 then 'leader' when 4 then 'dba' end title
               from auth_user a inner join authtoken_token b on a.id=b.user_id 
               inner join team_user c on a.username=c.uname
               where b.`key`='{}'""".format(token)
    return db_helper.find_all(sql)