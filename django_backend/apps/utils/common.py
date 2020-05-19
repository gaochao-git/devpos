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
            return "no_write_node","no_write_node"
    except Exception as e:
        logger.error(e)

# 获取登陆用户及leader相关信息
def get_login_user_info(login_user):
    sql = "select b.qa_name,b.leader_name,b.dba_name from team_user a inner join team_check_role b on a.gid=b.gid where a.uname='{}'".format(login_user)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    return rows