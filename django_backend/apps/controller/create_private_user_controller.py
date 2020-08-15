# coding=utf-8

from django.shortcuts import render
from django.http import HttpResponse
import json
from django.db import connection
import pymysql
import uuid

from django.http import HttpResponse
import json
from apps.service import privilege_apply

# 获取所有权限申请工单信息
def get_application_form_info_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    search_applicant = request_body['params']['search_applicant']
    ret = privilege_apply.get_application_form(search_applicant)
    print(111)
    print(ret)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')