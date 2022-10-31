from django.db import connection
import logging
import pymysql
from django.db import transaction
from datetime import datetime
from utils.error_code import StatusCode
logger = logging.getLogger('sql_logger')
db_all_remote_user = "gaochao"
db_all_remote_pass = "fffjjj"

# pymysql自动提交默认为False,django会将自动提交改为True,也可以在setting中自己设置,如果某个SQL想单独设置，则需要单独开启事物
################################################# 本项目数据源公共方法 ##########################################

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
    conn = None
    cursor = None
    affected_rows = 0
    try:
        conn = pymysql.connect(host=ip, port=int(port), user=db_all_remote_user, passwd=db_all_remote_pass, db="",
                               charset="utf-8",connect_timeout=my_connect_timeout)
        cursor = conn.cursor()
        affected_rows = cursor.execute(sql)
        status = "ok"
        message = StatusCode.OK.msg
        code = StatusCode.OK.code
    except Exception as e:
        status = "error"
        message = StatusCode.ERR_DB.msg
        code = StatusCode.ERR_DB.code
        logger.exception("sql执行失败:%s", e)
    finally:
        if cursor: cursor.close()
        if conn: connection.close()
        return {"status": status, "message": message, "code": code, "affected_rows": affected_rows}


def target_source_dml_many(ip, port, sql_list, my_connect_timeout=2):
    """
    连接远程mysql执行管理类命令、更新类命令
    :param ip:
    :param port:
    :param sql:
    :param my_connect_timeout:
    :return:
    """
    conn = None
    cursor = None
    affected_rows = 0
    try:
        conn = pymysql.connect(host=ip, port=int(port), user=db_all_remote_user, passwd=db_all_remote_pass, db="",
                               charset="utf-8",connect_timeout=my_connect_timeout)
        cursor = conn.cursor()
        for sql in sql_list:
            item_sql_affected_rows = cursor.execute(sql)
            affected_rows += item_sql_affected_rows
        status = "ok"
        message = StatusCode.OK.msg
        code = StatusCode.OK.code
    except Exception as e:
        status = "error"
        message = StatusCode.ERR_DB.msg
        code = StatusCode.ERR_DB.code
        logger.exception("sql执行失败:%s", e)
    finally:
        if cursor: cursor.close()
        if conn: connection.close()
        return {"status": status, "message": message, "code": code, "affected_rows": affected_rows}


class DbUtil:
    def __init__(self, close_conn=False, dsn=None):
        self._start_time = datetime.now()
        self._connection = None
        self._status = "ok"
        self._message = StatusCode.OK.msg
        self._code = StatusCode.OK.code
        self._data = []
        self._row_count = None
        self._affected_rows = None
        self._execute_time = 0
        self._cursor = None
        self._dsn = dsn
        self._close_conn = close_conn
        self._get_connection()

    def _get_connection(self):
        try:
            if self._dsn is None:
                self._connection = connection
            else:
                self._connection = pymysql.connect(
                    host=self._dsn.get('ip'),
                    port=int(self._dsn.get('port')),
                    user=self._dsn.get('user'),
                    passwd=self._dsn.get('passwd'),
                    db=self._dsn.get('db'),
                    charset="utf8",
                    connect_timeout=self._dsn.get('connect_timeout')
                )
        except Exception as e:
            print(e)
            return self._err(e)

    def find_all(self, sql, args=None):
        try:
            self._cursor = self._connection.cursor()
            self._cursor.execute(sql, args)
            rows = self._cursor.fetchall()
            self._data = [dict(zip([col[0] for col in self._cursor.description], row)) for row in rows]
            self._row_count = self._cursor.rowcount
            return self._ok()
        except Exception as e:
            return self._err(e)

    def find_all_many(self, sql_list, args=None):
        try:
            self._cursor = self._connection.cursor()
            for sql in sql_list:
                self._cursor.execute(sql, args)
            rows = self._cursor.fetchall()
            self._data = [dict(zip([col[0] for col in self._cursor.description], row)) for row in rows]
            self._row_count = self._cursor.rowcount
            return self._ok()
        except Exception as e:
            return self._err(e)

    def dml(self, sql, args=None):
        try:
            self._cursor = self._connection.cursor()
            self._affected_rows = self._cursor.execute(sql, args)
            return self._ok()
        except Exception as e:
            return self._err(e)

    def dml_many(self, sql_list, args=None):
        try:
            with transaction.atomic():
                self._cursor = self._connection.cursor()
                self._affected_rows = sum(self._cursor.execute(sql) for sql in sql_list)
            return self._ok()
        except Exception as e:
            return self._err(e)

    def batch_insert(self, sql, args=None):
        """
        批量插入,不使用字符串拼接sql,通过传递参数解决sql注入问题
        :param sql:
        :param args:[{},{}]、[(),()]、((),())
            1)[{},{}]
            args = [{"name":"lisa","age":18},{"name":"bob","age":11}]
            sql = "insert into emp(name,age) values(%(name)s,%(age)s)"
            batch_insert(sql, args)
            2)[(),()]
            args = [("lisa",18),("bob",11)]
            sql = "insert into emp(name,age) values(%s,%s)"
            batch_insert(sql, args)
            3)((),())
            args = (("lisa",18),("bob",11))
            sql = "insert into emp(name,age) values(%s,%s)"
            batch_insert(sql, args)
        :param batch_size:
        :return:
        """
        try:
            self._cursor = self._connection.cursor()
            self._affected_rows = self._cursor.executemany(sql, args)
            return self._ok()
        except Exception as e:
            return self._err(e)

    def _err(self, msg):
        self._close_session()
        logger.error("execute sql error %s" %(msg))
        self._status = "error"
        self._message = msg
        self._code = StatusCode.ERR_DB.code
        self._execute_time = (self._start_time - datetime.now()).microseconds/1000
        return {
            "status": self._status,
            "message": self._message,
            "code": self._code,
            "data": self._data,
            "row_count": self._row_count,
            "affected_rows": self._affected_rows,
            "execute_time": self._execute_time
        }

    def _ok(self):
        self._close_session()
        self._execute_time = (self._start_time - datetime.now()).microseconds / 1000
        return {
            "status": self._status,
            "message": self._message,
            "code": self._code,
            "data": self._data,
            "row_count": self._row_count,
            "affected_rows": self._affected_rows,
            "execute_time": self._execute_time
        }

    def _close_session(self):
        if self._cursor:
            self._cursor.close()
        # 远程连接需要手动关闭连接
        if self._connection:
            self._connection.close()


def find_all(sql, args=None):
    """
    本地数据源
    :param sql:
    :param args:
    :return:
    """
    db = DbUtil()
    return db.find_all(sql, args)


def find_all_many(sql_list, args=None):
    """
    本地数据源
    :param sql_list:[sql1, sql2, ...]
    :param args:
    :return:
    """
    db = DbUtil()
    return db.find_all_many(sql_list, args)


def dml(sql, args=None):
    """
    本地数据源
    :param sql:
    :param args:
    :return:
    """
    db = DbUtil()
    return db.dml(sql, args)


def dml_many(sql_list, args=None):
    """
    本地数据源
    :param sql_list:[sql1, sql2, ...]
    :param args:
    :return:
    """
    db = DbUtil()
    return db.dml_many(sql_list, args)


def batch_insert(sql, args=None):
    """
    本地数据源
    :param sql:
    :param args:
    :return:
    """
    db = DbUtil()
    return db.batch_insert(sql, args)


def target_source_find_all(ip, port, sql, user=db_all_remote_user, passwd=db_all_remote_pass, db=None, connect_timeout=2,args=None):
    dsn = {
        "ip": ip,
        "port": port,
        "user": user,
        "passwd": passwd,
        "db": db,
        "connect_timeout": connect_timeout
    }
    db = DbUtil(dsn=dsn)
    return db.find_all(sql, args)