from django.db import connection
import pymysql


# inception拆分SQL
def split_sql_func(submit_sql_uuid):
    # 查询工单信息
    try:
        cursor = connection.cursor()
        sql_select = "select master_ip,master_port, submit_sql_file_path from sql_execute where submit_sql_uuid='{}'".format(submit_sql_uuid)
        cursor.execute("%s" % sql_select)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        sql_file_path = data[0]["submit_sql_file_path"]
        master_ip = data[0]["master_ip"]
        master_port = data[0]["master_port"]
        with open("./upload/{}".format(sql_file_path), "rb") as f:
            execute_sql = f.read()
            execute_sql = execute_sql.decode('utf-8')
        start_split_sql(cursor,submit_sql_uuid,master_ip, master_port, execute_sql, sql_file_path)
        message = "拆分任务成功"
    except Exception as e:
        message = "拆分任务失败"
        print(e)
    finally:
        cursor.close()
        connection.close()
        return message


# 开始拆分
def start_split_sql(submit_sql_uuid,master_ip, master_port, execute_sql, sql_file_path):
    # 拆分SQL
    sql = """/*--user=wthong;--password=fffjjj;--host={};--port={};--enable-split;*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(master_ip, master_port, execute_sql)
    try:
        conn = pymysql.connect(host='39.97.247.142', user='', passwd='', db='', port=6669, charset="utf8")  # inception服务器
        cur = conn.cursor()
        cur.execute(sql)
        sql_tuple = cur.fetchall()
        write_split_sql_to_new_file(master_ip, master_port,submit_sql_uuid,sql_tuple,sql_file_path)
        message = "拆分SQL成功"
    except Exception as e:
        message = "拆分SQL失败"
        print("Mysql Error %d: %s" % (e.args[0], e.args[1]))
    finally:
        cur.close()
        conn.close()
        return message


# 将拆分SQL写入拆分文件,并将自任务写入sql_execute_split
def write_split_sql_to_new_file(cursor,master_ip, master_port,submit_sql_uuid,sql_tuple,sql_file_path):
    try:
        result = []
        result_tmp = {}
        result_copy = {}
        for tup in sql_tuple:
            result_tmp['split_seq'] = tup[0]
            result_tmp['sql'] = tup[1]
            result_tmp['ddlflag'] = tup[2]
            result_tmp['sql_num'] = tup[3]
            result_copy = result_tmp.copy()
            result.append(result_copy)
            result_tmp.clear()
        for i in result:
            ddlflag = i["ddlflag"]
            split_seq = i["split_seq"]
            sql_num = i["sql_num"]
            sql = i["sql"]
            dir_name = sql_file_path.split('/')[0]
            file_name = sql_file_path.split('/')[1]
            split_file_name = str(split_seq) + '_' + file_name
            upfile = './upload/' + dir_name + '/' + split_file_name
            split_seqsplit_sql_file_path = dir_name + '/' + split_file_name
            with open(upfile, 'w') as f:
                f.write(sql)
            print(9999999)
            insert_split_sql = """insert into sql_execute_split(
                                    submit_sql_uuid,
                                    split_seq,
                                    split_seqsplit_sql_file_path,
                                    sql_num,
                                    ddlflag,
                                    master_ip,
                                    master_port
                                    ) values('{}',{},'{}',{},{},'{}',{})
                                """.format(submit_sql_uuid,split_seq,split_seqsplit_sql_file_path,sql_num,ddlflag,master_ip, master_port)
            cursor.execute(insert_split_sql)
            print(insert_split_sql)
        message = "拆分后SQL写入新文件成功"
    except Exception as e:
        message = "拆分后SQL写入新文件失败"
        print(e)
    finally:
        return message