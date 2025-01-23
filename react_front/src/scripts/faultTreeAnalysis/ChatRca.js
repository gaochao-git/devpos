import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Button, message, Select, Tooltip, Tag, Popover, Checkbox, Modal, Divider } from 'antd';
import { Icon } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MyAxios from "../common/interface"
import ZabbixChart from './ZabbixChart';

// API URLs and Configuration
const DIFY_BASE_URL = 'http://127.0.0.1/v1';
const DIFY_API_KEY = 'Bearer app-0awR0muTJbJAISBjgHYli4Dv';
const DIFY_CHAT_URL = `${DIFY_BASE_URL}/chat-messages`;
const DIFY_CONVERSATIONS_URL = `${DIFY_BASE_URL}/conversations`;
const COMMAND_EXECUTE_URL = 'http://localhost:8002/execute';  // 新增命令执行 URL

// 定义 Markdown 渲染器配置
const markdownRenderers = {
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

// 定义上下文类型
const CONTEXT_TYPES = [
    { key: 'tree', label: '故障树数据', icon: 'cluster', 
      description: '使用故障树结构和关联信息' },
    { key: 'zabbix', label: 'Zabbix可用指标列表', icon: 'line-chart', 
      description: '包含系统性能和状态指标' }
];

// 定义 Zabbix 指标列表
const ZABBIX_METRICS = [
    {
        key: 'mysql.status[Bytes_received]',
        label: 'MySQL bytes received per second',
        description: '每秒接收字节数'
    },
    {
        key: 'mysql.status[Bytes_sent]',
        label: 'MySQL bytes sent per second',
        description: '每秒发送字节数'
    },
    {
        key: 'mysql.status[Questions]',
        label: 'MySQL queries per second',
        description: '每秒查询数'
    },
    {
        key: 'mysql.status[Slow_queries]',
        label: 'MySQL slow queries',
        description: '慢查询数'
    }
    // ... 其他 Zabbix 指标
];

// 定义助手列表
const DEFAULT_ASSISTANTS = [
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

// 从 treeData 中提取服务器信息的函数
const extractServersFromTree = (treeData) => {
    const servers = [];
    const existingIpPorts = new Set(); // 用于记录已存在的 IP:port 组合
    
    const traverse = (node) => {
        if (node.ip_port && node.ip_port.ip) {
            // 创建唯一标识符
            const ipPortKey = `${node.ip_port.ip}:${node.ip_port.port || ''}`;
            
            // 如果这个 IP:port 组合还没有被记录过
            if (!existingIpPorts.has(ipPortKey)) {
                existingIpPorts.add(ipPortKey); // 记录这个组合
                servers.push({
                    ip: node.ip_port.ip,
                    port: node.ip_port.port,
                    name: node.key || node.ip_port.ip
                });
            }
        }
        // 继续遍历子节点
        if (node.children) {
            node.children.forEach(traverse);
        }
    };
    
    traverse(treeData);
    return servers;
};

// 历史会话组件
const HistoryConversationModal = ({
    visible,
    onCancel,
    historyData,
    expandedConversations,
    conversationMessages,
    loadingConversations,
    onConversationToggle,
    onContinueConversation
}) => {
    return (
        <Modal
            title="历史会话列表"
            visible={visible}
            onCancel={onCancel}
            footer={[
                <Button key="close" onClick={onCancel}>
                    关闭
                </Button>
            ]}
            width={800}
        >
            <div style={{ 
                maxHeight: '600px', 
                overflowY: 'auto',
                paddingRight: '10px'
            }}>
                {historyData.map(conversation => {
                    const isExpanded = expandedConversations.has(conversation.id);
                    const isLoading = loadingConversations.has(conversation.id);
                    const messages = conversationMessages.get(conversation.id);

                    return (
                        <div 
                            key={conversation.id} 
                            style={{ 
                                marginBottom: '16px',
                                border: '1px solid #e8e8e8',
                                borderRadius: '8px',
                                background: '#fff'
                            }}
                        >
                            <div style={{ 
                                padding: '16px',
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: isExpanded ? '1px solid #e8e8e8' : 'none'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ 
                                        fontSize: '16px', 
                                        fontWeight: 500,
                                        color: '#1890ff'
                                    }}>
                                        {conversation.name || '未命名会话'}
                                    </div>
                                    <div style={{ 
                                        fontSize: '12px', 
                                        color: '#666',
                                        marginTop: '4px'
                                    }}>
                                        {new Date(conversation.created_at * 1000).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px'
                                }}>
                                    <Button
                                        type="primary"
                                        size="small"
                                        onClick={() => onContinueConversation(conversation)}
                                    >
                                        继续对话
                                    </Button>
                                    <div 
                                        onClick={() => onConversationToggle(conversation.id)}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            cursor: 'pointer',
                                            padding: '8px'
                                        }}
                                    >
                                        {isLoading && <Icon type="loading" />}
                                        <Icon 
                                            type={isExpanded ? 'up' : 'down'} 
                                            style={{ fontSize: '16px', color: '#666' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {isExpanded && messages && (
                                <div style={{ padding: '16px' }}>
                                    {messages.map((message, index) => (
                                        <div 
                                            key={message.id}
                                            style={{
                                                marginBottom: index === messages.length - 1 ? 0 : '16px',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                background: '#fff',
                                                border: '1px solid #e8e8e8'
                                            }}
                                        >
                                            {/* 问题部分 */}
                                            <div style={{
                                                padding: '12px',
                                                marginBottom: '8px',
                                                background: '#f0f5ff',
                                                borderRadius: '4px',
                                                border: '1px solid #d6e4ff'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '8px'
                                                }}>
                                                    <Tag color="blue">问题</Tag>
                                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                                        {new Date(message.created_at * 1000).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                                    {message.query}
                                                </div>
                                            </div>

                                            {/* 回答部分 */}
                                            <div style={{
                                                padding: '12px',
                                                background: '#f6ffed',
                                                borderRadius: '4px',
                                                border: '1px solid #b7eb8f'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '8px'
                                                }}>
                                                    <Tag color="green">回答</Tag>
                                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                                        {new Date(message.created_at * 1000).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                                    {message.answer}
                                                </div>
                                            </div>

                                            {/* 参考资料部分 */}
                                            {message.retriever_resources && message.retriever_resources.length > 0 && (
                                                <div style={{ 
                                                    marginTop: '12px',
                                                    padding: '12px',
                                                    background: '#fafafa',
                                                    borderRadius: '4px',
                                                    border: '1px solid #e8e8e8',
                                                    fontSize: '12px'
                                                }}>
                                                    <div style={{ 
                                                        fontWeight: 500, 
                                                        marginBottom: '8px',
                                                        color: '#666'
                                                    }}>
                                                        参考资料
                                                    </div>
                                                    {message.retriever_resources.map((resource, idx) => (
                                                        <div key={idx} style={{ 
                                                            padding: '4px 0',
                                                            borderBottom: idx < message.retriever_resources.length - 1 ? '1px dashed #e8e8e8' : 'none'
                                                        }}>
                                                            <div>来源：{resource.dataset_name} - {resource.document_name}</div>
                                                            <div>相关度：{(resource.score * 100).toFixed(1)}%</div>
                                                            <div style={{ 
                                                                marginTop: '4px',
                                                                padding: '8px',
                                                                background: '#fff',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                color: '#666'
                                                            }}>
                                                                {resource.content}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
};

// 修改获取标准时间格式的公共方法
const getStandardTime = () => {
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

const ChatRca = ({ treeData, style }) => {
    // 消息列表状态
    const [messages, setMessages] = useState([]);
    // 流式响应内容
    const [streamContent, setStreamContent] = useState('');
    // 输入框值
    const [inputValue, setInputValue] = useState('');
    // 是否正在流式响应
    const [isStreaming, setIsStreaming] = useState(false);
    // 选中的上下文类型
    const [selectedContext, setSelectedContext] = useState([]);
    // 会话ID
    const [conversationId, setConversationId] = useState('');
    // 新增状态
    const [atPosition, setAtPosition] = useState(null);
    const [filteredAssistants, setFilteredAssistants] = useState(DEFAULT_ASSISTANTS);
    const [quickSelectMode, setQuickSelectMode] = useState(null);
    const [quickSelectItems, setQuickSelectItems] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [selectedResults, setSelectedResults] = useState(new Set());
    const [activeAssistants, setActiveAssistants] = useState(new Map());
    const [assistantConfigs, setAssistantConfigs] = useState(new Map());
    // 添加状态来控制快捷命令弹出框
    const [showQuickCommands, setShowQuickCommands] = useState(null); // 存储当前显示快捷命令的助手名称
    // 添加 ref 来存储每个助手的输入框引用
    const inputRefs = useRef(new Map());
    // 添加状态来存储每个助手的输入值
    const [assistantInputs, setAssistantInputs] = useState(new Map());
    // 添加新的状态
    // 添加新的状态来跟踪每个助手的执行状态
    const [executingAssistants, setExecutingAssistants] = useState(new Set());
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const messagesContainerRef = useRef(null);
    const lastScrollTop = useRef(0);
    const abortControllerRef = useRef(null);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // 添加新的状态来管理历史会话
    const [historyData, setHistoryData] = useState([]);
    const [expandedConversations, setExpandedConversations] = useState(new Set());
    const [conversationMessages, setConversationMessages] = useState(new Map());
    const [loadingConversations, setLoadingConversations] = useState(new Set());
    const [historyModalVisible, setHistoryModalVisible] = useState(false);

    // 添加状态来存储每个服务器的 Zabbix 监控项
    const [zabbixMetrics, setZabbixMetrics] = useState(new Map());
    const [zabbixMetricsList, setZabbixMetricsList] = useState([]);
    const ASSISTANT_CONFIGS = {
        'SSH助手': {
            prefix: 'ssh> ',
            serverFormat: (ip) => ip,
            commonCommands: [
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
                
                // 进程相关
                { value: 'ps aux --sort=-%cpu | head -10', label: '进程: 按CPU使用率降序显示前10个进程' },
                { value: 'ps aux --sort=-%mem | head -10', label: '进程: 按内存使用率降序显示前10个进程' },
                { value: 'pstree -p', label: '进程: 以树形结构显示进程间父子关系' }
            ]
        },
        'MySQL助手': {
            prefix: 'mysql> ',
            serverFormat: (ip, port) => `${ip}:${port || '3306'}`,
            commonCommands: [
                { value: 'show processlist;', label: 'MySQL: 查看进程列表' },
                { value: 'show slave status\\G', label: 'MySQL: 查看主从状态' },
                { value: 'show master status\\G', label: 'MySQL: 查看主库状态' },
                { value: 'show status like "%Threads_connected%"', label: 'MySQL: 查看连接数' },
                { value: 'show engine innodb status\\G', label: 'MySQL: 查看事务状态' }
            ]
        },
        'Zabbix助手': {
            prefix: 'zabbix> ',
            serverFormat: (ip) => ip,
            commonCommands: [], 
            getMetrics: async (ip) => {
                try {
                    const response = await MyAxios.post('/fault_tree/v1/get_all_metric_names_by_ip/', { "ip": ip });
                    
                    if (response.data.status === "ok") {
                        const metrics = response.data.data.map(metric => ({
                            value: metric.key_,  // 修正为 key_
                            label: metric.name   // 保持不变
                        }));
                        setZabbixMetricsList(metrics);
                        console.log('Zabbix metrics after conversion:', metrics);
                        return metrics;
                    } else {
                        message.error(response.data.message || '获取监控项失败');
                        return [];
                    }
                } catch (error) {
                    console.error('获取 Zabbix 监控项失败:', error);
                    message.error(error.message || '获取监控项失败');
                    return [];
                }
            }
        }
    };

    // 在组件顶部添加新的状态
    const [messageViewModes, setMessageViewModes] = useState(new Map());

    // 将 QUICK_SELECT_CONFIG 移到组件内部
    const QUICK_SELECT_CONFIG = {
        servers: extractServersFromTree(treeData),
        commands: {
            'SSH助手': [
                { cmd: 'ls -l', desc: '列出文件' },
                { cmd: 'df -h', desc: '查看磁盘空间' },
                { cmd: 'free -m', desc: '查看内存使用' }
            ],
            'MySQL助手': [
                { cmd: 'show processlist', desc: '查看连接状态' },
                { cmd: 'show slave status\\G', desc: '查看从库状态' },
                { cmd: 'show master status\\G', desc: '查看主库状态' }
            ],
            'Zabbix助手': [
                { cmd: 'zabbix_get -s host -k key', desc: '获取监控项数据' },
                { cmd: 'zabbix_sender -z server -s host -k key -o value', desc: '发送数据' }
            ]
        }
    };

    // 中断处理
    const handleInterrupt = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    // 修改 handleStream 函数
    const handleStream = async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let lastUpdateTime = Date.now();
        
        // 先添加一个空的助手消息，只显示标签
        setMessages(prev => [...prev, {
            type: 'assistant',
            content: '',
            timestamp: getStandardTime()
        }]);

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '' || !line.startsWith('data: ')) continue;

                    try {
                        const jsonStr = line.slice(6);
                        const data = JSON.parse(jsonStr);

                        if (data.conversation_id && !conversationId) {
                            setConversationId(data.conversation_id);
                        }

                        if (data.answer) {
                            fullContent += data.answer;
                            
                            // 使用时间阈值来控制更新频率
                            const currentTime = Date.now();
                            if (currentTime - lastUpdateTime > 100) {
                                // 更新最后一条消息的内容
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    newMessages[newMessages.length - 1].content = fullContent;
                                    return newMessages;
                                });
                                lastUpdateTime = currentTime;
                            }
                        }
                    } catch (e) {
                        console.warn('JSON parse error:', e);
                    }
                }
            }

            // 确保最后一次更新能立即显示
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = fullContent;
                return newMessages;
            });
            setStreamContent(''); // 清空流式内容

        } catch (error) {
            console.error('Stream processing error:', error);
            throw error;
        } finally {
            setIsStreaming(false);
        }
    };

    // 调用大模型的方法
    const handleModelQuery = async (fullContent) => {
        try {
            // 构建上下文数据
            const contextData = [];
            if (selectedContext.includes('tree') && treeData) {
                contextData.push(`故障树数据：${JSON.stringify(treeData)}`);
            }
            if (selectedContext.includes('zabbix')) {
                contextData.push(`Zabbix可用指标列表：${JSON.stringify(zabbixMetricsList)}`);
            }

            // 组合查询
            const fullQuery = contextData.length > 0
                ? `${contextData.join('\n\n')}\n\n问题：${fullContent}`
                : fullContent;

            const response = await fetch(DIFY_CHAT_URL, {
                method: 'POST',
                headers: {
                    'Authorization': DIFY_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: { "mode": "故障定位" },
                    query: fullQuery,
                    response_mode: 'streaming',
                    conversation_id: conversationId,
                    user: 'system'
                }),
                signal: abortControllerRef.current?.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            await handleStream(response);
            
            // 清空已选择的上下文和选中的结果
            setSelectedContext([]);
            setSelectedResults(new Set());
        } catch (modelError) {
            console.error('大模型调用错误:', modelError);
            setMessages(prev => [...prev, {
                type: 'assistant',
                content: `调用失败: ${modelError.message}`,
                timestamp: getStandardTime(),
                isError: true
            }]);
            message.error('大模型调用失败：' + modelError.message);
            throw modelError;
        }
    };

    // 处理用户滚动
    const handleScroll = () => {
        if (!messagesContainerRef.current) return;
        
        const container = messagesContainerRef.current;
        const currentScrollTop = container.scrollTop;
        
        // 检测向上滚动
        if (currentScrollTop < lastScrollTop.current) {
            setIsUserScrolling(true);
        }
        
        lastScrollTop.current = currentScrollTop;
    };

    // 自动滚动函数
    const scrollToBottom = useCallback(() => {
        if (!isUserScrolling && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [isUserScrolling]);

    // 监听消息更新，处理自动滚动
    useEffect(() => {
        if (messages.length > 0 && !isUserScrolling) {
            scrollToBottom();
        }
    }, [messages, scrollToBottom, isUserScrolling]);

    // 修改 handleSend 函数
    const handleSend = async () => {
        if (!inputValue.trim() || isStreaming) return;
        setIsUserScrolling(false);

        const timestamp = getStandardTime();
        const isAssistantCommand = DEFAULT_ASSISTANTS.some(assistant => 
            inputValue.includes('@' + assistant.name)
        );

        // 获取选中的内容
        const selectedContent = messages
            .filter(msg => selectedResults.has(msg.timestamp))
            .map(msg => msg.content)
            .join('\n\n');

        // 构建完整的消息内容
        const fullContent = selectedContent 
            ? `${selectedContent}\n${inputValue}`
            : inputValue;

        // 先添加用户消息
        const userMessage = {
            type: 'user',
            content: fullContent,
            contexts: selectedContext.map(key => 
                CONTEXT_TYPES.find(t => t.key === key)
            ),
            timestamp: timestamp
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsStreaming(true);
        setStreamContent(''); // 确保在新消息开始时清空流式内容
        abortControllerRef.current = new AbortController();

        try {
            if (isAssistantCommand) {
                await executeCommand(inputValue);
            } else {
                await handleModelQuery(fullContent);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: `调用失败: ${error.message}`,
                    timestamp: timestamp,
                    isError: true
                }]);
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    // 处理输入变化
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        
        // 检查是否以@开头（忽略前面的空格）
        if (value.trim().startsWith('@')) {
            // 先关闭快速选择窗口
            setQuickSelectMode(null);
            setQuickSelectItems([]);
            
            const searchText = value.trim().slice(1).toLowerCase();
            setAtPosition(0);
            
            const filtered = DEFAULT_ASSISTANTS.filter(assistant => 
                assistant.name.toLowerCase().includes(searchText) ||
                assistant.description.toLowerCase().includes(searchText)
            );
            setFilteredAssistants(filtered);
        } else {
            setAtPosition(null);
            setFilteredAssistants(DEFAULT_ASSISTANTS);
        }
    };

    // 处理助手选择
    const handleAssistantSelect = (assistant) => {
        if (!assistant) {
            setAtPosition(null);
            return;
        }
        
        // 添加新的助手输入框
        setActiveAssistants(prev => {
            const newMap = new Map(prev);
            newMap.set(assistant.name, true);
            return newMap;
        });
        
        // 初始化助手配置
        setAssistantConfigs(prev => {
            const newMap = new Map(prev);
            newMap.set(assistant.name, { ip: '', port: '' });
            return newMap;
        });
        
        setAtPosition(null);
        setInputValue('');
    };

    // 添加关闭助手输入框的函数
    const handleCloseAssistant = (assistantName) => {
        setActiveAssistants(prev => {
            const newMap = new Map(prev);
            newMap.delete(assistantName);
            return newMap;
        });
    };

    // 处理键盘事件
    const handleKeyDown = (e) => {
        console.log('Key pressed:', e.key);

        if (e.key === 'Tab') {
            e.preventDefault(); // 阻止默认的 Tab 行为
            
            // 先关闭 @ 窗口
            setAtPosition(null);
            
            const currentAssistant = DEFAULT_ASSISTANTS.find(assistant => 
                inputValue.includes('@' + assistant.name)
            );
            
            if (!quickSelectMode) {
                setQuickSelectMode('server');
                setQuickSelectItems(QUICK_SELECT_CONFIG.commands[currentAssistant.name]);
            } else if (quickSelectMode === 'server') {
                setQuickSelectMode('command');
                const commands = currentAssistant 
                    ? QUICK_SELECT_CONFIG.commands[currentAssistant.name] 
                    : QUICK_SELECT_CONFIG.commands['SSH助手'];
                setQuickSelectItems(commands);
            } else {
                // 当关闭快速选择窗口时，不改变模式，而是重新开始循环
                setQuickSelectMode('server');
                setQuickSelectItems(QUICK_SELECT_CONFIG.commands['SSH助手']);
            }
            
            setSearchText('');
            setSelectedIndex(0);

            // 确保输入框保持焦点
            e.target.focus();
            return;
        }

        // Enter 键处理
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (quickSelectMode) {
                // 处理快速选择
                const items = getFilteredItems();
                if (items.length > 0) {
                    const selectedItem = items[selectedIndex];
                    handleQuickSelect(selectedItem);
                }
                return;
            }
            handleSend();
        }

        // 上下键处理
        if (quickSelectMode && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            const items = getFilteredItems();
            if (items.length === 0) return;

            setSelectedIndex(prevIndex => {
                if (e.key === 'ArrowUp') {
                    return prevIndex > 0 ? prevIndex - 1 : items.length - 1;
                } else {
                    return prevIndex < items.length - 1 ? prevIndex + 1 : 0;
                }
            });
        }

        // Escape 键处理
        if (e.key === 'Escape') {
            setQuickSelectMode(null);
            setQuickSelectItems([]);
            setSearchText('');
            setSelectedIndex(0);
        }
    };

    // 在搜索框的 onBlur 事件中检查是否应该保持焦点
    const handleSearchBlur = (e) => {
        // 如果快速选择窗口是打开的，且不是点击了窗口内的元素，则重新获取焦点
        if (quickSelectMode && !e.relatedTarget?.closest('.quick-select-popup')) {
            e.target.focus();
        }
    };

    // 获取过滤后的项目
    const getFilteredItems = useCallback(() => {
        if (!searchText) return quickSelectItems;
        
        const search = searchText.toLowerCase();
        return quickSelectItems.filter(item => {
            if (quickSelectMode === 'server') {
                return item.name.toLowerCase().includes(search) || 
                       item.ip.toLowerCase().includes(search);
            } else {
                return item.cmd.toLowerCase().includes(search) || 
                       item.desc.toLowerCase().includes(search);
            }
        });
    }, [quickSelectItems, quickSelectMode, searchText]);

    // 处理快速选择
    const handleQuickSelect = (item) => {
        if (!item) return;
        
        const cursorPosition = document.querySelector('.chat-input').selectionStart;
        const textBeforeCursor = inputValue.slice(0, cursorPosition);
        const textAfterCursor = inputValue.slice(cursorPosition);
        
        let insertText;
        if (quickSelectMode === 'server') {
            // 检查当前输入中的助手类型
            const isMySQLAssistant = inputValue.includes('@MySQL助手');
            
            // 根据助手类型格式化 IP 和端口
            if (isMySQLAssistant && item.port) {
                insertText = `${item.ip} -P ${item.port} `; // MySQL 格式：ip -P port
            } else {
                insertText = item.ip + ' '; // SSH 格式：只有 ip
            }
        } else {
            insertText = item.cmd + ' ';
        }
        
        const newValue = textBeforeCursor + insertText + textAfterCursor;
        setInputValue(newValue);
        setQuickSelectMode(null);
        setQuickSelectItems([]);
        setSearchText('');
        setSelectedIndex(0);
        
        // 选择后重新获取输入框焦点
        setTimeout(() => {
            const input = document.querySelector('.chat-input');
            input.focus();
            const newCursorPosition = textBeforeCursor.length + insertText.length;
            input.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 0);
    };

    // 修改 executeCommand 函数中处理 Zabbix 响应的部分
    const executeCommand = async (params) => {
        try {
            if (params.tool === 'zabbix') {
                const response = await MyAxios.post('/fault_tree/v1/get_metric_history_by_ip/', {
                    address: params.address,
                    cmd: params.cmd,
                    time_from: params.time_from,
                    time_till: params.time_till
                });
                
                if (response.data.status === 'ok') {
                    const formattedCommand = `> @${params.tool}助手 ${params.address} ${params.cmd}`;
                    const metricsData = response.data.data;
                    const firstItem = metricsData[0];
                    
                    const headerRow = `指标名称: (${firstItem.key_})\n`;
                    const dataRows = metricsData.map(point => 
                        `${point.metric_time} | ${point.value}${firstItem.units}`
                    ).join('\n');

                    const formatMessage = `${formattedCommand}\n\`\`\`\n${headerRow}${dataRows}\n\`\`\``;
                    
                    const timestamp = getStandardTime();
                    
                    setMessages(prev => {
                        setExecutingAssistants(new Set());
                        return [...prev, {
                            type: 'assistant',
                            content: formatMessage,
                            rawContent: response.data.data,
                            command: `@${params.tool}助手 ${params.address} ${params.cmd}`,
                            timestamp: timestamp,
                            isZabbix: true
                        }];
                    });
                    
                    setMessageViewModes(prev => new Map(prev).set(timestamp, 'chart'));
                    
                    return response.data;
                }
            }
            
            // 其他助手使用原有的 API
            const response = await fetch(COMMAND_EXECUTE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            const result = await response.json();
            
            if (result.status === "ok") {
                const formattedCommand = `> @${params.tool}助手 ${params.address} ${params.cmd}`;
                const formattedResult = `\`\`\`bash\n${result.data}\n\`\`\``;
                const formatMessage = `${formattedCommand}\n${formattedResult}`;
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: formatMessage,
                    rawContent: result.data,
                    command: `@${params.tool}助手 ${params.address} ${params.cmd}`,
                    timestamp: getStandardTime(),
                    isError: false
                }]);
            } else {
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: `执行失败: ${result.message || '未知错误'}`,
                    rawContent: result.message || '未知错误',
                    command: `@${params.tool}助手 ${params.address} ${params.cmd}`,
                    timestamp: getStandardTime(),
                    isError: true
                }]);
            }
            // 重置执行状态
            setExecutingAssistants(new Set());
            return result;
        } catch (error) {
            console.error('执行命令失败:', error);
            message.error(error.message || '执行命令失败');
            // 重置执行状态
            setExecutingAssistants(new Set());
            throw error;
        }
    };

    // 恢复原来的选择处理函数
    const handleResultSelect = (timestamp) => {
        setSelectedResults(prev => {
            const newSet = new Set(prev);
            if (newSet.has(timestamp)) {
                newSet.delete(timestamp);
            } else {
                newSet.add(timestamp);
            }
            return newSet;
        });
    };

    // 添加 useEffect 处理点击外部关闭
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showQuickCommands && !event.target.closest('.assistant-input-container')) {
                setShowQuickCommands(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showQuickCommands]);

    // 处理新开会话
    const handleNewChat = () => {
        setMessages([]);
        setConversationId('');
        setInputValue('');
        setIsStreaming(false);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    // 添加新的函数用于获取会话消息
    const fetchConversationMessages = async (conversationId) => {
        try {
            const response = await fetch(`${DIFY_BASE_URL}/messages?user=system&conversation_id=${conversationId}`, {
                method: 'GET',
                headers: {
                    'Authorization': DIFY_API_KEY,
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('获取会话消息失败:', error);
            throw error;
        }
    };

    // 处理展开/收起的函数
    const handleConversationToggle = async (conversationId) => {
        const isExpanded = expandedConversations.has(conversationId);
        const messages = conversationMessages.get(conversationId);

        // 如果是展开操作且没有消息数据，则先加载消息
        if (!isExpanded && !messages) {
            setLoadingConversations(prev => new Set(prev).add(conversationId));
            try {
                const messagesData = await fetchConversationMessages(conversationId);
                setConversationMessages(prev => new Map(prev).set(conversationId, messagesData.data));
            } catch (error) {
                message.error('获取会话详情失败');
            } finally {
                setLoadingConversations(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(conversationId);
                    return newSet;
                });
            }
        }

        // 更新展开状态
        setExpandedConversations(prev => {
            const newSet = new Set(prev);
            if (isExpanded) {
                newSet.delete(conversationId);
            } else {
                newSet.add(conversationId);
            }
            return newSet;
        });
    };

    // 修改 handleViewHistory 函数
    const handleViewHistory = async () => {
        setIsHistoryLoading(true);
        try {
            const response = await fetch(`${DIFY_CONVERSATIONS_URL}?user=system&limit=20`, {
                method: 'GET',
                headers: {
                    'Authorization': DIFY_API_KEY,
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.data && data.data.length > 0) {
                setHistoryData(data.data);
                setHistoryModalVisible(true);
            } else {
                message.info('暂无历史会话记录');
            }
        } catch (error) {
            console.error('获取历史记录失败:', error);
            message.error('获取历史记录失败，请稍后重试');
        } finally {
            setIsHistoryLoading(false);
        }
    };

    // 修改继续对话的处理函数
    const handleContinueConversation = async (conversation) => {
        try {
            // 获取历史消息
            const messagesData = await fetchConversationMessages(conversation.id);
            
            // 设置会话ID
            setConversationId(conversation.id);
            
            // 修改消息转换逻辑，确保问题和回答都被正确加载
            const convertedMessages = messagesData.data.flatMap(msg => {
                const messages = [];
                
                // 添加用户问题
                if (msg.query) {
                    messages.push({
                        type: 'user',
                        content: msg.query,
                        timestamp: new Date(msg.created_at * 1000).toLocaleString()
                    });
                }
                
                // 添加系统回答
                if (msg.answer) {
                    messages.push({
                        type: 'assistant',
                        content: msg.answer,
                        timestamp: new Date(msg.created_at * 1000).toLocaleString(),
                        // 如果有参考资料，也一并保存
                        retriever_resources: msg.retriever_resources
                    });
                }
                
                return messages;
            });
            
            // 加载转换后的消息到当前对话
            setMessages(convertedMessages);
            
            // 关闭历史对话弹窗
            setHistoryModalVisible(false);
            
            message.success('已加载历史对话');
        } catch (error) {
            console.error('加载历史对话失败:', error);
            message.error('加载历史对话失败');
        }
    };

    // 计算输入区域的总高度
    const getInputAreaHeight = () => {
        const baseHeight = 80; // 基础输入框高度
        return baseHeight; // 保持输入框高度固定
    };

    // 计算助手区域的总高度
    const getAssistantsHeight = () => {
        const assistantHeight = 56; // 每个助手框的高度
        const activeAssistantsCount = Array.from(activeAssistants.keys()).length;
        return activeAssistantsCount * assistantHeight;
    };

    const inputAreaHeight = getInputAreaHeight();
    const assistantsHeight = getAssistantsHeight();

    // 修改复制函数
    const copyToClipboard = (msg) => {
        let content = '';
        
        // 处理不同类型的消息内容
        if (msg.type === 'assistant') {
            if (msg.command) {
                // 所有助手消息（包括Zabbix）都复制显示的内容
                const contentMatch = msg.content.match(/^>.*\n```.*\n([\s\S]*?)\n```/);
                content = contentMatch ? contentMatch[1] : msg.content;
            } else {
                // 大模型回复
                content = msg.content;
            }
        } else {
            content = msg.content;
        }

        navigator.clipboard.writeText(content).then(() => {
            message.success('已复制到剪贴板');
        }).catch(() => {
            message.error('复制失败');
        });
    };

    // 修改选择服务器的处理函数
    const handleServerSelect = async (assistantName, value) => {
        const [ip, port] = value.split(':');
        setAssistantConfigs(prev => 
            new Map(prev).set(assistantName, { ip, port: port || '' })
        );
        
        // 如果是 Zabbix 助手，获取监控项
        if (assistantName === 'Zabbix助手') {
            const metrics = await ASSISTANT_CONFIGS[assistantName].getMetrics(ip);
            setZabbixMetrics(prev => new Map(prev).set(ip, metrics));
            
            // 更新助手配置中的命令列表
            ASSISTANT_CONFIGS[assistantName].commonCommands = metrics;
        }
    };

    // 修改渲染命令选择框的部分
    const renderCommandSelect = (assistantName) => {
        const config = ASSISTANT_CONFIGS[assistantName];
        const serverConfig = assistantConfigs.get(assistantName);
        
        let commands = config.commonCommands;
        if (assistantName === 'Zabbix助手' && serverConfig?.ip) {
            commands = zabbixMetrics.get(serverConfig.ip) || [];
        }
        
        return (
            <Select
                style={{ flex: 1, marginRight: '12px' }}
                placeholder={commands.length ? "选择命令" : "请先选择服务器"}
                showSearch
                value={assistantInputs.get(assistantName) || undefined}
                onChange={(value) => {
                    setAssistantInputs(prev => new Map(prev).set(assistantName, value));
                }}
                optionLabelProp="value"
                filterOption={(input, option) => {
                    const value = option.props.value || '';
                    const label = option.props.children.props.children[0].props.children || '';
                    return (
                        value.toLowerCase().includes(input.toLowerCase()) ||
                        label.toLowerCase().includes(input.toLowerCase())
                    );
                }}
            >
                {commands.map(cmd => (
                    <Select.Option 
                        key={cmd.value} 
                        value={cmd.value}
                    >
                        <div style={{ padding: '4px 0' }}>
                            <div style={{ fontWeight: 'bold' }}>{cmd.value}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{cmd.label}</div>
                        </div>
                    </Select.Option>
                ))}
            </Select>
        );
    };

    return (
        <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: '#f5f5f5',
            position: 'relative',
            overflow: 'hidden',
            ...style
        }}>
            {/* 顶部工具栏 */}
            <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid #e8e8e8',
                background: '#fff',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '16px',
                zIndex: 1000
            }}>
                <Tooltip title="新开会话">
                    <Icon 
                        type="plus-circle" 
                        style={{ 
                            fontSize: '18px',
                            cursor: 'pointer',
                            color: '#1890ff'
                        }}
                        onClick={handleNewChat}
                    />
                </Tooltip>
                <Tooltip title="历史会话">
                    <Icon 
                        type={isHistoryLoading ? "loading" : "history"}
                        style={{ 
                            fontSize: '18px',
                            cursor: isHistoryLoading ? 'not-allowed' : 'pointer',
                            color: '#1890ff'
                        }}
                        onClick={!isHistoryLoading ? handleViewHistory : undefined}
                    />
                </Tooltip>
            </div>

            {/* 消息列表区域 */}
            <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '16px',
                    marginBottom: `${inputAreaHeight + assistantsHeight}px`,
                }}
            >
                {messages.map((msg, index) => (
                    <div key={index} style={{
                        marginBottom: '16px',
                        display: 'flex',
                        justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                        <div style={{
                            maxWidth: '80%',
                            padding: '12px',
                            borderRadius: '8px',
                            background: msg.type === 'user' ? '#91d5ff' : '#fff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            {/* 消息头部 */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px'
                            }}>
                                {/* 左侧角色和时间 */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <Tag color={
                                        msg.type === 'user' ? '#fa8c16' : 
                                        msg.command ? '#52c41a' : 
                                        '#1890ff'
                                    }>
                                        {msg.type === 'user' ? '用户' : 
                                         msg.command ? '助手' : 
                                         '大模型'}
                                    </Tag>
                                    <span style={{ 
                                        fontSize: '12px', 
                                        color: 'rgba(0, 0, 0, 0.45)'
                                    }}>
                                        {msg.timestamp}
                                    </span>
                                </div>

                                {/* 右侧操作按钮 */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {/* 引用勾选框 */}
                                    <Checkbox
                                        checked={selectedResults.has(msg.timestamp)}
                                        onChange={(e) => handleResultSelect(msg.timestamp)}
                                        style={{ marginRight: '8px' }}
                                    />
                                    
                                    {/* Zabbix视图切换按钮 */}
                                    {msg.isZabbix && (
                                        <>
                                            <Button
                                                type="link"
                                                size="small"
                                                icon="file-text"
                                                style={{
                                                    color: messageViewModes.get(msg.timestamp) === 'text' ? '#1890ff' : '#999',
                                                    padding: '4px 8px'
                                                }}
                                                onClick={() => setMessageViewModes(prev => new Map(prev).set(msg.timestamp, 'text'))}
                                            >
                                                文本
                                            </Button>
                                            <Button
                                                type="link"
                                                size="small"
                                                icon="line-chart"
                                                style={{
                                                    color: messageViewModes.get(msg.timestamp) === 'chart' ? '#1890ff' : '#999',
                                                    padding: '4px 8px'
                                                }}
                                                onClick={() => setMessageViewModes(prev => new Map(prev).set(msg.timestamp, 'chart'))}
                                            >
                                                图表
                                            </Button>
                                        </>
                                    )}
                                    
                                    {/* 复制按钮 - 对所有助手消息和大模型回复都显示 */}
                                    {msg.type === 'assistant' && (
                                        <Button
                                            type="link"
                                            size="small"
                                            icon="copy"
                                            style={{ padding: '4px 8px' }}
                                            onClick={() => copyToClipboard(msg)}
                                        >
                                            复制
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* 消息内容 */}
                            {msg.isZabbix ? (
                                messageViewModes.get(msg.timestamp) === 'text' ? (
                                    <ReactMarkdown components={markdownRenderers}>
                                        {msg.content}
                                    </ReactMarkdown>
                                ) : (
                                    <div style={{ 
                                        marginTop: '10px',
                                        width: '100%',  // 修改为100%，与文本宽度一致
                                        overflow: 'hidden'
                                    }}>
                                        <ZabbixChart 
                                            data={msg.rawContent} 
                                            style={{ height: '220px' }}
                                            showHeader={false}
                                        />
                                    </div>
                                )
                            ) : (
                                <ReactMarkdown components={markdownRenderers}>
                                    {msg.content}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 底部输入区域 */}
            <div style={{
                padding: '16px',
                background: '#fff',
                borderTop: '1px solid #e8e8e8',
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
            }}>
                {/* 上下文标签区域 */}
                <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                }}>
                    {selectedContext.map(key => {
                        const contextType = CONTEXT_TYPES.find(t => t.key === key);
                        return (
                            <Tag 
                                key={key}
                                closable
                                onClose={() => {
                                    setSelectedContext(prev => 
                                        prev.filter(k => k !== key)
                                    );
                                }}
                                style={{
                                    margin: 0,
                                    background: '#e6f4ff',
                                    borderColor: '#91caff'
                                }}
                            >
                                <Icon type={contextType.icon} /> {contextType.label}
                            </Tag>
                        );
                    })}
                </div>

                {/* 输入框和发送按钮 */}
                <div style={{ 
                    display: 'flex',
                    gap: '8px',
                    position: 'relative'
                }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        {/* 助手输入框区域 */}
                        {Array.from(activeAssistants.keys()).map(assistantName => {
                            const config = ASSISTANT_CONFIGS[assistantName];
                            if (!config) return null;

                            const isPresetAssistant = assistantName === 'MySQL助手' || 
                                                     assistantName === 'SSH助手' ||
                                                     assistantName === 'Zabbix助手';

                            if (isPresetAssistant) {
                                return (
                                    <div key={assistantName} style={{ 
                                        marginBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '4px 11px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '4px',
                                        background: '#fff',
                                        width: '100%'
                                    }}>
                                        <span style={{ 
                                            color: '#ff4d4f',
                                            fontFamily: 'monospace',
                                            marginRight: '12px',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {config.prefix}
                                        </span>
                                        <Select
                                            style={{ width: '30%', marginRight: '12px' }}
                                            placeholder="选择服务器"
                                            value={assistantConfigs.get(assistantName)?.ip ? 
                                                config.serverFormat(
                                                    assistantConfigs.get(assistantName).ip,
                                                    assistantConfigs.get(assistantName).port
                                                ) : undefined
                                            }
                                            onChange={value => handleServerSelect(assistantName, value)}
                                        >
                                            {QUICK_SELECT_CONFIG.servers.map(server => (
                                                <Select.Option 
                                                    key={server.ip} 
                                                    value={config.serverFormat(server.ip, server.port)}
                                                >
                                                    {config.serverFormat(server.ip, server.port)}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                        {renderCommandSelect(assistantName)}
                                        <div style={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            <div 
                                                style={{ 
                                                    cursor: 'pointer', 
                                                    color: '#1890ff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                                onClick={() => {
                                                    const isExecuting = executingAssistants.has(assistantName);
                                                    
                                                    if (isExecuting) {
                                                        // 实现暂停逻辑
                                                        if (abortControllerRef.current) {
                                                            abortControllerRef.current.abort();  // 中断请求
                                                        }
                                                        setExecutingAssistants(new Set());
                                                        return;
                                                    }

                                                    const value = assistantInputs.get(assistantName);
                                                    const serverConfig = assistantConfigs.get(assistantName);
                                                    
                                                    if (!value) {
                                                        message.warning('请选择要执行的命令');
                                                        return;
                                                    }
                                                    if (!serverConfig?.ip) {
                                                        message.warning('请先选择服务器');
                                                        return;
                                                    }

                                                    // 设置执行状态
                                                    setExecutingAssistants(prev => new Set(prev).add(assistantName));

                                                    const TOOL_MAP = {
                                                        'MySQL助手': 'mysql',
                                                        'SSH助手': 'ssh',
                                                        'Zabbix助手': 'zabbix'
                                                    };

                                                    let params;
                                                    if (assistantName === 'MySQL助手') {
                                                        params = {
                                                            tool: TOOL_MAP[assistantName],
                                                            address: `${serverConfig.ip}:${serverConfig.port || '3306'}`,
                                                            cmd: value
                                                        };
                                                    } else {
                                                        params = {
                                                            tool: TOOL_MAP[assistantName],
                                                            address: serverConfig.ip,
                                                            cmd: value
                                                        };
                                                    }

                                                    // 添加用户消息到对话框
                                                    const userCommand = `@${params.tool}助手 ${params.address} ${params.cmd}`;
                                                    setMessages(prev => [...prev, {
                                                        type: 'user',
                                                        content: userCommand,
                                                        command: userCommand,  // 使用和助手回答相同的属性结构
                                                        timestamp: getStandardTime()
                                                    }]);

                                                    executeCommand(params);
                                                }}
                                            >
                                                {executingAssistants.has(assistantName) ? (
                                                    <>
                                                        <Icon type="pause-circle" />
                                                        暂停
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon type="arrow-right" />
                                                        执行
                                                    </>
                                                )}
                                            </div>
                                            <Icon 
                                                type="close" 
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleCloseAssistant(assistantName)}
                                            />
                                        </div>
                                    </div>
                                );
                            }

                            // ... rest of the code for non-preset assistants ...
                        })}

                        {/* 主输入框 */}
                        <Input
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSearchBlur}
                            className="chat-input"
                            placeholder="输入问题... 按 @ 键选择专业助手，按 Tab 键快速选择服务器"
                            disabled={isStreaming}
                            addonBefore={
                                <Popover
                                    placement="topLeft"
                                    content={
                                        <div>
                                            {CONTEXT_TYPES.map(type => (
                                                <div
                                                    key={type.key}
                                                    onClick={() => {
                                                        if (!selectedContext.includes(type.key)) {
                                                            setSelectedContext(prev => [...prev, type.key]);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '8px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <Icon type={type.icon} /> {type.label}
                                                </div>
                                            ))}
                                        </div>
                                    }
                                    trigger="click"
                                >
                                    <Icon 
                                        type="plus" 
                                        style={{ 
                                            cursor: 'pointer',
                                            fontSize: '16px'
                                        }}
                                    />
                                </Popover>
                            }
                            addonAfter={
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {!isStreaming && (
                                        <Icon 
                                            type="arrow-right"
                                            style={{ 
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                color: '#1890ff'
                                            }}
                                            onClick={handleSend}
                                        />
                                    )}
                                    {isStreaming && (
                                        <Icon 
                                            type="pause-circle" 
                                            style={{ 
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                color: '#ff4d4f'
                                            }}
                                            onClick={handleInterrupt}
                                        />
                                    )}
                                </div>
                            }
                            style={{
                                width: '100%'
                            }}
                        />

                        {/* @ 助手选择弹窗 */}
                        {atPosition !== null && (
                            <div style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: 0,
                                width: '320px',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                padding: '8px',
                                marginBottom: '8px',
                                zIndex: 1000,
                                maxHeight: '400px',
                                overflowY: 'auto',
                                border: '1px solid #e2e8f0'
                            }}>
                                {/* 添加关闭按钮 */}
                                <div 
                                    onClick={() => setAtPosition(null)}
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '8px',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        borderRadius: '50%',
                                        color: '#64748b',
                                        transition: 'background-color 0.2s',
                                        '&:hover': {
                                            background: '#e2e8f0'
                                        }
                                    }}
                                >
                                    <span style={{
                                        fontSize: '18px',
                                        lineHeight: 1,
                                        fontFamily: 'Arial'
                                    }}>×</span>
                                </div>

                                {filteredAssistants.map((assistant) => (
                                    <div
                                        key={assistant.id}
                                        onClick={() => handleAssistantSelect(assistant)}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            background: 'transparent',
                                            '&:hover': {
                                                background: '#f1f5f9'
                                            }
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold', color: '#334155' }}>
                                            {assistant.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            {assistant.description}
                                        </div>
                                        <div style={{ 
                                            marginTop: '8px',
                                            fontSize: '12px',
                                            color: '#94a3b8'
                                        }}>
                                            {assistant.examples[0]}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 快速选择弹窗 */}
                        {quickSelectMode && (
                            <div className="quick-select-popup" style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: 0,
                                width: '320px',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                padding: '8px',
                                marginBottom: '8px',
                                zIndex: 1000,
                                maxHeight: '400px',
                                overflowY: 'auto',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '8px',
                                    padding: '0 4px'
                                }}>
                                    {/* 搜索框 */}
                                    <Input
                                        placeholder={quickSelectMode === 'server' ? "搜索服务器..." : "搜索命令..."}
                                        value={searchText}
                                        onChange={(e) => {
                                            setSearchText(e.target.value);
                                            setSelectedIndex(0);
                                        }}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            borderRadius: '4px',
                                            color: 'white',
                                            width: 'calc(100% - 28px)'
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Tab') {
                                                e.stopPropagation();
                                            }
                                        }}
                                    />
                                    {/* 关闭按钮 */}
                                    <Icon 
                                        type="close" 
                                        onClick={() => {
                                            setQuickSelectMode(null);
                                            setQuickSelectItems([]);
                                            setSearchText('');
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            fontSize: '16px',
                                            padding: '4px'
                                        }}
                                    />
                                </div>

                                {/* 显示过滤后的列表 */}
                                {getFilteredItems().map((item, index) => (
                                    <div
                                        key={quickSelectMode === 'server' ? item.ip : item.value}
                                        onClick={() => handleQuickSelect(item)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        title={quickSelectMode === 'server' ? `${item.name} (${item.ip})` : `${item.value}\n${item.label}`}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            background: index === selectedIndex ? '#e2e8f0' : 'transparent',
                                            transition: 'background-color 0.2s'
                                        }}
                                    >
                                        {quickSelectMode === 'server' ? (
                                            <>
                                                <div style={{ fontWeight: 'bold', color: '#334155' }}>{item.name}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{item.ip}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: 'bold', color: '#334155' }}>{item.value}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{item.label}</div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                
                                {/* 显示无结果提示 */}
                                {getFilteredItems().length === 0 && (
                                    <div style={{ 
                                        padding: '8px 12px', 
                                        color: '#64748b',
                                        textAlign: 'center' 
                                    }}>
                                        未找到匹配结果
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <HistoryConversationModal
                visible={historyModalVisible}
                onCancel={() => setHistoryModalVisible(false)}
                historyData={historyData}
                expandedConversations={expandedConversations}
                conversationMessages={conversationMessages}
                loadingConversations={loadingConversations}
                onConversationToggle={handleConversationToggle}
                onContinueConversation={handleContinueConversation}
            />
        </div>
    );
};

export default ChatRca;
