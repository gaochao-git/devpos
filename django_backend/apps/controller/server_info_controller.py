#!/usr/bin/env python
# -*- coding: utf-8 -*-

from apps.utils.base_view import BaseView
from django.utils.decorators import method_decorator
from apps.dao import server_info_dao

import logging
logger = logging.getLogger('devops')
from djcelery import models as celery_models  # TaskState, WorkerState,PeriodicTask, IntervalSchedule, CrontabSchedule
import json
import datetime



# 创建指定时间执行的任务
def create_cron_task():
    name = "test"
    task = "myapp.tasks.add"
    task_args = {"x":1, "Y":1}
    crontab_time = {"month_of_year": "9" ,"day_of_month": "5","hour": "01","minute":"05"}
    # task任务， created是否定时创建
    task, created = celery_models.PeriodicTask.objects.get_or_create(name=name, task=task)
    # 获取 crontab
    crontab = celery_models.CrontabSchedule.objects.filter(**crontab_time).first()
    if crontab is None:
        # 如果没有就创建，有的话就继续复用之前的crontab
        crontab = celery_models.CrontabSchedule.objects.create(**crontab_time)
    task.crontab = crontab  # 设置crontab
    task.enabled = True  # 开启task
    task.kwargs = json.dumps(task_args)  # 传入task参数
    # expiration = timezone.now() + datetime.timedelta(day=1)
    # task.expires = expiration # 设置任务过期时间为现在时间的一天以后
    task.save()

# 创建周期性任务
def create_interval_task():
    """
    PERIOD_CHOICES = (('days', _('Days')),
                  ('hours', _('Hours')),
                  ('minutes', _('Minutes')),
                  ('seconds', _('Seconds')),
                  ('microseconds', _('Microseconds')))
    :return:
    """
    schedule, created = celery_models.IntervalSchedule.objects.get_or_create(every=10, period='seconds', )
    params = [1234]
    #params = {"mail": "1234"}
    # 带参数的创建方法，如下：
    celery_models.PeriodicTask.objects.create(
        interval=schedule,  # 上面创建10秒的间隔 interval 对象
        name='test_task',  # 设置任务的name值
        task='apps.celery_task.tasks.sendmail',  # 指定需要周期性执行的任务
        args=json.dumps(params),    # list or tuple
        # kwargs=json.dumps(params),
        queue='default',
        routing_key='default'
        # expires=datetime.utcnow() + datetime.timedelta(seconds=30)
    )

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
