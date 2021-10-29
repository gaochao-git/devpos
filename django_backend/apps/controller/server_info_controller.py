#!/usr/bin/env python
# -*- coding: utf-8 -*-

from django.http import HttpResponse
import json
from apps.service import server_info
from apps.utils.auth import permission_required
import logging
logger = logging.getLogger('devops')


@permission_required
def get_server_info_controller(request):
    """
    获取主机信息
    .get('param_name')方式该参数为选填
    ['param_name']方式参数为必添
    :param request:
    :return:
    """
    try:
        request_body = json.loads(str(request.body, encoding="utf-8"))
        search_server_name = request_body.get("search_server_name")      # None或者str
        ret = server_info.get_server_info(search_server_name)
    except KeyError as e:
        logger.exception(e)
        ret = {"status": "error", "message": "参数不符合"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')