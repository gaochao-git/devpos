from django.db import connection
import logging
import pymysql
from django.db import transaction
from datetime import datetime
from apps.utils.error_code import StatusCode
logger = logging.getLogger('sql_logger')
db_all_remote_user = "gaochao"
db_all_remote_pass = "fffjjj"

# pymysql自动提交默认为False,django会将自动提交改为True,也可以在setting中自己设置,如果某个SQL想单独设置，则需要单独开启事物
################################################# 本项目数据源公共方法 ##########################################
def findall(sql):
    """
    获取多条数据
    :param sql:
    :return:
    """
    data = []
    cursor = connection.cursor()
    try:
        cursor.execute(sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = "执行SQL成功"
        return data
    except Exception as e:
        status = "error"
        message = "执行SQL失败"
        logger.exception("sql执行失败:%s", e)
    finally:
        cursor.close()
        connection.close()


def find_all(sql):
    """
    传入SQL
    :param sql:
    :return:
    """
    data = []
    try:
        cursor = connection.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = StatusCode.OK.errmsg
        code = StatusCode.OK.code
    except Exception as e:
        status = "error"
        message = StatusCode.ERR_DB.errmsg
        code = StatusCode.ERR_DB.code
        logger.exception("sql执行失败:%s", e)
    finally:
        cursor.close()
        connection.close()
        return {"status": status, "message": message, "code": code, "data": data}

def find_all_many(sql_list):
    """
    传入SQL列表,有些SQL需要预处理SQL
    :param sql_list:
    :return:
    """
    data = []
    try:
        cursor = connection.cursor()
        for sql in sql_list:
            cursor.execute(sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = StatusCode.OK.errmsg
        code = StatusCode.OK.code
    except Exception as e:
        status = "error"
        message = StatusCode.ERR_DB.errmsg
        code = StatusCode.ERR_DB.code
        logger.exception("sql执行失败:%s", e)
    finally:
        cursor.close()
        connection.close()
        return {"status": status, "message": message, "code": code, "data": data}


def dml(sql):
    """
    单条DML
    :param sql:
    :return:
    """
    cursor = connection.cursor()
    try:
        cursor.execute(sql)
        status = "ok"
        message = StatusCode.OK.errmsg
        code = StatusCode.OK.code
    except Exception as e:
        status = "error"
        message = StatusCode.ERR_DB.errmsg
        code = StatusCode.ERR_DB.code
        logger.exception("sql执行失败:%s", e)
    finally:
        cursor.close()
        connection.close()
        return {"status": status, "message": message, "code": code}


def dml_many(sql_list):
    """
    多条DML
    :param sql_list:
    :return:
    """
    try:
        with transaction.atomic():
            cursor = connection.cursor()
            for sql in sql_list:
                cursor.execute(sql)
        status = "ok"
        message = StatusCode.OK.errmsg
        code = StatusCode.OK.code
    except Exception as e:
        status = "error"
        message = StatusCode.ERR_DB.errmsg
        code = StatusCode.ERR_DB.code
        logger.exception("sql执行失败:%s", e)
    finally:
        cursor.close()
        connection.close()
        return {"status": status, "message": message, "code": code}


################################################# 指定数据源公共方法 ##########################################
def target_source_find_all(ip, port, sql, db=None, my_connect_timeout=2):
    """
    连接远程数据库执行查询命令
    :param ip:
    :param port:
    :param sql:
    :param my_connect_timeout:
    :return:
    """
    conn = False
    data = []
    try:
        conn = pymysql.connect(host=ip, port=int(port), user=db_all_remote_user, passwd=db_all_remote_pass, db=db,
                               charset="utf8",connect_timeout=my_connect_timeout)
        cursor = conn.cursor()
        start_time = datetime.now()
        cursor.execute(sql)
        rows = cursor.fetchall()
        end_time = datetime.now()
        diff_time = (end_time - start_time).microseconds/1000
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = StatusCode.OK.errmsg
        code = StatusCode.OK.code
    except Exception as e:
        status = "error"
        message = StatusCode.ERR_DB.errmsg
        code = StatusCode.ERR_DB.code
        diff_time = 0
        logger.exception("sql执行失败:%s", e)
    finally:
        if conn: cursor.close()
        if conn: connection.close()
        return {"status": status, "message": message, "code": code, "data": data, 'query_time': diff_time}


def target_source_ping(ip, port):
    """
    ping远程服务器
    :param ip:
    :param port:
    :return:
    """
    sql = "select 1"
    return target_source_find_all(ip, port, sql, 0.2)


def target_source_dml(ip, port, sql, my_connect_timeout=2):
    """
    连接远程mysql执行管理类命令、更新类命令
    :param ip:
    :param port:
    :param sql:
    :param my_connect_timeout:
    :return:
    """
    conn = False
    try:
        conn = pymysql.connect(host=ip, port=int(port), user=db_all_remote_user, passwd=db_all_remote_pass, db="",
                               charset="utf-8",connect_timeout=my_connect_timeout)
        cursor = conn.cursor()
        cursor.execute(sql)
        status = "ok"
        message = StatusCode.OK.errmsg
        code = StatusCode.OK.code
    except Exception as e:
        status = "error"
        message = StatusCode.ERR_DB.errmsg
        code = StatusCode.ERR_DB.code
        logger.exception("sql执行失败:%s", e)
    finally:
        if conn: cursor.close()
        if conn: connection.close()
        return {"status": status, "message": message, "code": code}


def target_source_dml_many(ip, port, sql_list, my_connect_timeout=2):
    """
    连接远程mysql执行管理类命令、更新类命令
    :param ip:
    :param port:
    :param sql:
    :param my_connect_timeout:
    :return:
    """
    conn = False
    try:
        conn = pymysql.connect(host=ip, port=int(port), user=db_all_remote_user, passwd=db_all_remote_pass, db="",
                               charset="utf-8",connect_timeout=my_connect_timeout)
        cursor = conn.cursor()
        for sql in sql_list:
            cursor.execute(sql)
        status = "ok"
        message = StatusCode.OK.errmsg
        code = StatusCode.OK.code
    except Exception as e:
        status = "error"
        message = StatusCode.ERR_DB.errmsg
        code = StatusCode.ERR_DB.code
        logger.exception("sql执行失败:%s", e)
    finally:
        if conn: cursor.close()
        if conn: connection.close()
        return {"status": status, "message": message, "code": code}