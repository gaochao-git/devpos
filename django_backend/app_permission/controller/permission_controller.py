#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超


from app_permission.service import permission
from app_permission.dao import permission_dao
from apps.utils.base_view import BaseView
from validator import Required, Not, Truthy, Blank, Range, Equals, In, validate,InstanceOf,Length
import logging
logger = logging.getLogger('devops')


class GetRoleInfoController(BaseView):
    def get(self, request):
        """
        获取所有角色信息
        :param request:
        :return:
        """
        ret = permission_dao.get_role_info_dao()
        return self.my_response(ret)


class AddRoleNameController(BaseView):
    def post(self, request):
        """
        增加指定角色
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "role_name": [Length(2, 20)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        role_name = request_body.get('role_name')
        config_user = self.request_user_info.get('username')
        ret = permission_dao.add_role_name_dao(role_name, config_user)
        return self.my_response(ret)


class DelRoleNameController(BaseView):
    def post(self, request):
        """
        删除指定角色
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "role_name": [Length(2, 20)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        role_name = request_body.get('role_name')
        ret = permission_dao.del_role_name_dao(role_name)
        return self.my_response(ret)


class GetAllUserInfoController(BaseView):
    def post(self, request):
        """
        获取所有用户
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "user_name": [Length(2, 50)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        user_name = request_body.get('user_name')
        ret = permission_dao.get_all_user_info(user_name)
        return self.my_response(ret)


class GetSchemaPermissionController(BaseView):
    def post(self, request):
        """
        获取所有用户
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "cluster_name": [Required, Length(2, 64)],
            "schema_name": [Required, Length(2, 64)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        cluster_name = request_body.get('cluster_name')
        schema_name = request_body.get('schema_name')
        ret = permission_dao.get_schema_permisson_dao(cluster_name, schema_name)
        return self.my_response(ret)


class ChangeSchemaPermissionController(BaseView):
    def post(self, request):
        """
        更改库权限
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "cluster_name": [Required, Length(2, 64)],
            "schema_name": [Required, Length(2, 64)],
            "permission_user": [Required, InstanceOf(list)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        cluster_name = request_body.get('cluster_name')
        schema_name = request_body.get('schema_name')
        permission_user = request_body.get('permission_user')
        ret = permission_dao.change_schema_permisson_dao(cluster_name, schema_name, permission_user)
        return self.my_response(ret)
