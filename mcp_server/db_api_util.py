import pymysql

# 固定的数据库连接信息
DB_USER = 'gaochao'  # 替换为你的用户名
DB_PASSWORD = 'fffjjj'  # 替换为你的密码

def execute_query(instance_name, schme_name, query):
    # 连接到数据库
    host_ip = instance_name.split('_')[0].strip()
    host_port = instance_name.split('_')[1].strip()
    connection = pymysql.connect(host=host_ip, port=int(host_port), user=DB_USER,password=DB_PASSWORD, database=schme_name)
    try:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()
            # 将结果转换为字典列表
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in rows], None  # 返回结果和 None 作为错误
    except Exception as e:  # 捕获所有异常
        return None, str(e)  # 返回 None 作为结果和错误信息
    finally:
        connection.close()

def get_all_table_names_and_comments(instance_name, schme_name):
    # 获取指定库中的表名和备注
    print("get_all_table_names_and_comments")
    query = f"SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.tables WHERE TABLE_SCHEMA='{schme_name}'"
    tables, error = execute_query(instance_name, schme_name, query)
    if error: return error  # 返回错误信息
    res = {table['TABLE_NAME']: table['TABLE_COMMENT'] for table in tables}  # 返回表名和备注的字典
    print(res)
    return res

def get_table_structures(instance_name, schme_name, table_names):
    print("get_table_structures")
    structures = []
    table_names = table_names.split(',')
    for table_name in table_names:
        # 获取表结构
        query = f"SHOW CREATE TABLE {table_name}"
        structure, error = execute_query(instance_name, schme_name, query)  # 获取所有结果和错误信息
        print(structure, error)
        if error: return error  # 返回错误信息
        structures.append(structure[0]['Create Table'])  # 表结构在 'Create Table' 列
    return "\n\n".join(structures)  # 用换行符拼接多个表结构

# 示例用法
# table_info, error = get_all_table_names_and_comments()
# if error:
#     print(f"错误: {error}")
# else:
#     print(table_info)  # 输出字典形式的表名和备注
# table_structures, error = get_table_structures(table_info.keys())
# if error:
#     print(f"错误: {error}")
# else:
#     print(table_structures)