from django.db import connection
import logging
from datetime import datetime
logger = logging.getLogger('sql_logger')

# 获取多条数据
def findall(sql):
    cursor = connection.cursor()
    try:
        start_time = datetime.now()
        cursor.execute(sql)
        end_time = datetime.now()
        time_diff = (end_time - start_time).microseconds / 1000
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        return data
    except Exception as e:
        logger.error(e)
    finally:
        logger.info("sql:%s,sql执行耗时:%s ms" % (sql,time_diff))
        cursor.close()
        connection.close()


# 更新数据
def update(sql):
    cursor = connection.cursor()
    try:
        start_time = datetime.now()
        cursor.execute(sql)
        end_time = datetime.now()
        time_diff = (end_time - start_time).microseconds / 1000
        update_status = "ok"
    except Exception as e:
        update_status = "error"
        logger.error(e)
    finally:
        logger.info("sql:%s,sql执行耗时:%s ms" % (sql,time_diff))
        cursor.close()
        connection.close()
        return update_status

# 插入数据
def insert(sql):
    cursor = connection.cursor()
    try:
        start_time = datetime.now()
        cursor.execute(sql)
        end_time = datetime.now()
        time_diff = (end_time - start_time).microseconds / 1000
        insert_status = "ok"
    except Exception as e:
        insert_status = "error"
        logger.error(e)
    finally:
        logger.info("sql:%s,sql执行耗时:%s ms" % (sql,time_diff))
        cursor.close()
        connection.close()
        return insert_status