from django.urls import path
from db_dcl.controller import db_dcl_controller
from apps.utils import common


urlpatterns = [
    path('api/get_application_form_info/', db_dcl_controller.get_application_form_info_controller),
    # 权限申请--查看已有账号信息
    path('api/privileges_extend_info/', db_dcl_controller.privileges_extend_info_func),  # 权限申请--权限扩展
    path('api/get_order_info/', db_dcl_controller.get_order_info_func),  # 权限申请--查看工单信息
    path('api/privileges_create_user_info/', db_dcl_controller.privileges_create_user_info_func),  # 权限申请--新建用户工单提交
    path('api/privileges_original_info/', db_dcl_controller.privileges_original_info_func),  # 权限申请--查看用户原始权限信息
    path('api/check_order/', db_dcl_controller.check_order_func),  # 权限申请--审核工单
    path('api/execute_order/', db_dcl_controller.execute_order_func),  # 权限申请--执行工单
    path('api/privilege_view_user/', db_dcl_controller.privilege_view_user_func),
]


