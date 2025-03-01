import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input, Button, message, Spin, Icon, Card, Select, Divider, Checkbox } from 'antd';
import { BaseChatHeader, BaseChatFooter, ChatMessage } from '../components/BaseLayout';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import {
    sendMessageToAssistant,
    getHistoryConversations,
    getConversationMessages,
    renameConversation,
    stopMessageGeneration
} from '../aIAssistantApi';

const { TextArea } = Input;
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
            title="RAG 配置" 
            bordered={false}
            style={{ marginBottom: '10px' }}
        >
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
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    
    // RAG 配置
    const [ragConfig, setRagConfig] = useState({
        db_types: [],
        vectorQuery: '',
        scalarQuery: ''
    });
    
    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const abortControllerRef = useRef(null);
    const scrollTimeoutRef = useRef(null);
    
    // 计算属性
    const allSelected = useMemo(() => {
        return ragConfig.db_types.length === DB_OPTIONS.length;
    }, [ragConfig.db_types]);
    
    // 滚动处理
    const handleScroll = useCallback(() => {
        if (!messagesContainerRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const scrollPosition = scrollTop + clientHeight;
        
        // 判断是否在底部附近 (50px 阈值)
        const isNearBottom = scrollHeight - scrollPosition < 50;
        setAutoScrollEnabled(isNearBottom);
    }, []);
    
    // 滚动到底部
    const scrollToBottom = useCallback((force = false) => {
        if (!messagesEndRef.current || !messagesContainerRef.current) return;
        
        if (autoScrollEnabled || force) {
            requestAnimationFrame(() => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({
                        behavior: 'smooth',
                        block: 'end'
                    });
                }
            });
        }
    }, [autoScrollEnabled]);
    
    // 更新 RAG 配置
    const updateRagConfig = useCallback((updates) => {
        setRagConfig(prev => ({ ...prev, ...updates }));
    }, []);
    
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
        setAutoScrollEnabled(true);
        
        // 添加消息后立即滚动到底部
        setTimeout(() => scrollToBottom(true), 50);

        try {
            const inputs = {
                db_types: ragConfig.db_types,
                vector_query: ragConfig.vectorQuery,
                scalar_query: ragConfig.scalarQuery
            };

            // 准备文件对象
            const fileObjects = uploadedFileIds.map(id => ({
                type: "document",
                transfer_method: "local_file",
                upload_file_id: id
            }));

            // 使用防抖更新器
            let lastUpdateTime = Date.now();
            const UPDATE_INTERVAL = 100;
            
            const debouncedSetMessages = (messagesUpdater) => {
                const currentTime = Date.now();
                if (currentTime - lastUpdateTime > UPDATE_INTERVAL || 
                    typeof messagesUpdater !== 'function') {
                    
                    setMessages(prev => {
                        const newMessages = typeof messagesUpdater === 'function' 
                            ? messagesUpdater(prev)
                            : messagesUpdater;
                        
                        return newMessages;
                    });
                    
                    lastUpdateTime = currentTime;
                    
                    // 如果自动滚动启用，滚动到底部
                    if (autoScrollEnabled) {
                        setTimeout(() => scrollToBottom(), 10);
                    }
                }
            };

            await sendMessageToAssistant(
                {
                    query: content,
                    inputs,
                    files: fileObjects,
                    conversationId,
                    abortController: abortControllerRef.current,
                    agentType: 'data-analysis'
                },
                {
                    setMessages: debouncedSetMessages,
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
        autoScrollEnabled, 
        scrollToBottom
    ]);
    
    // 设置滚动监听
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
        }
        
        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [handleScroll]);
    
    // 清理定时器
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);
    
    // 监听消息变化，滚动到底部
    useEffect(() => {
        if (autoScrollEnabled) {
            scrollTimeoutRef.current = setTimeout(() => {
                scrollToBottom();
            }, 50);
        }
    }, [messages, autoScrollEnabled, scrollToBottom]);
    
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
                    onViewHistory={() => {
                        setIsHistoryLoading(true);
                        setTimeout(() => {
                            setIsHistoryLoading(false);
                        }, 1000);
                    }}
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
                                padding: '0 15px'
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
            </div>
        </div>
    );
};

export default DataAnalysisAgent;