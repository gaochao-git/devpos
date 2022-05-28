from django.urls import path
from app_jks.controller import jks_controller
from django_backend.urls import RouterAccess

urlpatterns = [
    path('v1/install_mysql/', jks_controller.InstallMysqlController.as_view(),kwargs={"access": RouterAccess.dba}), # 添加收藏项
]