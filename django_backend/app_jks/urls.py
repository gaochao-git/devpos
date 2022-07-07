from django.urls import path
from app_jks.controller import jks_controller
from django_backend.urls import RouterAccess

urlpatterns = [
    path('v1/job_list/', jks_controller.JobListController.as_view(),kwargs={"access": RouterAccess.dba}), # 列出任务
    path('v1/job_stop/', jks_controller.JobStopController.as_view(),kwargs={"access": RouterAccess.dba}), # 停止任务
    path('v1/job_log/', jks_controller.JobLogController.as_view(),kwargs={"access": RouterAccess.dba}), # 停止任务
    path('v1/install_mysql/', jks_controller.InstallMysqlController.as_view(),kwargs={"access": RouterAccess.dba}), # 安装mysql
]