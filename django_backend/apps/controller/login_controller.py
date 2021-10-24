from django.http import HttpResponse
import json
from apps.service import login
import logging
# from apps.tasks import sendmail

logger = logging.getLogger("devpos")


def get_login_user_name_by_token_handler(request):
    """
    根据登陆token获取用户详情
    :param request:
    :return:
    """
    bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
    token = bearer_token.split(' ')[1]
    ret = login.get_login_user_name_by_token(token)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')