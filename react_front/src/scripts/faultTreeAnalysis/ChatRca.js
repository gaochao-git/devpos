import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Button, message, Select, Tooltip, Tag, Popover, Checkbox } from 'antd';
import { Icon } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { debounce } from 'lodash';

const difyApiUrl = 'http://127.0.0.1/v1/chat-messages';
const difyApiKey = 'Bearer app-0awR0muTJbJAISBjgHYli4Dv';

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

// 定义助手配置
const ASSISTANT_CONFIGS = {
    'MySQL助手': {
        prefix: 'mysql> ',
        serverFormat: (ip, port) => `${ip}:${port || '3306'}`,
        commandFormat: (ip, port, command) => `${ip} -P ${port} -e "${command}"`,
        commonCommands: [
            { label: 'show processlist', value: 'show processlist' },
            { label: 'show tables', value: 'show tables' },
            { label: 'show status', value: 'show status' }
        ]
    },
    'SSH助手': {
        prefix: 'ssh> ',
        serverFormat: (ip) => ip,
        commandFormat: (ip, _, command) => `${ip} ${command}`,
        commonCommands: [
            { label: 'df -h', value: 'df -h' },
            { label: 'free -m', value: 'free -m' },
            { label: 'top -n 1', value: 'top -n 1' }
        ]
    },
    'Zabbix助手': {
        prefix: 'zabbix> ',
        serverFormat: (ip) => ip,
        commandFormat: (ip, _, command) => `${ip} "${command}"`,
        commonCommands: [
            { label: '主机列表', value: 'host.get' },
            { label: '监控项', value: 'item.get' },
            { label: '告警历史', value: 'alert.get' }
        ]
    }
};

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

    // 修改 createParser 函数来处理错误事件
    const createParser = (onEvent, onError) => {
        return {
            feed(chunk) {
                try {
                    const lines = chunk.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.slice(6);
                            try {
                                const jsonData = JSON.parse(jsonStr);
                                if (jsonData.event === 'error') {
                                    // 处理错误事件
                                    onError(jsonData);
                                } else if (jsonData.answer) {
                                    // 处理正常响应
                                    onEvent(jsonData);
                                }
                            } catch (jsonError) {
                                console.error('JSON parse error:', jsonError);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Parse error:', e, 'Chunk:', chunk);
                }
            }
        };
    };

    // 重新添加 debounceSetStreamContent，但使用较小的延迟时间
    const debounceSetStreamContent = useCallback(
        debounce((content) => {
            setStreamContent(content);
        }, 50),  // 将延迟时间从 100ms 减少到 50ms，提高响应性
        []
    );

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
            timestamp: new Date().toLocaleTimeString()
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
                contextData.push(`Zabbix可用指标列表：${JSON.stringify(ZABBIX_METRICS.map(metric => ({
                    key: metric.key,
                    label: metric.label
                })))}`);
            }

            // 组合查询
            const fullQuery = contextData.length > 0
                ? `${contextData.join('\n\n')}\n\n问题：${fullContent}`
                : fullContent;

            const response = await fetch(difyApiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': difyApiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: { "mode": "故障定位" },
                    query: fullQuery,
                    response_mode: 'streaming',
                    conversation_id: conversationId,
                    user: 'system'
                })
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
                timestamp: new Date().toLocaleTimeString(),
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
            timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsStreaming(true);
        setStreamContent(''); // 确保在新消息开始时清空流式内容

        try {
            if (isAssistantCommand) {
                await executeCommand(inputValue);
            } else {
                await handleModelQuery(fullContent);
            }
        } catch (error) {
            console.error('Error:', error);
            if (!isAssistantCommand && !error.handled) {
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: '发送消息失败，请稍后重试',
                    timestamp: new Date().toLocaleTimeString(),
                    isError: true
                }]);
            }
            message.error(isAssistantCommand ? '执行命令失败' : '发送消息失败，请稍后重试');
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
                setQuickSelectItems(QUICK_SELECT_CONFIG.servers);
            } else if (quickSelectMode === 'server') {
                setQuickSelectMode('command');
                const commands = currentAssistant 
                    ? QUICK_SELECT_CONFIG.commands[currentAssistant.name] 
                    : QUICK_SELECT_CONFIG.commands['SSH助手'];
                setQuickSelectItems(commands);
            } else {
                // 当关闭快速选择窗口时，不改变模式，而是重新开始循环
                setQuickSelectMode('server');
                setQuickSelectItems(QUICK_SELECT_CONFIG.servers);
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

    // 添加 executeCommand 函数定义
    const executeCommand = async (command) => {
        try {
            const response = await fetch('http://localhost:8002/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    command: command
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.detail || '未知错误');
            }

            if (responseData.success) {
                // 将结果格式化为 Markdown 代码块
                const formattedCommand = `> ${command}`;
                const formattedResult = `\`\`\`bash\n${responseData.result}\n\`\`\``;
                const formatMessage = `${formattedCommand}\n${formattedResult}`;
                // 添加助手响应到消息列表
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: formatMessage,
                    command: command,
                    timestamp: new Date().toLocaleTimeString()
                }]);
            } else {
                throw new Error(responseData.result || '执行失败');
            }
            
            return responseData;

        } catch (error) {
            console.error('执行命令失败:', error);
            // 添加错误消息到对话列表
            setMessages(prev => [...prev, {
                type: 'assistant',
                content: `执行失败: ${error.message}`,
                command: command,
                timestamp: new Date().toLocaleTimeString(),
                isError: true
            }]);
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

    return (
        <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            background: '#f5f5f5',
            ...style
        }}>
            <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    maxHeight: '500px',
                    scrollBehavior: 'smooth'
                }}
            >
                {messages.map((msg, index) => (
                    <div key={index} style={{
                        marginBottom: '16px',
                        display: 'flex',
                        flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}>
                        <div style={{
                            flex: 1,
                            maxWidth: '80%',
                            padding: '12px',
                            borderRadius: '8px',
                            background: msg.type === 'user' ? '#91d5ff' : '#fff',
                            color: msg.type === 'user' ? '#333' : '#333',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            {/* 角色、时间和勾选框放在一行 */}
                            <div style={{
                                display: 'flex',
                                justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                                alignItems: 'center',
                                marginBottom: '8px',
                                gap: '8px'
                            }}>
                                <div style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    color: '#fff',
                                    background: msg.type === 'user' ? '#fa8c16' : 
                                               (msg.command ? '#52c41a' : '#722ed1'),
                                }}>
                                    {msg.type === 'user' ? '用户' : 
                                     (msg.command ? '助手' : '大模型')}
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    color: msg.type === 'user' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)',
                                }}>
                                    {msg.timestamp}
                                </div>
                                {/* 只在助手返回的命令结果上显示勾选框 */}
                                {msg.type === 'assistant' && msg.command && (
                                    <Checkbox
                                        checked={selectedResults.has(msg.timestamp)}
                                        onChange={() => handleResultSelect(msg.timestamp)}
                                    />
                                )}
                            </div>

                            {/* 消息内容 */}
                            {msg.type === 'user' ? (
                                <div>
                                    <div className="context-tags" style={{ marginBottom: '8px' }}>
                                        {msg.contexts?.map(ctx => (
                                            <Tag key={ctx.key} icon={<Icon type={ctx.icon} />}>
                                                {ctx.label}
                                            </Tag>
                                        ))}
                                    </div>
                                    <ReactMarkdown components={markdownRenderers}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <ReactMarkdown components={markdownRenderers}>
                                    {msg.content}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                padding: '16px',
                background: '#fff',
                borderTop: '1px solid #e8e8e8'
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
                            
                            // 修改助手命令发送处理函数
                            const handleAssistantSend = async () => {
                                const command = assistantInputs.get(assistantName)?.trim();
                                if (command) {
                                    const assistantConfig = assistantConfigs.get(assistantName);
                                    if (!assistantConfig?.ip) {
                                        message.warning('请先选择服务器');
                                        return;
                                    }
                                    const fullCommand = `@${assistantName} ${config.commandFormat(
                                        assistantConfig.ip,
                                        assistantConfig.port,
                                        command
                                    )}`;
                                    
                                    setExecutingAssistants(prev => new Set(prev).add(assistantName)); // 设置该助手的执行状态
                                    try {
                                        await executeCommand(fullCommand);
                                        // 清空输入但保持配置
                                        setAssistantInputs(prev => 
                                            new Map(prev).set(assistantName, '')
                                        );
                                    } catch (error) {
                                        console.error('执行命令失败:', error);
                                    } finally {
                                        setExecutingAssistants(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(assistantName);
                                            return newSet;
                                        }); // 清除该助手的执行状态
                                    }
                                }
                            };
                            
                            return (
                                <div key={assistantName} style={{ marginBottom: '8px', position: 'relative' }}>
                                    <Input
                                        ref={el => {
                                            if (el) {
                                                inputRefs.current.set(assistantName, el);
                                            }
                                        }}
                                        value={assistantInputs.get(assistantName) || ''}
                                        onChange={e => {
                                            const newValue = e.target.value;
                                            setAssistantInputs(prev => new Map(prev).set(assistantName, newValue));
                                        }}
                                        addonBefore={
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ 
                                                    color: '#ff4d4f',
                                                    fontFamily: 'monospace',
                                                    marginLeft: '8px'
                                                }}>
                                                    {config.prefix}
                                                </span>
                                                <Select
                                                    style={{ width: 160 }}
                                                    placeholder="选择服务器"
                                                    value={assistantConfigs.get(assistantName)?.ip ? 
                                                        config.serverFormat(
                                                            assistantConfigs.get(assistantName).ip,
                                                            assistantConfigs.get(assistantName).port
                                                        ) : undefined
                                                    }
                                                    onChange={value => {
                                                        const [ip, port] = value.split(':');
                                                        setAssistantConfigs(prev => 
                                                            new Map(prev).set(assistantName, { ip, port: port || '3306' })
                                                        );
                                                    }}
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
                                                
                                            </div>
                                        }
                                        addonAfter={
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div 
                                                    style={{ 
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        color: '#1890ff'
                                                    }}
                                                    onClick={handleAssistantSend}
                                                >
                                                    发送
                                                </div>
                                                {executingAssistants.has(assistantName) && (
                                                    <Icon 
                                                        type="close-circle" 
                                                        style={{ 
                                                            cursor: 'pointer',
                                                            color: '#ff4d4f'
                                                        }}
                                                        onClick={() => {
                                                            setExecutingAssistants(prev => {
                                                                const newSet = new Set(prev);
                                                                newSet.delete(assistantName);
                                                                return newSet;
                                                            });
                                                        }}
                                                    />
                                                )}
                                                <Icon 
                                                    type="close" 
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleCloseAssistant(assistantName)}
                                                />
                                            </div>
                                        }
                                        placeholder={`输入命令... (按 Tab 键查看常用命令)`}
                                        onKeyDown={e => {
                                            if (e.key === 'Tab') {
                                                e.preventDefault();
                                                setShowQuickCommands(assistantName);
                                            } else if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAssistantSend();
                                            }
                                        }}
                                    />
                                    
                                    {/* 快捷命令弹出框 */}
                                    {showQuickCommands === assistantName && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: 0,
                                            right: 0,
                                            background: '#fff',
                                            border: '1px solid #d9d9d9',
                                            borderRadius: '4px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                            zIndex: 1000,
                                            marginBottom: '4px',
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                        }}>
                                            {config.commonCommands.map(cmd => (
                                                <div
                                                    key={cmd.value}
                                                    style={{
                                                        padding: '8px 12px',
                                                        cursor: 'pointer',
                                                        hover: {
                                                            backgroundColor: '#f5f5f5'
                                                        }
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.backgroundColor = '#fff';
                                                    }}
                                                    onClick={() => {
                                                        setAssistantInputs(prev => {
                                                            const newMap = new Map(prev);
                                                            newMap.set(assistantName, cmd.value);
                                                            return newMap;
                                                        });
                                                        setShowQuickCommands(null);
                                                    }}
                                                >
                                                    {cmd.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
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
                                    <div 
                                        style={{ 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: '#1890ff'
                                        }}
                                        onClick={handleSend}
                                    >
                                        <Icon type="message" style={{ marginRight: '4px' }} />
                                        发送
                                    </div>
                                    {isStreaming && (
                                        <Icon 
                                            type="close-circle" 
                                            style={{ 
                                                cursor: 'pointer',
                                                color: '#ff4d4f'
                                            }}
                                            onClick={() => setIsStreaming(false)}
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
                                background: '#1e40af',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                padding: '8px',
                                marginBottom: '8px',
                                zIndex: 1000,
                                maxHeight: '400px',
                                overflowY: 'auto'
                            }}>
                                {/* @ 助手选择弹窗内容 */}
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
                                                background: 'rgba(255, 255, 255, 0.1)'
                                            }
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold', color: 'white' }}>
                                            {assistant.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                            {assistant.description}
                                        </div>
                                        <div style={{ 
                                            marginTop: '8px',
                                            fontSize: '12px',
                                            color: 'rgba(255, 255, 255, 0.5)'
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
                                background: '#1e40af',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                padding: '8px',
                                marginBottom: '8px',
                                zIndex: 1000,
                                maxHeight: '400px',
                                overflowY: 'auto'
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
                                        key={quickSelectMode === 'server' ? item.ip : item.cmd}
                                        onClick={() => handleQuickSelect(item)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            background: index === selectedIndex ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                                            transition: 'background-color 0.2s'
                                        }}
                                    >
                                        {quickSelectMode === 'server' ? (
                                            <>
                                                <div style={{ fontWeight: 'bold', color: 'white' }}>{item.name}</div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>{item.ip}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: 'bold', color: 'white' }}>{item.cmd}</div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>{item.desc}</div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                
                                {/* 显示无结果提示 */}
                                {getFilteredItems().length === 0 && (
                                    <div style={{ 
                                        padding: '8px 12px', 
                                        color: 'rgba(255, 255, 255, 0.7)',
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
        </div>
    );
};

export default ChatRca;
