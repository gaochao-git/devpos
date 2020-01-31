#!/usr/bin/python
#-\*-coding: utf-8-\*-

import pymysql
import sys
import json


# inception执行SQL
def execute_sql_func(master_ip, master_port, osc_config_sql, execute_sql):
    print("inception_prepare_sql:{}".format(osc_config_sql))
    sql = """/*--user=wthong;--password=fffjjj;--host={};--port={};--execute=1;--enable-remote-backup={};--enable-ignore-warnings={};--enable-force={};*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(master_ip, master_port, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error, execute_sql)
    print(sql)
    try:
        conn = pymysql.connect(host='39.97.247.142', user='', passwd='', db='', port=6669,charset="utf8")  # inception服务器
        cur = conn.cursor()
        if osc_config_sql == "":
            cur.execute(sql)
        else:
            cur.execute(osc_config_sql)
            cur.execute(sql)
        results = cur.fetchall()
        content = {"status": "ok", "message": "ok", "data":results}
        cur.close()
        conn.close()
    except Exception as e:
        content = {"status":"error", "message":e}
        print(e)
    finally:
        return content


# 处理inception执行结果
def process_execute_results(results):
    if results:
        try:
            result_error_level_list = []
            for row in results:
                print(row)
                result_error_level_list.append(row[2])
                inception_id = row[0]
                inception_stage = row[1]
                inception_error_level = row[2]
                inception_error_message = row[4]
                inception_sql = row[5]
                inception_affected_rows = row[6]
                inception_execute_time = row[9]
                insert_execute_results_sql = """insert into sql_execute_results(submit_sql_uuid,inception_id,inception_stage,inception_error_level,inception_error_message,inception_sql,inception_affected_rows,inception_execute_time) 
                                                                                values('{}',{},'{}',{},'{}','{}',{},'{}')
                """.format(submit_sql_uuid, inception_id, inception_stage, inception_error_level,pymysql.escape_string(inception_error_message), pymysql.escape_string(inception_sql),inception_affected_rows, inception_execute_time)
                cursor.execute(insert_execute_results_sql)
            connection.commit()
            print('inception执行结果插入表中成功')
            content = {"status": "ok", "message": "ok", "inception_return_max_code": max(result_error_level_list)}
        except Exception as e:
            content = {"status": "error", "message": e}
            print(e)
            print('inception执行结果插入表中失败')
            connection.rollback()
        finally:
            return content


def main():
    try:
        #获取工单详情
        sql_select = "select master_ip,master_port, submit_sql_file_path ,inception_osc_config from sql_execute where submit_sql_uuid='{}'".format(submit_sql_uuid)
        cursor.execute("%s" % sql_select)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        sql_file_path = data[0]["submit_sql_file_path"]
        inception_osc_config = data[0]["inception_osc_config"]
        master_ip = data[0]["master_ip"]
        master_port = data[0]["master_port"]
        if inception_osc_config == "" or inception_osc_config == '{}':
            osc_config_sql = "show databases;"
        else:
            osc_config_dict = json.loads(inception_osc_config)
            osc_config_sql_list = []
            for k in osc_config_dict:
                osc_config_sql = "inception set session {}={};".format(k, osc_config_dict[k])
                osc_config_sql_list.append(osc_config_sql)
                osc_config_sql_list_str = [str(i) for i in osc_config_sql_list]
                osc_config_sql = ''.join(osc_config_sql_list_str)
        # 通过sql_file_path获取SQL文件并读取要执行的SQL
        with open("./upload/{}".format(sql_file_path), "rb") as f:
            execute_sql = f.read()
            execute_sql = execute_sql.decode('utf-8')
    except Exception as e:
        print(e)

    # 更新工单状态为执行中
    try:
        sql_execute_executing = "update sql_execute set dba_execute=2,execute_status=2 where submit_sql_uuid='{}'".format(submit_sql_uuid)
        cursor.execute("%s" % sql_execute_executing)
        connection.commit()
    except Exception as e:
        print(e)
        connection.rollback()
    # 执行工单
    ret = execute_sql_func(master_ip, master_port, osc_config_sql, execute_sql)
    if ret["status"] == "ok":
        ret_process_results = process_execute_results(ret["data"])
        if ret_process_results["status"] == "ok":
            if ret_process_results["inception_return_max_code"] == 2:
                sql_update_executing = "update sql_execute set execute_status=4 where submit_sql_uuid='{}'".format(submit_sql_uuid)
                print('执行失败')
            elif ret_process_results["inception_return_max_code"] == 1:
                sql_update_executing = "update sql_execute set execute_status=5 where submit_sql_uuid='{}'".format(submit_sql_uuid)
                print('执行成功含警告')
            elif ret_process_results["inception_return_max_code"] == 0:
                sql_update_executing = "update sql_execute set execute_status=3 where submit_sql_uuid='{}'".format(submit_sql_uuid)
                print('执行成功')
            else:
                sql_update_executing = "update sql_execute set execute_status=999 where submit_sql_uuid='{}'".format(submit_sql_uuid)
                print("未知")
            try:
                cursor.execute("%s" % sql_update_executing)
                connection.commit()
                print('inception执行SQL成功,更改数据库状态成功')
            except Exception as e:
                print(e)
                print('inception执行SQL成功,更改数据库状态失败')
                connection.rollback()
        else:
            print(ret_process_results["message"])
    else:
        # 更新工单状态为失败
        try:
            sql_execute_error = "update sql_execute set execute_status=4 where submit_sql_uuid='{}'".format(submit_sql_uuid)
            cursor.execute("%s" % sql_execute_error)
            connection.commit()
        except Exception as e:
            print(e)
            connection.rollback()


if __name__ == "__main__":
    connection = pymysql.connect(host='10.90.171.31', port=3309, user='wth', password='YLAZ6IQw5NGSmjyh',database="test", charset="utf8")
    cursor = connection.cursor()
    submit_sql_uuid = sys.argv[1]
    inception_backup = sys.argv[2]
    inception_check_ignore_warning = sys.argv[3]
    inception_execute_ignore_error = sys.argv[4]
    split_sql_file_path = sys.argv[5]
    try:
        main()
    except Exception as e:
        print(e)
    finally:
        cursor.close()
        connection.close()

