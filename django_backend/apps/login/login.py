from django.http import HttpResponse
import json
from apps import utils


# 登陆验证获取用户信息
def get_login_user_name_by_token_func(request):
    token = request.META.get('HTTP_AUTHORIZATION')
    try:
        data = utils.get_login_user(token)
        if data:
            content = {'status': "ok", 'message': "验证成功", "data": data}
        else:
            content = {'status': "ok", 'message': "验证失败"}
    except Exception as e:
        print(e)
        content = {'status': "error", 'message': e,}
    print(content)
    return HttpResponse(json.dumps(content, default=str), content_type='application/json')