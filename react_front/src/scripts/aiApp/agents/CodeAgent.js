import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Input, Button, message, Spin, Icon, Card, Select, Divider, Checkbox } from 'antd';
import { BaseChatHeader, BaseChatFooter, ChatMessage } from '../components/BaseLayout';
import { HistoryIcon, NewChatIcon } from '../components/BaseIcon';
import {
    sendMessageToAssistant,
    getHistoryConversations,
    getHistoryMessageDetail,
    stopMessageGeneration
} from '../aIAssistantApi';
import HistoryConversationModal from '../components/HistoryConversationModal';
import { agentComponentMap } from '../config/componentMapping';
import MyAxios from "../../common/interface";
import PropTypes from 'prop-types';

const { Option } = Select;

// 消息列表组件
const MessageItem = memo(({ msg, isLast, streaming, onStopGeneration }) => {
    return (
        <ChatMessage
            message={{
                ...msg,
                isUser: msg.role === 'user',
                timestamp: msg.time
            }}
            isStreaming={isLast && streaming}
            onStopGeneration={onStopGeneration}
            agentType={agentTypeKey}
        />
    );
}, (prevProps, nextProps) => {
    // 优化策略：历史消息保持稳定，只允许最新消息更新
    if (!prevProps.isLast && !nextProps.isLast) {
        return true;  // 阻止历史消息重新渲染
    }
    
    // 最新消息的更新条件
    return (
        prevProps.msg === nextProps.msg &&
        prevProps.isLast === nextProps.isLast &&
        prevProps.streaming === nextProps.streaming
    );
});

const MessageList = ({ messages, streaming, onStopGeneration, messagesEndRef }) => {
    return (
        <>
            {messages.map((msg, index) => (
                <MessageItem
                    key={`${index}-${msg.time || ''}`}
                    msg={msg}
                    isLast={index === messages.length - 1}
                    streaming={streaming}
                    onStopGeneration={onStopGeneration}
                />
            ))}
            <div ref={messagesEndRef} />
        </>
    );
};

// 智能体名称
const agentTypeKey = 'code';

// 重构为函数式组件
const CodeAgent = ({ 
    defaultInstance,
    defaultDatabase,
    defaultTables
}) => {
    // 打印接收到的 props
    console.log("CodeAgent received props:", {
        defaultInstance,
        defaultDatabase,
        defaultTables
    });

    // 获取智能体配置
    const agentConfig = agentComponentMap[agentTypeKey];
    // 状态管理
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [streaming, setStreaming] = useState(false);
    const [taskId, setTaskId] = useState(null);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isWebSearchActive, setIsWebSearchActive] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadedFileIds, setUploadedFileIds] = useState([]);
    // 添加自动滚动控制状态
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    
    // 添加历史会话相关状态
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [expandedConversations, setExpandedConversations] = useState(new Set());
    const [conversationMessages, setConversationMessages] = useState(new Map());
    const [loadingConversations, setLoadingConversations] = useState(new Set());
    
    // 添加数据库配置状态
    const [dbConfig, setDbConfig] = useState({
        instance: defaultInstance || '',
        database: defaultDatabase || '',
        tables: defaultTables || []  // 所有可选的表列表
    });

    // 监听父组件传入的 props 变化
    useEffect(() => {
        setDbConfig({
            instance: defaultInstance || '',
            database: defaultDatabase || '',
            tables: defaultTables || []
        });
    }, [defaultInstance, defaultDatabase, defaultTables]);

    // 用户选择的表，单独管理
    const [selectedTables, setSelectedTables] = useState([]);

    // 添加状态标记是否来自父组件
    const isFromParent = !!defaultInstance;

    const [dbOptions, setDbOptions] = useState({});
    
    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const abortControllerRef = useRef(null);
    
    // 添加表结构状态
    const [tableStructures, setTableStructures] = useState({});
    
    // 滚动到底部
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current && shouldAutoScroll && messagesContainerRef.current) {
            // 使用容器的scrollTo方法而不是scrollIntoView
            const container = messagesContainerRef.current;
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [shouldAutoScroll]);
    
    // 监听消息变化，自动滚动
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);
    
    // 监听滚动事件
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        
        const handleScroll = () => {
            // 检查是否滚动到底部或接近底部（20px误差范围）
            const isAtBottom = 
                container.scrollHeight - container.scrollTop - container.clientHeight < 20;
            
            // 如果用户滚动到底部，恢复自动滚动
            if (isAtBottom) {
                setShouldAutoScroll(true);
            } else if (shouldAutoScroll) {
                // 如果用户向上滚动，停止自动滚动
                setShouldAutoScroll(false);
            }
        };
        
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [shouldAutoScroll]);
    
    // 当开始流式传输时，只有在用户已经在底部时才启用自动滚动
    useEffect(() => {
        if (streaming) {
            const container = messagesContainerRef.current;
            if (container) {
                // 检查是否已经在底部或接近底部
                const isAtBottom = 
                    container.scrollHeight - container.scrollTop - container.clientHeight < 20;
                
                // 只有当用户已经在底部时，才启用自动滚动
                if (isAtBottom) {
                    setShouldAutoScroll(true);
                    scrollToBottom();
                }
                // 如果用户不在底部，保持当前的滚动状态
            }
        }
    }, [streaming, scrollToBottom]);
    

    // 文件变更处理
    const handleFilesChange = useCallback((files, fileIds) => {
        setUploadedFiles(files);
        setUploadedFileIds(fileIds);
    }, []);
    
    // 中断生成
    const handleInterrupt = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        
        if (taskId) {
            stopMessageGeneration(taskId)
                .then(() => console.log('Generation stopped'))
                .catch(err => console.error('Failed to stop generation:', err));
        }
        
        setStreaming(false);
    }, [taskId]);
    
    // Web 搜索切换
    const handleWebSearch = useCallback(() => {
        setIsWebSearchActive(prev => !prev);
    }, []);
    
    // 获取历史会话列表
    const fetchHistoryList = useCallback(async (agentType) => {
        setIsHistoryLoading(true);
        try {
            const data = await getHistoryConversations(agentType=agentTypeKey);
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
    }, []);
    
    // 处理展开/收起会话
    const handleConversationToggle = useCallback(async (conversationId) => {
        const isExpanded = expandedConversations.has(conversationId);
        const messages = conversationMessages.get(conversationId);

        if (!isExpanded && !messages) {
            setLoadingConversations(prev => new Set(prev).add(conversationId));
            try {
                // 使用 getHistoryMessageDetail 并传递助手类型
                const messagesData = await getHistoryMessageDetail(conversationId, agentTypeKey);
                setConversationMessages(prev => new Map(prev).set(conversationId, messagesData.data));
            } catch (error) {
                console.error('获取会话详情失败:', error);
                message.error('获取会话详情失败');
            } finally {
                setLoadingConversations(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(conversationId);
                    return newSet;
                });
            }
        }

        setExpandedConversations(prev => {
            const newSet = new Set(prev);
            if (isExpanded) {
                newSet.delete(conversationId);
            } else {
                newSet.add(conversationId);
            }
            return newSet;
        });
    }, [expandedConversations, conversationMessages]);
    
    // 继续历史会话
    const handleContinueConversation = useCallback(async (conversation) => {
        try {
            // 使用 getHistoryMessageDetail 并传递助手类型
            const messagesData = await getHistoryMessageDetail(conversation.id, agentTypeKey);
            setConversationId(conversation.id);
            
            const convertedMessages = messagesData.data.flatMap(msg => {
                const messages = [];
                
                if (msg.query) {
                    messages.push({
                        role: 'user',
                        content: msg.query,
                        time: new Date(msg.created_at * 1000).toLocaleString()
                    });
                }
                
                if (msg.answer) {
                    messages.push({
                        role: 'assistant',
                        content: msg.answer,
                        time: new Date(msg.created_at * 1000).toLocaleString()
                    });
                }
                
                return messages;
            });
            
            setMessages(convertedMessages);
            setHistoryModalVisible(false);
        } catch (error) {
            console.error('继续会话失败:', error);
            message.error('继续会话失败，请稍后重试');
        }
    }, []);
    
    // 获取数据库列表
    const getSchema = async (instanceName) => {
        if (!instanceName) return [];
        
        try {
            const params = { instance_name: instanceName };
            const res = await MyAxios.post('/web_console/v1/get_schema_list/', params, { timeout: 5000 });
            
            if (res.data.status === 'ok') {
                const dbOptions = Array.isArray(res.data.data) ? res.data.data.map(item => ({
                    value: item.Database||item.SCHEMA_NAME,
                    label: item.Database||item.SCHEMA_NAME,
                })) : [];
                
                setDbOptions(prev => ({
                    ...prev,
                    [instanceName]: dbOptions
                }));
                
                return dbOptions;
            } else {
                message.error(res.data.message || "获取数据库列表失败");
                return [];
            }
        } catch (err) {
            message.error(err.message || "获取数据库列表异常");
            return [];
        }
    };

    // 获取表列表
    const getTables = async (instanceName, databaseName) => {
        let params = {
            schema_name: databaseName,
            instance_name: instanceName,
            table_name: '',
        };
        
        try {
            const res = await MyAxios.post('/web_console/v1/get_table_list/', params);
            if (res.data.status === 'ok') {
                const table_info_list = res.data.data['table_info_list'];
                // 直接提取表名作为字符串数组
                const tableNames = table_info_list.map(item => item.TABLE_NAME);
                setDbConfig(prev => ({
                    ...prev,
                    tables: tableNames
                }));
            } else {
                message.error(res.data.message);
            }
        } catch (err) {
            console.error("获取表列表异常:", err);
            message.error(err.message || "获取表列表异常");
        }
    };

    // 修改表选择处理函数
    const handleTableChange = async (selected) => {
        // 获取新增的表
        const newTables = selected.filter(table => !selectedTables.includes(table));
        
        // 获取新增表的结构并拼接为字符串
        for (const tableName of newTables) {
            const structure = await getTableStructure(tableName);
            if (structure) {
                const structureStr = `表 ${tableName} 的结构：\n${structure}`;
                setTableStructures(prev => ({
                    ...prev,
                    [tableName]: structureStr
                }));
            }
        }
        
        // 更新选中的表
        setSelectedTables(selected);
    };

    // 修改实例变更处理函数
    const handleInstanceChange = (value) => {
        setDbConfig(prev => ({
            instance: value,
            database: null,
            tables: []
        }));
        setSelectedTables([]); // 清空选中的表
    };

    // 修改数据库变更处理函数
    const handleDbChange = (value) => {
        console.log('数据库变更为:', value);
        setDbConfig(prev => ({
            ...prev,
            database: value,
            tables: []
        }));
        setSelectedTables([]); // 清空选中的表
        
        if (value) {
            getTables(dbConfig.instance, value);
        }
    };
    
    // 获取数据库选项
    const getDbOptions = (instanceName) => {
        if (!instanceName) return [];
        return dbOptions[instanceName] || [];
    };

    // 发送消息
    const handleSend = useCallback(async (content) => {
        if (!content?.trim()) return;

        // 创建新的 abortController
        abortControllerRef.current = new AbortController();

        // 先添加用户消息
        const userMessage = {
            role: 'user',
            content: content,
            time: new Date().toLocaleTimeString(),
            files: uploadedFileIds.length > 0 
                ? uploadedFiles.map(file => file.name || file.fileName)
                : undefined
        };

        // 批量更新状态
        setMessages(prev => [...prev, userMessage]);
        setStreaming(true);
        setQuestion('');
                
        // 当用户发送新消息时，始终启用自动滚动
        setShouldAutoScroll(true);

        
        try {
            // 准备数据库配置
            let inputs = {
                instance_name: dbConfig.instance || '',
                schema_name: dbConfig.database || '',
                table_names: selectedTables.join(','),
                table_structures: Object.values(tableStructures).join('\n\n')
            };
            
            console.log("发送数据库配置:", inputs);

            // 准备文件对象
            const fileObjects = uploadedFileIds.map(id => ({
                type: "document",
                transfer_method: "local_file",
                upload_file_id: id
            }));

            await sendMessageToAssistant(
                {
                    query: content,
                    inputs: inputs,
                    files: fileObjects,
                    conversationId,
                    abortController: abortControllerRef.current,
                    agentType: agentTypeKey
                },
                {
                    setMessages: setMessages,
                    setIsStreaming: setStreaming,
                    getStandardTime: () => new Date().toLocaleTimeString(),
                    setTaskId,
                    setConversationId
                }
            );

            // 发送后清空文件ID
            setUploadedFileIds([]);
            setUploadedFiles([]);

        } catch (error) {
            console.error('Failed to send message:', error);
            message.error('发送消息失败');
        } finally {
            setStreaming(false);
            abortControllerRef.current = null;
        }
    }, [
        uploadedFileIds, 
        uploadedFiles, 
        dbConfig, 
        conversationId,
        selectedTables,
        tableStructures
    ]);
    
    // 修改获取表结构的函数
    const getTableStructure = async (tableName) => {
        if (!dbConfig.instance || !dbConfig.database) return null;
        
        try {
            const params = {
                des_ip_port: dbConfig.instance,
                schema_name: dbConfig.database,
                table_name: tableName
            };
            
            const res = await MyAxios.post('/web_console/v1/get_table_frm/', params);
            if (res.data.status === 'ok' && res.data.data && res.data.data.length > 0) {
                return res.data.data[0]['Create Table'];  // 直接返回 Create Table 字段
            }
            return null;
        } catch (err) {
            console.error(`获取表 ${tableName} 结构失败:`, err);
            return null;
        }
    };

    return (
        <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 128px)', 
            padding: '0px',
            background: '#f5f5f5'
        }}>
            <div style={{
                flex: 1,
                background: '#fff',
                borderRadius: '8px',
                border: '1px solid #e8e8e8',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '15px 20px',
                    borderBottom: '1px solid #e8e8e8',
                    background: '#fff'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: agentConfig.color || '#1890ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '15px',
                        fontSize: '24px'
                    }}>
                        {agentConfig.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{agentConfig.name}</div>
                        <div style={{ color: '#666', fontSize: '14px' }}>{agentConfig.description}</div>
                    </div>
                    
                    {/* 实例选择框 */}
                    <div style={{ marginRight: '15px', width: '200px' }}>
                        <Input
                            placeholder="输入实例"
                            value={dbConfig.instance}
                            onChange={(e) => handleInstanceChange(e.target.value)}
                            style={{ width: '100%' }}
                            allowClear
                            disabled={isFromParent}
                        />
                    </div>
                    
                    {/* 数据库选择框 */}
                    <div style={{ marginRight: '15px', width: '150px' }}>
                        <Select
                            showSearch
                            placeholder="选择数据库"
                            value={dbConfig.database}
                            onChange={handleDbChange}
                            style={{ width: '100%' }}
                            filterOption={(input, option) =>
                                option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                            allowClear
                            disabled={isFromParent}
                            onDropdownVisibleChange={(open) => {
                                if (open && dbConfig.instance && !dbOptions[dbConfig.instance]) {
                                    getSchema(dbConfig.instance);
                                }
                            }}
                        >
                            {getDbOptions(dbConfig.instance).map(option => (
                                <Option key={option.value} value={option.value}>
                                    {option.label}
                                </Option>
                            ))}
                        </Select>
                    </div>
                    
                    {/* 表选择框 */}
                    <div style={{ marginRight: '15px', width: '200px' }}>
                        <Select
                            mode="multiple"
                            showSearch
                            placeholder="选择表(可多选)"
                            value={selectedTables}
                            onChange={handleTableChange}
                            style={{ width: '100%' }}
                            filterOption={(input, option) =>
                                option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                            allowClear
                        >
                            {dbConfig.tables.map(table_name => (
                                <Option 
                                    key={table_name}
                                    value={table_name}
                                >
                                    {table_name}
                                </Option>
                            ))}
                        </Select>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <NewChatIcon onClick={() => {
                            setMessages([]);
                            setConversationId(null);
                            setQuestion("");
                        }} />
                        <HistoryIcon isLoading={isHistoryLoading} onClick={fetchHistoryList} />
                    </div>
                </div>

                <div style={{
                    flex: 1,
                    display: 'flex',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        flex: 1,
                        height: '100%',
                        margin: '5px 0 0 0',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#F8FBFF',
                        borderTopRightRadius: '8px'
                    }}>
                        <div 
                            ref={messagesContainerRef}
                            style={{
                                flex: 1,
                                overflow: 'auto',
                                padding: '0 15px 30px 15px'
                            }}
                        >
                            <MessageList 
                                messages={messages}
                                streaming={streaming}
                                onStopGeneration={handleInterrupt}
                                messagesEndRef={messagesEndRef}
                            />
                        </div>
                        <BaseChatFooter 
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onSend={() => {
                                const content = question.trim();
                                if (content) {
                                    handleSend(content);
                                }
                            }}
                            disabled={streaming}
                            isStreaming={streaming}
                            onInterrupt={handleInterrupt}
                            onWebSearch={handleWebSearch}
                            isWebSearchActive={isWebSearchActive}
                            onFilesChange={handleFilesChange}
                            agentType={agentTypeKey}
                        />
                    </div>
                </div>
                
                {/* 添加历史会话弹窗 */}
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
        </div>
    );
};

CodeAgent.propTypes = {
    defaultInstance: PropTypes.string,
    defaultDatabase: PropTypes.string,
    defaultTables: PropTypes.arrayOf(PropTypes.string)
};

export default CodeAgent;