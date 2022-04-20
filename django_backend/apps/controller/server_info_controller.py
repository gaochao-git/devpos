#!/usr/bin/env python
# -*- coding: utf-8 -*-

from apps.utils.base_view import BaseView
from django.utils.decorators import method_decorator
from apps.dao import server_info_dao
import logging
logger = logging.getLogger('devops')


class GetServerInfoController(BaseView):
    def get(self, request):
        """
        获取主机信息
        :param request:
        :return:
        """
        search_server_name = self.request_params.get("search_server_name")  # None或者str
        if search_server_name == "": search_server_name = None
        ret = server_info_dao.get_server_info_dao(search_server_name)
        return self.my_response(ret)
