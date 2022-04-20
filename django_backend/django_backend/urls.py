from django.contrib import admin
from django.urls import path, include
from apps.utils import auth
from apps.controller import mysql_cluster_controller
from apps.controller import mysql_instance_controller
from apps.controller import server_info_controller
from apps.controller import deploy_mysql_controller
from apps.ansible_task.adhoc import ansible_adhoc
from rest_framework.authtoken import views as drf_views
from rest_framework_jwt.views import obtain_jwt_token,refresh_jwt_token
from enum import Enum


class RouterAccess(Enum):
    """角色与路由对应访问权限"""
    all = ['common', 'dba', 'admin']
    dba = ['dba', 'admin']
    admin = ['admin']


urlpatterns = [
    # 用户登陆
    path('admin/', admin.site.urls), # django后台登陆
    path('api/v1/auth/', drf_views.obtain_auth_token),       # token登录v1版本,不带过期
    path('api/v2/auth/', obtain_jwt_token),                  # token登陆v2版本,带过期,用在web调用
    path('api/v2/auth_refresh/', refresh_jwt_token),         # token登陆v2版本,刷新token,用在接口请求中,用老的token换新的token
    path('api/get_login_user_info/', auth.get_login_user_info_controller),  # 根据token获得登录用户名
    path('api/v2/v2_get_login_user_info/', auth.v2_get_login_user_info_controller),  # 登录--根据token获得登录用户名

    # 用户及权限管理

    # 服务器资源
    path('api/server_resource/v1/get_server_info/', server_info_controller.GetServerInfoController.as_view(), kwargs={"access": RouterAccess.all}), # server--查看主机信息
    # mysql资源
    path('api/db_resource/v1/get_mysql_cluster/', mysql_cluster_controller.get_mysql_cluster_controller),  # 获取mysql集群信息
    path('api/db_resource/v1/get_mysql_cluster_ins/', mysql_cluster_controller.get_mysql_cluster_ins_controller),  # 获取mysql集群实例信息
    path('api/db_resource/v1/get_mysql_instance_info/', mysql_instance_controller.get_mysql_instance_info_handler),  # 获取所有mysql实例

    # 数据库集群资源申请工单
    path('api/v1/service/ticket/ansible_adhoc/', ansible_adhoc.adhoc),  # ansible api执行命令
    path('api/v1/submit_deploy_mysql/', deploy_mysql_controller.submit_install_mysql_controller),  # 提交部署mysql工单
    path('api/v1/get_deploy_mysql_submit_info/', deploy_mysql_controller.get_deploy_mysql_submit_info_controller), # 获取所有部署mysql工单信息
    path('api/v1/service/ticket/get_deploy_mysql_info_by_uuid/', deploy_mysql_controller.get_deploy_mysql_info_by_uuid_controller), # 获取部署mysql工单详情
    path('api/v1/service/ticket/deploy_mysql_by_uuid/', deploy_mysql_controller.deploy_mysql_by_uuid_controller), # 执行部署mysql任务
    path('api/v1/service/ticket/get_ansible_api_log/', deploy_mysql_controller.get_ansible_api_log_controller), # 获取部署日志
    path('api/v1/pass_submit_deploy_mysql/', deploy_mysql_controller.pass_submit_deploy_mysql_controller),  # 审核部署mysql工单
    path('api/v1/service/ticket/get_work_flow_by_uuid/', deploy_mysql_controller.get_work_flow_by_uuid_controller),  # 获取工单流转记录

    # 用户管理
    path('api/permission/', include("app_permission.urls")),
    # SQL变更服务
    path('api/audit_sql/', include("app_audit_sql.urls")),
    # db_dcl权限申请服务
    path('api/db_dcl/', include("app_db_dcl.urls")),
    # web_console数据查询服务
    path('api/web_console/', include("app_web_console.urls")),
    ]


