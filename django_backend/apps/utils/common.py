from django.db import connection
import logging
from apps.utils import db_helper

logger = logging.getLogger('devops')

# 根据集群名获取write_ip,write_port
def get_cluster_write_node_info(cluster_name):
    sql_get_write_node = """select 
                                    b.host_ip,b.port 
                                from mysql_cluster_instance a inner join mysql_instance b 
                                on a.instance_name=b.instance_name 
                                where a.cluster_name='{}' and b.read_only='off' and b.instance_status=1 limit 1
                                """.format(cluster_name)
    cursor = connection.cursor()
    print(sql_get_write_node)
    try:
        cursor.execute("%s" % sql_get_write_node)
        rows = cursor.fetchone()
        if rows:
            des_master_ip = rows[0]
            des_master_port = rows[1]
            return des_master_ip,des_master_port
        else:
            return "no_write_node"
    except Exception as e:
        logger.error(e)