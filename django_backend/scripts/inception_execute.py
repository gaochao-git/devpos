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
        logging.info("工单:%s,inception执行SQL成功",submit_sql_uuid)
    except Exception as e:
        content = {"status":"error", "message":e}
        logging.info("inception执行SQL失败:%s",str(e))
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
        #获取工单详情
        sql_select = "select a.master_ip,a.master_port,a.cluster_name,b.inception_osc_config from sql_submit_info a inner join sql_execute_split b on a.submit_sql_uuid =b.submit_sql_uuid where split_sql_file_path='{}'".format(split_sql_file_path)
        cursor.execute("%s" % sql_select)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        inception_osc_config = data[0]["inception_osc_config"]
        cluster_name = data[0]["cluster_name"]
        if cluster_name:
            sql_get_write_node = """select 
                                    b.host_ip,b.port 
                                from mysql_cluster_instance a inner join mysql_instance b 
                                on a.instance_name=b.instance_name 
                                where a.cluster_name='{}' and b.read_only='off' and b.instance_status=1 limit 1
                                """.format(cluster_name)
            cursor.execute("%s" % sql_get_write_node)
            rows = cursor.fetchone()
            if rows:
                des_master_ip = rows[0]
                des_master_port = rows[1]
        else:
            des_master_ip = data[0]["master_ip"]
            des_master_port = data[0]["master_port"]
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
        with open("./upload/{}".format(split_sql_file_path), "rb") as f:
            execute_sql = f.read()
            execute_sql = execute_sql.decode('utf-8')
        logging.info("工单:%s,获取待执行SQL成功",submit_sql_uuid)
    except Exception as e:
        logging.error(str(e))
        print(e)

    # 更新工单状态为执行中
    try:
        sql_update_executing = "update sql_submit_info set dba_execute=2,execute_status=2,submit_sql_execute_plat_or_manual=1,dba_execute_user_name='{}' where submit_sql_uuid='{}'".format(execute_user_name, submit_sql_uuid)
        sql_execute_executing = "update sql_execute_split set dba_execute=2,execute_status=2,submit_sql_execute_plat_or_manual=1 where split_sql_file_path='{}'".format(split_sql_file_path)
        cursor.execute("%s" % sql_update_executing)
        cursor.execute("%s" % sql_execute_executing)
        connection.commit()
        logging.info("工单:%s,状态更改为已执行成功", submit_sql_uuid)
    except Exception as e:
        print(e)
        connection.rollback()
        logging.error("工单:%s,更改工单状态为已执行失败", submit_sql_uuid)
    # 执行工单
    logging.info("工单:%s,master信息为%s_%s", submit_sql_uuid, des_master_ip, des_master_port)
    ret = execute_sql_func(des_master_ip, des_master_port, osc_config_sql, execute_sql)
    if ret["status"] == "ok":
        ret_process_results = process_execute_results(ret["data"])
        if ret_process_results["status"] == "ok":
            if ret_process_results["inception_return_max_code"] == 2:
                sql_update_executing = "update sql_execute_split set execute_status=4 where split_sql_file_path='{}'".format(split_sql_file_path)
                print('执行失败')
            elif ret_process_results["inception_return_max_code"] == 1:
                sql_update_executing = "update sql_execute_split set execute_status=5 where split_sql_file_path='{}'".format(split_sql_file_path)
                print('执行成功含警告')
            elif ret_process_results["inception_return_max_code"] == 0:
                sql_update_executing = "update sql_execute_split set execute_status=3 where split_sql_file_path='{}'".format(split_sql_file_path)
                print('执行成功')
            else:
                sql_update_executing = "update sql_execute_split set execute_status=999 where split_sql_file_path='{}'".format(split_sql_file_path)
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
            sql_execute_error = "update sql_submit_info set execute_status=4 where submit_sql_uuid='{}'".format(submit_sql_uuid)
            sql_update_executing_error = "update sql_execute_split set execute_status=4 where split_sql_file_path='{}'".format(split_sql_file_path)
            cursor.execute("%s" % sql_execute_error)
            cursor.execute("%s" % sql_update_executing_error)
            connection.commit()
        except Exception as e:
            print(e)
            connection.rollback()

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
    try:
        logging.info("工单:%s,开始执行...",submit_sql_uuid)
        main()
        logging.info("工单:%s,执行完成...",submit_sql_uuid)
    except Exception as e:
        logging.error("工单:%s,执行错误...%s",submit_sql_uuid,str(e))
        print(e)
    finally:
        cursor.close()
        connection.close()

