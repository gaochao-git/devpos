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
`;

const MessageBubble = styled.div`
  max-width: 70%;
  margin: 10px 0;
  padding: 12px 16px;
  border-radius: 12px;
  white-space: pre-wrap;
  ${props => props.isUser ? `
    background-color: #007AFF;
    color: white;
    align-self: flex-end;
  ` : `
    background-color: ${props.isError ? '#ffebee' : '#F0F0F0'};
    color: ${props.isError ? '#d32f2f' : '#333'};
    align-self: flex-start;
  `}
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

const ChatInterface = ({ agent }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 初始化会话
  useEffect(() => {
    initializeConversation();
  }, []);

  // 滚动到最新消息
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeConversation = async () => {
    try {
      const newConversationId = await createNewConversation();
      setConversationId(newConversationId);
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setMessages(prev => [...prev, {
        content: '初始化会话失败，请刷新页面重试。',
        isError: true,
        timestamp: getStandardTime()
      }]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getStandardTime = () => {
    return new Date().toISOString();
  };

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

    // 取消之前的请求（如果有）
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    try {
      await sendMessageToAssistant(
        {
          query: input,
          inputs: { mode: agent.mode || "通用助手" },
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
      console.error('Failed to send message:', error);
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
      <MessagesContainer>
        {messages.map((message, index) => (
          <MessageBubble 
            key={index} 
            isUser={message.isUser}
            isError={message.isError}
          >
            {message.isUser ? message.content : (message.content || '思考中...')}
          </MessageBubble>
        ))}
        <div ref={messagesEndRef} />
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

export default ChatInterface; 