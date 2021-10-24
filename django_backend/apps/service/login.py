from django.db import connection
import logging
from apps.dao import login_dao
from django.http import HttpResponse
import json

logger = logging.getLogger('sql_logger')


def get_login_user_name_by_token(token):
    """
    根据登陆token获取用户详情
    :param token:
    :return:
    """
    ret = login_dao.get_login_user_name_by_token_dao(token)
    return ret