# coding=utf-8

from django.http import HttpResponse
import json
from app_db_dcl.service import db_dcl

# 获取所有权限申请工单信息
def get_application_form_info_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    search_applicant = request_body['params']['search_applicant']
    ret = db_dcl.get_application_form(search_applicant)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')