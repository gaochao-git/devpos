#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
create_function_design_docs.py
为每个核心模块生成《功能设计文档》
1. 复用功能需求文档的前四大章节（需求介绍、功能需求、非功能需求、验收标准）。
2. 追加第五章【功能设计】、第六章【实施计划】、第七章【测试用例】。
"""
import os
from pathlib import Path
import re

REQ_DIR_TEMPLATE = "nuxx_code/{module}/{module}模块功能需求文档.md"
OUT_DIR_TEMPLATE = "nuxx_code/{module}/{module}模块功能设计文档.md"

MODULES = ['log', 'plugins', 'rw_split', 'security', 'shard', 'sql_extend', 'storage', 'transaction']

# 章节分隔正则，用于提取前四部分
CHAPTER_PATTERN = re.compile(r"^## 四、验收标准", re.MULTILINE)


def read_requirement_prefix(module: str) -> str:
    """读取功能需求文档中从开头到第四章结束的文本。若不存在则返回空字符串"""
    req_path = Path(REQ_DIR_TEMPLATE.format(module=module))
    if not req_path.exists():
        return ""
    text = req_path.read_text(encoding="utf-8")
    # 找到第四章标题行之后的所有内容索引
    match = CHAPTER_PATTERN.search(text)
    if not match:
        return text  # 如果匹配不到，则返回全文
    # 保留直到第四章标题及其后全部内容（即前四章完整内容）
    return text[: match.end()] + "\n"


def create_function_design_doc(module: str):
    """生成功能设计文档"""
    prefix = read_requirement_prefix(module)
    if not prefix:
        print(f"[WARN] 未找到 {module} 模块的功能需求文档，跳过")
        return

    # 为不同模块定制专门的架构图和组件
    module_designs = {
        'log': {
            'arch_graph': '''```mermaid
graph TD
    App[应用程序] --> Logger[日志记录器]
    Logger --> Formatter[格式化器]
    Logger --> Appender[输出器]
    Appender --> FileOut[文件输出]
    Appender --> ConsoleOut[控制台输出]
    Appender --> NetworkOut[网络输出]
    FileOut --> Rotator[文件轮转]
```''',
            'components': [
                ('Logger', '日志记录器', '`log()` / `setLevel()` / `addAppender()`'),
                ('Formatter', '格式化器', '`format()` / `setPattern()`'),
                ('Appender', '输出器', '`append()` / `flush()` / `close()`'),
                ('Rotator', '文件轮转', '`rotate()` / `compress()` / `cleanup()`')
            ],
            'sequence': '''```mermaid
sequenceDiagram
    participant App as 应用程序
    participant Logger as 日志记录器
    participant Formatter as 格式化器
    participant Appender as 输出器
    participant File as 文件系统
    
    App->>Logger: log(level, message)
    Logger->>Formatter: format(record)
    Formatter-->>Logger: formatted_text
    Logger->>Appender: append(formatted_text)
    Appender->>File: write(data)
    File-->>Appender: success
    Appender-->>Logger: complete
```'''
        },
        'plugins': {
            'arch_graph': '''```mermaid
graph TD
    Core[核心系统] --> PluginManager[插件管理器]
    PluginManager --> Registry[插件注册表]
    PluginManager --> Loader[插件加载器]
    PluginManager --> Lifecycle[生命周期管理]
    Loader --> PluginA[插件A]
    Loader --> PluginB[插件B]
    Loader --> PluginC[插件C]
    Registry --> Dependencies[依赖管理]
```''',
            'components': [
                ('PluginManager', '插件管理器', '`load()` / `unload()` / `register()`'),
                ('Registry', '插件注册表', '`register()` / `discover()` / `resolve()`'),
                ('Loader', '插件加载器', '`loadPlugin()` / `unloadPlugin()`'),
                ('Lifecycle', '生命周期管理', '`init()` / `start()` / `stop()` / `destroy()`')
            ],
            'sequence': '''```mermaid
sequenceDiagram
    participant Core as 核心系统
    participant Manager as 插件管理器
    participant Loader as 插件加载器
    participant Plugin as 插件实例
    
    Core->>Manager: loadPlugin(name)
    Manager->>Loader: load(pluginPath)
    Loader->>Plugin: create instance
    Plugin-->>Loader: plugin object
    Loader->>Plugin: init()
    Plugin-->>Loader: success
    Loader-->>Manager: plugin ready
    Manager-->>Core: load complete
```'''
        },
        'rw_split': {
            'arch_graph': '''```mermaid
graph TD
    Client[客户端] --> Router[读写路由器]
    Router --> WritePool[写连接池]
    Router --> ReadPool[读连接池]
    WritePool --> Master[主数据库]
    ReadPool --> Slave1[从数据库1]
    ReadPool --> Slave2[从数据库2]
    ReadPool --> Slave3[从数据库3]
    Router --> Monitor[健康监控]
    Monitor --> Master
    Monitor --> Slave1
    Monitor --> Slave2
    Monitor --> Slave3
```''',
            'components': [
                ('Router', '读写路由器', '`route()` / `selectRead()` / `selectWrite()`'),
                ('ConnectionPool', '连接池', '`getConnection()` / `releaseConnection()`'),
                ('HealthMonitor', '健康监控', '`checkHealth()` / `failover()`'),
                ('LoadBalancer', '负载均衡器', '`balance()` / `updateWeights()`')
            ],
            'sequence': '''```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Router as 读写路由器
    participant Master as 主数据库
    participant Slave as 从数据库
    
    Client->>Router: SELECT查询
    Router->>Slave: 路由到从库
    Slave-->>Router: 查询结果
    Router-->>Client: 返回数据
    
    Client->>Router: INSERT/UPDATE
    Router->>Master: 路由到主库
    Master-->>Router: 执行结果
    Router-->>Client: 返回结果
```'''
        },
        'security': {
            'arch_graph': '''```mermaid
graph TD
    Request[请求] --> AuthGateway[认证网关]
    AuthGateway --> AuthService[认证服务]
    AuthGateway --> AuthzService[授权服务]
    AuthService --> UserStore[用户存储]
    AuthzService --> RoleStore[角色权限]
    AuthGateway --> Audit[审计日志]
    AuthGateway --> Encryption[加密模块]
    Encryption --> DataStore[数据存储]
```''',
            'components': [
                ('AuthService', '认证服务', '`authenticate()` / `login()` / `logout()`'),
                ('AuthzService', '授权服务', '`authorize()` / `checkPermission()`'),
                ('Encryption', '加密模块', '`encrypt()` / `decrypt()` / `hash()`'),
                ('AuditLogger', '审计日志', '`logAccess()` / `logOperation()`')
            ],
            'sequence': '''```mermaid
sequenceDiagram
    participant User as 用户
    participant Gateway as 安全网关
    participant Auth as 认证服务
    participant Authz as 授权服务
    participant Resource as 资源服务
    
    User->>Gateway: 访问请求
    Gateway->>Auth: 验证身份
    Auth-->>Gateway: 认证结果
    Gateway->>Authz: 检查权限
    Authz-->>Gateway: 授权结果
    Gateway->>Resource: 转发请求
    Resource-->>Gateway: 响应
    Gateway-->>User: 返回结果
```'''
        },
        'shard': {
            'arch_graph': '''```mermaid
graph TD
    Client[客户端] --> ShardRouter[分片路由器]
    ShardRouter --> ShardManager[分片管理器]
    ShardManager --> Shard1[分片1]
    ShardManager --> Shard2[分片2]
    ShardManager --> Shard3[分片3]
    ShardRouter --> QueryMerger[查询合并器]
    ShardRouter --> LoadBalancer[负载均衡]
    ShardManager --> Rebalancer[重平衡器]
```''',
            'components': [
                ('ShardRouter', '分片路由器', '`route()` / `locate()` / `distribute()`'),
                ('ShardManager', '分片管理器', '`createShard()` / `migrateShard()`'),
                ('QueryMerger', '查询合并器', '`merge()` / `aggregate()` / `sort()`'),
                ('Rebalancer', '重平衡器', '`rebalance()` / `migrate()` / `monitor()`')
            ],
            'sequence': '''```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Router as 分片路由器
    participant Shard1 as 分片1
    participant Shard2 as 分片2
    participant Merger as 查询合并器
    
    Client->>Router: 跨分片查询
    Router->>Shard1: 子查询1
    Router->>Shard2: 子查询2
    Shard1-->>Merger: 结果1
    Shard2-->>Merger: 结果2
    Merger->>Merger: 合并排序
    Merger-->>Client: 最终结果
```'''
        },
        'sql_extend': {
            'arch_graph': '''```mermaid
graph TD
    SQL[SQL语句] --> Parser[SQL解析器]
    Parser --> AST[抽象语法树]
    AST --> Analyzer[语义分析器]
    Analyzer --> Optimizer[查询优化器]
    Optimizer --> Executor[执行引擎]
    Parser --> FunctionRegistry[函数注册表]
    Optimizer --> RuleEngine[规则引擎]
    Executor --> Storage[存储引擎]
```''',
            'components': [
                ('SQLParser', 'SQL解析器', '`parse()` / `validate()` / `buildAST()`'),
                ('Optimizer', '查询优化器', '`optimize()` / `rewrite()` / `suggest()`'),
                ('FunctionRegistry', '函数注册表', '`register()` / `lookup()` / `invoke()`'),
                ('RuleEngine', '规则引擎', '`applyRules()` / `addRule()` / `evaluate()`')
            ],
            'sequence': '''```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Parser as SQL解析器
    participant Optimizer as 查询优化器
    participant Executor as 执行引擎
    participant Storage as 存储引擎
    
    Client->>Parser: SQL语句
    Parser->>Parser: 词法分析
    Parser->>Parser: 语法分析
    Parser->>Optimizer: AST
    Optimizer->>Optimizer: 查询重写
    Optimizer->>Executor: 执行计划
    Executor->>Storage: 数据操作
    Storage-->>Executor: 结果集
    Executor-->>Client: 查询结果
```'''
        },
        'storage': {
            'arch_graph': '''```mermaid
graph TD
    Application[应用层] --> StorageEngine[存储引擎]
    StorageEngine --> BufferManager[缓冲管理器]
    StorageEngine --> IndexManager[索引管理器]
    StorageEngine --> SpaceManager[空间管理器]
    BufferManager --> Cache[缓存池]
    IndexManager --> BTree[B+树索引]
    IndexManager --> Hash[哈希索引]
    SpaceManager --> Pages[页面管理]
    Pages --> DiskStorage[磁盘存储]
```''',
            'components': [
                ('StorageEngine', '存储引擎', '`read()` / `write()` / `allocate()`'),
                ('BufferManager', '缓冲管理器', '`pin()` / `unpin()` / `flush()`'),
                ('IndexManager', '索引管理器', '`createIndex()` / `search()` / `insert()`'),
                ('SpaceManager', '空间管理器', '`allocatePage()` / `freePage()` / `defrag()`')
            ],
            'sequence': '''```mermaid
sequenceDiagram
    participant App as 应用层
    participant Engine as 存储引擎
    participant Buffer as 缓冲管理器
    participant Index as 索引管理器
    participant Disk as 磁盘存储
    
    App->>Engine: 读取数据
    Engine->>Index: 查找位置
    Index-->>Engine: 页面地址
    Engine->>Buffer: 获取页面
    Buffer->>Disk: 读取页面
    Disk-->>Buffer: 页面数据
    Buffer-->>Engine: 缓存页面
    Engine-->>App: 返回数据
```'''
        },
        'transaction': {
            'arch_graph': '''```mermaid
graph TD
    Client[客户端] --> TxManager[事务管理器]
    TxManager --> LockManager[锁管理器]
    TxManager --> LogManager[日志管理器]
    TxManager --> DeadlockDetector[死锁检测器]
    LockManager --> LockTable[锁表]
    LogManager --> WAL[预写日志]
    TxManager --> RecoveryManager[恢复管理器]
    RecoveryManager --> Checkpoint[检查点]
```''',
            'components': [
                ('TxManager', '事务管理器', '`begin()` / `commit()` / `rollback()`'),
                ('LockManager', '锁管理器', '`lock()` / `unlock()` / `upgrade()`'),
                ('LogManager', '日志管理器', '`writeLog()` / `flush()` / `replay()`'),
                ('DeadlockDetector', '死锁检测器', '`detect()` / `resolve()` / `abort()`')
            ],
            'sequence': '''```mermaid
sequenceDiagram
    participant Client as 客户端
    participant TxMgr as 事务管理器
    participant LockMgr as 锁管理器
    participant LogMgr as 日志管理器
    participant Storage as 存储层
    
    Client->>TxMgr: BEGIN
    TxMgr->>TxMgr: 分配事务ID
    Client->>TxMgr: UPDATE操作
    TxMgr->>LockMgr: 申请写锁
    LockMgr-->>TxMgr: 锁获取成功
    TxMgr->>LogMgr: 写WAL日志
    TxMgr->>Storage: 执行更新
    Client->>TxMgr: COMMIT
    TxMgr->>LogMgr: 写提交日志
    TxMgr->>LockMgr: 释放所有锁
    TxMgr-->>Client: 提交成功
```'''
        }
    }

    design = module_designs.get(module, {
        'arch_graph': f'''```mermaid
graph TD
    API["{module} API"] --> Core["{module} Core"]
    Core --> Store["{module} Store"]
```''',
        'components': [
            ('Core', '核心逻辑处理', '`init()` / `run()` / `stop()`'),
            ('API', '对外接口层', '`create()` / `update()` / `delete()`'),
            ('Store', '数据存储层', '`save()` / `load()`')
        ],
        'sequence': '''```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Core
    participant Store
    Client->>API: 请求
    API->>Core: 业务调用
    Core->>Store: 数据读写
    Store-->>Core: 返回结果
    Core-->>API: 响应
    API-->>Client: 响应数据
```'''
    })

    # 第五章 功能设计
    chapter5 = f"""
## 五、功能设计

### 5.1 总体架构
{module}模块的总体架构如下图所示：

{design['arch_graph']}

### 5.2 组件划分
| 组件 | 职责 | 关键接口 |
|------|------|----------|
{chr(10).join(f"| {comp[0]} | {comp[1]} | {comp[2]} |" for comp in design['components'])}

### 5.3 数据模型
- 列出关键数据结构及说明。
- 使用UML类图或Mermaid表示。

### 5.4 交互流程
典型业务流程时序图：

{design['sequence']}

"""

    # 章节6、7不再需要
    # 仅保留到第五章
    final_content = prefix + chapter5

    out_path = Path(OUT_DIR_TEMPLATE.format(module=module))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(final_content, encoding="utf-8")
    print(f"已生成 {module} 模块功能设计文档 → {out_path}")


def main():
    for m in MODULES:
        create_function_design_doc(m)

if __name__ == "__main__":
    main() 