from django.urls import path
from web_console.controller import web_console_controller

urlpatterns = [
    path('v1/get_db_connect/', web_console_controller.get_db_connect_controller),
    path('v1/get_table_data/', web_console_controller.get_table_data_controller),
    path('v1/get_schema_list/', web_console_controller.get_schema_list_controller),
    path('v1/get_table_list/', web_console_controller.get_table_list_controller),
    path('v1/get_column_list/', web_console_controller.get_column_list_controller),
]
