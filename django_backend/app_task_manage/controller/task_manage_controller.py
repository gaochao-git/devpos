#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超


from app_task_manage.service import task_manage
from app_task_manage.dao import task_manage_dao
from apps.utils.base_view import BaseView
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
from celery import current_app
from djcelery import models as celery_models  # TaskState, WorkerState,PeriodicTask, IntervalSchedule, CrontabSchedule
import json
import datetime

import logging
logger = logging.getLogger('devops')


class GetTaskInfoController(BaseView):
    def get(self, request):
        """
        获取所有任务
        :param request:
        :return:
        """
        ret = task_manage_dao.get_task_info_dao()
        return self.my_response(ret)


class GetTaskRegisterController(BaseView):
    def get(self, request):
        """
        获取所已注册任务
        :param request:
        :return:
        """
        all_task_names = current_app.tasks.keys()
        ret = {"status":"ok","message":"获取注册任务成功","data":list(all_task_names)}
        return self.my_response(ret)


class AddTaskController(BaseView):
    def __init__(self):
        self.task_type = None
        self.task_name = None
        self.task = None
        self.task_args = None
        self.task_schedule = None
        self.task_enable = None
        self.task_queue = None
        self.task_routing_key = None
        self.task_exchange = None

    def post(self, request):
        """
        添加任务
        :param request:
        :return:
        """
        request_body = self.request_params
        self.task_type = request_body.get('task_type')
        self.task_name = request_body.get('task_name')
        self.task = request_body.get('task')
        self.task_args = request_body.get('task_args')
        self.task_schedule = request_body.get('task_schedule')
        self.task_enable = request_body.get('task_enable')
        self.task_queue = request_body.get('task_queue')
        self.task_routing_key = request_body.get('task_routing_key')
        self.task_exchange = request_body.get('task_exchange')
        if self.task_type == "crontab":
            self.create_cron_task()
        else:
            self.create_interval_task()

    def create_cron_task(self):
        """
        创建指定时间执行的任务
        :return:
        """
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

    def create_interval_task(self):
        """
        创建周期性任务
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
            name='test_task_1',  # 设置任务的name值
            task='apps.celery_task.tasks.sendmail',  # 指定需要周期性执行的任务
            args=json.dumps(params),    # list or tuple
            # kwargs=json.dumps(params),
            queue='default',
            routing_key='default',
            expires=datetime.datetime.now() + datetime.timedelta(seconds=30)
        )