from django.shortcuts import render
from django.http import HttpResponse
import json
from django.db import connection

def get_cluster_info_func(request):
    cursor = connection.cursor()
    print(request.method)
    if request.method == 'GET':
        sql = "select id as 'key',cluster_name,cluster_type,cluster_status,instance_name,role from cluster order by cluster_name"
    elif request.method == 'POST':
        to_str = str(request.body, encoding="utf-8")
        cluster_name = json.loads(to_str)['cluster_name']
        where_cluster_name_conditin = 'and cluster_name like "{}%"'.format(cluster_name)
        print(where_cluster_name_conditin)
        sql = "select id as 'key',cluster_name,cluster_type,cluster_status,instance_name,role from cluster where 1=1 {} order by cluster_name".format(where_cluster_name_conditin)
    cursor.execute("%s" % sql)
    rows = cursor.fetchall()
    data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
    print(data)
    return HttpResponse(json.dumps(data),content_type = 'application/json')
def get_search_cluster_info_func(request):
    cursor = connection.cursor()
    print(request.method)
    if request.method == 'GET':
        sql = "select id as 'key',cluster_name,cluster_type,cluster_status,instance_name,role from cluster order by cluster_name"
    elif request.method == 'POST':
        to_str = str(request.body, encoding="utf-8")
        cluster_name = json.loads(to_str)['cluster_name']
        where_cluster_name_conditin = 'and cluster_name like "{}%"'.format(cluster_name)
        print(where_cluster_name_conditin)
        sql = "select id as 'key',cluster_name,cluster_type,cluster_status,instance_name,role from cluster where 1=1 {} order by cluster_name".format(where_cluster_name_conditin)
    cursor.execute("%s" % sql)
    rows = cursor.fetchall()
    data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
    print(data)
    return HttpResponse(json.dumps(data),content_type = 'application/json')