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
        auth_ignore_path = ['/api/login/v1/auth/','/api/login/v2/auth/','/api/login/v2/auth_refresh/']
        if request.path not in auth_ignore_path:
            bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
            if bearer_token is None:
                ret = {"status": "error", "message": StatusCode.ERR_NO_LOGIN.msg, "code": StatusCode.ERR_NO_LOGIN.code}
                return HttpResponse(json.dumps(ret), content_type='application/json')
            try:
                token = bearer_token.split(' ')[1]
            except Exception as e:
                ret = {"status": "error", "message": StatusCode.ERR_LOGIN_FAIL.msg, "code":StatusCode.ERR_LOGIN_FAIL.code}
                return HttpResponse(json.dumps(ret), content_type='application/json')
            # ret = token_auth(token)
            ret = jwt_auth(token)
            if ret['status'] !="ok": return HttpResponse(json.dumps(ret), content_type='application/json')
            request.user = ret['data']
            assert request.user.get('user_id') > 0

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
        logger.exception("未手动捕获的异常%s,%s", request,exception)
        content = {"status": "error", "message": "后端服务异常", "code": StatusCode.ERROR.code}
        return HttpResponse(json.dumps(content), content_type='application/json')


def token_auth(token):
    """
    普通token验证,没有过期时间
    :param token:
    :return:
    """
    sql = """
        select a.user_id,b.username,b.is_superuser,b.email from authtoken_token a inner join auth_user b 
        on a.user_id=b.id where `key`='{}'
    """.format(token)
    ret = db_helper.find_all(sql)
    if ret['status'] != "ok" or len(ret['data']) == 0:
        return {"status": "error", "message": StatusCode.ERR_NO_LOGIN.msg, "code": StatusCode.ERR_NO_LOGIN.code}
    else:
        return {"status": "ok", "message": "验证通过", "code": "200", "data":ret['data']}


def jwt_auth(token):
    """
    jwt认证,有过期时间
    token不通过触发异常
    token验证通过返回用户信息:{'user_id': 1, 'username': 'gaochao', 'exp': 1635680388, 'email': ''}
    :param token:
    :return:
    """
    try:
        token_user_info = jwt_decode_handler(token)
        content = {"status": "ok", "message": "验证成功", "data": token_user_info}
    except jwt.ExpiredSignatureError as e:
        content = {"status": "error", "message": StatusCode.ERR_LOGIN_EXPIRE.msg, "code": StatusCode.ERR_LOGIN_EXPIRE.code}
        logger.error(e)
    except Exception as e:
        logger.exception(e)
        content = {"status": "error", "message": StatusCode.ERR_NO_LOGIN.msg, "code": StatusCode.ERR_NO_LOGIN.code}
    return content


def get_login_user_info_controller(request):
    """
    根据登陆token获取用户详情
    :param request:
    :return:
    """
    bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
    token = bearer_token.split(' ')[1]
    ret = get_login_user_info(token)
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


def get_login_user_info(token):
    """
    根据登陆token获取用户详情
    :param token:
    :return:
    """
    ret = get_login_user_info_dao(token)
    return ret

def get_login_user_info_dao(token):
    """
    根据登陆token获取用户详情
    :param token:
    :return:
    """
    sql="""select a.username,
                  a.email,
                  case c.title when 0 then '前端开发' when 1 then '后端开发' when 2 then 'qa' when 3 then 'leader' when 4 then 'dba' end title
               from auth_user a inner join authtoken_token b on a.id=b.user_id 
               inner join team_user c on a.username=c.uname
               where b.`key`='{}'""".format(token)
    return db_helper.find_all(sql)