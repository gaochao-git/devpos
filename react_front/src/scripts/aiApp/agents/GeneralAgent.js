import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import MarkdownRenderer from '../components/MarkdownRenderer';
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
  word-break: break-word;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.isUser ? '#007AFF' : props.isError ? '#ffebee' : '#F0F0F0'};
  color: ${props => props.isUser ? 'white' : props.isError ? '#d32f2f' : '#333'};

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
  font-size: 20px;

  &:hover {
    color: #0056b3;
  }

  &:disabled {
    color: #ccc;
    cursor: not-allowed;
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

  return (
    <ChatContainer>
      <MessagesContainer className="messages-container">
        {messages.map((message, index) => (
          <MessageContainer key={index} isUser={message.isUser}>
            <MessageBubble 
              isUser={message.isUser}
              isError={message.isError}
            >
              {message.isUser ? (
                <div>{message.content}</div>
              ) : (
                <div className="markdown-content">
                  <MarkdownRenderer content={message.content} />
                </div>
              )}
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
          <InputWithButtons>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="千事不决问通义..."
              disabled={isStreaming}
            />
            <ButtonGroup>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <UploadButton
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                title="上传图片或文档"
              >
                📎
              </UploadButton>
              <SendButton 
                onClick={handleSend} 
                disabled={(!input.trim() && files.length === 0) || isStreaming}
              >
                ▶
              </SendButton>
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
    </ChatContainer>
  );
};

export default GeneralAgent; 