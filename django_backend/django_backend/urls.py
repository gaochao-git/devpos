from django.contrib import admin
from django.urls import path
from apps import views
from apps import inception

urlpatterns = [
    path('admin/', admin.site.urls),
    path('get_cluster_info/', views.get_cluster_info_func),
    path('get_search_cluster_info/', views.get_search_cluster_info_func),
    path('get_submit_sql_info/', inception.get_submit_sql_info_func),
    path('get_apply_sql_by_uuid/', inception.get_apply_sql_by_uuid_func),
    path('get_submit_sql_by_uuid/', inception.get_submit_sql_by_uuid_func),
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
]

