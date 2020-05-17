#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from django.http import HttpResponse
import json
import logging
from apps.service import mysql_cluster

logger = logging.getLogger('devops')


# 获取所有集群信息
def get_mysql_cluster_controller(request):
    ret = mysql_cluster.get_mysql_cluster()
    return HttpResponse(json.dumps(ret), content_type='application/json')


# 模糊搜索集群名信息
def get_mysql_cluster_by_cluster_name_controller(request):
    to_str = str(request.body, encoding="utf-8")
    cluster_name = json.loads(to_str)['cluster_name']
    ret = mysql_cluster.get_mysql_cluster_by_cluster_name(cluster_name)
    return HttpResponse(json.dumps(ret), content_type='application/json')