import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { sendMessageToAssistant, createNewConversation, uploadFile } from '../aIAssistantApi';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #ffffff;
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
  white-space: pre-wrap;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.isUser ? '#007AFF' : props.isError ? '#ffebee' : '#F0F0F0'};
  color: ${props => props.isUser ? 'white' : props.isError ? '#d32f2f' : '#333'};
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
  align-items: flex-end;
`;

const InputWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 16px;
  outline: none;

  &:focus {
    border-color: #007AFF;
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

const UploadButton = styled.button`
  padding: 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  transition: color 0.2s;

  &:hover {
    color: #007AFF;
  }

  &:disabled {
    color: #ccc;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  padding: 12px 24px;
  background-color: #007AFF;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const GeneralAgent = ({ agent }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileStatuses, setFileStatuses] = useState({});
  const [uploadedFileIds, setUploadedFileIds] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const getStandardTime = () => {
    return new Date().toLocaleTimeString();
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      const resizeObserver = new ResizeObserver(scrollToBottom);
      resizeObserver.observe(messagesContainer);
      return () => resizeObserver.disconnect();
    }
  }, []);

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
    
    // 不清除文件列表，保持上传的文件可以继续使用
    setIsStreaming(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // 构建文件对象数组
      const fileObjects = uploadedFileIds.map(id => ({
        type: "document",
        transfer_method: "local_file",
        upload_file_id: id
      }));

      await sendMessageToAssistant(
        {
          query: input,
          files: fileObjects,  // 传递文件ID数组
          conversationId,
          abortController: abortControllerRef.current
        },
        {
          setMessages,
          setIsStreaming,
          getStandardTime
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

  return (
    <ChatContainer>
      <MessagesContainer className="messages-container">
        {messages.map((message, index) => (
          <MessageContainer key={index} isUser={message.isUser}>
            <MessageBubble 
              isUser={message.isUser}
              isError={message.isError}
            >
              {message.content}
              {message.files && message.files.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '14px', opacity: 0.8 }}>
                  📎 {message.files.join(', ')}
                </div>
              )}
            </MessageBubble>
            <Timestamp isUser={message.isUser}>
              {message.timestamp}
            </Timestamp>
          </MessageContainer>
        ))}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </MessagesContainer>
      <InputContainer>
        <InputWrapper>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题，可以上传文件进行文档问答..."
            disabled={isStreaming}
          />
          {files.length > 0 && (
            <FileUploadContainer>
              {files.map((file, index) => (
                <FilePreview 
                  key={index}
                  className={fileStatuses[file.name]?.status}
                >
                  <span>📎 {file.name}</span>
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
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          multiple
          accept=".txt,.pdf,.doc,.docx"
        />
        <UploadButton
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="上传文件（支持 PDF、Word、TXT 等格式）"
        >
          📎
        </UploadButton>
        <SendButton 
          onClick={handleSend} 
          disabled={(!input.trim() && files.length === 0) || isStreaming}
        >
          {isStreaming ? '发送中...' : '发送'}
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default GeneralAgent; 