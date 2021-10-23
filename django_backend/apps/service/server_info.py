#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超


from apps.dao import server_info_dao
import logging
logger = logging.getLogger('devops')


def get_server_info(search_server_name):
    """
    页面获取所有云主机信息
    :param search_server_name:
    :return:
    """
    data = []
    try:
        data = server_info_dao.get_server_info_dao(search_server_name)
        status = "ok"
        message = "ok"
        logger.info("获取所有工单成功")
    except Exception as e:
        status = "error"
        message = e
        logger.error("获取所有工单失败%s", str(e))
    finally:
        content = {'status': status, 'message': message, 'data': data}
        return content