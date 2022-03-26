from rest_framework.views import APIView
from django.http import HttpResponse
import json


class BaseView(APIView):
    """
    登陆认证,setting配置文件配置APIView中自带的auth
    权限验证,setting配置文件不配置APIView中自带的check_permission,自己实现
    接口控制
    请求参数处理
    返回结果处理
    操作审计
    频率限制,使用APIView中自带的DEFAULT_THROTTLE_CLASSES
    """
    def __init__(self):
        self.request_path = None
        self.request_method = None
        self.request_params = None
        self.request_user_info =None
        self.request_from = None

    def dispatch(self, request, *args, **kwargs):
        """
        请求预处理
        :param request:
        :param args:
        :param kwargs:
        :return:
        """
        # 权限验证
        if self.my_check_permissions(kwargs['access']) == "no_permission":
            return self.my_response({"status": "error", "message": "no permission", "code": 403})
        # 获取请求信息
        self.request_path = request.path
        self.request_method = request.method
        if self.request_method == "GET":
            self.request_params = request.GET.dict()
        elif self.request_method == "POST" and str(request.body, encoding="utf-8") != "":
            self.request_params = json.loads(str(request.body, encoding="utf-8"))
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
        if request.META.get('HTTP_AUTHORIZATION') == "request_from_api":
            self.request_from = "request_from_api"
            self.request_user_info = []
        else:
            self.request_from = "request_from_web"
            self.request_user_info = []

    def my_response(self,data, content_type='application/json'):
        """
        处理返回结果,封装统一返回格式
        :param data:
        :param content_type:
        :return:
        """
        if data.get('status') is None:
            data["status"] = "error"
            data["message"] = "return format is error, must include status keyword"
        if data.get('status') == "ok":
            if data.get('code') is None: data['code'] = 2000
            if data.get('message') is None: data['message'] = None
        if data.get('status') == "error":
            if data.get('code') is None: data['code'] = 5000
            if data.get('message') is None: data['message'] = "server error"
        self.audit_log(data)
        return HttpResponse(json.dumps(data, default=str), content_type=content_type)

    def audit_log(self,ret_info):
        """
        审计日志
        :return:
        """
        print(self.request_path, ret_info.get('status'), ret_info.get('message'))

    def api_control_switch(self):
        """
        判断哪些接口被关闭,发版等危险操作或特殊场景需要屏蔽接口使用
        :return:
        """
        pass
