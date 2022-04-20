from django.urls import path
from rest_framework.authtoken import views as drf_views
from rest_framework_jwt.views import obtain_jwt_token,refresh_jwt_token

urlpatterns = [
    path('v1/auth/', drf_views.obtain_auth_token), # token登录v1版本,不带过期
    path('v2/auth/', obtain_jwt_token),            # token登陆v2版本,带过期,用在web调用
    path('v2/auth_refresh/', refresh_jwt_token),   # token登陆v2版本,刷新token,用在接口请求中,用老的token换新的token
]
