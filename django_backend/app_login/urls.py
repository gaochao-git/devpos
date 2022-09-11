from django.urls import path
from rest_framework.authtoken import views as drf_views
from rest_framework_jwt.views import obtain_jwt_token,refresh_jwt_token
import django_cas_ng
import django_cas_ng.views as cas_view
from apps.utils import auth
from app_login.controller import login_controller
from django_backend.urls import RouterAccess


urlpatterns = [
    path('v1/auth_api/', drf_views.obtain_auth_token),  # 用户名密码登陆换取token,不带过期,用在接口调用
    path('v1/auth_web/', obtain_jwt_token),  # 用户名密码登陆换取token,带过期,用在web调用
    path('v1/auth_refresh/', refresh_jwt_token),  # 用户名密码登陆换取token,刷新token,用在接口请求中,用老的token换新的token
    path('v1/sso_login/', django_cas_ng.views.LoginView.as_view(), name='cas_mg_login'),  # sso登陆，如果没有登陆则跳转到sso登陆界面
    path('v1/sso_logout/', django_cas_ng.views.LogoutView.as_view(), name='cas_mg_logout'),  # sso登出
    path('v1/get_login_user_info/', login_controller.GetLoginUserInfoController.as_view(), kwargs={"access": RouterAccess.all}),  # 获取登陆用户信息
]
