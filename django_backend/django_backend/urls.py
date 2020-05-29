from django.contrib import admin
from django.urls import path
from apps.controller import mysql_cluster_controller
from apps.controller import mysql_instance_controller
from apps.controller import audit_sql_controller
from apps.controller import create_common_user
from apps.controller import migrate_common_user
from apps.controller import create_private_user
from apps.controller import cloud_instance
from apps.controller import login_controller
import datetime
from rest_framework.authtoken import views as drf_views

JWT_AUTH = {
    'JWT_EXPIRATION_DELTA': datetime.timedelta(days=7),
    'JWT_AUTH_HEADER_PREFIX': 'JWT',
}


urlpatterns = [
    path('admin/', admin.site.urls),                                                                          # django后台登陆
    path('get_mysql_cluster_info/', mysql_cluster_controller.get_mysql_cluster_controller),                               # 查看所有mysql集群信息
    path('get_search_mysql_cluster_info/', mysql_cluster_controller.get_mysql_cluster_by_cluster_name_controller),        # 根据集群名搜索集群信息

    # sql审核begin
    path('get_submit_sql_info/', audit_sql_controller.get_submit_sql_info_controller),                                         # 页面获取所有工单列表
    path('get_apply_sql_by_uuid/', audit_sql_controller.get_apply_sql_by_uuid_controller),                                     # 查看指定提交工单的详情
    path('get_submit_sql_by_uuid/', audit_sql_controller.get_submit_sql_by_uuid_controller),                                   # 页面预览指定工单提交的SQL
    path('get_submit_split_sql_by_file_path/', audit_sql_controller.get_submit_split_sql_by_file_path_controller),             # 获取指定拆分SQL
    path('get_check_sql_results_by_uuid/', audit_sql_controller.get_check_sql_results_by_uuid_controller),                     # 获取SQL检查结果
    path('get_execute_results_by_split_sql_file_path/', audit_sql_controller.get_execute_results_by_split_sql_file_path_controller),   # 根据拆分SQL文件获取SQL执行结果
    path('execute_submit_sql_by_file_path/', audit_sql_controller.execute_submit_sql_by_file_path_controller),                 # 平台执行SQL工单
    path('execute_submit_sql_by_file_path_manual/', audit_sql_controller.execute_submit_sql_by_file_path_manual_controller),   # 手动执行SQL工单
    path('get_execute_process_by_uuid/', audit_sql_controller.get_execute_process_by_uuid_controller),                    # 获取SQL执行进度
    path('get_split_sql_by_uuid/', audit_sql_controller.get_split_sql_by_uuid_controller),                                # 获取拆分SQL子文件路径等信息前端展示
    path('get_inception_variable_config_info/', audit_sql_controller.get_inception_variable_config_info_controller),      # 获取osc参数
    path('update_inception_variable/', audit_sql_controller.update_inception_variable_controller),                        # 更新 osc参数
    path('check_sql/', audit_sql_controller.check_sql_controller),                                                        # 检测sql
    path('submit_sql/', audit_sql_controller.submit_sql_controller),                                                      # 提交SQL
    path('pass_submit_sql_by_uuid/', audit_sql_controller.pass_submit_sql_by_uuid_controller),                            # 审核SQL
    path('get_master_ip/', audit_sql_controller.get_master_ip_controller),                                                # sql审核--获取主库ip
    path('get_cluster_name/', audit_sql_controller.get_cluster_name_controller),                                          # sql审核--根据cluster_name输入框自动补全
    path('recreate_sql/', audit_sql_controller.recreate_sql_controller),  # 根据拆分SQL文件获取SQL执行结果
    path('create_block_sql/', audit_sql_controller.create_block_sql_controller),  # 生成用id切割的SQL用来删除或者更新数据,防止大事物
    # sql审核end

    path('get_cloud_info/', cloud_instance.get_cloud_instance_func),                                     # server--查看主机信息
    path('get_user_info/', create_common_user.get_user_info_func),                                       # 公共账号管理--查看已有账号信息
    path('grant_user_info/', create_common_user.create_and_grant_func),                                  # 公共账号管理--创建用户申请权限
    path('migrate_common_user/', migrate_common_user.migrate_common_user_func),                          # 公共账号管理--同步公共账号
    path('get_private_user_info/', create_private_user.get_private_user_info_func),                      # 权限申请--查看已有账号信息
    path('privileges_extend_info/', create_private_user.privileges_extend_info_func),                    # 权限申请--权限扩展
    path('get_order_info/', create_private_user.get_order_info_func),                                    # 权限申请--查看工单信息
    path('privileges_create_user_info/', create_private_user.privileges_create_user_info_func),          # 权限申请--新建用户工单提交
    path('privileges_original_info/', create_private_user.privileges_original_info_func),                # 权限申请--查看用户原始权限信息
    path('check_order/', create_private_user.check_order_func),                                          # 权限申请--审核工单
    path('execute_order/', create_private_user.execute_order_func),                                      # 权限申请--执行工单
    path('auth/', drf_views.obtain_auth_token),                                                          # 登录--获取用户的token
    path('get_login_user_name_by_token/', login_controller.get_login_user_name_by_token_handler),                      # 登录--根据token获得登录用户名
    path('privilege_view_user/', create_private_user.privilege_view_user_func),                          # 权限申请--查看用户已有权限
    path('get_mysql_instance_info/', mysql_instance_controller.get_mysql_instance_info_handler),                       # 获取mysql实例
    path('get_search_mysql_instance_info/', mysql_instance_controller.get_search_mysql_instance_info_handler),         # 根据搜索框获取mysql实例
    ]

