#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from apps.utils import db_helper


def get_task_info_dao():
    """
    获取所有定时任务
    :return:
    """
    interval_sql = """
        select 
            name,task,args,kwargs,queue,exchange,routing_key,expires,enabled,last_run_at,
            total_run_count,date_changed,  description,crontab_id,interval_id,
            concat(b.every,' ',period) rule,
            case interval_id is null when TRUE then '' else 'Interval' end as type  
        from djcelery_periodictask a inner join djcelery_intervalschedule b on a.interval_id=b.id
    """
    crontab_sql = """
            select 
                name,task,args,kwargs,queue,exchange,routing_key,expires,enabled,last_run_at,
                total_run_count,date_changed,  description,crontab_id,interval_id,
                concat(b.minute,' ',b.hour,' ',b.day_of_week,' ',b.day_of_month,' ',b.month_of_year) rule,
                case crontab_id is null when TRUE then '' else 'Crontab' end as type 
            from djcelery_periodictask a inner join djcelery_crontabschedule b on a.crontab_id=b.id
        """
    sql = "{} union {}".format(interval_sql, crontab_sql)
    print(sql)
    return db_helper.find_all(sql)


def get_task_log_dao():
    """
    获取任务日志
    :return:
    """
    sql = """
        select 
           state,task_id,name,tstamp,args, kwargs,eta,expires,result,traceback,runtime,retries,hidden,worker_id
        from djcelery_taskstate order by tstamp desc limit 1000
    """
    return db_helper.find_all(sql)


def del_task_dao():
    """
    删除任务
    :return:
    """
