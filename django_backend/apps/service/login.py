from django.db import connection
import logging
from apps.dao import login_dao

logger = logging.getLogger('sql_logger')
# 根据登陆token获取用户信息
def get_login_user_name_by_token(token):
    try:
        data = login_dao.get_login_user_name_by_token_dao(token)
        if data:
            content = {'status': "ok", 'message': "验证成功", "data": data}
            logger.info(content)
        else:
            content = {'status': "ok", 'message': "验证失败"}
            logger.error(content)
    except Exception as e:
        content = {'status': "error", 'message': e, }
        logger.error(e)
    finally:
        return content
