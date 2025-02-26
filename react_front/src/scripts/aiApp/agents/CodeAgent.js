import React, { useState } from 'react';
import { Select } from 'antd';
import styled from 'styled-components';

const Container = styled.div`
  height: calc(100vh - 100px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: #4CAF50;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  margin-right: 12px;
`;

const ChatArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const MessageBubble = styled.div`
  max-width: 80%;
  margin: ${props => props.isUser ? '10px 0 10px auto' : '10px auto 10px 0'};
  padding: 12px 16px;
  border-radius: ${props => props.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
  background-color: ${props => props.isUser ? '#4CAF50' : 'white'};
  color: ${props => props.isUser ? 'white' : '#333'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    ${props => props.isUser ? 'right: -8px' : 'left: -8px'};
    width: 16px;
    height: 16px;
    background-color: ${props => props.isUser ? '#4CAF50' : 'white'};
    clip-path: ${props => props.isUser ? 'polygon(0 0, 0% 100%, 100% 100%)' : 'polygon(100% 0, 0% 100%, 100% 100%)'};
  }
`;

const InputContainer = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  padding: 8px;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  flex: 1;
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  outline: none;
  background: transparent;
`;

const SendButton = styled.button`
  background: #4CAF50;
  color: white;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #388E3C;
  }

  &:disabled {
    background: #ccc;
  }
`;

const CodeAgent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,
      { text: input, isUser: true },
      { text: '我是通用助手，很高兴为您服务！让我们开始对话吧。', isUser: false }
    ];
    
    setMessages(newMessages);
    setInput('');
  };

  return (
    <Container>
      <Header>
        <Avatar>💬</Avatar>
        <div>
          <h2 style={{ margin: 0 }}>通用助手</h2>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>随时为您解答各类问题</p>
        </div>
      </Header>
      <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%'
      }}>
        {/* 第一层：选择框区域 */}
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '16px',
          background: '#fff',
          borderBottom: '1px solid #e8e8e8'
        }}>
          <Select
            placeholder="选择机房"
            style={{ width: 120 }}
          >
            {/* 机房选项 */}
          </Select>
          <Select
            placeholder="选择集群"
            style={{ width: 200 }}
          >
            {/* 集群选项 */}
          </Select>
          <Select
            placeholder="选择数据库"
            style={{ width: 150 }}
          >
            {/* 数据库选项 */}
          </Select>
          <Select
            mode="multiple"
            placeholder="选择表"
            style={{ width: 300 }}
          >
            {/* 表选项 */}
          </Select>
        </div>

        {/* 第二层：聊天区域 */}
        <ChatArea style={{ flex: 1 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              发送消息开始对话
            </div>
          )}
          {messages.map((message, index) => (
            <MessageBubble key={index} isUser={message.isUser}>
              {message.text}
            </MessageBubble>
          ))}
        </ChatArea>
      </div>
      <InputContainer>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入您的问题..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <SendButton onClick={handleSend} disabled={!input.trim()}>
          ➤
        </SendButton>
      </InputContainer>
    </Container>
  );
};

export default CodeAgent; 