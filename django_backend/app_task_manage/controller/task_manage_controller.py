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
from app_task_manage.utils import celery_manage
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
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


class GetTaskLogController(BaseView):
    def get(self, request):
        """
        获取任务日志
        :param request:
        :return:
        """
        ret = task_manage_dao.get_task_log_dao()
        return self.my_response(ret)

class GetTasks(BaseView):
    def get(self, request):
        """
        获取任务日志
        :param request:
        :return:
        """
        ret = celery_manage.CeleryFlower.list_task()
        return self.my_response(ret)


class AddTaskController(BaseView):
    """
    任务加入后,beat会自动重载
    """
    def __init__(self):
        self.task_type = None
        self.task_name = None
        self.task = None
        self.task_desc = None
        self.task_args = None
        self.task_enable = None
        self.task_queue = None
        self.task_routing_key = None
        self.task_exchange = None
        self.task_rule = None
        self.args = []
        self.kwargs = {}


    def post(self, request):
        """
        添加任务
        :param request:
        :return:
        """
        request_body = self.request_params
        print(request_body)
        rules = {
            "task": [Required, Length(2, 100)],  # 任务
            "task_name": [Required, Length(2, 100)],  # 任务名
            "task_type": [Required, In(["Interval", "Crontab"])],  # 任务类型
            "task_rule": [Required, Length(2, 100)],  # 任务触发规则
            "task_args": [Required],  # 任务参数
            "is_enable": [Required, In([0, 1])],  # 是否开启任务
            "task_desc":[Required, Length(2, 100)],  # 描述
            "task_queue": [Required, Length(2, 100)],  # 是否开启任务
            "task_routing": [Required, Length(2, 100)],  # 是否开启任务
            "task_exchange": [Required, Length(2, 100)],  # 任务类型
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        self.task = request_body.get('task')
        self.task_name = request_body.get('task_name')
        self.task_desc = request_body.get('task_desc')
        self.task_type = request_body.get('task_type')
        self.task_rule = request_body.get('task_rule')
        self.task_args = request_body.get('task_args')
        self.task_enable = request_body.get('is_enable')
        self.task_queue = request_body.get('task_queue')
        self.task_routing_key = request_body.get('task_routing')
        self.task_exchange = request_body.get('task_exchange')
        try:
            # 校验参数格式是否合法，只允许列表或者字典
            if isinstance(self.task_args, dict):
                self.kwargs = self.task_args
            elif isinstance(self.task_args, list):
                self.args = self.task_args
            else:
                return self.my_response({"status": "error","message": "参数格式必须是[args,args2]或者{k1:v,k2:v,}"})
        except Exception as e:
            print(e)
        ret = {"status": "error","message": "执行出现异常"}
        print(self.task_type)
        if self.task_type == "Crontab":
            ret = self.create_cron_task()
        else:
            ret = self.create_interval_task()
        return self.my_response(ret)

    def create_cron_task(self):
        """
        创建指定时间执行的任务
        :return:
        """
        try:
            print(self.task_rule.split(' '))
            if len(self.task_rule.split(' ')) != 5: return {"status": "error", "message": "crontab格式不合法"}
            crontab_rule = self.task_rule.split(' ')
            minute = crontab_rule[0]
            hour = crontab_rule[1]
            day_of_month = crontab_rule[2]
            month_of_year = crontab_rule[3]
            day_of_week = crontab_rule[4]
            crontab_time = {"minute":minute,"hour": hour,"day_of_month": day_of_month,"month_of_year": month_of_year,"day_of_week":day_of_week}
            # 如果运行规则已经存在则啥也不做,否则插入运行定时规则
            schedule, created = celery_models.CrontabSchedule.objects.get_or_create(**crontab_time)
            # 判断任务是否已经存在
            task_info = celery_models.PeriodicTask.objects.filter(task=self.task)
            # 插入任务
            if task_info.exists(): return {"status": "error", "message": "任务已存在"}
            celery_models.PeriodicTask.objects.create(
                crontab=schedule,  # 上面创建10秒的间隔 interval 对象
                name=self.task_name,  # 设置任务的name值
                task=self.task,  # 指定需要周期性执行的任务
                enabled=self.task_enable,
                description=self.task_desc,
                args=json.dumps(self.args),  # list or tuple
                kwargs=json.dumps(self.kwargs),
                queue=self.task_queue,
                routing_key=self.task_routing_key,
            )
            status = "ok"
            message = "ok"
        except Exception as e:
            status = "error"
            message = str(e)
            print(e)
        return {"status": status, "message": message}

    def create_interval_task(self):
        """
        创建周期性任务
        :return:
        """
        # 先对规则进行校验
        interval_unit_list = ["seconds", "minutes", "hours", "days", "microseconds"]
        if len(self.task_rule.split('-')) != 2: return {"status": "error","message": "interval 任务规则不合法"}
        every = self.task_rule.split('-')[0]
        period = self.task_rule.split('-')[1]
        if not isinstance(every, int): return {"status": "error","message": "interval 必须是数字"}
        if period not in interval_unit_list: return {"status": "error","message": "interval 单位必须是%s" % interval_unit_list}
        try:
            # 如果运行规则已经存在则啥也不做,否则插入运行间隔规则
            schedule, created = celery_models.IntervalSchedule.objects.get_or_create(every=every, period=period)
            task_info = celery_models.PeriodicTask.objects.filter(task=self.task)
            # 插入任务
            if task_info.exists(): return {"status": "error", "message": "任务已存在"}
            celery_models.PeriodicTask.objects.create(
                interval=schedule,  # 上面创建10秒的间隔 interval 对象
                name=self.task_name,  # 设置任务的name值
                task=self.task,  # 指定需要周期性执行的任务
                enabled=self.task_enable,
                description=self.task_desc,
                args=json.dumps(self.args),    # list or tuple
                kwargs=json.dumps(self.kwargs),
                queue=self.task_queue,
                routing_key=self.task_routing_key,
            )
            status = "ok"
            message = "ok"
        except Exception as e:
            status = "error"
            message = str(e)
            print("添加任务失败:%s" % str(e))
        return {"status": status, "message": message}