from django.utils.deprecation import MiddlewareMixin
from django.shortcuts import HttpResponse
import json
from apps.dao import login_dao
from apps.utils import db_helper


class TokenAuth(MiddlewareMixin):
    """
    登陆验证中间件,除了登陆接口所有接口均需要验证
    """
    def process_request(self, request):
        auth_ignore_path = ['/api/auth/']
        if request.path not in auth_ignore_path:
            bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
            token = bearer_token.split(' ')[1]
            if token != 'undefined':
                sql = "select 1 from  authtoken_token where `key`='{}'".format(token)
                login_ret = db_helper.find_all(sql)
                if login_ret['status'] != "ok":
                    content = {"status": "error", "message": "登陆接口异常", "code": 1202}
                    return HttpResponse(json.dumps(content), content_type='application/json')
                if len(login_ret['data']) == 0:
                    content = {"status": "error", "message": "用户登陆失败", "code": 1203}
                    return HttpResponse(json.dumps(content), content_type='application/json')
            else:
                content = {"status": "error", "message": "当前用户没登陆,请登陆", "code": 1201}
                return HttpResponse(json.dumps(content), content_type='application/json')

    def process_response(self, request, response):
        # 基于请求响应
        print("md1  process_response 方法！", id(request))  # 在视图之后
        return response


def permission_required(func):
    """
    权限验证装饰器
    :param func:
    :return:
    """
    def wrapper(request, access):
        try:
            if access:
                print(access)
            return func(request)
        except Exception as e:
            print(e)
    return wrapper