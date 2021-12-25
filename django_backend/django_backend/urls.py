from django.contrib import admin
from django.urls import path, include
from apps.controller import mysql_cluster_controller
from apps.controller import mysql_instance_controller
from audit_sql.controller import audit_sql_controller
from apps.controller import create_common_user
from apps.controller import migrate_common_user
from apps.controller import create_private_user
from apps.controller import create_private_user_controller
from apps.controller import server_info_controller
from apps.controller import web_console_controller
from apps.controller import deploy_mysql_controller
from apps.utils import common, auth
from apps.ansible_task.adhoc import ansible_adhoc

from rest_framework.authtoken import views as drf_views
from rest_framework_jwt.views import obtain_jwt_token,refresh_jwt_token


urlpatterns = [
    path('admin/', admin.site.urls), # django后台登陆
    path('api/v1/auth/', drf_views.obtain_auth_token),       # token登录v1版本,不带过期
    path('api/v2/auth/', obtain_jwt_token),                  # token登陆v2版本,带过期
    path('api/v2/auth_refresh/', refresh_jwt_token),         # token登陆v2版本,刷新token,必须在access_token过期前前端定时调用更新token,不然会刷新失败
    path('api/get_login_user_info/', auth.get_login_user_info_controller), # 登录--根据token获得登录用户名
    path('api/v2/v2_get_login_user_info/', auth.v2_get_login_user_info_controller), # 登录--根据token获得登录用户名
    # SQL变更服务
    path('api/audit_sql/', include("audit_sql.urls")),

    # 数据库公共账号管理
    path('api/get_user_info/', create_common_user.get_user_info_func),                                       # 公共账号管理--查看已有账号信息
    path('api/grant_user_info/', create_common_user.create_and_grant_func),                                  # 公共账号管理--创建用户申请权限
    path('api/migrate_common_user/', migrate_common_user.migrate_common_user_func),                          # 公共账号管理--同步公共账号

    # 权限申请
    path('api/get_application_form_info/', create_private_user_controller.get_application_form_info_controller),  # 权限申请--查看已有账号信息
    path('api/privileges_extend_info/', create_private_user.privileges_extend_info_func),                    # 权限申请--权限扩展
    path('api/get_order_info/', create_private_user.get_order_info_func),                                    # 权限申请--查看工单信息
    path('api/privileges_create_user_info/', create_private_user.privileges_create_user_info_func),          # 权限申请--新建用户工单提交
    path('api/privileges_original_info/', create_private_user.privileges_original_info_func),                # 权限申请--查看用户原始权限信息
    path('api/check_order/', create_private_user.check_order_func),                                          # 权限申请--审核工单
    path('api/execute_order/', create_private_user.execute_order_func),                                      # 权限申请--执行工单
    path('api/privilege_view_user/', create_private_user.privilege_view_user_func),                          # 权限申请--查看用户已有权限

    # 服务器资源
    path('api/v1/service/server/get_server_info/', server_info_controller.get_server_info_controller), # server--查看主机信息
    # mysql资源
    path('api/get_mysql_cluster/', mysql_cluster_controller.get_mysql_cluster_controller),  # 获取mysql集群信息
    path('api/get_mysql_cluster_ins/', mysql_cluster_controller.get_mysql_cluster_ins_controller),  # 获取mysql集群实例信息
    path('api/get_search_mysql_cluster_info/', mysql_cluster_controller.get_mysql_cluster_by_cluster_name_controller),  # 根据集群名搜索集群信息
    path('api/get_mysql_instance_info/', mysql_instance_controller.get_mysql_instance_info_handler),  # 获取所有mysql实例
    path('api/get_search_mysql_instance_info/', mysql_instance_controller.get_search_mysql_instance_info_handler), # 根据搜索框获取mysql实例

    # web_console
    path('api/v1/service/console/get_db_connect/', web_console_controller.get_db_connect_controller),
    path('api/v1/service/console/get_table_data/', web_console_controller.get_table_data_controller),
    path('api/v1/service/console/get_schema_list/', web_console_controller.get_schema_list_controller),
    path('api/v1/service/console/get_table_list/', web_console_controller.get_table_list_controller),
    path('api/v1/service/console/get_column_list/', web_console_controller.get_column_list_controller),

    # 数据库集群资源申请工单
    path('api/v1/service/ticket/ansible_adhoc/', ansible_adhoc.adhoc),  # ansible api执行命令
    path('api/v1/service/ticket/submit_deploy_mysql/', deploy_mysql_controller.submit_install_mysql_controller),  # 提交部署mysql工单
    path('api/v1/service/ticket/get_deploy_mysql_submit_info/', deploy_mysql_controller.get_deploy_mysql_submit_info_controller), # 获取所有部署mysql工单信息
    path('api/v1/service/ticket/get_deploy_mysql_info_by_uuid/', deploy_mysql_controller.get_deploy_mysql_info_by_uuid_controller), # 获取部署mysql工单详情
    path('api/v1/service/ticket/deploy_mysql_by_uuid/', deploy_mysql_controller.deploy_mysql_by_uuid_controller), # 执行部署mysql任务
    path('api/v1/service/ticket/get_ansible_api_log/', deploy_mysql_controller.get_ansible_api_log_controller), # 获取部署日志
    path('api/v1/service/ticket/pass_submit_deploy_mysql_by_uuid/', deploy_mysql_controller.pass_submit_deploy_mysql_by_uuid_controller),  # 审核部署mysql工单
    path('api/v1/service/ticket/get_work_flow_by_uuid/', deploy_mysql_controller.get_work_flow_by_uuid_controller),  # 获取工单流转记录
    ]


