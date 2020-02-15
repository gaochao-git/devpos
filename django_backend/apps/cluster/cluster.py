from django.http import HttpResponse
import json
from django.db import connection


def get_cluster_info_func(request):
    sql = ""
    status = ""
    message = ""
    data = []
    cursor = connection.cursor()
    if request.method == 'GET':
        sql = "select id as 'key',cluster_name,cluster_type,cluster_status,instance_name,role from mysql_cluster order by cluster_name"
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message,'data': data}
    return HttpResponse(json.dumps(content), content_type='application/json')


def get_search_cluster_info_func(request):
    sql = ""
    status = ""
    message = ""
    data = []
    cursor = connection.cursor()
    if request.method == 'POST':
        to_str = str(request.body, encoding="utf-8")
        cluster_name = json.loads(to_str)['cluster_name']
        where_cluster_name_conditin = 'and cluster_name like "{}%"'.format(cluster_name)
        sql = "select id as 'key',cluster_name,cluster_type,cluster_status,instance_name,role from mysql_cluster where 1=1 {} order by cluster_name".format(where_cluster_name_conditin)
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        print(e)
    finally:
        cursor.close()
        connection.close()
    content = {'status': status, 'message': message, 'data': data}
    return HttpResponse(json.dumps(content), content_type='application/json')