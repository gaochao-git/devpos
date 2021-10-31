from django.http import HttpResponse
import json
from apps.service import login
import logging
from rest_framework_jwt.utils import jwt_decode_handler

logger = logging.getLogger("devpos")


def get_login_user_info_controller(request):
    """
    根据登陆token获取用户详情
    :param request:
    :return:
    """
    bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
    token = bearer_token.split(' ')[1]
    ret = login.get_login_user_info(token)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


def v2_get_login_user_info_controller(request):
    """
    根据登陆jwt token获取用户详情
    :param request:
    :return:
    """
    bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
    token = bearer_token.split(' ')[1]
    data = []
    try:
        token_user = jwt_decode_handler(token)
        status = "ok"
        message = "获取用户信息成功"
        data.append(token_user)
    except Exception as e:
        status = "error"
        message = "获取用户信息失败"
        logger.exception(e)
    ret = {"status": status, "message": message, "data":data}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')
