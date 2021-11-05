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


def audit_sql_log(file_path, status, msg):
    """
    将SQL工单关键步骤写入数据库
    :param file_path:
    :param msg:
    :return:
    """
    if status == 0:
        logger.info('工单%s:%s', file_path, msg)
    else:
        logger.error('工单%s:%s', file_path, msg)
    sql = """
            insert into audit_sql_log(split_file,step_status,audit_log_info,create_time,update_time) 
                                    values('{}',{},'{}',now(),now()) 
          """.format(file_path, status, msg)
    db_helper.dml(sql)


def write_celery_task(task_id, submit_id, task_type):
    """
    celery任务写入任务表
    :param task_id:
    :param submit_id:
    :param task_type:
    :return:
    """
    int_sql = """
            insert into my_celery_task_status(task_id,submit_id,task_type,task_status,create_time,update_time) 
                                    values('{}','{}','{}',0,now(),now()) 
          """.format(task_id, submit_id, task_type)
    del_sql = "delete from my_celery_task_status where submit_id='{}' and task_type='{}'".format(submit_id, task_type)
    if task_type == 'recheck_sql':
        sql_list = []
        sql_list.append(del_sql)
        sql_list.append(int_sql)
        return db_helper.dml_many(sql_list)
    else:
        return db_helper.dml(int_sql)


def mark_celery_task(submit_id, task_type, task_status, msg=""):
    """
    更改celery状态
    :param submit_id:
    :param task_status:
    :return:
    """
    sql = """
            update my_celery_task_status set task_status={},content='{}' where submit_id='{}' and task_type='{}'
          """.format(task_status, msg, submit_id, task_type)
    return db_helper.dml(sql)


def get_celery_task_status_dao(submit_id, task_type):
    """
    获取celery状态
    :param submit_id:
    :return:
    """
    sql = """
            select task_status,content as message from my_celery_task_status 
            where submit_id='{}' and task_type='{}'
         """.format(submit_id, task_type)
    return db_helper.find_all(sql)