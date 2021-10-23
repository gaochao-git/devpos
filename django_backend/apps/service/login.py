from django.db import connection
import logging
from apps.dao import login_dao
from django.http import HttpResponse
import json

logger = logging.getLogger('sql_logger')


def get_login_user_name_by_token(token):
    """
    根据登陆token获取用户信息
    :param token:
    :return:
    """
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


def auth(func):
    """
    登录验证装饰器
    :param func:
    :return:
    """
    def wrapper(request, access):
        try:
            bearer_token = request.META.get('HTTP_AUTHORIZATION')
            if bearer_token:
                token = bearer_token.split(' ')[1]
                return func(request)
            else:
                content = {"status": "error", "message": "token不存在", "code": 1201}
                return HttpResponse(json.dumps(content), content_type='application/json')
        except Exception as e:
            print(e)
    return wrapper