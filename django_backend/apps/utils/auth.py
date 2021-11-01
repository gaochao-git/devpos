from django.utils.deprecation import MiddlewareMixin
from django.shortcuts import HttpResponse
import json
import jwt
from rest_framework_jwt.utils import jwt_decode_handler
from apps.utils import db_helper
from apps.utils.error_code import StatusCode
import logging
logger = logging.getLogger('devops')


class Middleware(MiddlewareMixin):
    """
    登陆验证中间件,除了登陆接口所有接口均需要验证
    """
    def process_request(self, request):
        auth_ignore_path = ['/api/auth/','/api/v2/auth/','/api/v2/auth_refresh/']
        print(request.path)
        if request.path not in auth_ignore_path:
            bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
            if bearer_token is None:
                ret = {"status": "error", "message": StatusCode.ERR_NOT_LOGIN.errmsg, "code": StatusCode.ERR_NOT_LOGIN.code}
                return HttpResponse(json.dumps(ret), content_type='application/json')
            try:
                token = bearer_token.split(' ')[1]
            except Exception as e:
                ret = {"status": "error", "message": StatusCode.ERR_LOGIN_FAIL.errmsg, "code":StatusCode.ERR_LOGIN_FAIL.code}
                return HttpResponse(json.dumps(ret), content_type='application/json')
            # ret = v1_auth(token)
            ret = v2_auth(token)
            if ret['status'] !="ok": return HttpResponse(json.dumps(ret), content_type='application/json')

    def process_response(self, request, response):
        # 基于请求响应
        return response

    def process_exception(self, request, exception):
        """
        正常代码不论错误还是正确不会用到这个异常，除非一些异常没有被捕获到就会被这个异常不过到并处理
        :param request:
        :param exception:
        :return:
        """
        logger.error("未手动捕获的异常%s,%s", request,exception)
        content = {"status": "error", "message": "后端服务异常", "code": StatusCode.ERROR.code}
        return HttpResponse(json.dumps(content), content_type='application/json')


def v1_auth(token):
    """
    普通token验证,没有过期
    :param token:
    :return:
    """
    sql = "select 1 from authtoken_token where `key`='{}'".format(token)
    login_ret = db_helper.find_all(sql)
    if login_ret['status'] != "ok": return {"status": "error", "message": StatusCode.ERR_LOGIN_EXPIRE.errmsg, "code": StatusCode.ERR_LOGIN_EXPIRE.code}
    if len(login_ret['data']) == 0: return {"status": "error", "message": StatusCode.ERR_LOGIN_FAIL.errmsg, "code": StatusCode.ERR_LOGIN_FAIL.code}


def v2_auth(token):
    """
    jwt认证
    token不通过为处罚异常
    token验证通过返回用户信息:{'user_id': 1, 'username': 'gaochao', 'exp': 1635680388, 'email': ''}
    :param token:
    :return:
    """
    content = {"status": "ok", "message": "验证成功"}
    try:
        token_user = jwt_decode_handler(token)
    except jwt.ExpiredSignatureError as e:
        content = {"status": "error", "message": StatusCode.ERR_LOGIN_EXPIRE.errmsg, "code": StatusCode.ERR_LOGIN_EXPIRE.code}
        logger.error(e)
    except Exception as e:
        logger.exception(e)
        content = {"status": "error", "message": StatusCode.ERR_LOGIN_FAIL.errmsg, "code": StatusCode.ERR_LOGIN_FAIL.code}
    return content


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
            logger.exception(e)
            print(e)
    return wrapper