from django.http import HttpResponse,HttpResponseServerError,Http404
import logging
import random
from apps.utils import db_helper
from celery.result import AsyncResult
import json
import validators
from rest_framework.views import APIView

logger = logging.getLogger('devops')


class CheckValidators:
    """
    校验分为3类：
        权限校验放在controller校验
        基础校验放在controller校验
        业务逻辑参数校验放在service或者dao校验
    """
    @staticmethod
    def check_ip(my_params):
        """
        校验ip
        :param my_params: ip
        :return:
        """
        if not isinstance(my_params, str):
            return {"status": "error", "message": "类型不合法"}
        if validators.ipv4(my_params):
            return {"status": "ok", "message": "校验通过"}
        else:
            return {"status": "error", "message": "ip不合法"}

    @staticmethod
    def check_port(my_params, min_no=0, max_no=65535):
        """
        校验端口号
        :param my_params:
        :param min_no:
        :param max_no:
        :return:
        """
        if not str(my_params).isdigit():
            return {"status": "error", "message": "类型不合法"}
        if validators.between(int(my_params), min=min_no, max=max_no):
            return {"status": "ok", "message": "校验通过"}
        else:
            return {"status": "error", "message": "数字有效范围为%d-%d" % (min_no, max_no)}

    @staticmethod
    def check_instance_name(my_params):
        if not isinstance(my_params, str):
            print(111)
            return {"status": "error", "message": "类型不合法"}
        if len(my_params.split('_')) != 2:
            print(222)
            return {"status": "error", "message": "实例不合法"}
        if CheckValidators.check_ip(my_params.split('_')[0])['status'] != "ok":
            print(333)
            return {"status": "error", "message": "实例不合法"}
        if CheckValidators.check_port(my_params.split('_')[1])['status'] != "ok":
            print(444)
            return {"status": "error", "message": "实例不合法"}
        return {"status": "ok", "message": "校验通过"}

    @staticmethod
    def check_cluster_name(cluster_name, min_no, max_no):
        pass

    @staticmethod
    def check_str_length(my_params, min_no, max_no):
        """
        校验字符串长度
        :param my_str:
        :param min_no:
        :param max_no:
        :return:
        """
        if not isinstance(my_params, str):
            return {"status": "error", "message": "类型不合法"}
        if validators.length(my_params, min=min_no, max=max_no):
            return {"status": "ok", "message": "校验通过"}
        else:
            return {"status": "error", "message": "字符串有效长度范围为%d-%d" % (min_no, max_no)}

    @staticmethod
    def check_int_range(my_params, min_no, max_no):
        """
        校验数字类型是否合法
        :param my_params:
        :param min_no:
        :param max_no:
        :return:
        """
        if not isinstance(my_params, int):
            return {"status": "error", "message": "类型不合法"}
        if validators.between(my_params, min=min_no, max=max_no):
            return {"status": "ok", "message": "校验通过"}
        else:
            return {"status": "error", "message": "数字有效范围为%d-%d" %(min_no, max_no)}

    @staticmethod
    def check_uuid(my_params):
        """
        校验uuid合法性
        :param my_params:
        :return:
        """
        if validators.uuid(my_params):
            return {"status": "ok", "message": "校验通过"}
        else:
            return {"status": "error", "message": "uuid不合法"}


def my_response(data, content_type='application/json'):
    """
    公共返回response
    :param data:
    :param content_type:
    :return:
    """
    return HttpResponse(json.dumps(data, default=str), content_type=content_type)


class BaseView(APIView):
    def __init__(self):
        self.request_path = None
        self.request_method = None      # GET|GPST
        self.request_params = None
        self.request_user_info = None
        self.request_from = None  # web|api

    def dispatch(self, request, *args, **kwargs):
        self.request_method = request.method
        self.request_path = request.path
        if self.request_method == 'GET':
            self.request_params = request.GET.dict()
        elif self.request_method == 'POST':
            self.request_params = json.loads(request.body.decode("utf-8"))
        return super(BaseView, self).dispatch(request, *args, **kwargs)

    def my_response(self, data, content_type='application/json'):
        """
        公共返回response
        :param data:
        :param content_type:
        :return:
        """
        if data.get('status') == "ok" and data.get('code') is None:
            data['code'] = 200
        if data.get('status') == "error" and data.get('code') is None:
            data['code'] = 500
        return HttpResponse(json.dumps(data, default=str), content_type=content_type)


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


def get_celery_task_status(request):
    """
    获取celery工单状态
    PENDING -> STARTED -> RETRY -> STARTED -> RETRY -> STARTED -> SUCCESS
    :param request:
    :return:
    """
    try:
        request_body = json.loads(str(request.body, encoding="utf-8"))
        celery_id = request_body["celery_id"]  # None或者str
        res = AsyncResult(celery_id)
        if res.successful():
            ret = {"status": "ok", "message": "审核成功"}
        elif res.failed():
            ret = {"status": "error", "message": "审核异常:%s" % (res.info)}
        else:
            ret = {"status": "warn", "message": "执行中:%s" % res.state}
    except KeyError as e:
        logger.exception(e)
        ret = {"status": "error", "message": "参数不符合"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')