from django.db import connection
import logging
import random
from apps.utils import db_helper

logger = logging.getLogger('devops')


def get_cluster_node(cluster_name, instance_role):
    """
    获取集群内指定角色节点
    :param cluster_name:
    :param instance_role:
    :return:
    """
    sql = """
            select instance_name from mysql_cluster_instance where cluster_name='{}' and instance_role='{}'
          """.format(cluster_name, instance_role)
    return db_helper.find_all(sql)


def get_read_only(ip, port):
    """
    获取节点read_only
    """
    sql = "select case @@global.read_only when 0 then 'OFF' when 1 then 'ON' end as read_only"
    return db_helper.target_source_find_all(ip, port, sql)


# 获取登陆用户及leader相关信息
def get_login_user_info(login_user):
    sql = "select b.qa_name,b.leader_name,b.dba_name from team_user a inner join team_check_role b on a.gid=b.gid where a.uname='{}'".format(login_user)
    rows = []
    try:
        rows = db_helper.findall(sql)
    except Exception as e:
        logger.error(e)
    return rows


def get_user_info(token):
    """
    获取登陆用户详情
    :param token:
    :return:
    """
    sql = """
            select a.username,a.display_username,a.user_role,a.user_email,a.department,a.group_name 
            from cloud_user a 
            inner join auth_user b on a.username=b.username 
            inner join authtoken_token c on b.id=c.user_id where c.`key`='{}'
          """.format(token)
    return db_helper.find_all(sql)


def generate_server_id(host):
    """
    获取mysql的server_id
    :param host:
    :return:
    """
    return random.randint(100, 10000) + int(host.split('.')[-1])