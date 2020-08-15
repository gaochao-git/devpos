#!/usr/bin/env python
# -*- coding: utf-8 -*-


from django.http import HttpResponse
import json
from apps.service import server_info

# 获取所有云主机信息
def get_server_info_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    search_server_name = request_body['params']['search_server_name']
    ret = server_info.get_server_info(search_server_name)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')