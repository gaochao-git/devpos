from django.http import HttpResponse
import json
from apps.service import login
import logging

logger = logging.getLogger("devpos")

# 登陆验证获取用户信息
def get_login_user_name_by_token_handler(request):
    token = request.META.get('HTTP_AUTHORIZATION')
    ret = login.get_login_user_name_by_token(token)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')