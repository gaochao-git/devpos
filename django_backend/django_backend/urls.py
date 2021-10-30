from django.contrib import admin
from django.urls import path
from apps.controller import mysql_cluster_controller
from apps.controller import mysql_instance_controller
from apps.controller import audit_sql_controller
from apps.controller import create_common_user
from apps.controller import migrate_common_user
from apps.controller import create_private_user
from apps.controller import create_private_user_controller
from apps.controller import server_info_controller
from apps.controller import login_controller
from apps.controller import web_console_controller
from apps.controller import deploy_mysql_controller
from apps.ansible_task.adhoc import ansible_adhoc

from rest_framework.authtoken import views as drf_views


urlpatterns = [
    path('admin/', admin.site.urls), # django后台登陆
    path('api/auth/', drf_views.obtain_auth_token),       # 登录--获取用户的token
    path('api/get_login_user_name_by_token/', login_controller.get_login_user_name_by_token_handler), # 登录--根据token获得登录用户名

    # sql审核begin
    path('api/v1/service/ticket/audit_sql/get_submit_sql_info/', audit_sql_controller.get_submit_sql_info_controller), # 页面获取所有工单列表
    path('api/get_apply_sql_by_uuid/', audit_sql_controller.get_apply_sql_by_uuid_controller), # 查看指定提交工单的详情
    path('api/get_submit_sql_by_uuid/', audit_sql_controller.get_submit_sql_by_uuid_controller), # 页面预览指定工单提交的SQL
    path('api/get_submit_split_sql_by_file_path/', audit_sql_controller.get_submit_split_sql_by_file_path_controller), # 获取指定拆分SQL
    path('api/get_check_sql_results_by_uuid/', audit_sql_controller.get_check_sql_results_by_uuid_controller), # 获取SQL检查结果
    path('api/get_execute_results_by_split_sql_file_path/', audit_sql_controller.get_execute_results_by_split_sql_file_path_controller),   # 根据拆分SQL文件获取SQL执行结果
    path('api/execute_submit_sql_by_file_path/', audit_sql_controller.execute_submit_sql_by_file_path_controller), # 平台执行SQL工单
    path('api/execute_submit_sql_by_file_path_manual/', audit_sql_controller.execute_submit_sql_by_file_path_manual_controller),   # 手动执行SQL工单
    path('api/get_execute_process_by_uuid/', audit_sql_controller.get_execute_process_by_uuid_controller), # 获取SQL执行进度
    path('api/get_split_sql_by_uuid/', audit_sql_controller.get_split_sql_by_uuid_controller), # 获取拆分SQL子文件路径等信息前端展示
    path('api/get_inception_variable_config_info/', audit_sql_controller.get_inception_variable_config_info_controller), # 获取osc参数
    path('api/update_inception_variable/', audit_sql_controller.update_inception_variable_controller), # 更新 osc参数
    path('api/v1/service/ticket/audit_sql/check_sql/', audit_sql_controller.check_sql_controller),   # 检测sql
    path('api/submit_sql/', audit_sql_controller.submit_sql_controller), # 提交SQL
    path('api/pass_submit_sql_by_uuid/', audit_sql_controller.pass_submit_sql_by_uuid_controller), # 审核SQL
    path('api/get_master_ip/', audit_sql_controller.get_master_ip_controller), # sql审核--获取主库ip
    path('api/get_cluster_name/', audit_sql_controller.get_cluster_name_controller), # sql审核--根据cluster_name输入框自动补全
    path('api/recreate_sql/', audit_sql_controller.recreate_sql_controller),  # 根据拆分SQL文件获取SQL执行结果
    path('api/create_block_sql/', audit_sql_controller.create_block_sql_controller),  # 生成用id切割的SQL用来删除或者更新数据,防止大事物

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
    path('api/get_mysql_instance_info/', mysql_instance_controller.get_mysql_instance_info_handler),                       # 获取mysql实例
    path('api/get_search_mysql_instance_info/', mysql_instance_controller.get_search_mysql_instance_info_handler),         # 根据搜索框获取mysql实例

    # 服务器资源
    path('api/v1/service/server/get_server_info/', server_info_controller.get_server_info_controller, kwargs={"access": "all"}), # server--查看主机信息
    # mysql资源
    path('api/get_mysql_cluster_info/', mysql_cluster_controller.get_mysql_cluster_controller), # 查看所有mysql集群信息
    path('api/get_search_mysql_cluster_info/', mysql_cluster_controller.get_mysql_cluster_by_cluster_name_controller),        # 根据集群名搜索集群信息

    # web_console
    path('api/v1/service/console/get_table_data/', web_console_controller.get_table_data_controller),

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


