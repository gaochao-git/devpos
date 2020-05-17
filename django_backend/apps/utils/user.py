from django.db import connection
import logging

logger = logging.getLogger('sql_logger')
# 根据登陆token获取用户信息
def get_login_user(token):
    sql="""select a.username,
                 a.email,
                  case c.title when 0 then '前端开发' when 1 then '后端开发' when 2 then 'qa' when 3 then 'leader' when 4 then 'dba' end title
               from auth_user a inner join authtoken_token b on a.id=b.user_id 
               inner join team_user c on a.username=c.uname
               where b.`key`='{}'""".format(token)
    logger.info(sql)
    cursor = connection.cursor()
    try:
        cursor.execute("%s" % sql)
        rows = cursor.fetchall()
        if rows:
            data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
            return data[0]
        else:
            logger.error("token匹配用户信息失败")
            print("token匹配用户信息失败")
    except Exception as e:
        logger.error(e)
    finally:
        cursor.close()
        connection.close()


# 根据集群名获取write_ip,write_port
def get_cluster_write_node_info(cluster_name):
    sql_get_write_node = """select 
                                    b.host_ip,b.port 
                                from mysql_cluster_instance a inner join mysql_instance b 
                                on a.instance_name=b.instance_name 
                                where a.cluster_name='{}' and b.read_only='off' and b.instance_status=1 limit 1
                                """.format(cluster_name)
    cursor = connection.cursor()
    print(sql_get_write_node)
    try:
        cursor.execute("%s" % sql_get_write_node)
        rows = cursor.fetchone()
        if rows:
            des_master_ip = rows[0]
            des_master_port = rows[1]
            return des_master_ip,des_master_port
        else:
            return "no_write_node"
    except Exception as e:
        print(e)