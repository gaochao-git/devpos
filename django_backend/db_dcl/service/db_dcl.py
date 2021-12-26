#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超


from db_dcl.dao import db_dcl_dao
import logging
logger = logging.getLogger('devops')

# 获取用户工单信息
def get_application_form(search_applicant):
    data = []
    try:
        data = db_dcl_dao.get_application_from_info_dao(search_applicant)
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

