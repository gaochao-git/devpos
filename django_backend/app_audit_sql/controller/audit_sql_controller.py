#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

import json
from app_audit_sql.service import audit_sql
from apps.utils.common import CheckValidators,BaseView,my_response
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
from apps.utils import permission
import logging
logger = logging.getLogger('devops')


# 页面获取所有工单列表
class GetSqlSubmitSqlInfoCrotroller(BaseView):
    def get(self, request):
        ret = audit_sql.get_submit_sql_info()
        return self.my_response(ret)


class GetPreCheckResultCrotroller(BaseView):
    def get(self, request):
        """
        获取预审核结果
        :param request:
        :return:
        """
        check_sql_uuid = request.GET.get("check_sql_uuid")  # None或者str
        ret = audit_sql.get_pre_check_result(check_sql_uuid)
        return self.my_response(ret)


class GetViewSqlByUuidController(BaseView):
    def get(self, request):
        """
        获取用户提供的SQL或者回滚SQL
        :param request:
        :return:
        """
        submit_sql_uuid = request.GET.get("submit_sql_uuid")
        check_uuid_ret = CheckValidators.check_uuid(submit_sql_uuid)
        if check_uuid_ret['status'] != "ok": return self.my_response(check_uuid_ret)
        ret = audit_sql.get_view_sql_by_uuid(submit_sql_uuid)
        return self.my_response(ret)


class GetApplySqlByUuidController(BaseView):
    # 查看指定提交工单的详情
    def get(self, request):
        # 获取参数
        submit_sql_uuid = request.GET.get("submit_sql_uuid")
        # 基础参数校验
        check_uuid_ret = CheckValidators.check_uuid(submit_sql_uuid)
        if check_uuid_ret['status'] != "ok": return self.my_response(check_uuid_ret)
        # 执行业务逻辑
        ret = audit_sql.get_apply_sql_by_uuid(submit_sql_uuid)
        return self.my_response(ret)


class GetMasterIpController(BaseView):
    # 获取master ip
    def get(self, request):
        ret = audit_sql.get_master_ip()
        return self.my_response(ret)


class CheckSqlController(BaseView):
    # 页面调用inception检测SQL,如果根据cluster_name则需要先获取到对应的master_ip、master_port
    def post(self, request):
        """
        check_sql_uuid如果为None表示预检查SQL,如果为str则表示修改已提交SQL再次审核
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "cluster_name": [Length(0, 10)],  # 集群名,存在则校验,不存在则不校验
            "instance_name": [Length(0, 21)],  # 实例名,存在则校验,不存在则不校验
            "check_sql_info": [Required, Length(6, 20*1024*1024)],  # SQL长度
            "user_offer_rollback_sql": [Required, Length(0, 20*1024*1024)],  # SQL长度
            "submit_type": [Required,  In(["","master_ip_port", "cluster", "template"])], # 工单类型
            "check_sql_uuid": [lambda x: CheckValidators.check_uuid(x)['status'] == "ok"] ,  # uuid格式
            "check_type": [In(["check_sql", "recheck_sql"])] # 检查类型
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error","message": str(valid_ret.errors)})
        cluster_name = request_body.get('cluster_name').strip()
        instance_name = request_body.get('instance_name').strip()
        check_sql_info = request_body.get('check_sql_info')
        user_offer_rollback_sql = request_body.get('user_offer_rollback_sql')
        submit_type = request_body.get('submit_type')
        check_sql_uuid = request_body.get('check_sql_uuid')
        check_type = request_body.get('check_type')
        ret = audit_sql.check_sql(submit_type, check_sql_info, cluster_name, instance_name, check_sql_uuid, check_type, user_offer_rollback_sql)
        return self.my_response(ret)

# 页面提交SQL工单
def submit_sql_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    abj = audit_sql.SubmitSql(request_body)
    ret = abj.process_submit_sql()
    return my_response(ret)


def submit_recheck_sql_controller(request):
    """
    重新提交工单
    :param request:
    :return:
    """
    try:
        request_body = json.loads(str(request.body, encoding="utf-8"))
        submit_sql_uuid = request_body['submit_sql_uuid']
        ret = audit_sql.submit_recheck_sql(submit_sql_uuid, 1)
    except Exception as e:
        logger.exception(e)
        ret = {"status": "error", "message": "参数不符合"}
    return my_response(ret)




# 页面预览指定的拆分SQL
def get_submit_split_sql_by_file_path_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['split_sql_file_path']
    ret = audit_sql.get_submit_split_sql_by_file_path(split_sql_file_path)
    return my_response(ret)


# 页面查看inception变量配置
def get_inception_variable_config_info_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['split_sql_file_path']
    ret = audit_sql.get_inception_variable_config_info(split_sql_file_path)
    return my_response(ret)

# 页面修改inception变量配置
def update_inception_variable_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    split_sql_file_path = request_body['split_sql_file_path']
    new_config = request_body["params"]["new_config_json"]
    request_body_json = json.dumps(new_config)
    ret = audit_sql.update_inception_variable(request_body_json,split_sql_file_path)
    return my_response(ret)

# 页面查看审核结果
def get_check_sql_results_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    submit_sql_uuid = request_body['submit_sql_uuid']
    ret = audit_sql.get_check_sql_results(submit_sql_uuid)
    return my_response(ret)

# 审核通过并拆分SQL
def pass_submit_sql_by_uuid_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    submit_sql_uuid = request_body['submit_sql_uuid']
    apply_results = request_body['apply_results']   # 通过/不通过
    check_comment = request_body['check_comment']
    check_status = 2 if apply_results == "通过" else 3
    # ret = audit_sql.pass_submit_sql_by_uuid(submit_sql_uuid,apply_results,check_comment,check_status)
    obj = audit_sql.PassSubmitSql(submit_sql_uuid,check_comment,check_status)
    ret = obj.pass_submit_sql_by_uuid()
    return my_response(ret)


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
    return my_response(ret)


# 手动执行SQL更改工单状态
def execute_submit_sql_by_file_path_manual_controller(request):
    token = request.META.get('HTTP_AUTHORIZATION')
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    submit_sql_uuid = request_body['submit_sql_uuid']
    split_sql_file_path = request_body['split_sql_file_path']
    ret = audit_sql.execute_submit_sql_by_file_path_manual(token,submit_sql_uuid,split_sql_file_path)
    return my_response(ret)

# 根据拆分文件名查看对应执行结果
def get_execute_results_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['split_sql_file_path']
    ret = audit_sql.get_execute_results(split_sql_file_path)
    return my_response(ret)

# 根据uuid获取sqlsha1,根据sqlsha1连接inception查看执行进度
def get_execute_process_by_uuid_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['split_sql_file_path']
    ret = audit_sql.get_execute_process_by_uuid(split_sql_file_path)
    return my_response(ret)


# 获取页面拆分SQL
def get_split_sql_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    submit_sql_uuid = request_body['submit_sql_uuid']
    ret = audit_sql.get_split_sql(submit_sql_uuid)
    return my_response(ret)


# 工单执行失败点击生成重做数据
def recreate_sql_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    split_sql_file_path = request_body['split_sql_file_path']
    recreate_sql_flag = request_body['recreate_sql_flag']
    ret = audit_sql.recreate_sql(split_sql_file_path, recreate_sql_flag)
    return my_response(ret)


def create_block_sql_controller(request):
    to_str = str(request.body, encoding="utf-8")
    request_body = json.loads(to_str)
    ret = audit_sql.create_block_sql(request_body)
    return my_response(ret)