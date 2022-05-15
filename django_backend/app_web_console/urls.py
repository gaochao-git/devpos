from django.urls import path
from app_web_console.controller import web_console_controller
from django_backend.urls import RouterAccess

urlpatterns = [
    path('v1/get_db_connect/', web_console_controller.get_db_connect_controller),
    path('v1/get_schema_list/', web_console_controller.get_schema_list_controller),
    path('v1/get_table_list/', web_console_controller.get_table_list_controller),
    path('v1/get_column_list/', web_console_controller.get_column_list_controller),
    path('v1/get_table_data/', web_console_controller.GetaTableDataController.as_view(),kwargs={"access": RouterAccess.dba}),
    path('v1/get_favorite/', web_console_controller.GetFavoriteController.as_view(),kwargs={"access": RouterAccess.dba}),
    path('v1/get_db_info/', web_console_controller.GetDbInfoController.as_view(),kwargs={"access": RouterAccess.dba}),
]

