import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  height: calc(100vh - 100px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
`;

const EditorPanel = styled.div`
  width: 50%;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
`;

const ChatPanel = styled.div`
  width: 50%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
`;

const CodeEditor = styled.textarea`
  flex: 1;
  padding: 20px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.5;
  border: none;
  resize: none;
  outline: none;
`;

const EditorToolbar = styled.div`
  padding: 10px;
  background: #2d2d2d;
  border-bottom: 1px solid #333;
  display: flex;
  gap: 10px;
`;

const ToolButton = styled.button`
  padding: 8px 16px;
  background: ${props => props.primary ? '#0D47A1' : '#333'};
  color: white;
  border: 1px solid ${props => props.primary ? '#1565C0' : '#444'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.primary ? '#1565C0' : '#444'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ChatHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
`;

const CodeIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #0D47A1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  margin-right: 12px;
`;

const ChatArea = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const MessageBubble = styled.div`
  max-width: 80%;
  margin: ${props => props.isUser ? '10px 0 10px auto' : '10px 0'};
  padding: 12px 16px;
  border-radius: 8px;
  background: ${props => props.isUser ? '#0D47A1' : 'white'};
  color: ${props => props.isUser ? 'white' : '#333'};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  pre {
    margin: 8px 0;
    padding: 12px;
    background: #1e1e1e;
    border-radius: 4px;
    overflow-x: auto;
    color: #d4d4d4;
  }
`;

const InputArea = styled.div`
  padding: 20px;
  background: white;
  border-top: 1px solid #eee;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 10px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px;
`;

const Input = styled.input`
  flex: 1;
  border: none;
  padding: 8px;
  font-size: 14px;
  outline: none;
  background: transparent;
`;

const SendButton = styled.button`
  padding: 8px 16px;
  background: #0D47A1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: #1565C0;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #ccc;
    transform: none;
    cursor: not-allowed;
  }
`;

const CodeAgent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,
      { text: input, isUser: true },
      { 
        text: '让我来帮你解决代码问题。这是一个示例代码：\n```javascript\nconst example = () => {\n  console.log("Hello World");\n};\n```',
        isUser: false 
      }
    ];
    
    setMessages(newMessages);
    setInput('');
  };

  const handleRunCode = () => {
    if (!code.trim()) return;
    // 这里添加运行代码的逻辑
    console.log('Running code:', code);
  };

  const renderMessage = (message) => {
    const parts = message.text.split('```');
    if (parts.length === 1) {
      return message.text;
    }

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <pre key={index}>{part}</pre>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <Container>
      <EditorPanel>
        <EditorToolbar>
          <ToolButton onClick={() => setCode('')}>清空</ToolButton>
          <ToolButton primary onClick={handleRunCode}>运行代码</ToolButton>
        </EditorToolbar>
        <CodeEditor
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="// 在这里编写代码..."
        />
      </EditorPanel>
      <ChatPanel>
        <ChatHeader>
          <CodeIcon>💻</CodeIcon>
          <div>
            <h2 style={{ margin: 0 }}>代码助手</h2>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>专注解决编程问题</p>
          </div>
        </ChatHeader>
        <ChatArea>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              有任何代码问题都可以问我
            </div>
          )}
          {messages.map((message, index) => (
            <MessageBubble key={index} isUser={message.isUser}>
              {renderMessage(message)}
            </MessageBubble>
          ))}
        </ChatArea>
        <InputArea>
          <InputContainer>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="描述您的代码问题..."
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <SendButton onClick={handleSend} disabled={!input.trim()}>
              发送
            </SendButton>
          </InputContainer>
        </InputArea>
      </ChatPanel>
    </Container>
  );
};

export default CodeAgent; 