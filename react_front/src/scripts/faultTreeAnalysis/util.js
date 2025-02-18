import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';

// API URLs and Configuration
export const DIFY_BASE_URL = 'http://127.0.0.1/v1';
export const DIFY_API_KEY = 'Bearer app-wET78YZqHYdf3qbBy6HSxzRJ';
export const DIFY_API_KEY_AUTO = 'Bearer app-WvbP3X71cuYGevw523ecNOb2';
export const DIFY_CHAT_URL = `${DIFY_BASE_URL}/chat-messages`;
export const DIFY_CONVERSATIONS_URL = `${DIFY_BASE_URL}/conversations`;
export const COMMAND_EXECUTE_URL = 'http://localhost:8002/execute/';

// Markdown renderer configuration
export const markdownRenderers = {
    code: ({ node, inline, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match ? (
            <SyntaxHighlighter
                style={nightOwl}
                language={match[1]}
                PreTag="div"
                {...props}
            >
                {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
        ) : (
            <code className={className} {...props}>
                {children}
            </code>
        );
    }
};

// Context types definition
export const CONTEXT_TYPES = [
    { key: 'tree', label: '故障树数据', icon: 'cluster', 
      description: '使用故障树结构和关联信息' },
    { key: 'zabbix', label: 'Zabbix可用指标列表', icon: 'line-chart', 
      description: '包含系统性能和状态指标' },
    { key: 'ssh', label: 'SSH命令列表', icon: 'line-chart', 
      description: '执行系统命令' },
    { key: 'mysql', label: 'MySQL命令列表', icon: 'line-chart', 
      description: '执行MySQL命令' }
];

// Default assistants definition
export const DEFAULT_ASSISTANTS = [
    {
        id: 'ssh',
        name: 'SSH助手',
        description: '执行SSH连接、权限配置、日志查看等操作',
        mode: 'ssh_assistant',
        examples: [
            '@SSH助手 连接到 192.168.1.100',
            '@SSH助手 查看 /var/log/mysql/error.log',
            '@SSH助手 检查 mysql 进程状态'
        ]
    },
    {
        id: 'mysql',
        name: 'MySQL助手',
        description: '执行MySQL连接、状态查看、性能分析等操作',
        mode: 'mysql_assistant',
        examples: [
            '@MySQL助手 查看当前连接数',
            '@MySQL助手 检查慢查询日志',
            '@MySQL助手 显示主从状态'
        ]
    },
    {
        id: 'zabbix',
        name: 'Zabbix助手',
        description: '查看监控数据、告警信息、性能图表等',
        mode: 'zabbix_assistant',
        examples: [
            '@Zabbix助手 显示最近告警',
            '@Zabbix助手 查看主机 CPU 使用率',
            '@Zabbix助手 检查磁盘空间'
        ]
    },
    {
        id: 'elasticsearch',
        name: 'ES助手',
        description: '执行Elasticsearch查询、索引管理、集群监控等操作',
        mode: 'es_assistant',
        examples: [
            '@ES助手 查询日志索引',
            '@ES助手 检查集群健康状态',
            '@ES助手 分析字段统计'
        ]
    }
];

// Extract servers from tree data
export const extractServersFromTree = (treeData) => {
    const servers = [];
    const existingIpPorts = new Set();
    
    const traverse = (node) => {
        if (node.ip_port && node.ip_port.ip) {
            const ipPortKey = `${node.ip_port.ip}:${node.ip_port.port || ''}`;
            
            if (!existingIpPorts.has(ipPortKey)) {
                existingIpPorts.add(ipPortKey);
                servers.push({
                    ip: node.ip_port.ip,
                    port: node.ip_port.port,
                    name: node.key || node.ip_port.ip
                });
            }
        }
        if (node.children) {
            node.children.forEach(traverse);
        }
    };
    
    traverse(treeData);
    return servers;
};

// Get standard time format
export const getStandardTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const millisecond = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${millisecond}`;
};

// Common commands for assistants
export const SSH_COMMANDS = [
    // CPU相关
    { value: 'top -n 1', label: 'CPU: 查看系统负载和进程状态，采样1次' },
    { value: 'uptime', label: 'CPU: 查看1/5/15分钟的平均负载' },
    { value: 'mpstat -P ALL 1 3', label: 'CPU: 查看所有CPU核心的使用率统计，每秒采样1次共3次' },
    
    // 内存相关
    { value: 'free -m', label: '内存: 查看系统内存使用情况，以MB为单位' },
    { value: 'vmstat 1 3', label: '内存: 查看虚拟内存使用统计，每秒采样1次共3次' },
    
    // 磁盘相关
    { value: 'df -h', label: '磁盘: 查看各文件系统使用情况，以人类可读方式显示' },
    { value: 'iostat -xz 1 3', label: '磁盘: 查看IO详细统计信息，每秒采样1次共3次' },
    { value: 'lsof | wc -l', label: '磁盘: 统计当前系统打开的文件总数' },
    
    // 网络相关
    { value: 'netstat -ant | grep ESTABLISHED', label: '网络: 查看当前已建立的TCP连接数' },
    { value: 'netstat -anu', label: '网络: 查看所有UDP连接的状态' },
    { value: 'ss -ant', label: '网络: 使用ss命令查看网络连接详情' },
    { value: 'iftop -t -n -P -s 10 | head -n 10', label: '网络: 查看网络流量top10'},
    { value: 'iftop -t -n -P -s 10 | grep "=>" | head -n 10', label: '网络: 查看网络出流量top10'},
    { value: 'iftop -t -n -P -s 10 | grep "<=" | head -n 10', label: '网络: 查看网络入流量top10'},
    { value: 'iptables -L', label: '网络: 查看iptables规则'},
    
    // 进程相关
    { value: 'ps aux --sort=-%cpu | head -10', label: '进程: 按CPU使用率降序显示前10个进程' },
    { value: 'ps aux --sort=-%mem | head -10', label: '进程: 按内存使用率降序显示前10个进程' },
    { value: 'pstree -p', label: '进程: 以树形结构显示进程间父子关系' }
];

export const MYSQL_COMMANDS = [
    { value: 'show variables like "%read_only%"', label: 'MySQL: 查看是否为只读配置'},
    { value: 'show variables like "%connections%"', label: 'MySQL: 查看连接数配置'},
    { value: 'show variables', label: 'MySQL: 查看所有变量配置' },
    { value: 'show variables like "%log%"', label: 'MySQL: 查看日志配置'},
    { value: 'show status', label: 'MySQL: 查看所有运行状态' },
    { value: 'show status like "%connecte%"', label: 'MySQL: 查看连接运行状态' },
    { value: 'show slave status\\G', label: 'MySQL: 查看主从运行状态' },
    { value: 'show master status\\G', label: 'MySQL: 查看主库运行状态' },
    { value: 'show full processlist;', label: 'MySQL: 查看连接列表' },
    { value: 'show engine innodb status\\G', label: 'MySQL: 查看innodb运行状态' },
    { value: 'show variables like "%semi%";', label: 'MySQL: 查看半同步配置'},
    { value: 'show status like "%semi%";', label: 'MySQL: 查看半同步运行状态'},
    { value: 'select user,db,substring_index(host,":",1) ip,count(*) count from information_schema.processlist group by ip order by count;', label: 'MySQL: 查看连接聚合' },
    { value: 'select a.trx_id, a.trx_state, a.trx_started, a.trx_query, b.COMMAND, b.TIME, b.STATE, b.INFO, c.PROCESSLIST_ID, c.PROCESSLIST_USER, c.PROCESSLIST_HOST, c.PROCESSLIST_DB, d.SQL_TEXT FROM information_schema.INNODB_TRX a LEFT JOIN information_schema.PROCESSLIST b ON a.trx_mysql_thread_id = b.id LEFT JOIN performance_schema.threads c ON b.id = c.PROCESSLIST_ID LEFT JOIN performance_schema.events_statements_current d ON d.THREAD_ID = c.THREAD_ID order by a.trx_started desc\\G', label: 'MySQL: 查看未提交事物' },
    { value: 'SELECT * FROM information_schema.INNODB_TRX;', label: 'MySQL: 查看InnoDB事务信息' },
    { value: 'SELECT * FROM information_schema.INNODB_LOCK_WAITS;', label: 'MySQL: 查看锁等待信息' },
    { value: 'SELECT * FROM information_schema.INNODB_LOCKS;', label: 'MySQL: 查看锁详细信息' }
];

// 添加ES相关常量配置
export const ES_MOCK_INDICES = [
    { value: 'logs-*', label: '日志索引' },
    { value: 'metrics-*', label: '指标索引' },
    { value: 'traces-*', label: '链路追踪索引' }
];

export const ES_MOCK_FIELDS = {
    'logs-*': [
        { field: 'timestamp', type: 'date', description: '时间戳' },
        { field: 'level', type: 'keyword', description: '日志级别' },
        { field: 'message', type: 'text', description: '日志内容' },
        { field: 'service', type: 'keyword', description: '服务名称' },
        { field: 'host', type: 'keyword', description: '主机名' }
    ],
    'metrics-*': [
        { field: 'timestamp', type: 'date', description: '时间戳' },
        { field: 'metric_name', type: 'keyword', description: '指标名称' },
        { field: 'value', type: 'float', description: '指标值' },
        { field: 'tags', type: 'object', description: '标签' }
    ],
    'traces-*': [
        { field: 'timestamp', type: 'date', description: '时间戳' },
        { field: 'trace_id', type: 'keyword', description: '追踪ID' },
        { field: 'span_id', type: 'keyword', description: '跨度ID' },
        { field: 'service', type: 'keyword', description: '服务名称' }
    ]
};

export const ES_OPERATORS = {
    keyword: ['is', 'is not', 'in', 'not in'],
    text: ['contains', 'not contains'],
    date: ['>=', '<=', 'between'],
    float: ['>', '<', '>=', '<=', 'between'],
    object: ['exists', 'not exists']
};

// ES查询模板
export const ES_QUERY_TEMPLATES = [
    {
        name: '基础查询',
        description: '使用选定字段进行精确匹配',
        template: {
            query: {
                bool: {
                    must: []
                }
            }
        }
    },
    {
        name: '聚合分析',
        description: '对选定字段进行聚合统计',
        template: {
            size: 0,
            aggs: {}
        }
    }
];
export const MESSAGE_DISPLAY_THRESHOLD = 500;

/**
 * 格式化数值和单位为人类可读的格式
 * @param {number} value - 原始数值
 * @param {string} originalUnit - 原始单位
 * @returns {{value: string, unit: string}} 转换后的数值和单位
 */
export const formatValueWithUnit = (value, originalUnit) => {
    const conversionRules = {
        'B': [
            { threshold: 1024 ** 4, unit: 'TB', divisor: 1024 ** 4 },
            { threshold: 1024 ** 3, unit: 'GB', divisor: 1024 ** 3 },
            { threshold: 1024 ** 2, unit: 'MB', divisor: 1024 ** 2 },
            { threshold: 1024, unit: 'KB', divisor: 1024 },
            { threshold: 0, unit: 'B', divisor: 1 }
        ],
        'bps': [
            { threshold: 1000 ** 4, unit: 'Tbps', divisor: 1000 ** 4 },
            { threshold: 1000 ** 3, unit: 'Gbps', divisor: 1000 ** 3 },
            { threshold: 1000 ** 2, unit: 'Mbps', divisor: 1000 ** 2 },
            { threshold: 1000, unit: 'Kbps', divisor: 1000 },
            { threshold: 0, unit: 'bps', divisor: 1 }
        ]
    };

    const rules = conversionRules[originalUnit] || [{ threshold: 0, unit: originalUnit, divisor: 1 }];
    const rule = rules.find(r => Math.abs(value) >= r.threshold);
    const convertedValue = rule ? (value / rule.divisor).toFixed(2) : value;
    const finalUnit = rule ? rule.unit : originalUnit;

    return { value: convertedValue, unit: finalUnit };
};