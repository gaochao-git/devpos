from django.urls import path
from db_dcl.controller import db_dcl_controller


urlpatterns = [
    path('api/get_application_form_info/', db_dcl_controller.get_application_form_info_controller),
]


