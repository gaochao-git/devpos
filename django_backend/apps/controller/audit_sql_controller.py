#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from django.http import HttpResponse
import json
from apps.utils import common
from apps.utils import inception
from apps.service import audit_sql
import logging
logger = logging.getLogger('devops')


# 页面获取所有工单列表
def get_submit_sql_info_controller(request):
    ret = audit_sql.get_submit_sql_info()
    return HttpResponse(json.dumps(ret,default=str), content_type='application/json')


# 获取所有集群名
def get_cluster_name_controller(request):
    ret = audit_sql.get_cluster_name()
    return HttpResponse(json.dumps(ret,default=str), content_type='application/json')


# 页面预览指定工单提交的SQL
def get_submit_sql_by_uuid_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    submit_sql_uuid = request_body['submit_sql_uuid']
    ret = audit_sql.get_submit_sql_by_uuid(submit_sql_uuid)
    return HttpResponse(json.dumps(ret,default=str), content_type='text/xml')


# 查看指定提交工单的详情
def get_apply_sql_by_uuid_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    submit_sql_uuid = request_body['submit_sql_uuid']
    ret = audit_sql.get_apply_sql_by_uuid(submit_sql_uuid)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


# 获取master ip
def get_master_ip_controller(request):
    ret = audit_sql.get_master_ip()
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


# 页面调用inception检测SQL,如果根据cluster_name则需要先获取到对应的master_ip、master_port
def check_sql_controller(request):
    """
    request_body.get('xx')参数为选填参数
    request_body['xx']参数为必选参数
    :param request:
    :return:
    """
    try:
        request_body = json.loads(str(request.body, encoding="utf-8"))
        cluster_name = request_body.get('cluster_name').strip()
        instance_name = request_body.get('instance_name').strip()
        check_sql_info = request_body['check_sql_info']
        submit_type = request_body['submit_type']
        ret = audit_sql.check_sql(submit_type, check_sql_info, cluster_name, instance_name)
    except Exception as e:
        logger.exception(e)
        ret = {"status": "error", "message": "参数不符合"}
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


# 页面提交SQL工单
def submit_sql_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    ret = audit_sql.submit_sql(request_body)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')



# 页面预览指定的拆分SQL
def get_submit_split_sql_by_file_path_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['split_sql_file_path']
    ret = audit_sql.get_submit_split_sql_by_file_path(split_sql_file_path)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


# 页面查看inception变量配置
def get_inception_variable_config_info_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['split_sql_file_path']
    ret = audit_sql.get_inception_variable_config_info(split_sql_file_path)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')

# 页面修改inception变量配置
def update_inception_variable_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    split_sql_file_path = request_body['split_sql_file_path']
    new_config = request_body["params"]["new_config_json"]
    request_body_json = json.dumps(new_config)
    ret = audit_sql.update_inception_variable(request_body_json,split_sql_file_path)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')

# 页面查看审核结果
def get_check_sql_results_by_uuid_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    submit_sql_uuid = request_body['submit_sql_uuid']
    ret = audit_sql.get_check_sql_results_by_uuid(submit_sql_uuid)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')

# 审核通过并拆分SQL
def pass_submit_sql_by_uuid_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    submit_sql_uuid = request_body['submit_sql_uuid']
    apply_results = request_body['apply_results']
    check_comment = request_body['check_comment']
    check_status = 2 if apply_results == "通过" else 3
    # ret = audit_sql.pass_submit_sql_by_uuid(submit_sql_uuid,apply_results,check_comment,check_status)
    obj = audit_sql.PassSubmitSql(submit_sql_uuid,apply_results,check_comment,check_status)
    ret = obj.pass_submit_sql_by_uuid()
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


# 获取SQL文件路径,调用inception执行
def execute_submit_sql_by_file_path_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    submit_sql_uuid = request_body['submit_sql_uuid']
    file_path = request_body['split_sql_file_path']
    inc_bak = request_body['inception_backup']
    inc_war = request_body['inception_check_ignore_warning']
    inc_err = request_body['inception_execute_ignore_error']
    inc_sleep = request_body['inception_execute_sleep_ms']
    exe_user_name = request_body["execute_user_name"]
    obj = audit_sql.ExecuteSqlByFilePath(submit_sql_uuid, file_path, exe_user_name,inc_bak, inc_war, inc_err, inc_sleep)
    ret = obj.execute_submit_sql_by_file_path()
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


# 手动执行SQL更改工单状态
def execute_submit_sql_by_file_path_manual_controller(request):
    token = request.META.get('HTTP_AUTHORIZATION')
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    submit_sql_uuid = request_body['submit_sql_uuid']
    split_sql_file_path = request_body['split_sql_file_path']
    ret = audit_sql.execute_submit_sql_by_file_path_manual(token,submit_sql_uuid,split_sql_file_path)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')

# 根据拆分文件名查看对应执行结果
def get_execute_results_by_split_sql_file_path_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['split_sql_file_path']
    ret = audit_sql.get_execute_results_by_split_sql_file_path(split_sql_file_path)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')

# 根据uuid获取sqlsha1,根据sqlsha1连接inception查看执行进度
def get_execute_process_by_uuid_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['split_sql_file_path']
    ret = audit_sql.get_execute_process_by_uuid(split_sql_file_path)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


# inception拆分SQL
# def split_sql_func(submit_sql_uuid):
#     # 查询工单信息
#     try:
#         cursor = connection.cursor()
#         sql_select = "select master_ip,master_port,cluster_name,submit_sql_file_path from sql_submit_info where submit_sql_uuid='{}'".format(submit_sql_uuid)
#         cursor.execute("%s" % sql_select)
#         rows = cursor.fetchall()
#         data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
#         sql_file_path = data[0]["submit_sql_file_path"]
#         cluster_name = data[0]["cluster_name"]
#         if cluster_name:
#             des_master_ip, des_master_port = common.get_cluster_node(cluster_name)
#         else:
#             des_master_ip = data[0]["master_ip"]
#             des_master_port = data[0]["master_port"]
#         with open("./upload/{}".format(sql_file_path), "rb") as f:
#             execute_sql = f.read()
#             execute_sql = execute_sql.decode('utf-8')
#         ret = audit_sql.start_split_sql(cursor,submit_sql_uuid,des_master_ip, des_master_port, execute_sql, sql_file_path,cluster_name)
#         if ret == "拆分SQL成功":
#             message = "拆分任务成功"
#         else:
#             message = "拆分任务失败"
#     except Exception as e:
#         message = "拆分任务失败"
#         print(e)
#     finally:
#         cursor.close()
#         connection.close()
#         return message


# 获取页面拆分SQL
def get_split_sql_by_uuid_controller(request):
    print(5555555)
    request_body = json.loads(str(request.body, encoding="utf-8"))
    submit_sql_uuid = request_body['submit_sql_uuid']
    ret = audit_sql.get_split_sql_by_uuid(submit_sql_uuid)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


# 工单执行失败点击生成重做数据
def recreate_sql_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['split_sql_file_path']
    recreate_sql_flag = request_body['recreate_sql_flag']
    ret = audit_sql.recreate_sql(split_sql_file_path, recreate_sql_flag)
    return HttpResponse(json.dumps(ret, default=str), content_type='application/json')


def create_block_sql_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    ret = audit_sql.create_block_sql(request_body)
    return HttpResponse(json.dumps(ret, default=str), content_type='text/xml')