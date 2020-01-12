from django.http import HttpResponse
import json
import pymysql
def check_sql_func(request):
    print(request.body)
    to_str = str(request.body, encoding="utf-8")
    data = json.loads(to_str)

    print(data)
    db_ip = data['params']['db_ip']
    db_port = data['params']['db_port']
    check_sql_info = data['params']['check_sql_info']
    print(db_ip,db_port,check_sql_info)
    sql = """/*--user=wthong;--password=fffjjj;--host={};--execute=1;--port={};*/\
        inception_magic_start;
        {}   
        inception_magic_commit;""".format(db_ip,db_port,check_sql_info)
    print(sql)
    try:
        conn = pymysql.connect(host='39.97.247.142', user='', passwd='', db='', port=6669,charset="utf8")  # inception服务器
        cur = conn.cursor()
        ret = cur.execute(sql)
        result = cur.fetchall()
        num_fields = len(cur.description)
        field_names = [i[0] for i in cur.description]
        cur.close()
        conn.close()
        data = []
        #[{"sql": "create", "check_resutls": ""}, {}]
        for row in result:
            check_sql = {}
            check_sql["sql"] = row[5]
            check_sql["results"] = row[4]
            data.append(check_sql)
        print(data)
    except Exception as e:
        print("Mysql Error %d: %s" % (e.args[0], e.args[1]))
    return HttpResponse(json.dumps(data),content_type = 'application/json')