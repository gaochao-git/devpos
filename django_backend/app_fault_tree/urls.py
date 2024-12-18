# app_fault_tree/urls.py
from django.urls import path
from .views import (
    CreateFaultTreeConfig,
    UpdateFaultTreeConfig,
    DeleteFaultTreeConfig,
    GetFaultTreeConfigList,
    GetFaultTreeConfigDetail,
    ActivateFaultTreeConfig,
    GetFaultTreeHistoryList,
    GetFaultTreeHistoryDetail,
    RollbackFaultTreeConfig,
    DeleteFaultTreeHistory,
    GetFaultTreeData,
    GetFaultTreeStreamData,
    AnalyzeRootCause,
    GetMetricHistory
)

urlpatterns = [
    # 故障树配置相关接口
    path('v1/create_config/', CreateFaultTreeConfig.as_view()),      # 创建故障树配置
    path('v1/update_config/', UpdateFaultTreeConfig.as_view()),      # 更新故障树配置
    path('v1/delete_config/', DeleteFaultTreeConfig.as_view()),      # 删除故障树配置
    path('v1/get_config_list/', GetFaultTreeConfigList.as_view()),   # 获取故障树配置列表
    path('v1/get_config_detail/', GetFaultTreeConfigDetail.as_view()), # 获取故障树配置详情
    path('v1/activate_config/', ActivateFaultTreeConfig.as_view()),   # 激活故障树配置

    # 故障树历史版本相关接口
    path('v1/get_history_list/', GetFaultTreeHistoryList.as_view()),    # 获取历史版本列表
    path('v1/get_history_detail/', GetFaultTreeHistoryDetail.as_view()), # 获取历史版本详情
    path('v1/rollback_config/', RollbackFaultTreeConfig.as_view()),      # 回滚到历史版本
    path('v1/delete_history/', DeleteFaultTreeHistory.as_view()),        # 删除历史版本

    # 获取故障树渲染数据
    path('v1/get_fault_tree_data/', GetFaultTreeData.as_view()),        # 获取故障树数据
    path('v1/get_fault_tree_stream_data/', GetFaultTreeStreamData.as_view()),        # 流式获取故障树数据
    path('v1/analyze_root_cause/', AnalyzeRootCause.as_view()),         # 根因分析
    path('v1/get_metric_history/', GetMetricHistory.as_view()),             # 获取某个指标历史数据

]