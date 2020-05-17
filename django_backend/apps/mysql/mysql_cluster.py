from django.http import HttpResponse
import json
from apps.utils import db_helper
import logging

logger = logging.getLogger('devops')

# 获取所有集群信息
def get_mysql_cluster_info_func(request):
    sql = ""
    status = ""
    message = ""
    data = []
    sql = """select b.id as 'key',
                    a.instance_name,
                    a.cluster_name,
                    a.cluster_type,
                    b.host_name,
                    b.host_ip,
                    b.port,
                    b.read_only,
                    b.version,
                    b.server_charset,
                    b.bufferpool,
                    b.master_ip,
                    case b.master_port when 0 then '' else master_port end master_port,
                    case b.instance_status when 0 then '不可用' when 1 then '正常服务' when 2 then '已下线' end as instance_status 
             from mysql_cluster_instance a inner join mysql_instance b on a.instance_name=b.instance_name
             """
    try:
        data = db_helper.findall(sql)
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.info(e)
    finally:
        content = {'status': status, 'message': message,'data': data}
        return HttpResponse(json.dumps(content), content_type='application/json')

# 模糊搜索集群名信息
def get_search_cluster_info_func(request):
    sql = ""
    status = ""
    message = ""
    data = []
    if request.method == 'POST':
        to_str = str(request.body, encoding="utf-8")
        cluster_name = json.loads(to_str)['cluster_name']
        where_cluster_name_conditin = 'and cluster_name like "{}%"'.format(cluster_name)
        sql = """select b.id as 'key',
                            a.instance_name,
                            a.cluster_name,
                            a.cluster_type,
                            b.host_name,
                            b.host_ip,
                            b.port,
                            b.read_only,
                            b.version,
                            b.server_charset,
                            b.bufferpool,
                            b.master_ip,
                            case b.master_port when 0 then '' else master_port end master_port,
                            case b.instance_status when 0 then '不可用' when 1 then '正常服务' when 2 then '已下线' end as instance_status 
                     from mysql_cluster_instance a inner join mysql_instance b on a.instance_name=b.instance_name where 1=1 {}
                     """.format(where_cluster_name_conditin)
    try:
        data = db_helper.findall(sql)
        status = "ok"
        message = "ok"
    except Exception as e:
        status = "error"
        message = e
        logger.info(e)
    finally:
        content = {'status': status, 'message': message, 'data': data}
        return HttpResponse(json.dumps(content), content_type='application/json')