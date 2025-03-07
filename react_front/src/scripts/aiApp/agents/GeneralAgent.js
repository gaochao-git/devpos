import React, { useState, useRef, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { BaseChatHeader, BaseChatFooter, ChatMessage } from '../components/BaseLayout';
import { 
    sendMessageToAssistant, 
    getHistoryConversations,
    getHistoryMessageDetail,
    stopMessageGeneration
} from '../aIAssistantApi';
import HistoryConversationModal from '../components/HistoryConversationModal';
import { agentComponentMap } from '../config/componentMapping';

const agentTypeKey = 'general';

// 使用与 CodeAgent 相同的 MessageList 组件
const MessageList = React.memo(({ messages, streaming, onStopGeneration, messagesEndRef }) => {
    return (
        <>
            {messages.map((message, index) => (
                <ChatMessage
                    key={index}
                    message={message}
                    isStreaming={streaming && index === messages.length - 1}
                    onStopGeneration={onStopGeneration}
                    agentType={agentTypeKey}
                />
            ))}
            <div ref={messagesEndRef} />
        </>
    );
});

const GeneralAgent = () => {
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
    
    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const abortControllerRef = useRef(null);
    
    // 初始化欢迎消息 - 移除欢迎消息
    useEffect(() => {
        // 不再设置初始欢迎消息
        // setMessages([{
        //     role: 'assistant',
        //     content: "你好！我是通用助手，请问有什么我可以帮你的？",
        //     time: new Date().toLocaleTimeString()
        // }]);
        
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);
    
    // 滚动到底部
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current && shouldAutoScroll && messagesContainerRef.current) {
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
            const { scrollTop, scrollHeight, clientHeight } = container;
            // 如果用户向上滚动，停止自动滚动
            // 添加一个小的缓冲区（例如 100px）以使体验更流畅
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShouldAutoScroll(isAtBottom);
        };
        
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);
    
    // 处理文件变更
    const handleFilesChange = useCallback((files, fileIds) => {
        setUploadedFiles(files);
        setUploadedFileIds(fileIds);
    }, []);
    
    // 处理网络搜索切换
    const handleWebSearch = useCallback(() => {
        setIsWebSearchActive(!isWebSearchActive);
    }, [isWebSearchActive]);
    
    // 获取历史会话列表
    const fetchHistoryList = useCallback(async () => {
        setIsHistoryLoading(true);
        try {
            const data = await getHistoryConversations(agentTypeKey);
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
                const messagesData = await getHistoryMessageDetail(conversationId, agentTypeKey);
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
                        time: new Date(msg.created_at * 1000).toLocaleString(),
                        message_id: msg.id
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
    const handleSend = useCallback(async () => {
        if ((!question.trim() && uploadedFiles.length === 0) || streaming) return;
        
        const userMessage = {
            role: 'user',
            content: question,
            files: uploadedFiles.map(f => f.name),
            time: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setQuestion('');
        
        const fileIds = [...uploadedFileIds];
        setUploadedFiles([]);
        setUploadedFileIds([]);
        
        setStreaming(true);
        
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        
        try {
            const fileObjects = fileIds.map(id => ({
                type: "document",
                transfer_method: "local_file",
                upload_file_id: id
            }));
            
            await sendMessageToAssistant(
                {
                    query: question,
                    files: fileObjects,
                    conversationId,
                    abortController: abortControllerRef.current,
                    agentType: agentTypeKey
                },
                {
                    setMessages,
                    setIsStreaming: setStreaming,
                    getStandardTime: () => new Date().toLocaleTimeString(),
                    setTaskId,
                    setConversationId
                }
            );
        } catch (error) {
            console.error('发送消息失败:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '发送消息失败，请重试。',
                isError: true,
                time: new Date().toLocaleTimeString()
            }]);
            setStreaming(false);
        }
    }, [question, uploadedFiles, uploadedFileIds, streaming, conversationId]);
    
    // 中断生成
    const handleInterrupt = useCallback(async () => {
        if (taskId) {
            try {
                await stopMessageGeneration(taskId, agentTypeKey);
                setStreaming(false);
                setTaskId(null);
            } catch (error) {
                console.error('Failed to stop generation:', error);
            }
        }
    }, [taskId]);
    
    return (
            <div style={{
               height: 'calc(100vh - 128px)', 
                flex: 1,
                background: '#fff',
                borderRadius: '8px',
                border: '1px solid #e8e8e8',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <BaseChatHeader 
                    icon={agentConfig.icon}
                    title={agentConfig.name}
                    description={agentConfig.description}
                    iconBgColor={agentConfig.color}
                    onNewChat={() => {
                        setMessages([]); // 清空消息，不再添加欢迎消息
                        setConversationId(null);
                        setQuestion("");
                    }}
                    onViewHistory={fetchHistoryList}
                    isHistoryLoading={isHistoryLoading}
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
                        borderTopRightRadius: '8px',
                        minWidth: 0
                    }}>
                        <div 
                            ref={messagesContainerRef}
                            style={{
                                flex: 1,
                                overflow: 'auto',
                                padding: '0 15px 30px 15px',
                                minWidth: 0,
                                width: '100%'
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
                            onSend={handleSend}
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
    );
};

export default GeneralAgent; 