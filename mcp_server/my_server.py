# server.py
from fastmcp import FastMCP
from zabbix_api_util import get_all_host_metrics, get_zabbix_metrics
import datetime
import pytz

mcp = FastMCP("Demo 🚀")


@mcp.tool()
def mcp_server_get_beijing_time() -> dict:
    """获取当前信息"""
    WEEKDAY_MAP = {
        'Monday': '星期一',
        'Tuesday': '星期二',
        'Wednesday': '星期三',
        'Thursday': '星期四',
        'Friday': '星期五',
        'Saturday': '星期六',
        'Sunday': '星期日'
    }
    
    beijing_tz = pytz.timezone('Asia/Shanghai')
    current_time = datetime.datetime.now(beijing_tz)
    
    # 获取英文星期并转换为中文
    week_en = current_time.strftime("%A")
    week_cn = WEEKDAY_MAP.get(week_en)
    
    return {
        "timestamp": int(current_time.timestamp()),
        "datetime": current_time.strftime("%Y-%m-%d %H:%M:%S"),
        "date": current_time.strftime("%Y-%m-%d"),
        "time": current_time.strftime("%H:%M:%S"),
        "week": week_cn,
        "timezone": "Asia/Shanghai"
    }

@mcp.tool()
def mcp_server_get_all_host_metrics(host_ip: str) -> str:
    """获取所有主机指标名称"""
    result = get_all_host_metrics(host_ip)
    if result.get('data'):
        for item in result['data']:
            item.pop('lastclock', None)
            item.pop('lastvalue', None)
    # 处理 result 中的嵌套结构
    if result.get('status') == 'error':
        return result.get('msg', '获取监控项失败')
        
    return result.get('data')

@mcp.tool()
def mcp_server_get_zabbix_metrics_data(host_ip: str, metric_name: str, time_from: int, time_till: int) -> str:
    """
    获取指定主机指标数据
    :param host_ip: 主机IP地址
    :param metric_name: 指标名称,key_的名称
    :param time_from: 开始时间戳（秒）
    :param time_till: 结束时间戳（秒）
    """
    return get_zabbix_metrics(host_ip, metric_name, time_from, time_till)

if __name__ == "__main__":
    mcp.run(transport="sse", host="0.0.0.0", port=8001) # sse方式