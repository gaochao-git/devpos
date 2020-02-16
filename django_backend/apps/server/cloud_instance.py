# coding=utf-8

from django.shortcuts import render
from django.http import HttpResponse
import json
from django.db import connection
import datetime
import pymysql

class DateEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(obj, datetime.date):
            return obj.strftime("%Y-%m-%d")
        else:
            return json.JSONEncoder.default(self, obj)

# 云主机
def get_cloud_instance_func(request):
    cursor = connection.cursor()
    print(request.method)
    if request.method == 'GET':
        sql = """select id as 'key',
                server_public_ip,
                server_private_ip,
                server_hostname,
                case server_usage when 1 then 'MySQL' when 2 then 'Redis' when 3 then '混合' end server_usage,
                case server_type when 1 then '云主机' when 2 then '物理机' end server_type,
                memory,
                disk_capacity,
                disk_type,
                network_type,
                public_network_bandwidth,
                private_network_bandwidth,
                cpu_size,
                deadline,
                case status when 0 then '不可用' when 1 then '可用' end status
          from server order by server_hostname"""
    elif request.method == 'POST':
        to_str = str(request.body, encoding="utf-8")
        instance_name = json.loads(to_str)['instance_name'].strip()
        where_instance_name_conditin = 'and instance_name like "{}%"'.format(instance_name)
        print(where_instance_name_conditin)
        sql = "select id as 'key',instance_name,instance_host,instance_password,instance_status,network,cpu_size,disk_size,deadline from cloud where 1=1 {} order by instance_name".format(where_instance_name_conditin)
    cursor.execute(sql)
    rows = cursor.fetchall()
    data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
    print(data)
    return HttpResponse(json.dumps(data,cls=DateEncoder), content_type='application/json')