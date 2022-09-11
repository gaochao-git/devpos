from rest_framework.views import APIView
from django.http import HttpResponse
import json
from apps.utils.error_code import StatusCode
# from rest_framework.authentication import TokenAuthentication
from rest_framework_jwt.authentication import JSONWebTokenAuthentication
from rest_framework_jwt.utils import jwt_decode_handler
import time
from datetime import datetime
import django
import logging
logger = logging.getLogger('my_access')



class BaseView(APIView):
    """
    登陆认证,用全局'rest_framework_jwt.authentication.JSONWebTokenAuthentication'
    权限验证,结合URL自己实现
    请求参数处理
    返回结果处理
    接口控制：待实现
    操作审计：待实现
    限流：待实现
    """
    def __init__(self):
        self.request_path = None
        self.request_method = None
        self.request_params = None
        self.request_user_info =None
        self.request_from = None
        self._start_time = datetime.now()

    def dispatch(self, request, *args, **kwargs):
        """
        请求预处理
        :param request:
        :param args:
        :param kwargs: url中的kwargs={"access": RouterAccess.all}
        :return:
        """
        # 权限验证
        if self.my_check_permissions(kwargs['access']) == "no_permission":
            return self.my_response({"status": "error", "message": StatusCode.ERR_NO_PERMISSION.msg, "code": StatusCode.ERR_NO_PERMISSION.code})
        # 获取请求信息
        self.request_path = request.path
        self.request_method = request.method
        if self.request_method == "GET":
            self.request_params = request.GET.dict()
        elif self.request_method == "POST" and str(request.body, encoding="utf-8") != "":
            self.request_params = json.loads(str(request.body, encoding="utf-8"))
        # 获取请求用户信息
        self.get_user_info(request)
        # return super(BaseView, self).dispatch(request, *args, **kwargs)  #路由里面带了权限,类试图里面需要采用def get(request, **kwargs)才可以,太麻烦
        return super(BaseView, self).dispatch(request)

    def my_check_permissions(self, access):
        """
        重写APIView权限验证
        如果用具角色不在权限列表中['common','dba','admin'],则不允许访问
        :param access:
        :return:
        """
        user_role = "dba"
        if user_role not in access.value:
            return "no_permission"

    def get_user_info(self, request):
        """
        获取请求用户信息
        :param request:
        :return:
        """
        bearer_token = request.META.get('HTTP_AUTHORIZATION')
        token = bearer_token.split(' ')[1]
        self.request_user_info = jwt_decode_handler(token)   # auth已经校验了,所以token肯定有效能获取到值
        exp_timestamp = time.localtime(self.request_user_info['exp'])
        orig_iat_timestamp = time.localtime(self.request_user_info['orig_iat'])
        self.request_user_info['exp_format'] = time.strftime("%Y-%m-%d %H:%M:%S", exp_timestamp)
        self.request_user_info['orig_iat_format'] = time.strftime("%Y-%m-%d %H:%M:%S", orig_iat_timestamp)

    def my_response(self, data, content_type='application/json'):
        """
        处理返回结果,封装统一返回格式
        :param data:
        :param content_type:
        :return:
        """
        if data.get('status') is None:
            data["status"] = "error"
            data["message"] = "return format is error, must include status keyword"
            data['code'] = StatusCode.ERR_COMMON.code
        if data.get('status') == "ok":
            if data.get('code') is None: data['code'] = StatusCode.OK.code
            if data.get('message') is None: data['message'] = StatusCode.OK.msg
        if data.get('status') == "error":
            if data.get('code') is None: data['code'] = StatusCode.ERR_COMMON.code
            if data.get('message') is None: data['message'] = StatusCode.ERR_COMMON.msg
        self.audit_log(data)
        request_time = round((datetime.now() - self._start_time).total_seconds() * 1000)
        extra = {
            "user_name": self.request_user_info.get('username'),
            "http_method": self.request_method,
            "request_path": self.request_path,
            "request_status": data.get('status'),
            "request_time": request_time
        }
        if data.get('status') == "ok":
            logger.info(data['message'], extra=extra)
        else:
            logger.error(data['message'], extra=extra)
        return HttpResponse(json.dumps(data, default=str), content_type=content_type)

    def res_success(self, status="ok", message=StatusCode.OK.msg, code=StatusCode.OK.code, data=None):
        if isinstance(data, django.db.models.query.QuerySet):
            data = list(data)
        ret = {
            "status": status,
            "message": message,
            "code": code,
            "data": data
        }
        return self.my_response(ret)

    def res_err(self, status="error", message=StatusCode.ERR_COMMON.msg, code=StatusCode.ERR_COMMON.code):
        ret = {
            "status": status,
            "message": message,
            "code": code,
        }
        return self.my_response(ret)

    def audit_log(self,ret_info):
        """
        审计日志
        :return:
        """
        # print(self.request_path, ret_info.get('status'), ret_info.get('message'))
        pass

    def api_control_switch(self):
        """
        判断哪些接口被关闭,发版等危险操作或特殊场景需要屏蔽接口使用
        :return:
        """
        pass

