from django.urls import path
from app_task_manage.controller import task_manage_controller
from django_backend.urls import RouterAccess

urlpatterns = [
    path('v1/get_task_info/', task_manage_controller.GetTaskInfoController.as_view(), kwargs={"access": RouterAccess.dba}),
    path('v1/get_register_task/', task_manage_controller.GetTaskRegisterController.as_view(), kwargs={"access": RouterAccess.dba}),
    path('v1/get_task_log/', task_manage_controller.GetTaskLogController.as_view(), kwargs={"access": RouterAccess.dba}),
]
