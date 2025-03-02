import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Button, Icon, message, Tooltip } from 'antd';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { 
    sendMessageToAssistant, 
    uploadFile,
    getHistoryConversations,  // 确保这个名字和 aIAssistantApi.js 中的导出一致
    getHistoryMessageDetail,  // 添加新的API导入
    stopMessageGeneration  // 添加新的导入
} from '../aIAssistantApi';
import HistoryConversationModal from '../components/HistoryConversationModal';
import { agentComponentMap } from '../config/componentMapping';  // 添加这行导入
import { BaseChatHeader, BaseChatFooter, ChatMessage } from '../components/BaseLayout';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f8fbff;  // 更浅的蓝色背景
  border-radius: 0 0 8px 8px;
  margin-bottom: 20px;
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
`;

const MessageBubble = styled.div`
  max-width: 70%;
  margin: 10px 0;
  padding: 12px 16px;
  border-radius: 12px;
  word-break: break-word;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.isUser ? '#c1e0c1' : props.isError ? '#ffebee' : '#ffffff'};  // 用户消息加深为 #c1e0c1
  color: ${props => props.isError ? '#d32f2f' : '#333333'};

  .markdown-content {
    * {
      color: inherit;
    }

    pre {
      margin: 8px 0;
      border-radius: 6px;
      background: ${props => props.isUser ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    }

    code {
      font-family: monospace;
    }

    p {
      margin: 8px 0;
    }

    ul, ol {
      margin: 8px 0;
      padding-left: 20px;
    }
  }

  .metadata {
    margin-top: 8px;
    padding: 8px;
    background: #fafafa;
    border-radius: 4px;
    font-size: 12px;
    color: #999;
  }
`;

const MessageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  margin: 4px 0;
`;

const Timestamp = styled.div`
  font-size: 12px;
  color: #666;
  margin: ${props => props.isUser ? '4px 8px 0 0' : '4px 0 0 8px'};
`;

const InputContainer = styled.div`
  display: flex;
  gap: 10px;
  padding: 0px;
  background-color: #ffffff;
  border-radius: 8px;
`;

const InputWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
`;

const InputWithButtons = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding-right: 8px;

  &:focus-within {
    border-color: #007AFF;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  outline: none;
`;

const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UploadButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;  // 增大字体大小

  &:hover {
    color: #007AFF;
  }

  &:disabled {
    color: #ccc;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #007AFF;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;  // 增大字体大小

  &:hover {
    color: #0056b3;
  }

  &:disabled {
    color: #ccc;
    cursor: not-allowed;
  }
`;

const StopButton = styled(SendButton)`
  color: #ff4d4f;
  
  &:hover {
    color: #ff7875;
  }
`;

const FileUploadContainer = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;

  .file-status {
    font-size: 12px;
    color: #666;
  }

  &.uploading {
    background-color: #e3f2fd;
  }

  &.error {
    background-color: #ffebee;
  }
`;

const RemoveFileButton = styled.button`
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 2px;
  &:hover {
    color: #d32f2f;
  }
`;

const agentTypeKey = 'general';

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
    const [input, setInput] = useState('');
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
    
    // 获取标准时间
    const getStandardTime = () => {
        const now = new Date();
        return now.toLocaleString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };
    
    // 初始化欢迎消息
    useEffect(() => {
        setMessages([{
            role: 'assistant',
            content: "你好！我是通用助手，请问有什么我可以帮你的？",
            time: getStandardTime()
        }]);
        
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
        if ((!input.trim() && uploadedFiles.length === 0) || streaming) return;
        
        const userMessage = {
            role: 'user',
            content: input,
            files: uploadedFiles.map(f => f.name),
            time: getStandardTime()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        
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
                    query: input,
                    files: fileObjects,
                    conversationId,
                    abortController: abortControllerRef.current,
                    agentType: agentTypeKey
                },
                {
                    setMessages: (updater) => {
                        setMessages(prev => {
                            const newMessages = typeof updater === 'function' 
                                ? updater(prev) 
                                : updater;
                            
                            // 确保消息有正确的格式
                            return newMessages.map(msg => ({
                                ...msg,
                                role: msg.isUser ? 'user' : 'assistant',
                                time: msg.timestamp || msg.time || getStandardTime(),
                                content: msg.content
                            }));
                        });
                    },
                    setIsStreaming: setStreaming,
                    getStandardTime,
                    setTaskId: (id) => {
                        console.log('Received task ID:', id);
                        setTaskId(id);
                    },
                    setConversationId
                }
            );
        } catch (error) {
            console.error('发送消息失败:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '发送消息失败，请重试。',
                isError: true,
                time: getStandardTime()
            }]);
            setStreaming(false);
        }
    }, [input, uploadedFiles, uploadedFileIds, streaming, conversationId]);
    
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
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 128px)', 
            padding: '20px',
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
                    icon={agentConfig.icon}
                    title={agentConfig.name}
                    description={agentConfig.description}
                    iconBgColor={agentConfig.color}
                    onNewChat={() => {
                        setMessages([{
                            role: 'assistant',
                            content: "你好！我是通用助手，请问有什么我可以帮你的？",
                            time: getStandardTime()
                        }]);
                        setConversationId(null);
                        setInput("");
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
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#F8FBFF'
                    }}>
                        <div 
                            ref={messagesContainerRef}
                            style={{
                                flex: 1,
                                overflow: 'auto',
                                padding: '20px'
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
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
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
        </div>
    );
};

export default GeneralAgent; 