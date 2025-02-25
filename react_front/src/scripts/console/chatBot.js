import React, { useState, useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import styled from 'styled-components';

const ChatContainer = styled.div`
  height: 600px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #ccc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
`;

const MessageContainer = styled.div`
  padding: 12px;
  margin: 8px;
  max-width: 70%;
  ${props => props.isUser ? `
    align-self: flex-end;
    background-color: #007bff;
    color: white;
    border-radius: 12px 12px 0 12px;
  ` : `
    align-self: flex-start;
    background-color: #f1f1f1;
    border-radius: 12px 12px 12px 0;
  `}
`;

const InputContainer = styled.div`
  padding: 16px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 8px;
`;

const Input = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
`;

const SendButton = styled.button`
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: #0056b3;
  }
`;

const ChatMessage = ({ message, isUser }) => (
  <MessageContainer isUser={isUser}>
    {message}
  </MessageContainer>
);

// 计算消息高度的辅助函数
const estimateMessageHeight = (message) => {
  const baseHeight = 70; // 基础高度（包含padding和margin）
  const charPerLine = 50; // 每行预计字符数
  const lineHeight = 24; // 每行高度
  const lines = Math.ceil(message.length / charPerLine);
  return baseHeight + (lines - 1) * lineHeight;
};

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const listRef = useRef();
  const sizeMap = useRef({});

  const getItemSize = index => {
    return sizeMap.current[index] || estimateMessageHeight(messages[index].text);
  };

  const Row = ({ index, style }) => {
    const message = messages[index];
    return (
      <div style={style}>
        <ChatMessage
          message={message.text}
          isUser={message.isUser}
        />
      </div>
    );
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // 模拟机器人回复
    setTimeout(() => {
      const botResponse = {
        id: Date.now(),
        text: `Bot response to: ${inputValue}`,
        isUser: false,
      };
      setMessages(prev => [...prev, botResponse]);
      
      // 滚动到底部
      if (listRef.current) {
        listRef.current.scrollToItem(messages.length + 1);
      }
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <ChatContainer>
      <div style={{ flex: 1, position: 'relative' }}>
        <List
          ref={listRef}
          height={500} // 聊天区域高度
          itemCount={messages.length}
          itemSize={getItemSize}
          width="100%"
          style={{ padding: '0 16px' }}
        >
          {Row}
        </List>
      </div>
      <InputContainer>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
        />
        <SendButton onClick={handleSend}>Send</SendButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatBot;
