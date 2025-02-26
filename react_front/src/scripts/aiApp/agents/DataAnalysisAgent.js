import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  height: calc(100vh - 100px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
`;

const VisualizationPanel = styled.div`
  width: 50%;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #f8f9fa;
`;

const ChatPanel = styled.div`
  width: 50%;
  display: flex;
  flex-direction: column;
  background: white;
`;

const UploadArea = styled.div`
  padding: 20px;
  border: 2px dashed #9C27B0;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  margin-bottom: 20px;
  transition: all 0.2s;

  &:hover {
    background: rgba(156, 39, 176, 0.1);
    border-color: #7B1FA2;
  }
`;

const ChartArea = styled.div`
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eee;
`;

const ChatHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
`;

const DataIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #9C27B0;
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
  background: #f8f9fa;
`;

const MessageBubble = styled.div`
  max-width: 80%;
  margin: ${props => props.isUser ? '10px 0 10px auto' : '10px 0'};
  padding: 12px 16px;
  border-radius: 12px;
  background: ${props => props.isUser ? '#9C27B0' : 'white'};
  color: ${props => props.isUser ? 'white' : '#333'};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .data-preview {
    margin-top: 8px;
    padding: 8px;
    background: #f1f1f1;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
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

  &::placeholder {
    color: #9e9e9e;
  }
`;

const SendButton = styled.button`
  padding: 8px 16px;
  background: #9C27B0;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: #7B1FA2;
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

const DataAnalysisAgent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [data, setData] = useState(null);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,
      { text: input, isUser: true },
      { 
        text: '我来帮你分析数据。这是一个数据预览：',
        data: data ? `文件名: ${data.name}\n大小: ${data.size} bytes` : '暂无数据',
        isUser: false 
      }
    ];
    
    setMessages(newMessages);
    setInput('');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setData(file);
      setMessages([
        ...messages,
        {
          text: `已上传文件：${file.name}`,
          data: `文件大小：${file.size} bytes\n类型：${file.type}`,
          isUser: true
        }
      ]);
    }
  };

  return (
    <Container>
      <VisualizationPanel>
        <UploadArea>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="data-upload"
          />
          <label htmlFor="data-upload">
            <DataIcon style={{ margin: '0 auto 10px' }}>📊</DataIcon>
            点击或拖拽文件到此处上传
            <br />
            <small style={{ color: '#666' }}>支持 CSV, Excel 文件</small>
          </label>
        </UploadArea>
        <ChartArea>
          {data ? (
            <div>数据可视化区域</div>
          ) : (
            <div style={{ color: '#666' }}>上传数据后将在此处显示图表</div>
          )}
        </ChartArea>
      </VisualizationPanel>
      <ChatPanel>
        <ChatHeader>
          <DataIcon>📊</DataIcon>
          <div>
            <h2 style={{ margin: 0 }}>数据分析助手</h2>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>专业的数据分析与可视化</p>
          </div>
        </ChatHeader>
        <ChatArea>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              上传数据文件开始分析
            </div>
          )}
          {messages.map((message, index) => (
            <MessageBubble key={index} isUser={message.isUser}>
              {message.text}
              {message.data && (
                <div className="data-preview">
                  {message.data}
                </div>
              )}
            </MessageBubble>
          ))}
        </ChatArea>
        <InputArea>
          <InputContainer>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="询问数据分析相关问题..."
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

export default DataAnalysisAgent; 