#!/usr/bin/python
#-\*-coding: utf-8-\*-

import pymysql
import json
import sys
import logging
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s %(filename)s[line:%(lineno)d] %(levelname)s %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S',
                    filename='./logs/inception_execute.log',
                    filemode='a+'
)


# inception执行SQL
def execute_sql_func(master_ip,master_port,osc_config_sql,execute_sql):
    sql = """/*--user=wthong;--password=fffjjj;--host={};--port={};--execute=1;--enable-remote-backup={};--enable-ignore-warnings={};--enable-force={};*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(master_ip, master_port, inception_backup, inception_check_ignore_warning, inception_execute_ignore_error, execute_sql)
    logging.info("工单:%s,inception执行SQL开始", submit_sql_uuid)
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
        logging.info("工单:%s,inception执行SQL正常结束", submit_sql_uuid)
    except Exception as e:
        content = {"status":"error", "message":e}
        logging.info("工单:%s,inception执行SQL异常结束", submit_sql_uuid)
    finally:
        cur.close()
        conn.close()
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
                insert_execute_results_sql = """insert into sql_execute_results(submit_sql_uuid,inception_id,inception_stage,inception_error_level,inception_error_message,inception_sql,inception_affected_rows,inception_execute_time,split_sql_file_path) 
                                                                                values('{}',{},'{}',{},'{}','{}',{},'{}','{}')
                """.format(submit_sql_uuid, inception_id, inception_stage, inception_error_level,pymysql.escape_string(inception_error_message), pymysql.escape_string(inception_sql),inception_affected_rows, inception_execute_time,split_sql_file_path)
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
        # 通过sql_file_path获取SQL文件并读取要执行的SQL
        with open("./upload/{}".format(split_sql_file_path), "rb") as f:
            execute_sql = f.read()
            execute_sql = execute_sql.decode('utf-8')
        logging.info("工单:%s,获取待执行SQL成功",submit_sql_uuid)
    except Exception as e:
        logging.error(str(e))
    # 获取工单是否已经被执行过
    sql = "select 1 from sql_execute_split where dba_execute !=1 and execute_status !=1 and split_sql_file_path='{}'".format(split_sql_file_path)
    cursor.execute(sql)
    row = cursor.fetchall()
    if row:
        logging.error("工单:%s_%s,该SQL已经执行,执行脚本退出",submit_sql_uuid,split_sql_file_path)
        sys.exit()
    # 更新工单状态为执行中
    try:
        sql_update_executing = "update sql_submit_info set dba_execute=2,execute_status=2,submit_sql_execute_plat_or_manual=1,dba_execute_user_name='{}' where submit_sql_uuid='{}'".format(execute_user_name, submit_sql_uuid)
        sql_execute_executing = "update sql_execute_split set dba_execute=2,execute_status=2,submit_sql_execute_plat_or_manual=1 where split_sql_file_path='{}'".format(split_sql_file_path)
        cursor.execute(sql_update_executing)
        cursor.execute(sql_execute_executing)
        connection.commit()
        logging.info("工单:%s,工单状态更改为执行中成功", submit_sql_uuid)
    except Exception as e:
        connection.rollback()
        logging.error("工单:%s,状态更改为执行中失败:%s", submit_sql_uuid,str(e))
    # 执行工单
    logging.error(des_master_ip, des_master_port, osc_config_sql, execute_sql)
    ret = execute_sql_func(des_master_ip, des_master_port, osc_config_sql, execute_sql)

    # 返回值ok，只能说明inception执行完成没有异常中断，具体执行的每条SQL状态需要单独判断
    if ret["status"] == "ok":
        ret_process_results = process_execute_results(ret["data"])
        if ret_process_results["status"] == "ok":
            if ret_process_results["inception_return_max_code"] == 2:
                sql_update_executing = "update sql_execute_split set execute_status=4 where split_sql_file_path='{}'".format(split_sql_file_path)
            elif ret_process_results["inception_return_max_code"] == 1:
                sql_update_executing = "update sql_execute_split set execute_status=5 where split_sql_file_path='{}'".format(split_sql_file_path)
            elif ret_process_results["inception_return_max_code"] == 0:
                sql_update_executing = "update sql_execute_split set execute_status=3 where split_sql_file_path='{}'".format(split_sql_file_path)
            else:
                sql_update_executing = "update sql_execute_split set execute_status=999 where split_sql_file_path='{}'".format(split_sql_file_path)
            try:
                cursor.execute("%s" % sql_update_executing)
                connection.commit()
                logging.info('工单:%s,更改工单状态为执行完成，inception返回状态码最大值为:%s',submit_sql_uuid, ret_process_results["inception_return_max_code"])
            except Exception as e:
                logging.error('工单:%s,更改工单状态为执行完成时出现异常，工单状态为:%s',submit_sql_uuid,str(e))
                connection.rollback()
        else:
            logging.warning(ret_process_results["message"])
    else:
        # 更新工单状态为失败
        try:
            sql_execute_error = "update sql_submit_info set execute_status=4 where submit_sql_uuid='{}'".format(submit_sql_uuid)
            sql_update_executing_error = "update sql_execute_split set execute_status=4 where split_sql_file_path='{}'".format(split_sql_file_path)
            cursor.execute("%s" % sql_execute_error)
            cursor.execute("%s" % sql_update_executing_error)
            connection.commit()
            logging.info('工单:%s,inception执行SQL异常结束,更改工单状态为失败，更改成功',submit_sql_uuid)
        except Exception as e:
            connection.rollback()
            logging.error('工单:%s,inception执行SQL异常结束,更改工单状态为失败时出现异常:%s',submit_sql_uuid,str(e))

    try:
        get_all_sql_split_status = "select execute_status from sql_execute_split where submit_sql_uuid='{}'".format(submit_sql_uuid)
        cursor.execute("%s" % get_all_sql_split_status)
        rows = cursor.fetchall()
        sql_split_status_list = []
        for row in rows:
            sql_split_status_list.append(row[0])
        max_code = max(sql_split_status_list)
        sql_update_execute_max_code = "update sql_submit_info set execute_status={} where submit_sql_uuid='{}'".format(max_code, submit_sql_uuid)
        cursor.execute("%s" % sql_update_execute_max_code)
        connection.commit()
    except Exception as e:
        connection.rollback()
        logging.error("工单:%s,get_all_sql_split_status错误:%s",(submit_sql_uuid,str(e)))


if __name__ == "__main__":
    connection = pymysql.connect(host='39.97.247.142', port=3306, user='wthong', password='fffjjj',database='devops', charset='utf8')
    cursor = connection.cursor()
    submit_sql_uuid = sys.argv[1]
    inception_backup = sys.argv[2]
    inception_check_ignore_warning = sys.argv[3]
    inception_execute_ignore_error = sys.argv[4]
    split_sql_file_path = sys.argv[5]
    execute_user_name = sys.argv[6]
    des_master_ip = sys.argv[7]
    des_master_port = sys.argv[8]
    osc_config_sql = sys.argv[9]
    try:
        logging.info("工单:%s,执行main方法开始",submit_sql_uuid)
        main()
        logging.info("工单:%s,执行main方法结束",submit_sql_uuid)
    except Exception as e:
        logging.error("工单:%s,执行main方法报错，报错信息:%s",submit_sql_uuid,str(e))
        print(e)
    finally:
        cursor.close()
        connection.close()

