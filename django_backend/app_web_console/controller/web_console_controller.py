#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2019/4/17 3:17 PM
# @Author  : 高超

from django.http import HttpResponse
import json
import logging
from app_web_console.service import web_console
from  app_web_console.dao import web_console_dao
from apps.utils.base_view import BaseView
from validator import Required, In, validate,Length, InstanceOf
from apps.utils.my_validator import validate_ip_port, my_form_validate
from apps.utils import common
from utils.soar import Soar
from django import forms
logger = logging.getLogger('devops')


class GetTableDataController(BaseView):
    def post(self, request):
        """
        获取数据
        :param request:
        :return:
        """
        request_body = self.request_params
        # 验证参数方法1
        rules1 = {
            "des_ip_port": forms.CharField(validators=[validate_ip_port]),
            "sql": forms.CharField(required=True, min_length=3,
                          error_messages={"required": "SQL为必填", "min_length": "SQL长度不合法最少为3"}),
            "schema_name": forms.CharField(required=True, min_length=3, max_length=64,
                                  error_messages={"required": "库名为必填", "min_length": "库名长度不合法,最少为2",
                                                  "max_length": "库名长度不合法,最长为64"}),
            "type": forms.ChoiceField(choices=([('query', '执行SQL'), ('explain', '分析SQL')]),
                                         error_messages={"invalid": "可选参数不合法"})

        }
        valid_ret = my_form_validate(request_body, rules1)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})

        # 验证参数方法2
        rules = {
            "des_ip_port": [lambda x: common.CheckValidators.check_instance_name(x)['status'] == "ok"],
            "sql": [Required, Length(2, 10000),],
            "schema_name": [Required, Length(2, 64),],
            "type": [Required, Length(2, 100)],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        des_ip_port = request_body.get('des_ip_port')
        sql = request_body.get('sql')
        type = request_body.get('type')
        schema_name = request_body.get('schema_name')
        if schema_name=="选择库名": schema_name=None
        ret = web_console.get_table_data(des_ip_port, sql, schema_name, type)
        return self.my_response(ret)


class GetFavoriteController(BaseView):
    def get(self, request):
        """
        获取收藏信息
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "favorite_type": [Required, In(['db_source', 'db_sql'])],
        }

        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        favorite_type = request_body.get('favorite_type')
        ret = web_console.get_favorite_data(favorite_type)
        return self.my_response(ret)


class AddFavoriteController(BaseView):
    def post(self, request):
        """
        添加收藏信息
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "favorite_type": [Required, In(['db_source', 'db_sql'])],
            "favorite_name": [Required, Length(2, 64)],
            "favorite_detail": [Required, Length(2, 10000)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        favorite_type = request_body.get('favorite_type')
        favorite_name = request_body.get('favorite_name')
        favorite_detail = request_body.get('favorite_detail')
        config_user_name = self.request_user_info.get('username')
        ret = web_console_dao.add_favorite_dao(config_user_name, favorite_type, favorite_name, favorite_detail)
        return self.my_response(ret)


class DelFavoriteController(BaseView):
    def post(self, request):
        """
        删除收藏信息
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "favorite_name": [Required, Length(2, 64)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        favorite_name = request_body.get('favorite_name')
        config_user_name = self.request_user_info.get('username')
        ret = web_console_dao.del_favorite_dao(config_user_name, favorite_name)
        return self.my_response(ret)


def get_schema_list_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    instance_name = request_body['instance_name']
    ret = web_console.get_schema_list(instance_name)
    return HttpResponse(json.dumps(ret, default=str), 'application/json')


def get_db_connect_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    instance_name = request_body['instance_name']
    ret = web_console.get_db_connect(instance_name)
    return HttpResponse(json.dumps(ret, default=str), 'application/json')

def get_table_list_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    instance_name = request_body['instance_name']
    schema_name = request_body['schema_name']
    table_name = request_body['table_name']
    ret = web_console.get_table_list(instance_name,schema_name,table_name)
    return HttpResponse(json.dumps(ret, default=str), 'application/json')


def get_column_list_controller(request):
    request_body = json.loads(str(request.body, encoding="utf-8"))
    instance_name = request_body['instance_name']
    schema_name = request_body['schema_name']
    table_name = request_body['table_name']
    ret = web_console.get_column_list(instance_name,schema_name,table_name)
    return HttpResponse(json.dumps(ret, default=str), 'application/json')


class GetDbInfoController(BaseView):
    def get(self, request):
        """
        获取收藏信息
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "des_ip_port": [lambda x: common.CheckValidators.check_instance_name(x)['status'] == "ok"],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        des_ip_port = request_body.get('des_ip_port')
        ret = web_console_dao.get_db_info_dao(des_ip_port)
        return self.my_response(ret)


class CheckGenerateSqlController(BaseView):
    def post(self, request):
        """
        获取源与目标表结构
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "generate_sql": [Required, Length(2, 10000)],
            "des_ip_port": [Required, Length(2, 10000)],
            "des_schema_name": [Required, Length(2, 10000)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        generate_sql = request_body.get('generate_sql')
        des_ip_port = request_body.get('des_ip_port')
        des_schema_name = request_body.get('des_schema_name')
        ret = web_console.check_generate_sql(des_ip_port, des_schema_name, generate_sql)
        return self.my_response(ret)


class SaveDesignTableSnapShotController(BaseView):
    def post(self, request):
        """
        保留设计表信息
        :param request:
        :return:
        """
        request_body = self.request_params
        print(request_body)
        rules = {
            "table_name": [Required, Length(2, 10000)],
            'data_source': [Required, InstanceOf(list)],
            'index_source': [Required, InstanceOf(list)],
            'table_engine': [Required, Length(2, 10000)],
            'table_charset': [Required, Length(2, 10000)],
            'table_comment': [Required, Length(2, 10000)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        table_name = request_body.get('table_name')
        data_source = request_body.get('data_source')
        index_source = request_body.get('index_source')
        table_engine = request_body.get('table_engine')
        table_charset = request_body.get('table_charset')
        table_comment = request_body.get('table_comment')
        user_name = self.request_user_info.get('username')
        # 这两个数据需要特殊格式处理
        data_source = json.dumps(data_source, ensure_ascii=False)
        index_source = json.dumps(index_source, ensure_ascii=False)
        ret = web_console_dao.save_design_table_snap_shot_dao(table_name, data_source, index_source, table_engine, table_charset, table_comment, user_name)
        return self.my_response(ret)


class GetDesignTableSnapShotController(BaseView):
    def post(self, request):
        """
        获取用户自身设计表信息
        :param request:
        :return:
        """
        user_name = self.request_user_info.get('username')
        ret = web_console_dao.get_design_table_snap_shot_dao(user_name)
        return self.my_response(ret)


class GetSqlScoreController(BaseView):
    def post(self, request):
        """
        获取sql评分
        :param request:
        :return:
        """
        request_body = self.request_params
        # 验证参数方法1
        rules = {
            "des_ip_port": [lambda x: common.CheckValidators.check_instance_name(x)['status'] == "ok"],
            "sql": [Required, Length(2, 10000), ],
            "schema_name": [Required, Length(2, 64), ],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        des_ip_port = request_body.get('des_ip_port')
        ip = des_ip_port.split('_')[0]
        port = des_ip_port.split('_')[1]
        sql = request_body.get('sql')
        db_name = request_body.get('schema_name')
        soar_engine = Soar()
        out = soar_engine.analyze_sql(ip,port,db_name,sql)
        ret = {"status": "ok","message":"ok","data":out}
        return self.my_response(ret)


class GetTargetTableInfoController(BaseView):
    def post(self, request):
        """
        获取目标表表结构信息
        :param request:
        :return:
        """
        request_body = self.request_params
        # 验证参数方法1
        rules = {
            "des_ip_port": [lambda x: common.CheckValidators.check_instance_name(x)['status'] == "ok"],
            "des_schema_name": [Required, Length(2, 64), ],
            "des_table_name": [Required, Length(2, 64), ],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        des_ip_port = request_body.get('des_ip_port').strip()
        ip = des_ip_port.split('_')[0]
        port = des_ip_port.split('_')[1]
        des_schema_name = request_body.get('des_schema_name')
        des_table_name = request_body.get('des_table_name')
        # ret = web_console_dao.get_target_table_info_dao(ip, port, des_schema_name, des_table_name)
        obj = web_console_dao.TableInfo(ip, port, des_schema_name, des_table_name)
        ret = obj.get_table_meta()
        return self.my_response(ret)


class GetDbColController(BaseView):
    def post(self, request):
        """
        获取推荐列
        :param request:
        :return:
        """
        request_body = self.request_params
        # 验证参数方法1
        rules = {
            "search_col_content": [Required, Length(0, 64), ],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        search_col_content = request_body.get('search_col_content')
        obj = web_console_dao.GetRecommandDbCol(search_col_content)
        ret = obj.get_db_col_dao()
        return self.my_response(ret)


class GetTableFrmController(BaseView):
    def post(self, request):
        """
        获取推荐列
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "des_ip_port": [lambda x: common.CheckValidators.check_instance_name(x)['status'] == "ok"],
            "schema_name": [Required, Length(2, 64), ],
            "table_name": [Required, Length(2, 64), ],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        des_ip_port = request_body.get('des_ip_port').strip()
        ip = des_ip_port.split('_')[0].strip()
        port = des_ip_port.split('_')[1].strip()
        schema_name = request_body.get('schema_name','').strip()
        table_name = request_body.get('table_name','').strip()
        ret = web_console_dao.get_table_frm_dao(ip,port,schema_name,table_name)
        print(ret)
        return self.my_response(ret)
    

class GetAllTableNamesAndComments(BaseView):
    def post(self, request):
        request_body = self.request_params
        rules = {
            "instance_name": [Required],
            "schema_name": [Required],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
                return self.my_response({
                    "status": "error",
                    "message": str(valid_ret.errors),
                    "code": 400
                })
        instance_name = request_body.get('instance_name')
        schema_name = request_body.get('schema_name')
        ip = instance_name.split('_')[0]
        port = instance_name.split('_')[1]
        ret = web_console_dao.get_all_table_names_and_comments_dao(ip,port,schema_name)
        return self.my_response(ret)
    

class GetTableStructures(BaseView):
    def post(self, request):
        request_body = self.request_params
        rules = {
            "instance_name": [Required],
            "schema_name": [Required],
            "table_names": []
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error","message": str(valid_ret.errors),"code": 400})
        instance_name = request_body.get('instance_name').strip()
        schema_name = request_body.get('schema_name').strip()
        table_names = request_body.get('table_names')
        if table_names: table_names = table_names.split(',')
        ip = instance_name.split('_')[0]
        port = instance_name.split('_')[1]
        ret = web_console_dao.get_table_structures_dao(ip,port,schema_name,table_names)
        return self.my_response(ret)


class GetDatasetsController(BaseView):
    def post(self, request):
        """
        获取数据集列表
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "cluster_group_name": [Required, Length(1, 64)],
            "database_name": [Required, Length(1, 64)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        
        cluster_group_name = request_body.get('cluster_group_name')
        database_name = request_body.get('database_name')
        user_name = self.request_user_info.get('username')
        
        ret = web_console_dao.get_datasets_dao(cluster_group_name, database_name, user_name)
        return self.my_response(ret)


class GetManagedDatasetsController(BaseView):
    def post(self, request):
        """
        获取用户管理的数据集列表（只返回admin_by是当前用户的数据集）
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "cluster_group_name": [Required, Length(1, 64)],
            "database_name": [Required, Length(1, 64)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        
        cluster_group_name = request_body.get('cluster_group_name')
        database_name = request_body.get('database_name')
        user_name = self.request_user_info.get('username')
        
        ret = web_console_dao.get_managed_datasets_dao(cluster_group_name, database_name, user_name)
        return self.my_response(ret)


class CreateDatasetController(BaseView):
    def post(self, request):
        """
        创建数据集
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "dataset_name": [Required, Length(1, 128)],
            "dataset_description": [Length(0, 128)],
            "dataset_content": [Required, Length(1, 65535)],
            "cluster_group_name": [Required, Length(1, 64)],
            "database_name": [Required, Length(1, 64)],
            "is_shared": [InstanceOf(int)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        
        dataset_name = request_body.get('dataset_name')
        dataset_description = request_body.get('dataset_description', '')
        dataset_content = request_body.get('dataset_content')
        cluster_group_name = request_body.get('cluster_group_name')
        database_name = request_body.get('database_name')
        is_shared = request_body.get('is_shared', 0)
        create_by = self.request_user_info.get('username')
        
        ret = web_console_dao.create_dataset_dao(
            dataset_name, 
            dataset_description, 
            dataset_content, 
            cluster_group_name, 
            database_name,
            is_shared,
            create_by
        )
        return self.my_response(ret)


class UpdateDatasetController(BaseView):
    def post(self, request):
        """
        更新数据集
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "dataset_id": [Required, InstanceOf(int)],
            "dataset_name": [Required, Length(1, 128)],
            "dataset_description": [Length(0, 128)],
            "dataset_content": [Required, Length(1, 65535)],
            "is_shared": [InstanceOf(int)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        
        dataset_id = request_body.get('dataset_id')
        dataset_name = request_body.get('dataset_name')
        dataset_description = request_body.get('dataset_description', '')
        dataset_content = request_body.get('dataset_content')
        is_shared = request_body.get('is_shared', 0)
        update_by = self.request_user_info.get('username')
        
        ret = web_console_dao.update_dataset_dao(
            dataset_id, 
            dataset_name, 
            dataset_description, 
            dataset_content,
            is_shared,
            update_by
        )
        return self.my_response(ret)


class DeleteDatasetController(BaseView):
    def post(self, request):
        """
        删除数据集
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "dataset_id": [Required, InstanceOf(int)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        
        dataset_id = request_body.get('dataset_id')
        user_name = self.request_user_info.get('username')
        
        ret = web_console_dao.delete_dataset_dao(dataset_id, user_name)
        return self.my_response(ret)


class TransferAdminController(BaseView):
    def post(self, request):
        """
        转移数据集管理员权限
        :param request:
        :return:
        """
        request_body = self.request_params
        rules = {
            "dataset_id": [Required, InstanceOf(int)],
            "new_admin": [Required, Length(1, 64)],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({"status": "error", "message": str(valid_ret.errors)})
        
        dataset_id = request_body.get('dataset_id')
        new_admin = request_body.get('new_admin')
        current_user = self.request_user_info.get('username')
        
        ret = web_console_dao.transfer_admin_dao(dataset_id, new_admin, current_user)
        return self.my_response(ret)