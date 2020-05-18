#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
from apps.dao import mysql_cluster_dao

logger = logging.getLogger('devops')

# 获取所有集群信息
def get_mysql_cluster():
    data = []
    try:
        data = mysql_cluster_dao.get_mysql_cluster_dao()
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message,'data': data}
        return content


# 模糊搜索集群名信息
def get_mysql_cluster_by_cluster_name(cluster_name):
    data = []
    try:
        data = mysql_cluster_dao.get_mysql_cluster_by_cluster_name_dao(cluster_name)
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.error(e)
    finally:
        content = {'status': status, 'message': message, 'data': data}
        return content
