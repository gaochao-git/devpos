from django.urls import path
from app_permission.controller import permission_controller
from django_backend.urls import RouterAccess

urlpatterns = [
    path('v1/get_user_role_info/', permission_controller.GetRoleInfoController.as_view(), kwargs={"access": RouterAccess.dba}),
    path('v1/del_role_name/', permission_controller.DelRoleNameController.as_view(), kwargs={"access": RouterAccess.dba}),
    path('v1/add_role_name/', permission_controller.AddRoleNameController.as_view(), kwargs={"access": RouterAccess.dba}),
]