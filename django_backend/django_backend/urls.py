from django.contrib import admin
from django.urls import path, include
from apps.controller import mysql_cluster_controller
from apps.controller import mysql_instance_controller
from apps.controller import server_info_controller
from apps.controller import deploy_mysql_controller
from apps.ansible_task.adhoc import ansible_adhoc
from enum import Enum


class RouterAccess(Enum):
    """角色与路由对应访问权限"""
    all = ['common', 'dba', 'admin']
    dba = ['dba', 'admin']
    admin = ['admin']
    no = []  # 无需权限验证的公开接口


urlpatterns = [
    # django后台登陆
    path('admin/', admin.site.urls),
    # 用户登陆
    path('api/login/', include("app_login.urls")),

    # 用户权限管理
    path('api/permission/', include("app_permission.urls")),
    # SQL变更服务
    path('api/audit_sql/', include("app_audit_sql.urls")),
    # db_dcl权限申请服务
    path('api/db_dcl/', include("app_db_dcl.urls")),
    # web_console数据查询服务
    path('api/web_console/', include("app_web_console.urls")),
    # 循环/定时任务管理
    path('api/task_manage/', include("app_task_manage.urls")),

    # jks任务
    path('api/jks/', include("app_jks.urls")),

    # 服务器资源
    path('api/server_resource/v1/get_server_info/', server_info_controller.GetServerInfoController.as_view(), kwargs={"access": RouterAccess.all}), # server--查看主机信息
    # mysql资源
    # path('api/db_resource/v1/get_mysql_cluster/', mysql_cluster_controller.get_mysql_cluster_controller),  # 获取mysql集群信息
    path('api/db_resource/v1/get_mysql_cluster/', mysql_cluster_controller.GetMysqlClusterController.as_view(), kwargs={"access": RouterAccess.all}),  # 获取mysql集群信息
    path('api/db_resource/v1/get_mysql_cluster_ins/', mysql_cluster_controller.get_mysql_cluster_ins_controller),  # 获取mysql集群实例信息
    path('api/db_resource/v1/get_mysql_instance_info/', mysql_instance_controller.get_mysql_instance_info_handler),  # 获取所有mysql实例
    path('api/db_resource/v1/get_mysql_cluster_ins_info/', mysql_cluster_controller.get_mysql_cluster_ins_info_controller),  # 获取所有mysql实例
    path('api/db_resource/v1/get_schema_list/', mysql_cluster_controller.GetSchemaListController.as_view(), kwargs={"access": RouterAccess.all}), # server--查看主机信息
    path('api/zabbix/v1/get_zabbix_info/', mysql_instance_controller.get_zabbix_info_handler),  # 获取所有mysql实例

    # 数据库集群资源申请工单
    path('api/v1/service/ticket/ansible_adhoc/', ansible_adhoc.adhoc),  # ansible api执行命令
    path('api/v1/submit_deploy_mysql/', deploy_mysql_controller.submit_install_mysql_controller),  # 提交部署mysql工单
    path('api/v1/get_deploy_mysql_submit_info/', deploy_mysql_controller.get_deploy_mysql_submit_info_controller), # 获取所有部署mysql工单信息
    path('api/v1/service/ticket/get_deploy_mysql_info_by_uuid/', deploy_mysql_controller.get_deploy_mysql_info_by_uuid_controller), # 获取部署mysql工单详情
    path('api/v1/service/ticket/deploy_mysql_by_uuid/', deploy_mysql_controller.deploy_mysql_by_uuid_controller), # 执行部署mysql任务
    path('api/v1/service/ticket/get_ansible_api_log/', deploy_mysql_controller.get_ansible_api_log_controller), # 获取部署日志
    path('api/v1/pass_submit_deploy_mysql/', deploy_mysql_controller.pass_submit_deploy_mysql_controller),  # 审核部署mysql工单
    path('api/v1/service/ticket/get_work_flow_by_uuid/', deploy_mysql_controller.get_work_flow_by_uuid_controller),  # 获取工单流转记录
    # 故障分析
    path("api/fault_tree/", include("app_fault_tree.urls")),
    ]


