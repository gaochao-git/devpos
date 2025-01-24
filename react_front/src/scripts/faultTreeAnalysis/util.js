import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';

// API URLs and Configuration
export const DIFY_BASE_URL = 'http://127.0.0.1/v1';
export const DIFY_API_KEY = 'Bearer app-0awR0muTJbJAISBjgHYli4Dv';
export const DIFY_CHAT_URL = `${DIFY_BASE_URL}/chat-messages`;
export const DIFY_CONVERSATIONS_URL = `${DIFY_BASE_URL}/conversations`;
export const COMMAND_EXECUTE_URL = 'http://localhost:8002/execute';

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