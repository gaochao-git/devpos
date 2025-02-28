import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Icon, message, Tooltip } from 'antd';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { 
    sendMessageToAssistant, 
    createNewConversation, 
    uploadFile,
    getHistoryConversations,  // 确保这个名字和 aIAssistantApi.js 中的导出一致
    getHistoryMessageDetail,  // 添加新的API导入
    stopMessageGeneration  // 添加新的导入
} from '../aIAssistantApi';
import HistoryConversationModal from '../components/HistoryConversationModal';
import { agentComponentMap } from '../config/componentMapping';  // 添加这行导入

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
  border-radius: 8px;
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
  padding: 20px;
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

// 添加样式组件
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 16px;  // 增加图标间距
  align-items: center;
`;

// 修改图标样式，使用圆形背景
const AgentIcon = styled.span`
  font-size: 24px;  // 调整图标大小
  display: flex;
  align-items: center;
  justify-content: center;  // 水平居中
  color: white;  // 图标颜色改为白色
  background-color: ${props => props.color};  // 使用传入的颜色作为背景
  width: 36px;  // 固定宽度
  height: 36px;  // 固定高度
  border-radius: 50%;  // 使用 50% 实现圆形
  margin-right: 8px;  // 与文字的间距
`;

const AgentName = styled.span`
  font-size: 16px;
  color: #333;
  font-weight: 500;  // 稍微加粗文字
`;

// 提取消息组件
const Message = React.memo(({ 
  message, 
  isStreaming, 
  handleStopGeneration 
}) => (
  <MessageContainer isUser={message.isUser}>
    <MessageBubble 
      isUser={message.isUser}
      isError={message.isError}
    >
      {message.isUser ? (
        <div>{message.content}</div>
      ) : (
        <div className="markdown-content">
          <MarkdownRenderer content={message.content} />
          {message.metadata?.usage && (
            <div className="metadata">
              <div>Tokens: {message.metadata.usage.total_tokens} (Prompt: {message.metadata.usage.prompt_tokens}, Completion: {message.metadata.usage.completion_tokens})</div>
              <div>Cost: ¥{message.metadata.usage.total_price} (Prompt: ¥{message.metadata.usage.prompt_price}, Completion: ¥{message.metadata.usage.completion_price})</div>
              <div>Response Time: {message.metadata.usage.latency.toFixed(2)}s</div>
            </div>
          )}
        </div>
      )}
      {message.files && message.files.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '14px', opacity: 0.8 }}>
          📎 {message.files.join(', ')}
        </div>
      )}
    </MessageBubble>
    {(!message.isCurrentMessage || !isStreaming) && (
      <Timestamp isUser={message.isUser}>
        {message.timestamp}
      </Timestamp>
    )}
  </MessageContainer>
), (prevProps, nextProps) => {
  // 如果是当前正在生成的消息，不进行记忆化
  if (nextProps.message.isCurrentMessage) {
    return false;
  }
  
  // 对于历史消息，比较关键属性
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.timestamp === nextProps.message.timestamp &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

const GeneralAgent = ({ agentType = 'general' }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileStatuses, setFileStatuses] = useState({});
  const [uploadedFileIds, setUploadedFileIds] = useState([]);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesContainerRef = useRef(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [expandedConversations, setExpandedConversations] = useState(new Set());
  const [conversationMessages, setConversationMessages] = useState(new Map());
  const [loadingConversations, setLoadingConversations] = useState(new Set());
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);

  // 获取助手配置
  const agentConfig = agentComponentMap[agentType];

  const getStandardTime = () => {
    const now = new Date();
    return now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false
    }).replace(/\//g, '-');
  };

  useEffect(() => {
    // 初始化会话
    const initConversation = async () => {
      try {
        const newConversationId = await createNewConversation();
        setConversationId(newConversationId);
        // 添加系统欢迎消息
        setMessages([{
          content: "你好！我是通用助手，请问有什么我可以帮你的？",
          isUser: false,
          timestamp: getStandardTime()
        }]);
      } catch (error) {
        console.error('初始化会话失败:', error);
        setMessages([{
          content: "初始化会话失败，请刷新页面重试。",
          isError: true,
          timestamp: getStandardTime()
        }]);
      }
    };

    initConversation();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  // 消息更新时的滚动处理
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleFileUpload = async (event) => {
    const newFiles = Array.from(event.target.files);
    
    // 更新文件列表和状态
    setFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      setFileStatuses(prev => ({
        ...prev,
        [file.name]: { status: 'uploading', id: null }
      }));
    });

    // 立即上传文件
    for (const file of newFiles) {
      try {
        const uploadResult = await uploadFile(file);
        setFileStatuses(prev => ({
          ...prev,
          [file.name]: { status: 'ready', id: uploadResult.id }
        }));
        setUploadedFileIds(prev => [...prev, uploadResult.id]);
      } catch (error) {
        console.error('文件上传失败:', error);
        setFileStatuses(prev => ({
          ...prev,
          [file.name]: { status: 'error', error: '上传失败' }
        }));
      }
    }
  };

  const removeFile = (fileToRemove) => {
    setFiles(prev => prev.filter(file => file !== fileToRemove));
    // 同时移除对应的文件ID
    const fileStatus = fileStatuses[fileToRemove.name];
    if (fileStatus?.id) {
      setUploadedFileIds(prev => prev.filter(id => id !== fileStatus.id));
    }
    // 清除文件状态
    setFileStatuses(prev => {
      const newStatus = { ...prev };
      delete newStatus[fileToRemove.name];
      return newStatus;
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && files.length === 0) || isStreaming) return;

    const userMessage = {
      content: input,
      files: files.map(f => f.name),
      isUser: true,
      timestamp: getStandardTime()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // 发送完消息后清除文件列表
    const fileIds = [...uploadedFileIds];  // 保存当前的文件ID
    setFiles([]);  // 清空文件列表
    setFileStatuses({});  // 清空文件状态
    setUploadedFileIds([]);  // 清空上传文件ID
    
    setIsStreaming(true);

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
          abortController: abortControllerRef.current
        },
        {
          setMessages,
          setIsStreaming,
          getStandardTime,
          setTaskId: (taskId) => {
            console.log('Received task ID:', taskId);
            setCurrentTaskId(taskId);
          }
        }
      );
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev => [...prev, {
        content: '发送消息失败，请重试。',
        isError: true,
        timestamp: getStandardTime()
      }]);
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 添加 getFileIcon 函数
  const getFileIcon = (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'txt':
        return '📃';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      default:
        return '📎';
    }
  };

  // 获取历史会话列表
  const fetchHistoryList = async () => {
    setIsHistoryLoading(true);
    try {
      const data = await getHistoryConversations();
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

  // 处理展开/收起会话
  const handleConversationToggle = async (conversationId) => {
    const isExpanded = expandedConversations.has(conversationId);
    const messages = conversationMessages.get(conversationId);

    if (!isExpanded && !messages) {
      setLoadingConversations(prev => new Set(prev).add(conversationId));
      try {
        // 使用新的 API 获取历史消息详情
        const messagesData = await getHistoryMessageDetail(conversationId, 'general');
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
  };

  // 继续历史会话
  const handleContinueConversation = async (conversation) => {
    try {
      // 使用新的 API 获取历史消息详情
      const messagesData = await getHistoryMessageDetail(conversation.id, 'general');
      setConversationId(conversation.id);
      
      const convertedMessages = messagesData.data.flatMap(msg => {
        const messages = [];
        
        if (msg.query) {
          messages.push({
            content: msg.query,
            isUser: true,
            timestamp: new Date(msg.created_at * 1000).toLocaleString()
          });
        }
        
        if (msg.answer) {
          messages.push({
            content: msg.answer,
            isUser: false,
            timestamp: new Date(msg.created_at * 1000).toLocaleString()
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
  };

  // 添加新开会话处理函数
  const handleNewConversation = () => {
    setMessages([]);
    setConversationId('');
  };

  const handleStopGeneration = async () => {
    console.log('Attempting to stop generation with task ID:', currentTaskId);
    if (currentTaskId) {
        try {
            await stopMessageGeneration(currentTaskId, agentType);
            setIsStreaming(false);
            setCurrentTaskId(null);
        } catch (error) {
            console.error('Failed to stop generation:', error);
        }
    }
  };

  return (
    <ChatContainer>
      <Header>
        <HeaderLeft>
          <AgentIcon color={agentConfig.color}>
            {agentConfig.icon}
          </AgentIcon>
          <AgentName>{agentConfig.name}</AgentName>
        </HeaderLeft>
        <HeaderRight>
          <Tooltip title="新开会话">
            <Icon 
              type="plus-circle" 
              style={{ 
                fontSize: '18px',
                cursor: 'pointer',
                color: '#1890ff'
              }}
              onClick={handleNewConversation}
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
              onClick={!isHistoryLoading ? fetchHistoryList : undefined}
            />
          </Tooltip>
        </HeaderRight>
      </Header>

      <MessagesContainer 
        className="messages-container"
        ref={messagesContainerRef}
      >
        {messages.map((message, index) => (
          <Message
            key={message.timestamp}
            message={message}
            isStreaming={isStreaming}
            handleStopGeneration={handleStopGeneration}
          />
        ))}
      </MessagesContainer>
      <InputContainer>
        <InputWrapper>
          <InputWithButtons>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="智能助手随时待命..."
              disabled={isStreaming}
            />
            <ButtonGroup>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                multiple
                accept=".txt,.md,.mdx,.pdf,.html,.htm,.xlsx,.xls,.docx,.csv"
              />
              <UploadButton
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                title="上传图片或文档"
              >
                <Icon type="plus" />
              </UploadButton>
              {isStreaming ? (
                <StopButton 
                  onClick={handleStopGeneration}
                  title="停止生成"
                >
                  <Icon type="pause" />
                </StopButton>
              ) : (
                <SendButton 
                  onClick={handleSend} 
                  disabled={(!input.trim() && files.length === 0) || isStreaming}
                  title="发送消息"
                >
                  <Icon type="arrow-up" />
                </SendButton>
              )}
            </ButtonGroup>
          </InputWithButtons>
          {files.length > 0 && (
            <FileUploadContainer>
              {files.map((file, index) => (
                <FilePreview 
                  key={index}
                  className={fileStatuses[file.name]?.status}
                >
                  {getFileIcon(file)}
                  <span>{file.name}</span>
                  {fileStatuses[file.name]?.status === 'uploading' && (
                    <span className="file-status">上传中...</span>
                  )}
                  <RemoveFileButton 
                    onClick={() => removeFile(file)}
                    title="移除文件"
                  >
                    ×
                  </RemoveFileButton>
                </FilePreview>
              ))}
            </FileUploadContainer>
          )}
        </InputWrapper>
      </InputContainer>

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
    </ChatContainer>
  );
};

export default GeneralAgent; 