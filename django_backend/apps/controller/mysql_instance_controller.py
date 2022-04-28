from django.http import HttpResponse
import json
from django.db import connection
import random

# 获取所有mysql实例
def get_mysql_instance_info_handler(request):
    cursor = connection.cursor()
    sql = """select id as 'key',
                    case instance_status when 0 then '不可用' when 1 then '正常服务' when 2 then '已下线' end as instance_status,
                    instance_name,
                    host_name,
                    host_ip,
                    port,
                    version,
                    read_only,
                    bufferpool,
                    server_charset,
                    master_ip,
                    case master_port when 0 then '' else master_port end master_port
             from mysql_instance order by instance_name"""
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        content = {'status': "ok", 'message': "获取mysql实例成功",'data': data}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print(e)
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content), content_type='application/json')

# 根据输入主机名获取对应mysql实例
def get_search_mysql_instance_info_handler(request):
    cursor = connection.cursor()
    to_str = str(request.body, encoding="utf-8")
    host_name = json.loads(to_str)['host_name']
    where_host_name_conditin = 'and host_name like "{}%"'.format(host_name)
    sql = """select id as 'key',
                    cluster_type,
                    case instance_status when 0 then '不可用' when 1 then '正常服务' when 2 then '已下线' end as instance_status,
                    instance_name,
                    role,
                    host_name,
                    host_ip,
                    port,
                    version,
                    read_only,
                    bufferpool,
                    server_charset,
                    master_ip,
                    case master_port when 0 then '' else master_port end master_port
             from mysql_instance where 1=1 {} order by instance_name""".format(where_host_name_conditin)
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        content = {'status': "ok", 'message': "获取mysql实例成功",'data': data}
    except Exception as e:
        content = {'status': "error", 'message': str(e)}
        print(e)
    finally:
        cursor.close()
        connection.close()
    return HttpResponse(json.dumps(content), content_type='application/json')


def get_zabbix_info_handler(request):
    data1 = [{"idc": 'BJ10',"ip": '172.16.1.216',"type": 'warning',"detail": '3306 port is down'}];
    data2 = [{"idc": 'BJ11', "ip": '172.16.1.105', "type": 'info', "detail": 'swap is used'}];
    data3 = [{"idc": 'BJ10', "ip": '172.16.1.221', "type": 'error', "detail": '3306 port is down'},{"idc": 'BJ10', "ip": '172.16.1.220', "type": 'warning', "detail": 'query bigger than 5s'}];
    data = random.choice([data1,data2,data3])
    content = {'status': "ok", 'message': "获取信息成功", 'data': data}
    return HttpResponse(json.dumps(content), content_type='application/json')