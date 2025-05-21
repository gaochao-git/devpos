# server.py
from fastmcp import FastMCP
from db_api_util import get_all_table_names_and_comments, get_table_structures


mcp = FastMCP("Demo 🚀")


@mcp.tool()
def mcp_server_get_all_table_names_and_comments(instance_name: str, schema_name: str) -> str:
    """
    获取数据库中的表名及表备注
    :param instance_name: 数据库实例地址ip_port格式
    :param schema_name: 数据库库名
    """
    return get_all_table_names_and_comments(instance_name, schema_name)
    
        
@mcp.tool()
def mcp_server_get_table_structures(instance_name: str, schema_name: str, table_names: str) -> str:
    """
    获取数据库中的指定表的表结构
    :param instance_name: 数据库实例地址ip_port格式
    :param schema_name: 数据库库名
    :param table_names: 表名，多个表用英文逗号拼接
    """
    return get_table_structures(instance_name, schema_name, table_names)

if __name__ == "__main__":
    mcp.run(transport="sse", host="0.0.0.0", port=8001) # sse方式