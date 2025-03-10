import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

const { Option } = Select;

// 扩展 BaseChatHeader 组件
class CodeChatHeader extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            database: "cloudb",
            instance: '82.156.146.51_3306',
            instanceOptions: {},
            dbOptions: {},
            tables: [],
            selectedTables: []
        };
    }

    componentDidMount() {
        this.getSchema();
        this.getTables();
    }


    // 获取数据库列表
    async getSchema(instanceName) {
        if (!instanceName) return [];
        
        try {
            const params = { instance_name: instanceName };
            
            console.log("获取数据库列表，参数:", params);
            
            const res = await MyAxios.post('/web_console/v1/get_schema_list/', params, { timeout: 5000 });
            console.log("获取数据库列表，响应:", res);
            
            if (res.data.status === 'ok') {
                // 将API返回的数据转换为Select需要的格式
                // 注意：数据格式是 [{Database: "dbname"}, ...] 而不是 ["dbname", ...]
                const dbOptions = Array.isArray(res.data.data) ? res.data.data.map(item => ({
                    value: item.Database||item.SCHEMA_NAME,
                    label: item.Database||item.SCHEMA_NAME,
                })) : [];
                
                // 更新状态
                this.setState(prevState => ({
                    dbOptions: {
                        ...prevState.dbOptions,
                        [instanceName]: dbOptions
                    }
                }));
                
                return dbOptions;
            } else {
                console.error("获取数据库列表失败:", res.data.message);
                message.error(res.data.message || "获取数据库列表失败");
                return [];
            }
        } catch (err) {
            console.error("获取数据库列表异常:", err);
            message.error(err.message || "获取数据库列表异常");
            return [];
        }
    }

    // 获取数据库选项
    getDbOptions = (instanceName) => {
        if (!instanceName) return [];
        return this.state.dbOptions[instanceName] || [];
    };

    // 获取表列表
    async getTables() {
        const { instance, database } = this.state;
        if (!instance || !database) return;
        
        let params = {
            schema_name: database,
            instance_name: instance,
            table_name: "%", // 默认获取所有表
        };
        
        console.log("获取表列表，参数:", params);
        
        try {
            const res = await MyAxios.post('/web_console/v1/get_table_list/', params);
            if (res.data.status === 'ok') {
                const table_info_list = res.data.data['table_info_list'];
                const tables = table_info_list.map(item => ({
                    value: item.TABLE_NAME,
                    label: item.TABLE_NAME
                }));
                
                this.setState({ tables });
            } else {
                message.error(res.data.message);
            }
        } catch (err) {
            console.error("获取表列表异常:", err);
            message.error(err.message || "获取表列表异常");
        }
    }

    // 处理数据库变更
    handleDbChange = (value) => {
        this.setState({ 
            database: value,
            tables: [],
            selectedTables: []
        }, () => {
            // 获取该数据库的表
            if (value) {
                this.getTables();
            }
        });
        
        // 如果有外部回调，则调用
        if (this.props.onDbChange) {
            this.props.onDbChange(value);
        }
    };

    // 处理表选择变更
    handleTableChange = (selectedTables) => {
        this.setState({ selectedTables });
        
        // 如果有外部回调，则调用
        if (this.props.onTableChange) {
            this.props.onTableChange(selectedTables);
        }
    };

    render() {
        const { instance, database, tables, selectedTables } = this.state;
        const { 
            icon, 
            title, 
            description, 
            iconBgColor, 
            onNewChat, 
            onViewHistory, 
            isHistoryLoading 
        } = this.props;

        return (
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
                    background: iconBgColor || '#1890ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '15px',
                    fontSize: '24px'
                }}>
                    {icon}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{title}</div>
                    <div style={{ color: '#666', fontSize: '14px' }}>{description}</div>
                </div>
                
                
                {/* 实例选择框 - 改为输入框 */}
                <div style={{ marginRight: '15px', width: '150px' }}>
                    <Input
                        placeholder="输入实例"
                        value={instance}
                        onChange={(e) => this.setState({ instance: e.target.value })}
                        style={{ width: '100%' }}
                        allowClear
                    />
                </div>
                
                {/* 数据库选择框 */}
                <div style={{ marginRight: '15px', width: '150px' }}>
                    <Select
                        showSearch
                        placeholder="选择数据库"
                        value={database}
                        onChange={this.handleDbChange}
                        style={{ width: '100%' }}
                        filterOption={(input, option) =>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                        allowClear
                        disabled={!instance}
                        onFocus={() => this.getSchema(instance)}
                        onDropdownVisibleChange={(open) => {
                            if (open && instance) {
                                this.getSchema(instance);
                            }
                        }}
                    >
                        {this.getDbOptions(instance).map(option => (
                            <Option key={option.value} value={option.value}>
                                {option.label}
                            </Option>
                        ))}
                    </Select>
                </div>
                
                {/* 表选择框 - 新增 */}
                <div style={{ marginRight: '15px', width: '200px' }}>
                    <Select
                        mode="multiple"
                        showSearch
                        placeholder="选择表(可多选)"
                        value={selectedTables}
                        onChange={this.handleTableChange}
                        style={{ width: '100%' }}
                        filterOption={(input, option) =>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                        allowClear
                        disabled={!database}
                    >
                        {tables.map(option => (
                            <Option key={option.value} value={option.value}>
                                {option.label}
                            </Option>
                        ))}
                    </Select>
                </div>
                
                {/* 使用公共图标组件 */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <NewChatIcon onClick={onNewChat} />
                    <HistoryIcon isLoading={isHistoryLoading} onClick={onViewHistory} />
                </div>
            </div>
        );
    }
}

// 消息列表组件
const MessageList = React.memo(({ 
    messages, 
    streaming, 
    onStopGeneration,
    messagesEndRef 
}) => {
    return (
        <>
            {messages.map((msg, index) => (
                <ChatMessage
                    key={`${index}-${msg.time || ''}`}
                    message={{
                        ...msg,
                        isUser: msg.role === 'user',
                        timestamp: msg.time
                    }}
                    isStreaming={streaming && index === messages.length - 1}
                    onStopGeneration={onStopGeneration}
                    agentType={agentTypeKey}
                />
            ))}
            <div ref={messagesEndRef} />
        </>
    );
});

// 智能体名称
const agentTypeKey = 'code';

// 重构为函数式组件
const CodeAgent = () => {
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
        instance: null,
        database: null,
        tables: []
    });
    
    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const abortControllerRef = useRef(null);
    
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
    
    
    // 处理数据库变更
    const handleDbChange = useCallback((value) => {
        setDbConfig(prev => ({
            ...prev,
            database: value,
            tables: []
        }));
    }, []);
    
    // 处理表变更
    const handleTableChange = useCallback((tables) => {
        setDbConfig(prev => ({
            ...prev,
            tables
        }));
    }, []);
    
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
            let inputs = {};
            
            // 添加数据库相关参数
            if (dbConfig) {
                inputs = {
                    instance_name: dbConfig.instance || '',
                    schema_name: dbConfig.database || '',
                    table_names: dbConfig.tables || []
                };
            }
            
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
    ]);
    

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
                {/* 使用自定义的 CodeChatHeader 替代 BaseChatHeader */}
                <CodeChatHeader 
                    icon={agentConfig.icon}
                    title={agentConfig.name}
                    description={agentConfig.description}
                    iconBgColor={agentConfig.color}
                    onNewChat={() => {
                        setMessages([]);
                        setConversationId(null);
                        setQuestion("");
                    }}
                    onViewHistory={fetchHistoryList}
                    isHistoryLoading={isHistoryLoading}
                    onDbChange={handleDbChange}
                    onTableChange={handleTableChange}
                />

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

export default CodeAgent;