#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import logging
import uuid
from apps.dao import deploy_mysql_dao
from apps.celery_task.tasks import install_mysql


logger = logging.getLogger('devops')


def submit_install_mysql(topo_source, port, version):
    """
    提交部署mysql任务
    :param topo_source:
    :param port:
    :param version:
    :return:
    """
    uuid_str = str(uuid.uuid4())
    ret = deploy_mysql_dao.submit_install_mysql_dao(uuid_str, topo_source, port, version)
    if ret['status'] != "ok": return ret
    try:
        task_id = install_mysql.delay(topo_source, port, version)
        if task_id:
            print("推送celery成功:",task_id)
        else:
            print("推送celery失败")
    except Exception as e:
        logger.exception(e)