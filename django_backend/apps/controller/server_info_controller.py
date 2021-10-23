#!/usr/bin/env python
# -*- coding: utf-8 -*-

from django.http import HttpResponse
import json
from apps.service import server_info
from apps.service import login
import logging
logger = logging.getLogger('devops')


@login.auth
def get_server_info_controller(request):
    """
    获取主机信息
    :param request:
    :return:
    """
    try:
        to_str = str(request.body, encoding="utf-8")
        request_body = json.loads(to_str)
        search_server_name = request_body["params"]["search_server_name"]
        ret = server_info.get_server_info(search_server_name)
    except KeyError as e:
        logger.exception(e)
        ret = {"status": "error", "message": "参数不符合"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')