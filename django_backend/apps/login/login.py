from django.http import HttpResponse
import json
from apps.utils import user
import logging
logger = logging.getLogger("devpos")

# 登陆验证获取用户信息
def get_login_user_name_by_token_func(request):
    token = request.META.get('HTTP_AUTHORIZATION')
    try:
        data = user.get_login_user(token)
        if data:
            content = {'status': "ok", 'message': "验证成功", "data": data}
            logger.info(content)
        else:
            content = {'status': "ok", 'message': "验证失败"}
            logger.error(content)
    except Exception as e:
        logger.error(e)
        content = {'status': "error", 'message': e,}
    return HttpResponse(json.dumps(content, default=str), content_type='application/json')