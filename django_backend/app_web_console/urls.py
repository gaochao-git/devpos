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
    path('v1/get_table_frm/', web_console_controller.GetTableFrmController.as_view(),kwargs={"access": RouterAccess.dba}), # 获取表结构
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
    path('v1/get_all_table_names_and_comments/', web_console_controller.GetAllTableNamesAndComments.as_view(),kwargs={"access": RouterAccess.all}),
    path('v1/get_table_structures/', web_console_controller.GetTableStructures.as_view(),kwargs={"access": RouterAccess.all}),  # 获取表结构，多表拼接表结构

    # 数据集管理
    path('v1/get_datasets/', web_console_controller.GetDatasetsController.as_view(),kwargs={"access": RouterAccess.all}),  # 获取数据集列表
    path('v1/create_dataset/', web_console_controller.CreateDatasetController.as_view(),kwargs={"access": RouterAccess.all}),  # 创建数据集
    path('v1/update_dataset/', web_console_controller.UpdateDatasetController.as_view(),kwargs={"access": RouterAccess.all}),  # 更新数据集
    path('v1/delete_dataset/', web_console_controller.DeleteDatasetController.as_view(),kwargs={"access": RouterAccess.all}),  # 删除数据集
]