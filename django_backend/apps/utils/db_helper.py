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
class DbUtil:
    def __init__(self, dsn=None):
        """
        有dsn是连接远程数据源,否则为连接项目数据源
        :param dsn:
        """

        self._start_time = datetime.now()
        self._dsn = dsn
        self._connection = None
        self._cursor = None
        self._query_results = {
            "status": "ok",
            "message": StatusCode.OK.msg,
            "code": StatusCode.OK.code,
            "data": [],
            "row_count": None,
            "affected_rows": None,
            "execute_time": 0,
            "warning": None
        }

    def _get_connection(self):
        if self._dsn is None:
            return connection
        else:
            return pymysql.connect(
                host=self._dsn.get('ip'),
                port=int(self._dsn.get('port')),
                user=self._dsn.get('user'),
                passwd=self._dsn.get('passwd'),
                db=self._dsn.get('db'),
                charset="utf8",
                connect_timeout=self._dsn.get('connect_timeout')
            )

    def query(self, sqls, args=None):
        """
        :param sqls:list|string,如果为list则args不生效
        :param args:
        :return:
        """
        try:
            self._connection = self._get_connection()
            self._cursor = self._connection.cursor()
            if isinstance(sqls, list):
                for sql in sqls: self._cursor.execute(sql)
            else:
                self._cursor.execute(sqls, args)
            rows = self._cursor.fetchall()
            self._query_results['data'] = [dict(zip([col[0] for col in self._cursor.description], row)) for row in rows]
            self._query_results['row_count'] = self._cursor.rowcount
            return self._ok()
        except pymysql.Warning as e:
            self._query_results['warning'] = str(e)
        except Exception as e:
            return self._err(e)

    def dml(self, sqls, args=None):
        """
        :param sqls:list|string,如果为list则args不生效
        :param args:
        :return:
        """
        try:
            self._connection = self._get_connection()
            self._cursor = self._connection.cursor()
            if isinstance(sqls, list):
                with transaction.atomic():
                    self._cursor = self._connection.cursor()
                    self._query_results['affected_rows'] = sum(self._cursor.execute(sql) for sql in sqls)
            else:
                self._query_results['affected_rows'] = self._cursor.execute(sqls, args)
            return self._ok()
        except pymysql.Warning as e:
            self._query_results['warning'] = str(e)
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
            self._connection = self._get_connection()
            self._cursor = self._connection.cursor()
            self._query_results['affected_rows'] = self._cursor.executemany(sql, args)
            return self._ok()
        except pymysql.Warning as e:
            self._query_results['warning'] = str(e)
        except Exception as e:
            return self._err(e)

    def _err(self, msg):
        logger.error("execute sql error %s" % (msg))
        self._close_session()
        self._execute_time = (self._start_time - datetime.now()).microseconds/1000
        self._query_results['status'] = "error"
        self._query_results['message'] = msg
        self._query_results['code'] = StatusCode.ERR_DB.code
        self._query_results['execute_time'] = self._execute_time
        return self._query_results

    def _ok(self):
        self._close_session()
        self._execute_time = (self._start_time - datetime.now()).microseconds / 1000
        self._query_results['execute_time'] = self._execute_time
        return self._query_results

    def _close_session(self):
        if self._cursor:
            self._cursor.close()
        # 远程连接需要手动关闭连接
        if self._connection:
            self._connection.close()


def find_all(sql, args=None):
    """
    本地数据源
    :param sql:list|string
    :param args:
    :return:
    """
    db = DbUtil()
    return db.query(sql, args)


def dml(sql, args=None):
    """
    本地数据源
    :param sql:
    :param args:
    :return:
    """
    db = DbUtil()
    return db.dml(sql, args)


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
    return db.query(sql, args)


def target_source_dml(ip, port, sql, user=db_all_remote_user, passwd=db_all_remote_pass, db=None, connect_timeout=2,args=None):
    dsn = {
        "ip": ip,
        "port": port,
        "user": user,
        "passwd": passwd,
        "db": db,
        "connect_timeout": connect_timeout
    }
    db = DbUtil(dsn=dsn)
    return db.dml(sql, args)