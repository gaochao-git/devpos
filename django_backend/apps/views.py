from django.shortcuts import render
from django.http import HttpResponse
import json
from django.db import connection

def get_cluster_info_func(request):
    data=request
    cursor = connection.cursor()
    sql = "select id as 'key',cluster_name,cluster_type,cluster_status,instance_name,role from cluster order by cluster_name"
    cursor.execute("%s" % sql)
    rows = cursor.fetchall()
    print(rows)
    data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
    print(data)
    #return HttpResponse('没有获取到数据')
    return HttpResponse(json.dumps(data),content_type = 'application/json')