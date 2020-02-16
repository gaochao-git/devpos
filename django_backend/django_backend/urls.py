from django.contrib import admin
from django.urls import path
from apps.cluster import cluster
from apps.sql import inception
from apps.common import create_common_user
from apps.common import migrate_common_user
from apps.privilege import create_private_user
from apps.server import cloud_instance
from apps.login import login
from rest_framework_jwt.views import obtain_jwt_token
import datetime
from rest_framework.authtoken import views as drf_views
from django.conf.urls import url

JWT_AUTH = {
    'JWT_EXPIRATION_DELTA': datetime.timedelta(days=7),
    'JWT_AUTH_HEADER_PREFIX': 'JWT',
}


urlpatterns = [
    path('admin/', admin.site.urls),
    path('get_cluster_info/', cluster.get_cluster_info_func),
    path('get_search_cluster_info/', cluster.get_search_cluster_info_func),
    path('get_submit_sql_info/', inception.get_submit_sql_info_func),
    path('get_apply_sql_by_uuid/', inception.get_apply_sql_by_uuid_func),
    path('get_submit_sql_by_uuid/', inception.get_submit_sql_by_uuid_func),
    path('get_submit_split_sql_by_file_path/', inception.get_submit_split_sql_by_file_path_func),
    path('get_check_sql_results_by_uuid/', inception.get_check_sql_results_by_uuid_func),
    path('get_execute_submit_sql_results_by_uuid/', inception.get_execute_submit_sql_results_by_uuid_func),
    path('execute_submit_sql_by_uuid/', inception.execute_submit_sql_by_uuid_func),
    path('get_execute_process_by_uuid/', inception.get_execute_process_by_uuid_func),
    path('get_split_sql_by_uuid/', inception.get_split_sql_by_uuid_func),
    path('get_inception_variable_config_info/', inception.get_inception_variable_config_info_func),
    path('update_inception_variable/', inception.update_inception_variable_func),
    path('check_sql/', inception.check_sql_func),
    path('submit_sql/', inception.submit_sql_func),
    path('pass_submit_sql_by_uuid/', inception.pass_submit_sql_by_uuid_func),
    path('get_cloud_info/', cloud_instance.get_cloud_instance_func),                                     # 查看云主机信息
    path('get_user_info/', create_common_user.get_user_info_func),                                       # 公共账号管理
    path('grant_user_info/', create_common_user.create_and_grant_func),                                  # 创建用户申请权限
    path('migrate_common_user/', migrate_common_user.migrate_common_user_func),                          # 同步公共账号
    path('get_private_user_info/', create_private_user.get_private_user_info_func),                      # 查看私有账号信息
    path('privileges_extend_info/', create_private_user.privileges_extend_info_func),                    # 权限扩展
    path('get_order_info/', create_private_user.get_order_info_func),                                    # 查看工单信息
    path('privileges_create_user_info/', create_private_user.privileges_create_user_info_func),          # 新建用户工单提交
    path('privileges_original_info/', create_private_user.privileges_original_info_func),                # 查看用户原始权限信息
    path('check_order/', create_private_user.check_order_func),                                          # 审核工单
    path('execute_order/', create_private_user.execute_order_func),                                      # 执行工单
    path('login/', drf_views.obtain_auth_token),
    path('auth/', drf_views.obtain_auth_token),
    path('get_login_user_name_by_token/', login.get_login_user_name_by_token_func),
]

