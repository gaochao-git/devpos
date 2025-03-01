import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input, Button, message, Spin, Icon, Card, Select, Divider, Checkbox } from 'antd';
import { BaseChatHeader, BaseChatFooter, ChatMessage } from '../components/BaseLayout';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import {
    sendMessageToAssistant,
    getHistoryConversations,
    getHistoryMessageDetail,
    stopMessageGeneration
} from '../aIAssistantApi';
import HistoryConversationModal from '../components/HistoryConversationModal';

const { Option } = Select;
const promptTemplate = {
    default: {
        label: "默认模版",
        text: "请回答以下问题：\n\n上下文信息：\n{context}\n\n问题：{question}\n\n请基于上下文信息回答问题。"
    },
    feature_compare: {
        label: "功能对比分析",
        text: "你是一个专业的数据库功能对比分析专家。本次需要分析的数据库包括：{db_types}。请基于以下规则回答问题：\n\n1. 只使用上下文中提供的信息进行分析和对比\n2. 必须对上述列出的所有数据库进行分析，使用表格形式清晰展示各个数据库对所查询功能的支持情况：\n   - ✓ 表示支持\n   - ✗ 表示不支持\n   - ? 表示上下文中未提及\n3. 明确指出哪些数据库在上下文中完全没有相关信息\n4. 给出信息来源，包括文档名称和页码\n5. 不要推测或编造未在上下文中明确提到的信息\n6. 即使某些数据库在上下文中没有找到相关信息，也要在表格中列出并标记为 ?\n\n上下文信息：\n{context}\n\n问题：{question}\n\n请按照上述规则进行分析和对比。如果是功能对比，请务必使用表格形式展示结果，并确保包含所有指定的数据库。"
    }
};

// 常量配置
const DB_OPTIONS = [
    { value: 'shentong', label: '神通数据库' },
    { value: 'gaussdb', label: 'GaussDB' },
    { value: 'ob', label: 'OceanBase' },
    { value: 'gbase', label: 'GBase' },
    { value: 'tdsql', label: 'TDSQL' },
    { value: 'polardb', label: 'PolarDB' },
    { value: 'tidb', label: 'TiDB' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'dm', label: '达梦' },
    { value: 'xugu', label: '虚谷' },
    { value: 'goldendb', label: 'GoldenDB' },
    { value: 'kadb', label: 'KADB' }
];

// 提取为纯组件
const RagConfigPanel = React.memo(({ 
    ragConfig, 
    updateRagConfig, 
    allSelected, 
    onSelectAll, 
    onDBTypeChange 
}) => {
    return (
        <Card 
            title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Checkbox
                        checked={ragConfig.enabled}
                        onChange={(e) => updateRagConfig({ enabled: e.target.checked })}
                    >
                        启用知识库增强
                    </Checkbox>
                </div>
            }
            bordered={false}
            style={{ marginBottom: '10px' }}
        >
            {/* 只有在启用RAG时才显示其他参数 */}
            {ragConfig.enabled && (
                <>
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ marginBottom: '5px' }}>数据库类型</div>
                        <div style={{ marginBottom: '8px' }}>
                            <Checkbox 
                                checked={allSelected}
                                onChange={onSelectAll}
                            >
                                全选
                            </Checkbox>
                        </div>
                        <Select
                            mode="multiple"
                            style={{ width: '100%' }}
                            placeholder="选择数据库类型"
                            value={ragConfig.db_types}
                            onChange={onDBTypeChange}
                        >
                            {DB_OPTIONS.map(option => (
                                <Option key={option.value} value={option.value}>
                                    {option.label}
                                </Option>
                            ))}
                        </Select>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ marginBottom: '5px' }}>矢量搜索</div>
                        <Input
                            placeholder="输入关键词，用于语义相似度搜索"
                            value={ragConfig.vectorQuery}
                            onChange={(e) => updateRagConfig({ vectorQuery: e.target.value })}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ marginBottom: '5px' }}>标量搜索</div>
                        <Input
                            placeholder="输入关键词，用于精确/模糊匹配搜索"
                            value={ragConfig.scalarQuery}
                            onChange={(e) => updateRagConfig({ scalarQuery: e.target.value })}
                        />
                    </div>
                </>
            )}
        </Card>
    );
});

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
                />
            ))}
            <div ref={messagesEndRef} />
        </>
    );
});

// 重构为函数式组件
const DataAnalysisAgent = () => {
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
    
    // RAG 配置
    const [ragConfig, setRagConfig] = useState({
        enabled: false,
        db_types: [],
        vectorQuery: '',
        scalarQuery: ''
    });
    
    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const abortControllerRef = useRef(null);
    
    // 计算属性
    const allSelected = useMemo(() => {
        return ragConfig.db_types.length === DB_OPTIONS.length;
    }, [ragConfig.db_types]);
    
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
    
    // 更新 RAG 配置
    const updateRagConfig = useCallback((updates) => {
        setRagConfig(prev => ({ ...prev, ...updates }));
        console.log("RAG配置已更新:", { ...ragConfig, ...updates });
    }, [ragConfig]);
    
    // 全选处理
    const handleSelectAll = useCallback((e) => {
        if (e.target.checked) {
            updateRagConfig({ db_types: DB_OPTIONS.map(option => option.value) });
        } else {
            updateRagConfig({ db_types: [] });
        }
    }, [updateRagConfig]);
    
    // 数据库类型变更
    const handleDBTypeChange = useCallback((values) => {
        updateRagConfig({ db_types: values });
    }, [updateRagConfig]);
    
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
            const data = await getHistoryConversations(agentType='data-analysis');
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
                const messagesData = await getHistoryMessageDetail(conversationId, 'data-analysis');
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
            const messagesData = await getHistoryMessageDetail(conversation.id, 'data-analysis');
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
            // 准备RAG配置
            let inputs = {};
            
            // 只有在启用RAG时才添加RAG相关参数
            if (ragConfig.enabled) {
                inputs = {
                    enabled: true,
                    db_types: ragConfig.db_types,
                    vector_query: ragConfig.vectorQuery,
                    scalar_query: ragConfig.scalarQuery
                };
            }
            
            console.log("发送RAG配置:", inputs);

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
                    agentType: 'data-analysis'
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
        ragConfig, 
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
                <BaseChatHeader 
                    icon="database"
                    title="知识库问答"
                    description="基于文档的智能问答系统"
                    iconBgColor="#e6f4ff"
                    iconColor="#1890ff"
                    onNewChat={() => {
                        setMessages([]);
                        setConversationId(null);
                        setQuestion("");
                        setRagConfig(prev => ({
                            ...prev,
                            enabled: false,
                            db_types: []
                        }));
                    }}
                    onViewHistory={fetchHistoryList}
                    isHistoryLoading={isHistoryLoading}
                />

                <div style={{
                    flex: 1,
                    display: 'flex',
                    overflow: 'hidden'
                }}>
                    <ResizableBox
                        width={400}
                        axis="x"
                        resizeHandles={['e']}
                        style={{ 
                            borderRight: '1px solid #e8e8e8',
                            height: '100%'
                        }}
                    >
                        <div style={{ 
                            height: '100%', 
                            overflow: 'auto',
                            padding: '15px'
                        }}>
                            <RagConfigPanel 
                                ragConfig={ragConfig}
                                updateRagConfig={updateRagConfig}
                                allSelected={allSelected}
                                onSelectAll={handleSelectAll}
                                onDBTypeChange={handleDBTypeChange}
                            />
                        </div>
                    </ResizableBox>

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
                            agentType="data-analysis"
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

export default DataAnalysisAgent;