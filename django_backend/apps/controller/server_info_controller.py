#!/usr/bin/env python
# -*- coding: utf-8 -*-

from django.http import HttpResponse
import json
from apps.service import server_info
import logging
logger = logging.getLogger('devops')
from rest_framework.decorators import api_view
from apps.utils.common import CheckValidators


@api_view(http_method_names=['get'])
def get_server_info_controller(request):
    """
    获取主机信息
    :param request:
    :return:
    """
    try:
        search_server_name = request.GET.get("search_server_name")      # None或者str
        ret = server_info.get_server_info(search_server_name)
    except KeyError as e:
        logger.exception(e)
        ret = {"status": "error", "message": "参数不符合"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')