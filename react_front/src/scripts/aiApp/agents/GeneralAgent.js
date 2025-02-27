import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { sendMessageToAssistant, createNewConversation } from '../aIAssistantApi';

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
`;

const Input = styled.input`
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 16px;
  outline: none;

  &:focus {
    border-color: #007AFF;
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

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = {
      content: input,
      isUser: true,
      timestamp: getStandardTime()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      await sendMessageToAssistant(
        {
          query: input,
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
              {message.content || '思考中...'}
            </MessageBubble>
            <Timestamp isUser={message.isUser}>
              {message.timestamp}
            </Timestamp>
          </MessageContainer>
        ))}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </MessagesContainer>
      <InputContainer>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入您的问题..."
          disabled={isStreaming}
        />
        <SendButton 
          onClick={handleSend} 
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming ? '发送中...' : '发送'}
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default GeneralAgent; 