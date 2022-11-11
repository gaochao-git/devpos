#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2022/10/19 21:17 PM
# @Author  : 高超

import pymysql
import re
import json
from django.conf import settings
import logging

from utils.exceptions import BusinessException

logger = logging.getLogger('devops')


go_inception_host = settings.GO_INCEPTION_ADDRESS["go_inception_host"]
go_inception_port = settings.GO_INCEPTION_ADDRESS["go_inception_port"]


class MyGoInception:
    def __init__(self, ip, port, sql, db='test'):
        self._host = ip
        self._port = port
        self._sql = sql
        self._db = db
        self.parse_query_tree()

    def _base_engine(self, base_sql):
        conn = None
        cur = None
        content = {"status": "error", "message": "go_inception 调用出现异常"}
        try:
            conn = pymysql.connect(host=go_inception_host, user='', passwd='', db='', port=go_inception_port, charset="utf8")
            cur = conn.cursor()
            cur.execute(base_sql)
            results = cur.fetchall()
            data = [dict(zip([col[0] for col in cur.description], row)) for row in results]
            content = {'status': "ok", 'go_inception审核完成': "ok", 'data': data}
        except Exception as e:
            logger.exception("go_inception解析失败:%s", str(e))
            message = "调用go_inception出现异常"
            if re.findall('1875', str(e)):
                message = "go_inception语法错误"
            elif re.findall('2003', str(e)):
                message = "go_inception语法检测器无法连接"
            content = {'status': "error", 'message': message}
        finally:
            if conn: cur.close()
            if conn: conn.close()
            return content

    def parse_select_field(self):
        """
        解析SQL中涉及的字段名及其所在位置
        :return:
        """
        sql = f"""/*--user=gaochao;--password=fffjjj;--host={self._host};--port={self._port};--masking=1;*/\
            inception_magic_start;
            use {self._db};
            {self._sql};
            inception_magic_commit;
        """
        return self._base_engine(sql)

    def parse_query_tree(self):
        """
        解析SQL语法
        :return:
        """
        sql = f"""/*--user=gaochao;--password=fffjjj;--host={self._host};--port={self._port};--enable-query-print;*/\
            inception_magic_start;
            {self._sql};
            inception_magic_commit;
        """
        query_tree_info_ret = self._base_engine(sql)
        if query_tree_info_ret.get('status') != 'ok': raise BusinessException(query_tree_info_ret.get('message'))
        query_tree = query_tree_info_ret.get('data')[0]['query_tree']
        tables = parse_table_ref(json.loads(query_tree), db_name=self._db)
        limit_offset = parse_limit_offset(json.loads(query_tree))
        parse_ret = {"tables": tables, "limit_offset": limit_offset}
        return parse_ret

    def check_sql(self):
        """
        sql检查
        :param self:
        :return:
        """
        base_sql = f"""
            /*--user=gaochao;--password=fffjjj;--host={self._host};--check=1;--port={self._port};*/
           inception_magic_start;
           {self._sql}
           inception_magic_commit;
        """
        return self._base_engine(base_sql)

    def check_sql_go_to_c(self):
        """
        sql检查
        :param self:
        :return:
        """
        base_sql = f"""
            /*--user=gaochao;--password=fffjjj;--host={self._host};--check=1;--port={self._port};*/
           inception_magic_start;
           {self._sql}
           inception_magic_commit;
        """
        ret = self._base_engine(base_sql)
        new_data = []
        for row in ret['data']:
            new_dict = {}
            new_dict['ID'] = row['order_id']
            new_dict['stage'] = row['stage']
            new_dict['SQL'] = row['sql']
            new_dict['stagestatus'] = row['stage_status']
            new_dict['errlevel'] = row['error_level']
            new_dict['errormessage'] = row['error_message']
            new_dict['Affected_rows'] = row['affected_rows']
            new_data.append(new_dict)
        ret['data'] = new_data
        return ret


def parse_table_ref(query_tree, db_name=None):
    __author__ = "xxlrr"
    """
    * 从goInception解析后的语法树里解析出兼容Inception格式的引用表信息。
    * 目前的逻辑是在SQL语法树中通过递归查找选中最小的 TableRefs 子树（可能有多个），
    然后在最小的 TableRefs 子树选中Source节点来获取表引用信息。
    * 查找最小TableRefs子树的方案竟然是通过逐步查找最大子树（直到找不到）来获得的，
    具体为什么这样实现，我不记得了，只记得当时是通过猜测goInception的语法树生成规
    则来写代码，结果猜一次错一次错一次猜一次，最终代码逐渐演变于此。或许直接查找最
    小子树才是效率较高的算法，但是就这样吧，反正它能运行 :)
    """
    try:
        table_ref = []
        find_queue = [query_tree]
        for tree in find_queue:
            tree = DictTree(tree)
            nodes = tree.find_max_tree("TableRefs", "Left", "Right")
            if nodes:
                find_queue.extend([v for node in nodes for v in node.values() if v])
            else:
                snodes = tree.find_max_tree("Source")
                if snodes:
                    table_ref.extend(
                        [
                            {
                                "schema": snode["Source"]["Schema"]["O"] or db_name,
                                "name": snode["Source"]["Name"]["O"],
                            }
                            for snode in snodes
                        ]
                    )
        return table_ref
    except Exception as e:
        logger.exception(e)


def parse_limit_offset(query_tree):
    __author__ = "gaochao"
    """
    从goInception解析后的语法树里解析出limit、offset
    """
    limit_offset = {"limit": None, "offset": None}
    for k, v in query_tree.items():
        if k == 'Limit' and v is not None:
            limit_offset.update({"limit": v.get('Count').get('i')})
            if v.get('Offset') is not None:
                limit_offset.update({"offset": v.get('Offset').get('i')})
    return limit_offset


class DictTree(dict):
    def find_max_tree(self, *keys):
        __author__ = "xxlrr"
        """通过广度优先搜索算法查找满足条件的最大子树(不找叶子节点)"""
        fit = []
        find_queue = [self]
        for tree in find_queue:
            for k, v in tree.items():
                if k in keys:
                    fit.append({k: v})
                elif isinstance(v, dict):
                    find_queue.append(v)
                elif isinstance(v, list):
                    find_queue.extend([n for n in v if isinstance(n, dict)])
        return fit
