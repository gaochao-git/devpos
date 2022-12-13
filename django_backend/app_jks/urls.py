from django.urls import path
from app_jks.controller import jks_controller
from django_backend.urls import RouterAccess

urlpatterns = [
    path('v1/job_list/', jks_controller.JobListController.as_view(),kwargs={"access": RouterAccess.dba}), # 列出任务
    path('v1/job_stop/', jks_controller.JobStopController.as_view(),kwargs={"access": RouterAccess.dba}), # 停止任务
    path('v1/job_log/', jks_controller.JobLogController.as_view(),kwargs={"access": RouterAccess.dba}), # 停止任务
    path('v1/install_mysql/', jks_controller.InstallMysqlController.as_view(),kwargs={"access": RouterAccess.dba}), # 安装mysql

    # jks任务配置
    path('v1/add_jks_config/', jks_controller.AddJksConfigController.as_view(),kwargs={"access": RouterAccess.dba}), # 增加任务配置
    path('v1/modify_jks_config/', jks_controller.ModifyJksConfigController.as_view(),kwargs={"access": RouterAccess.dba}), # 修改任务配置
    path('v1/del_jks_config/', jks_controller.DelJksConfigController.as_view(),kwargs={"access": RouterAccess.dba}), # 修改任务配置
    path('v1/get_jks_job_config_list/', jks_controller.GetJksJobConfigListController.as_view(),kwargs={"access": RouterAccess.dba}), # 获取所有配置任务
    path('v1/get_jks_job_config_detail/', jks_controller.GetJksJobConfigDetailController.as_view(),kwargs={"access": RouterAccess.dba}), # 获取任务详情
]