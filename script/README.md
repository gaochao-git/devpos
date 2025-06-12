# 监控数据和日志采集公共方法

这个目录包含了两个公共代码模块，用于获取监控数据和采集日志：

## 文件说明

- `zabbix_api_script.py` - Zabbix API 公共方法，用于获取监控数据
- `es_api_script.py` - Elasticsearch API 公共方法，用于采集日志数据
- `example_usage.py` - 使用示例脚本
- `requirements.txt` - Python依赖包列表

## 安装依赖

```bash
pip install -r requirements.txt
```

## 使用方法

### 1. Zabbix 监控数据获取

```python
from zabbix_api_script import create_zabbix_client

# 创建Zabbix客户端
zabbix = create_zabbix_client(
    url="http://82.156.146.51/zabbix",
    username="Admin",
    password="zabbix"
)

# 获取综合监控数据
monitoring_data = zabbix.get_monitoring_data(
    host_names=["server1", "server2"],
    item_keys=["system.cpu.util", "vm.memory.util"],
    hours_back=2
)

# 获取问题列表
problems = zabbix.get_problems()

# 获取CPU使用率Top10 IP
top_cpu_ips = zabbix.get_top_ips_by_metric(
    item_key="system.cpu.util",
    limit=10,
    hours_back=1
)

# 获取内存使用率Top10 IP  
top_memory_ips = zabbix.get_top_ips_by_metric(
    item_key="vm.memory.util",
    limit=10,
    hours_back=1
)

# 登出
zabbix.logout()
```

### 2. Elasticsearch 日志采集

```python
from es_api_script import create_elasticsearch_client

# 创建Elasticsearch客户端
es_client = create_elasticsearch_client(
    host="82.156.146.51",
    port=9200,
    username=None,  # 无需认证
    password=None   # 无需认证
)

# 采集日志数据
log_data = es_client.collect_logs(
    indices=["mysql-error-*", "mysql-slow-*", "logstash-test"],
    hours_back=2,
    max_logs=5000
)

# 搜索错误日志
error_logs = es_client.search_by_level(
    index="mysql-error-*",
    level="ERROR",
    hours_back=1
)

# 按关键词搜索
keyword_logs = es_client.search_by_keyword(
    index="mysql-error-*",
    keyword="exception",
    hours_back=24
)
```

## 主要功能

### Zabbix API 功能

- **连接管理**: 自动登录/登出
- **主机管理**: 获取主机列表、按组筛选
- **监控项管理**: 获取监控项、按主机筛选
- **数据获取**: 历史数据、趋势数据
- **问题监控**: 获取当前问题、按严重程度筛选
- **Top N分析**: 获取某个指标的Top N主机/IP
- **综合查询**: 一次性获取完整监控数据

### Elasticsearch API 功能

- **连接管理**: 自动连接测试、健康检查
- **索引管理**: 列出索引、获取索引信息
- **日志搜索**: 按时间范围、日志级别、关键词搜索
- **数据聚合**: 统计分析、时间序列聚合
- **综合采集**: 批量采集多个索引的日志数据

## 配置说明

### Zabbix 配置

```python
ZABBIX_CONFIG = {
    "url": "http://82.156.146.51/zabbix",    # Zabbix服务器地址
    "username": "Admin",                      # 用户名
    "password": "zabbix"                      # 密码
}
```

### Elasticsearch 配置

```python
ES_CONFIG = {
    "host": "82.156.146.51",   # ES服务器地址
    "port": 9200,              # ES端口
    "username": None,          # 用户名（无需认证）
    "password": None,          # 密码（无需认证）
    "use_ssl": False,          # 是否使用SSL
    "verify_certs": True       # 是否验证证书
}
```

## 运行示例

```bash
# 运行使用示例
python example_usage.py

# 或者直接运行单个模块
python zabbix_api_script.py
python es_api_script.py
```

## 错误处理

两个模块都包含完善的错误处理机制：

- 连接超时处理
- 认证失败处理
- API错误响应处理
- 网络异常处理
- 数据格式异常处理

## 日志记录

模块使用Python标准logging库记录操作日志：

- INFO级别：正常操作信息
- ERROR级别：错误信息
- 可通过修改logging配置调整日志级别

## 扩展使用

这两个公共方法可以很容易地集成到其他项目中：

1. **定时任务**: 结合cron或其他调度器定期采集数据
2. **监控告警**: 基于采集的数据实现自定义告警逻辑
3. **数据分析**: 将采集的数据导入到分析系统
4. **报表生成**: 基于监控和日志数据生成报表
5. **API服务**: 封装成REST API供其他系统调用

## 注意事项

1. 请根据实际环境修改配置信息
2. 确保网络连通性和认证信息正确
3. 注意API调用频率限制
4. 大量数据查询时注意内存使用
5. 生产环境建议添加更多的错误处理和重试机制 