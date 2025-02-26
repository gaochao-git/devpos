import React, { useState, useCallback, useEffect, useRef } from 'react';
import { message, Tooltip, Select } from 'antd';
import { Icon } from 'antd';
import MyAxios from "../common/interface"
import { AssistantContainer, registry } from './assistants';
import {
    DIFY_BASE_URL,
    DIFY_API_KEY,
    DIFY_API_KEY_AUTO,
    DIFY_CHAT_URL,
    DIFY_CONVERSATIONS_URL,
    COMMAND_EXECUTE_URL,
    CONTEXT_TYPES,
    extractServersFromCluster,
    getStandardTime,
    SSH_COMMANDS,
    MYSQL_COMMANDS,
} from './util';

// 从 components 目录导入组件
import HistoryConversationModal from './components/historyConversation';
import UserInput from './components/UserInput';
import MessageItem from './components/MessageItem';
import ContextTags from './components/ContextTags';

const ChatRca = (props) => {
    // 基础状态
    const [messages, setMessages] = useState([]);
    const [streamContent, setStreamContent] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedContext, setSelectedContext] = useState([]);
    const [conversationId, setConversationId] = useState('');
    
    // 添加clusterServers状态来存储服务器信息
    const [clusterServers, setClusterServers] = useState([]);

    // 助手相关状态
    const [atPosition, setAtPosition] = useState(null);
    const [filteredAssistants, setFilteredAssistants] = useState([]);
    const [activeAssistants, setActiveAssistants] = useState(new Map());
    const [assistantConfigs, setAssistantConfigs] = useState(new Map());
    const [assistantInputs, setAssistantInputs] = useState(new Map());
    const [executingAssistants, setExecutingAssistants] = useState(new Set());
    const [quickSelectMode, setQuickSelectMode] = useState(null);
    const [quickSelectItems, setQuickSelectItems] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [zabbixMetrics, setZabbixMetrics] = useState(new Map());
    const [hoveredAssistant, setHoveredAssistant] = useState(null);

    // 消息展示相关状态
    const [selectedResults, setSelectedResults] = useState(new Set());
    const [messageViewModes, setMessageViewModes] = useState(new Map());
    const [expandedMessages, setExpandedMessages] = useState(new Set());
    const [isUserScrolling, setIsUserScrolling] = useState(false);

    // 历史会话相关状态
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [expandedConversations, setExpandedConversations] = useState(new Set());
    const [conversationMessages, setConversationMessages] = useState(new Map());
    const [loadingConversations, setLoadingConversations] = useState(new Set());
    const [historyModalVisible, setHistoryModalVisible] = useState(false);

    // Refs
    const messagesContainerRef = useRef(null);
    const lastScrollTop = useRef(0);
    const abortControllerRef = useRef(null);

    // 添加命令执行状态管理
    const [executedCommands, setExecutedCommands] = useState(new Map());
    const [executingCommands, setExecutingCommands] = useState(new Set());

    // 添加自动驾驶模式状态
    const [isAutoMode, setIsAutoMode] = useState(false);

    // 添加懒加载相关状态（添加在其他 state 声明之后）
    const MESSAGES_PER_LOAD = 5;
    const [displayLimit, setDisplayLimit] = useState(MESSAGES_PER_LOAD);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // 添加集群相关状态
    const [clusters, setClusters] = useState([]);
    const [clusterName, setClusterName] = useState(props.clusterName);

    // 获取集群列表
    useEffect(() => {
        const fetchClusters = async () => {
            try {
                const response = await MyAxios.get('/db_resource/v1/get_mysql_cluster/');
                
                if (response.data.status === "ok") {
                    setClusters(response.data.data);
                } else {
                    message.error('获取集群列表失败');
                }
            } catch (error) {
                console.error('获取集群列表错误:', error);
                message.error('获取集群列表失败');
            }
        };
        
        fetchClusters();
    }, []);

    // 获取要显示的消息
    const getDisplayMessages = useCallback(() => {
        if (messages.length <= displayLimit) {
            return messages;
        }
        return messages.slice(-displayLimit);
    }, [messages, displayLimit]);

    // 在组件初始化时获取服务器信息
    useEffect(() => {
        if (clusterName) {
            const fetchClusterServers = async () => {
                const servers = await extractServersFromCluster(clusterName);
                setClusterServers(servers);
            };
            fetchClusterServers();
        }
    }, [clusterName]);

    // 添加获取Zabbix指标的函数
    const fetchZabbixMetrics = async () => {
        try {
            // 使用clusterServers
            const servers = clusterServers;
            const metricsMap = new Map();

            // 为每个服务器获取指标
            for (const server of servers) {
                const response = await MyAxios.post('/fault_tree/v1/get_all_metric_names_by_ip/', { 
                    "ip": server.ip 
                });
                
                if (response.data.status === "ok") {
                    // 只保留需要的字段
                    const filteredMetrics = response.data.data.map(metric => ({
                        name: metric.name,
                        key_: metric.key_,
                        units: metric.units
                    }));
                    metricsMap.set(server.ip, filteredMetrics);
                }
            }
            
            setZabbixMetrics(metricsMap);
        } catch (error) {
            console.error('获取Zabbix指标错误:', error);
            message.error('获取Zabbix指标失败');
        }
    };

    // 监听上下文选择变化
    useEffect(() => {
        if (selectedContext.includes('zabbix')) {
            fetchZabbixMetrics();
        }
    }, [selectedContext]);

    // 初始化助手列表
    useEffect(() => {
        const allAssistants = registry.getAll().map(assistant => ({
            name: assistant.name,
            description: `使用${assistant.name}执行命令`,
            examples: [`@${assistant.name} <服务器> <命令>`]  // 添加示例用法
        }));
        setFilteredAssistants(allAssistants);
    }, []);

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
        let currentTool = null;
        let lastUpdateTime = Date.now();
        const UPDATE_INTERVAL = 150; // 增加更新间隔到150ms，减少渲染频率
        
        // 添加新消息，标记为当前消息
        setMessages(prev => {
            // 先将所有消息标记为历史消息
            const updatedMessages = prev.map(msg => ({
                ...msg,
                isCurrentMessage: false
            }));
            
            // 添加新消息并标记为当前消息
            return [...updatedMessages, {
                type: 'llm',
                content: '',
                timestamp: getStandardTime(),
                isCurrentMessage: true // 标记为当前消息
            }];
        });

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

                        if (data.event === 'message_end') {
                            // 流结束时，更新完整内容并保持当前消息标记
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMessage = newMessages[newMessages.length - 1];
                                newMessages[newMessages.length - 1] = {
                                    ...lastMessage,
                                    content: fullContent,
                                    metadata: data.metadata,
                                    isCurrentMessage: true // 保持当前消息标记
                                };
                                return newMessages;
                            });
                            setIsStreaming(false);  // 立即设置为 false，让输入框可用
                            continue;
                        }

                        if (data.conversation_id && !conversationId) {
                            setConversationId(data.conversation_id);
                        }

                        // 首先判断是否为 agent_thought 事件
                        if (data.event === 'agent_thought') {
                            if (data.tool && data.tool_input && data.observation) {
                                // 直接使用原始的 tool_input，不添加 position
                                const toolInput = data.tool_input;
                                
                                // 构建工具调用的完整内容，position 作为单独的属性
                                const toolContent = `<tool>${data.tool}\n${toolInput}\n${data.observation}\n${data.position}</tool>\n\n`;
                                fullContent += toolContent;
                            }
                        } else {
                            // 处理普通回答
                            if (data.answer) {
                                fullContent += data.answer;
                            }
                        }

                        const currentTime = Date.now();
                        // 使用更长的更新间隔减少渲染频率
                        if (currentTime - lastUpdateTime > UPDATE_INTERVAL) {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMessage = newMessages[newMessages.length - 1];
                                newMessages[newMessages.length - 1] = {
                                    ...lastMessage,
                                    content: fullContent,
                                    isCurrentMessage: true // 保持当前消息标记
                                };
                                return newMessages;
                            });
                            lastUpdateTime = currentTime;
                        }
                    } catch (e) {
                        console.warn('JSON parse error:', e);
                    }
                }
            }

            setStreamContent('');

        } catch (error) {
            console.error('Stream processing error:', error);
            throw error;
        } finally {
            // 确保在流结束时更新最终内容
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                newMessages[newMessages.length - 1] = {
                    ...lastMessage,
                    content: fullContent,
                    isCurrentMessage: false // 流结束后，将其标记为历史消息
                };
                return newMessages;
            });
            setIsStreaming(false);
        }
    };

    // 调用大模型的方法
    const handleModelQuery = async (fullContent) => {
        try {
            // 构建上下文数据
            const contextData = selectedContext.map(key => {
                let content = '';
                switch(key) {
                    case 'tree':
                        content = JSON.stringify(clusterServers, null, 2);
                        break;
                    case 'zabbix':
                        // 将所有服务器的 Zabbix 指标合并成一个数组，只保留关键信息
                        const allMetrics = Array.from(zabbixMetrics.values())
                            .flat()
                            .map(metric => ({
                                name: metric.name,
                                key_: metric.key_,
                                units: metric.units
                            }))
                            .filter((metric, index, self) => 
                                index === self.findIndex(m => m.key_ === metric.key_)
                            ); // 基于key_去重
                        content = JSON.stringify(allMetrics, null, 2);
                        break;
                    case 'ssh':
                        content = JSON.stringify(SSH_COMMANDS.map(cmd => ({
                            command: cmd.value,
                            description: cmd.label
                        })), null, 2);
                        break;
                    case 'mysql':
                        content = JSON.stringify(MYSQL_COMMANDS.map(cmd => ({
                            command: cmd.value,
                            description: cmd.label
                        })), null, 2);
                        break;
                }
                return {
                    key,
                    icon: CONTEXT_TYPES.find(t => t.key === key)?.icon,
                    label: CONTEXT_TYPES.find(t => t.key === key)?.label,
                    content
                };
            });

            // 组合查询
            const fullQuery = contextData.length > 0
                ? `${contextData.map(c => c.content).join('\n\n')}\n\n问题：${fullContent}`
                : fullContent;

            const response = await fetch(DIFY_CHAT_URL, {
                method: 'POST',
                headers: {
                    'Authorization': isAutoMode ? DIFY_API_KEY_AUTO : DIFY_API_KEY,
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
                type: 'llm',
                content: `调用失败: ${modelError.message}`,
                timestamp: getStandardTime(),
                isError: true
            }]);
            message.error('大模型调用失败：' + modelError.message);
            throw modelError;
        }
    };

    // 修改现有的 handleScroll 函数
    const handleScroll = () => {
        if (!messagesContainerRef.current) return;
        
        const container = messagesContainerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;
        
        // 检测是否滚动到顶部
        if (scrollTop === 0 && messages.length > displayLimit && !isLoadingMore) {
            setIsLoadingMore(true);
            
            // 使用 setTimeout 模拟加载延迟，可以移除
            setTimeout(() => {
                setDisplayLimit(prev => Math.min(prev + MESSAGES_PER_LOAD, messages.length));
                setIsLoadingMore(false);
            }, 300);
        }
        
        // 检测向上滚动
        if (scrollTop < lastScrollTop.current) {
            setIsUserScrolling(true);
        }
        
        // 检测是否滚动到底部
        const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
        if (isAtBottom) {
            setIsUserScrolling(false);
        }
        
        lastScrollTop.current = scrollTop;
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

    // 添加展开状态管理
    const handleMessageExpand = (timestamp, expanded) => {
        setExpandedMessages(prev => {
            const newSet = new Set(prev);
            if (expanded) {
                newSet.add(timestamp);
            } else {
                newSet.delete(timestamp);
            }
            return newSet;
        });
    };

    // 修改 handleSend 函数
    const handleSend = async () => {
        if (!inputValue.trim() || isStreaming) return;
        
        setIsUserScrolling(false);
        // 确保发送新消息时显示最新消息
        setDisplayLimit(MESSAGES_PER_LOAD);

        // 折叠所有现有消息
        setExpandedMessages(new Set());

        const timestamp = getStandardTime();
        const isAssistantCommand = filteredAssistants.some(assistant => 
            inputValue.includes('@' + assistant.name)
        );

        // 获取选中的引用内容
        const references = Array.from(selectedResults).map(refTimestamp => {
            const refMsg = messages.find(m => m.timestamp === refTimestamp);
            return {
                timestamp: refTimestamp,
                content: refMsg?.content || '',
                type: refMsg?.type || ''
            };
        });

        // 构建完整的提问内容，包含引用内容
        const fullContent = references.length > 0
            ? `${references.map(ref => ref.content).join('\n\n')}\n\n${inputValue}`
            : inputValue;

        // 构建上下文数据
        const contextData = selectedContext.map(key => {
            let content = '';
            switch(key) {
                case 'tree':
                    content = JSON.stringify(clusterServers, null, 2);
                    break;
                case 'zabbix':
                    // 将所有服务器的 Zabbix 指标合并成一个数组
                    const allMetrics = Array.from(zabbixMetrics.values()).flat();
                    content = JSON.stringify(allMetrics, null, 2);
                    break;
                case 'ssh':
                    content = JSON.stringify(SSH_COMMANDS.map(cmd => ({
                        command: cmd.value,
                        description: cmd.label
                    })), null, 2);
                    break;
                case 'mysql':
                    content = JSON.stringify(MYSQL_COMMANDS.map(cmd => ({
                        command: cmd.value,
                        description: cmd.label
                    })), null, 2);
                    break;
            }
            return {
                key,
                icon: CONTEXT_TYPES.find(t => t.key === key)?.icon,
                label: CONTEXT_TYPES.find(t => t.key === key)?.label,
                content
            };
        });

        // 先将所有消息标记为历史消息
        setMessages(prev => {
            const updatedMessages = prev.map(msg => ({
                ...msg,
                isCurrentMessage: false
            }));
            
            // 添加用户消息
            return [...updatedMessages, {
                type: 'user',
                content: inputValue,
                contexts: contextData,
                references,
                timestamp: timestamp,
                isCurrentMessage: false // 用户消息不是当前消息
            }];
        });
        
        // 立即清除上下文选择
        setSelectedContext([]);
        setSelectedResults(new Set());
        
        setInputValue('');
        setIsStreaming(true);
        setStreamContent('');
        abortControllerRef.current = new AbortController();

        try {
            // 组合查询
            const fullQuery = contextData.length > 0
                ? `${contextData.map(c => c.content).join('\n\n')}\n\n问题：${fullContent}`
                : fullContent;

            if (isAssistantCommand) {
                await executeCommand(inputValue);
            } else {
                await handleModelQuery(fullQuery);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                setMessages(prev => {
                    // 先将所有消息标记为历史消息
                    const updatedMessages = prev.map(msg => ({
                        ...msg,
                        isCurrentMessage: false
                    }));
                    
                    return [...updatedMessages, {
                        type: 'llm',
                        content: `调用失败: ${error.message}`,
                        timestamp: timestamp,
                        isError: true,
                        isCurrentMessage: false // 错误消息不是当前消息
                    }];
                });
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

        // 处理@触发
        if (value.includes('@')) {
            const atIndex = value.lastIndexOf('@');
            const searchText = value.slice(atIndex + 1).toLowerCase();
            setAtPosition(atIndex);
            
            const allAssistants = registry.getAll().map(assistant => ({
                name: assistant.name,
                description: `使用${assistant.name}执行命令`,
                examples: [`@${assistant.name} <服务器> <命令>`]  // 添加示例用法
            }));

            const filtered = allAssistants.filter(assistant => 
                assistant.name.toLowerCase().includes(searchText) ||
                assistant.description.toLowerCase().includes(searchText)
            );
            setFilteredAssistants(filtered);
        } else {
            setAtPosition(null);
            const allAssistants = registry.getAll().map(assistant => ({
                name: assistant.name,
                description: `使用${assistant.name}执行命令`,
                examples: [`@${assistant.name} <服务器> <命令>`]  // 添加示例用法
            }));
            setFilteredAssistants(allAssistants);
        }
    };

    // 处理助手选择
    const handleAssistantSelect = (assistant) => {
        if (!assistant) {
            setAtPosition(null);
            return;
        }
        
        handleAssistantTrigger(assistant.name);
        setAtPosition(null);
        setInputValue('');
    };

    // 处理@助手的逻辑
    const handleAssistantTrigger = (assistantName) => {
        // 检查助手是否已经激活
        if (activeAssistants.has(assistantName)) {
            message.warning('该助手已经激活');
            return;
        }

        // 从注册表中获取助手
        const assistant = registry.get(assistantName);
        if (!assistant) {
            message.error(`未找到助手: ${assistantName}`);
            return;
        }

        // 激活助手
        setActiveAssistants(prev => new Map(prev).set(assistantName, true));
    };

    // 处理助手关闭
    const handleCloseAssistant = (assistantName) => {
        setActiveAssistants(prev => {
            const next = new Map(prev);
            next.delete(assistantName);
            return next;
        });
        setAssistantConfigs(prev => {
            const next = new Map(prev);
            next.delete(assistantName);
            return next;
        });
        setAssistantInputs(prev => {
            const next = new Map(prev);
            next.delete(assistantName);
            return next;
        });
    };

    // 处理键盘事件
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault(); // 阻止默认的 Tab 行为
            
            // 先关闭 @ 窗口
            setAtPosition(null);
            
            if (!quickSelectMode) {
                setQuickSelectMode('server');
            } else if (quickSelectMode === 'server') {
                setQuickSelectMode('command');
            } else {
                // 当关闭快速选择窗口时，不改变模式，而是重新开始循环
                setQuickSelectMode('server');
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

    // 处理命令执行
    const executeCommand = async (params) => {
        try {
            // 如果是中断命令
            if (params.type === 'interrupt') {
                const commandKey = JSON.stringify(params);
                setExecutingCommands(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(commandKey);
                    return newSet;
                });
                return;
            }

            // 如果是用户消息，直接添加到消息列表
            if (params.type === 'user') {
                setMessages(prev => [...prev, params]);
                return;
            }

            // 如果是直接的消息更新（比如 Zabbix 的响应）
            if (params.type === 'assistant') {
                setMessages(prev => [...prev, params]);
                // 如果是 Zabbix 响应，设置图表视图
                if (params.isZabbix) {
                    setMessageViewModes(prev => new Map(prev).set(params.timestamp, 'chart'));
                }
                return;
            }

            // 生成命令的唯一标识
            const commandKey = JSON.stringify({
                tool: params.tool,
                address: params.address,
                cmd: params.cmd
            });

            // 设置执行状态
            setExecutingCommands(prev => new Set(prev).add(commandKey));

            // 执行命令
            const response = await fetch(COMMAND_EXECUTE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            const result = await response.json();
            const formattedCommand = `> @${params.tool}助手 ${params.address} ${params.cmd}`;
            
            if (result.status === "ok") {
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
                // 记录执行成功的命令
                setExecutedCommands(prev => new Map(prev).set(commandKey, true));
            } else {
                const formattedResult = `\`\`\`bash\n执行失败: ${result.message || '未知错误'}\n\`\`\``;
                const formatMessage = `${formattedCommand}\n\n${formattedResult}`;
                setMessages(prev => [...prev, {
                    type: 'assistant',
                    content: formatMessage,
                    rawContent: result.message || '未知错误',
                    command: `@${params.tool}助手 ${params.address} ${params.cmd}`,
                    timestamp: getStandardTime(),
                    isError: true
                }]);
            }

            // 清除执行状态
            setExecutingCommands(prev => {
                const newSet = new Set(prev);
                newSet.delete(commandKey);
                return newSet;
            });
            setExecutingAssistants(new Set());
            return result;
        } catch (error) {
            console.error('执行命令失败:', error);
            message.error(error.message || '执行命令失败');
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
        const baseHeight = 80;
        return baseHeight;
    };

    // 计算助手区域的总高度
    const getAssistantsHeight = () => {
        const assistantHeight = 56;
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
    const handleServerSelect = (assistantName, value) => {
        const [ip, port] = value.split(':');
        setAssistantConfigs(prev => 
            new Map(prev).set(assistantName, { ip, port: port || '' })
        );
    };

    // 移除 useEffect 中的 showQuickCommands 相关代码
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (quickSelectMode && !event.target.closest('.assistant-input-container')) {
                setQuickSelectMode(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [quickSelectMode]);

    return (
        <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            background: '#f5f5f5',
            position: 'relative',
            overflow: 'hidden',
            ...props.style
        }}>
            {/* 顶部工具栏 */}
            <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid #e8e8e8',
                background: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Select
                        showSearch
                        style={{ width: 200 }}
                        placeholder="选择数据库集群"
                        value={clusterName}
                        optionFilterProp="children"
                        onChange={(value) => {
                            if (window.globalStore) {
                                window.globalStore.setCurrentCluster(value);
                            }
                            setClusterName(value);
                        }}
                        filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                    >
                        {clusters?.map(cluster => (
                            <Select.Option key={cluster.id} value={cluster.cluster_name}>
                                {cluster.cluster_name}
                            </Select.Option>
                        ))}
                    </Select>
                    <Tooltip title={isAutoMode ? "AI将自动分析故障原因并提供解决方案" : "AI将协助人工分析故障原因"}>
                        <div 
                            onClick={() => setIsAutoMode(!isAutoMode)}
                            style={{ 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: isAutoMode ? '#1890ff' : '#595959'
                            }}
                        >
                            <Icon type="robot" />
                            <span>{isAutoMode ? "AI自动分析" : "AI辅助分析"}</span>
                        </div>
                    </Tooltip>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
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
            </div>

            {/* 消息列表区域 */}
            <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="message-container"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '16px',
                    marginBottom: `${inputAreaHeight + assistantsHeight}px`,
                }}
            >
                {/* 加载更多提示 */}
                {messages.length > displayLimit && (
                    <div style={{
                        textAlign: 'center',
                        padding: '10px',
                        color: '#999',
                        fontSize: '14px'
                    }}>
                        {isLoadingMore ? (
                            <span>加载中...</span>
                        ) : (
                            <span>向上滚动加载更多</span>
                        )}
                    </div>
                )}

                {/* 消息列表 */}
                {getDisplayMessages().map((msg, index) => (
                    <div key={msg.timestamp} className="message-item">
                        <MessageItem
                            msg={msg}
                            index={index}
                            selectedResults={selectedResults}
                            handleResultSelect={handleResultSelect}
                            messageViewModes={messageViewModes}
                            setMessageViewModes={setMessageViewModes}
                            copyToClipboard={copyToClipboard}
                            isExpanded={expandedMessages.has(msg.timestamp)}
                            onExpandChange={(expanded) => handleMessageExpand(msg.timestamp, expanded)}
                            messages={messages}
                            isLatestMessage={index === getDisplayMessages().length - 1}
                            executedCommands={executedCommands}
                            executingCommands={executingCommands}
                            executeCommand={executeCommand}
                        />
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
                <ContextTags 
                    selectedContext={selectedContext}
                    setSelectedContext={setSelectedContext}
                />

                <div style={{ 
                    display: 'flex',
                    gap: '8px',
                    position: 'relative'
                }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <AssistantContainer
                            activeAssistants={activeAssistants}
                            assistantConfigs={assistantConfigs}
                            assistantInputs={assistantInputs}
                            setAssistantInputs={setAssistantInputs}
                            handleCloseAssistant={handleCloseAssistant}
                            executingAssistants={executingAssistants}
                            setExecutingAssistants={setExecutingAssistants}
                            executeCommand={executeCommand}
                            handleServerSelect={handleServerSelect}
                            servers={clusterServers}
                            setMessages={setMessages}
                            handleSend={handleSend}
                        />

                        <UserInput
                            inputValue={inputValue}
                            isStreaming={isStreaming}
                            atPosition={atPosition}
                            filteredAssistants={filteredAssistants}
                            selectedContext={selectedContext}
                            handleInputChange={handleInputChange}
                            handleKeyDown={handleKeyDown}
                            handleSearchBlur={handleSearchBlur}
                            handleAssistantSelect={handleAssistantSelect}
                            handleSend={handleSend}
                            handleInterrupt={handleInterrupt}
                            setSelectedContext={setSelectedContext}
                            setAtPosition={setAtPosition}
                        />

                        {/* @ 助手选择弹窗 */}
                        {atPosition !== null && (
                            <div style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: 0,
                                right: 0,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                zIndex: 1000
                            }}>
                                {filteredAssistants.map((assistant, index) => (
                                    <div
                                        key={assistant.name}
                                        style={{
                                            padding: '12px',
                                            cursor: 'pointer',
                                            borderBottom: index < filteredAssistants.length - 1 ? '1px solid #e2e8f0' : 'none',
                                            backgroundColor: hoveredAssistant === assistant.name ? '#f8fafc' : 'transparent'
                                        }}
                                        onClick={() => handleAssistantSelect(assistant)}
                                        onMouseEnter={() => setHoveredAssistant(assistant.name)}
                                        onMouseLeave={() => setHoveredAssistant(null)}
                                    >
                                        <div style={{ 
                                            fontWeight: 500,
                                            color: '#0f172a'
                                        }}>
                                            {assistant.name}
                                        </div>
                                        <div style={{ 
                                            fontSize: '12px',
                                            color: '#64748b'
                                        }}>
                                            {assistant.description}
                                        </div>
                                        <div style={{ 
                                            marginTop: '8px',
                                            fontSize: '12px',
                                            color: '#94a3b8'
                                        }}>
                                            示例：{assistant.examples[0]}
                                        </div>
                                    </div>
                                ))}
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
