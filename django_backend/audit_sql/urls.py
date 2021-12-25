from django.urls import path
from audit_sql.controller import audit_sql_controller
from apps.utils import common


urlpatterns = [
    path('v1/get_submit_sql_info/', audit_sql_controller.GetSqlSubmitSqlInfoCrotroller.as_view()), # 页面获取所有工单列表
    path('v1/get_apply_sql/', audit_sql_controller.GetApplySqlByUuidController.as_view()), # 查看指定提交工单的详情
    path('v1/get_view_sql_by_uuid/', audit_sql_controller.GetViewSqlByUuidController.as_view()), # 页面预览指定工单提交的SQL
    path('v1/get_submit_split_sql_by_file_path/', audit_sql_controller.get_submit_split_sql_by_file_path_controller), # 获取指定拆分SQL
    path('v1/get_check_sql_results/', audit_sql_controller.get_check_sql_results_controller), # 获取SQL检查结果
    path('v1/get_execute_results/', audit_sql_controller.get_execute_results_controller),  # 根据拆分SQL文件获取SQL执行结果
    path('v1/execute_submit_sql_by_file_path/', audit_sql_controller.execute_submit_sql_by_file_path_controller), # 平台执行SQL工单
    path('v1/execute_submit_sql_by_file_path_manual/', audit_sql_controller.execute_submit_sql_by_file_path_manual_controller),   # 手动执行SQL工单
    path('v1/get_execute_process_by_uuid/', audit_sql_controller.get_execute_process_by_uuid_controller), # 获取SQL执行进度
    path('v1/get_split_sql/', audit_sql_controller.get_split_sql_controller), # 获取拆分SQL子文件路径等信息前端展示
    path('v1/get_inception_variable_config_info/', audit_sql_controller.get_inception_variable_config_info_controller), # 获取osc参数
    path('v1/update_inception_variable/', audit_sql_controller.update_inception_variable_controller), # 更新 osc参数
    path('v1/check_sql/', audit_sql_controller.CheckSqlController.as_view()),   # 检测sql
    path('v1/submit_sql/', audit_sql_controller.submit_sql_controller), # 提交SQL
    path('v1/submit_recheck_sql/', audit_sql_controller.submit_recheck_sql_controller), # 重新提交SQL
    path('v1/pass_submit_sql_by_uuid/', audit_sql_controller.pass_submit_sql_by_uuid_controller), # 审核SQL
    path('v1/get_master_ip/', audit_sql_controller.GetMasterIpController.as_view()), # sql审核--获取主库ip
    path('v1/get_cluster_name/', audit_sql_controller.GetClusterNameCrotroller.as_view()), # sql审核--根据cluster_name输入框自动补全
    path('v1/recreate_sql/', audit_sql_controller.recreate_sql_controller),  # 根据拆分SQL文件获取SQL执行结果
    path('v1/create_block_sql/', audit_sql_controller.create_block_sql_controller),  # 生成用id切割的SQL用来删除或者更新数据,防止大事物
    path('v1/get_celery_task_status/', common.get_celery_task_status),  # 获取审核状态
    path('v1/get_pre_check_result/', audit_sql_controller.GetPreCheckResultCrotroller.as_view()),  # 生成用id切割的SQL用来删除或者更新数据,防止大事物
    ]


