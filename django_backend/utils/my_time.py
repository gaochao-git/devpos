#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超
# 时间处理


def secs_to_hms(seconds):
    """
    秒转为可读性强的时间
    seconds_to_dhms(886403)-------->10days,6hours,13min,23sec
    :param seconds:
    :return:
    """
    def _days(day):
        return "{}days,".format(day) if day > 1 else "{}day,".format(day)

    def _hours(hour):
        return "{}hours,".format(hour) if hour > 1 else "{}hour,".format(hour)

    def _minutes(minute):
        return "{}min,".format(minute) if minute > 1 else "{}min,".format(minute)

    def _seconds(second):
        return "{}sec".format(second) if second > 1 else "{}sec".format(second)
    days = seconds // (3600 * 24)
    hours = (seconds // 3600) % 24
    minutes = (seconds // 60) % 60
    seconds = seconds % 60
    if days > 0 :
        return _days(days)+_hours(hours)+_minutes(minutes)+_seconds(seconds)
    if hours > 0 :
        return _hours(hours)+_minutes(minutes)+_seconds(seconds)
    if minutes > 0 :
        return _minutes(minutes)+_seconds(seconds)
    return _seconds(seconds)