# 监控数据和日志采集公共方法

本项目提供了两个公共代码模块，用于通过脚本或方法调用获取监控数据和采集日志。

## 📁 文件结构

```
script/
├── zabbix_api_script.py    # Zabbix API 公共方法模块
├── es_api_script.py        # Elasticsearch API 公共方法模块
├── example_usage.py        # 使用示例脚本
├── requirements.txt        # Python依赖包
└── README.md              # 说明文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置服务器信息

在脚本中修改以下配置：

```python
# Zabbix配置
ZABBIX_URL = "http://82.156.146.51/zabbix"
USERNAME = "Admin"
PASSWORD = "zabbix"

# Elasticsearch配置
ES_HOST = "82.156.146.51"
ES_PORT = 9200
ES_USERNAME = None  # 无需认证
ES_PASSWORD = None  # 无需认证
```

### 3. 运行示例

```bash
# 运行Zabbix API示例
python zabbix_api_script.py

# 运行Elasticsearch API示例
python es_api_script.py

# 运行完整使用示例
python example_usage.py
```

## 📊 Zabbix API 功能

### 🔧 核心功能

- **连接管理**：自动登录/登出
- **主机管理**：获取主机列表、按组筛选
- **监控项管理**：获取监控项、按主机筛选
- **数据获取**：历史数据、趋势数据查询
- **问题监控**：获取当前问题、按严重程度筛选
- **Top N分析**：获取某个指标的Top N主机/IP
- **综合查询**：一次性获取完整监控数据

### 🆕 新功能：字符串时间格式支持

`get_monitoring_data` 方法现在支持标准字符串时间格式，让时间指定更加便捷：

#### 支持的字符串格式

只支持标准格式：**`YYYY-MM-DD HH:MM:SS`**

| 示例 | 说明 |
|------|------|
| `"2025-06-12 09:00:00"` | 2025年6月12日上午9点 |
| `"2025-06-12 17:30:00"` | 2025年6月12日下午5点30分 |
| `"2025-12-31 23:59:59"` | 2025年12月31日晚上11点59分59秒 |

#### 字符串时间使用示例

```python
# 使用字符串指定具体时间范围
data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_from="2025-06-12 09:00:00",
    time_till="2025-06-12 17:00:00"
)

# 工作时间段查询
data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_from="2025-06-12 08:30:00",
    time_till="2025-06-12 18:30:00"
)

# 夜间时段查询
data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_from="2025-06-11 22:00:00",
    time_till="2025-06-12 06:00:00"
)
```

### 🆕 新功能：灵活的时间单位支持

`get_monitoring_data` 方法现在支持多种时间单位，让时间范围指定更加灵活：

#### 支持的时间单位

| 单位 | 说明 | 示例 |
|------|------|------|
| `s` | 秒 | `"30s"` - 最近30秒 |
| `m` | 分钟 | `"15m"` - 最近15分钟 |
| `h` | 小时 | `"2h"` - 最近2小时 |
| `d` | 天 | `"7d"` - 最近7天 |
| `w` | 周 | `"2w"` - 最近2周 |

#### 时间单位使用示例

```python
# 不同时间单位示例
data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_back="30s"  # 最近30秒
)

data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_back="15m"  # 最近15分钟
)

data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_back="6h"  # 最近6小时
)

data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_back="3d"  # 最近3天
)

data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_back="1w"  # 最近1周
)

# 支持小数
data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_back="1.5h"  # 最近1.5小时
)

# 兼容数字格式（默认为小时）
data = zabbix.get_monitoring_data(
    host_identifiers=["server1"],
    item_keys=["system.cpu.util"],
    time_back=2  # 最近2小时（兼容旧版本）
)
```

### 🆕 新功能：自动识别IP地址和主机名

`get_monitoring_data` 方法现在能够**自动识别**输入是IP地址还是主机名，并使用对应的最优查询方式：

```python
# 创建客户端
zabbix = create_zabbix_client(ZABBIX_URL, USERNAME, PASSWORD)

# 通过主机名获取数据
data = zabbix.get_monitoring_data(
    host_identifiers=["zabbix_server", "web-server-01"],
    item_keys=["system.cpu.util", "vm.memory.util"],
    time_back="2h"  # 最近2小时
)

# 通过IP地址获取数据
data = zabbix.get_monitoring_data(
    host_identifiers=["192.168.1.100", "192.168.1.101"],
    item_keys=["system.cpu.util", "vm.memory.util"],
    time_back="30m"  # 最近30分钟
)

# 混合使用主机名和IP地址
data = zabbix.get_monitoring_data(
    host_identifiers=["zabbix_server", "192.168.1.100"],
    item_keys=["system.cpu.util", "vm.memory.util"],
    time_back="1d"  # 最近1天
)
```

### 📈 使用示例

```python
from zabbix_api_script import create_zabbix_client

# 创建客户端
zabbix = create_zabbix_client("http://your-zabbix-url", "username", "password")

# 1. 获取主机列表
hosts = zabbix.get_hosts()
print(f"找到 {len(hosts)} 台主机")

# 2. 获取监控项
items = zabbix.get_items(host_ids=["10001"])
print(f"找到 {len(items)} 个监控项")

# 3. 获取历史数据
history = zabbix.get_history(item_ids=["20001"], hours_back=1)
print(f"获取到 {len(history)} 条历史数据")

# 4. 获取趋势数据
trends = zabbix.get_trends(item_ids=["20001"], time_from=datetime.now() - timedelta(days=7))
print(f"获取到 {len(trends)} 条趋势数据")

# 5. 获取Top N主机
top_hosts = zabbix.get_top_hosts_by_metric("system.cpu.util", limit=10)
print(f"CPU使用率Top10主机: {len(top_hosts)}")

# 6. 获取Top N IP地址
top_ips = zabbix.get_top_ips_by_metric("vm.memory.size[available]", limit=10)
print(f"内存使用Top10 IP: {len(top_ips)}")

# 7. 综合监控数据（支持IP和主机名，支持多种时间单位）
monitoring_data = zabbix.get_monitoring_data(
    host_identifiers=["zabbix_server", "192.168.1.100"],  # 混合使用
    item_keys=["system.cpu.util", "vm.memory.util"],
    time_back="2h"  # 支持多种时间单位
)

# 登出
zabbix.logout()
```

### 🔍 查询方式对比

| 查询方式 | 参数示例 | 说明 |
|----------|----------|------|
| **主机名** | `["zabbix_server", "web-01"]` | 使用Zabbix中配置的主机名 |
| **IP地址** | `["192.168.1.100", "10.0.0.50"]` | 使用主机的IP地址 |
| **混合使用** | `["zabbix_server", "192.168.1.100"]` | 同时使用主机名和IP地址 |

### ⚡ 智能识别和查询逻辑

系统采用以下智能策略：

1. **自动类型识别**：
   - 使用正则表达式自动识别IPv4/IPv6地址
   - 非IP格式的字符串识别为主机名
   - 支持混合输入（主机名+IP地址）

2. **优化查询策略**：
   - **主机名查询**：直接使用Zabbix API的filter参数（高效）
   - **IP地址查询**：获取所有主机后匹配IP（相对较慢）
   - **混合查询**：分别使用最优方式查询后合并结果

3. **自动去重**：确保同一主机不会被重复添加

### 🔍 自动识别示例

```python
# 系统会自动识别以下输入类型：
identifiers = [
    "zabbix_server",           # ✅ 识别为主机名
    "192.168.1.100",          # ✅ 识别为IPv4地址  
    "2001:db8::1",            # ✅ 识别为IPv6地址
    "web-server-01",          # ✅ 识别为主机名
    "10.0.0.50"               # ✅ 识别为IPv4地址
]

# 一次调用，自动使用最优查询方式
data = zabbix.get_monitoring_data(host_identifiers=identifiers)
```

## 📋 Elasticsearch API 功能

### 🔧 核心功能

- **连接管理**：自动连接测试、健康检查
- **索引管理**：列出索引、获取索引信息
- **日志搜索**：按时间范围、日志级别、关键词搜索
- **数据聚合**：统计分析、时间序列聚合
- **综合采集**：批量采集多个索引的日志数据

### 📈 使用示例

```python
from es_api_script import create_elasticsearch_client

# 创建客户端
es = create_elasticsearch_client("localhost", 9200, "username", "password")

# 1. 获取集群健康状态
health = es.get_cluster_health()
print(f"集群状态: {health['status']}")

# 2. 列出索引
indices = es.list_indices()
print(f"找到 {len(indices)} 个索引")

# 3. 搜索日志
logs = es.search_by_time_range(
    index="application-logs",
    start_time=datetime.now() - timedelta(hours=1),
    end_time=datetime.now(),
    size=100
)

# 4. 按日志级别搜索
error_logs = es.search_by_level(
    index="application-logs",
    level="ERROR",
    hours_back=24
)

# 5. 关键词搜索
keyword_logs = es.search_by_keyword(
    index="application-logs",
    keyword="database connection",
    hours_back=6
)

# 6. 综合日志采集
log_data = es.collect_logs(
    indices=["app-logs", "error-logs"],
    hours_back=2,
    max_logs=1000
)
```

## 🔄 组合使用示例

```python
# 组合使用两个API进行故障分析
def analyze_system_issues():
    # 1. 从Zabbix获取有问题的主机
    zabbix = create_zabbix_client(ZABBIX_URL, USERNAME, PASSWORD)
    problems = zabbix.get_problems(severity=4)  # 高严重程度问题
    
    problem_hosts = []
    for problem in problems:
        # 获取问题相关的主机信息
        hosts = zabbix.get_hosts()  # 根据实际需要筛选
        problem_hosts.extend(hosts)
    
    # 2. 从Elasticsearch搜索相关主机的错误日志
    es = create_elasticsearch_client(ES_HOST, ES_PORT)
    
    for host in problem_hosts:
        host_ip = zabbix._get_host_ip(host)
        
        # 搜索该主机的错误日志
        error_logs = es.search_by_keyword(
            index="system-logs",
            keyword=host_ip,
            hours_back=2
        )
        
        print(f"主机 {host['name']} ({host_ip}) 的错误日志: {len(error_logs)} 条")
    
    zabbix.logout()
```

## 📝 配置说明

### Zabbix配置

```python
ZABBIX_CONFIG = {
    "url": "http://your-zabbix-server/zabbix",
    "username": "Admin",
    "password": "your-password"
}
```

### Elasticsearch配置

```python
ES_CONFIG = {
    "host": "your-es-server",
    "port": 9200,
    "username": "your-username",  # 可选
    "password": "your-password",  # 可选
    "use_ssl": False
}
```

## 🛠️ 依赖包

- `requests`: HTTP请求库
- `elasticsearch`: Elasticsearch官方客户端
- `urllib3`: HTTP库（elasticsearch依赖）

## 📚 API参考

### ZabbixAPI类主要方法

| 方法 | 说明 | 参数 |
|------|------|------|
| `get_hosts()` | 获取主机列表 | `group_names`, `host_names` |
| `get_items()` | 获取监控项 | `host_ids`, `item_keys` |
| `get_history()` | 获取历史数据 | `item_ids`, `time_from`, `time_till` |
| `get_trends()` | 获取趋势数据 | `item_ids`, `time_from`, `time_till` |
| `get_problems()` | 获取问题列表 | `host_ids`, `severity` |
| `get_top_hosts_by_metric()` | 获取Top N主机 | `item_key`, `limit`, `hours_back` |
| `get_top_ips_by_metric()` | 获取Top N IP | `item_key`, `limit`, `hours_back` |
| `get_monitoring_data()` | 综合监控数据 | `host_identifiers`, `item_keys`, `time_from`, `time_till`, `time_back` |

### ElasticsearchAPI类主要方法

| 方法 | 说明 | 参数 |
|------|------|------|
| `get_cluster_health()` | 集群健康状态 | 无 |
| `list_indices()` | 列出索引 | 无 |
| `search_by_time_range()` | 按时间搜索 | `index`, `start_time`, `end_time` |
| `search_by_level()` | 按日志级别搜索 | `index`, `level`, `hours_back` |
| `search_by_keyword()` | 关键词搜索 | `index`, `keyword`, `hours_back` |
| `collect_logs()` | 综合日志采集 | `indices`, `hours_back`, `max_logs` |

## ⚡ 性能优化

### 查询性能对比

| 查询方式 | 性能 | 原理 | 适用场景 |
|----------|------|------|----------|
| **主机名查询** | 🟢 最快 | 直接使用API filter | 已知主机名时优先使用 |
| **IP地址查询** | 🟡 较慢 | 需要遍历所有主机匹配IP | 只有IP地址时使用 |
| **混合查询** | 🟡 中等 | 分别使用最优方式后合并 | 同时有主机名和IP时 |

### 性能建议

1. **优先使用主机名**：如果知道主机名，优先使用主机名查询
2. **批量查询**：一次传入多个标识符比多次单独查询更高效
3. **缓存结果**：对于频繁查询的主机，可以缓存主机ID避免重复查询

```python
# ✅ 推荐：批量查询
data = zabbix.get_monitoring_data(
    host_identifiers=["server1", "server2", "192.168.1.100"],
    item_keys=["system.cpu.util", "vm.memory.util"]
)

# ❌ 不推荐：多次单独查询
for identifier in ["server1", "server2", "192.168.1.100"]:
    data = zabbix.get_monitoring_data(host_identifiers=[identifier])
```

## 🧪 测试功能

### 自动识别功能测试

```bash
cd script
python test_auto_detection.py
```

测试内容包括：
- IP地址格式识别准确性
- 主机名识别准确性  
- IPv6地址支持
- 混合查询功能
- 性能对比分析

### 时间单位功能测试

```bash
cd script
python test_time_units.py
```

测试内容包括：
- 各种时间单位解析准确性（s/m/h/d/w）
- 小数时间支持（如1.5h）
- 数字格式兼容性测试
- 错误格式处理验证
- 时间范围计算准确性验证

### 字符串时间格式测试

```bash
cd script
python test_simple_string_time.py
```

测试内容包括：
- 标准字符串时间格式解析（YYYY-MM-DD HH:MM:SS）
- 错误格式处理验证
- 实用场景演示
- 格式统一性验证

## 🔧 故障排除

### 常见问题

1. **连接失败**
   - 检查服务器地址和端口
   - 确认用户名密码正确
   - 检查网络连通性

2. **数据为空**
   - 确认主机名或IP地址正确
   - 检查监控项key是否存在
   - 确认时间范围内有数据

3. **权限错误**
   - 确认Zabbix用户有足够权限
   - 检查Elasticsearch访问权限

### 调试模式

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📄 许可证

本项目采用MIT许可证。

## 🤝 贡献

欢迎提交Issue和Pull Request！ 