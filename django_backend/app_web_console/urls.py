from django.urls import path
from app_web_console.controller import web_console_controller
from app_web_console.controller import meta_compare_controller
from django_backend.urls import RouterAccess

urlpatterns = [
    # cosole
    path('v1/get_db_connect/', web_console_controller.get_db_connect_controller),
    path('v1/get_db_info/', web_console_controller.GetDbInfoController.as_view(),kwargs={"access": RouterAccess.dba}),
    path('v1/get_schema_list/', web_console_controller.get_schema_list_controller),
    path('v1/get_table_list/', web_console_controller.get_table_list_controller),
    path('v1/get_column_list/', web_console_controller.get_column_list_controller),
    path('v1/get_table_data/', web_console_controller.GetTableDataController.as_view(),kwargs={"access": RouterAccess.dba}),
    path('v1/add_favorite/', web_console_controller.AddFavoriteController.as_view(),kwargs={"access": RouterAccess.dba}), # 添加收藏项
    path('v1/del_favorite/', web_console_controller.DelFavoriteController.as_view(),kwargs={"access": RouterAccess.dba}), # 删除收藏项
    path('v1/get_favorite/', web_console_controller.GetFavoriteController.as_view(),kwargs={"access": RouterAccess.dba}), # 获取收藏项
    # 表结构对比
    path('v1/meta_table_compare/', meta_compare_controller.CompareTableController.as_view(),kwargs={"access": RouterAccess.dba}),  # 批量对比
    path('v1/get_source_target_table_meta/', meta_compare_controller.GetSourceTargetTableMetaController.as_view(),kwargs={"access": RouterAccess.dba}),  # 获取源与目标表结构

    # 新建表/设计表
    path('v1/get_db_col/', web_console_controller.GetDbColController.as_view(),kwargs={"access": RouterAccess.all}),
    path('v1/check_generate_sql/', web_console_controller.CheckGenerateSqlController.as_view(),kwargs={"access": RouterAccess.all}),
    path('v1/save_design_table_snap_shot/', web_console_controller.SaveDesignTableSnapShotController.as_view(),kwargs={"access": RouterAccess.all}),  # 保存设计表信息
    path('v1/get_design_table_snap_shot/', web_console_controller.GetDesignTableSnapShotController.as_view(),kwargs={"access": RouterAccess.all}),  # 获取用户自身设计保存信息
    path('v1/get_target_table_info/', web_console_controller.GetTargetTableInfoController.as_view(),kwargs={"access": RouterAccess.all}),  # 获取用户自身设计保存信息


    # soar sql质量
    path('v1/get_sql_score/', web_console_controller.GetSqlScoreController.as_view(),kwargs={"access": RouterAccess.all}),

]