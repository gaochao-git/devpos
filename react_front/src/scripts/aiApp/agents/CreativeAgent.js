import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  height: calc(100vh - 100px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
`;

const CreativePanel = styled.div`
  width: 50%;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  background: white;
`;

const ChatPanel = styled.div`
  width: 50%;
  display: flex;
  flex-direction: column;
  background: white;
`;

const ToolBar = styled.div`
  padding: 15px;
  background: #FFF3E0;
  display: flex;
  gap: 10px;
  border-bottom: 1px solid #FFE0B2;
`;

const ToolButton = styled.button`
  padding: 10px 20px;
  background: ${props => props.active ? '#FF9800' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  box-shadow: ${props => props.active ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Canvas = styled.div`
  flex: 1;
  background: white;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ChatHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  background: #FFF3E0;
`;

const CreativeIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: #FF9800;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  margin-right: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const ChatArea = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #fff;
`;

const MessageBubble = styled.div`
  position: relative;
  max-width: 80%;
  margin: ${props => props.isUser ? '20px 0 20px auto' : '20px 0'};
  padding: 16px;
  border-radius: 16px;
  background: ${props => props.isUser ? '#FF9800' : '#FFF3E0'};
  color: ${props => props.isUser ? 'white' : '#333'};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  &:before {
    content: '';
    position: absolute;
    ${props => props.isUser ? 'right: -10px' : 'left: -10px'};
    top: 50%;
    transform: translateY(-50%);
    border-style: solid;
    border-width: 10px;
    border-color: transparent;
    ${props => props.isUser
      ? 'border-left-color: #FF9800;'
      : 'border-right-color: #FFF3E0;'
    }
  }

  .idea {
    margin-top: 8px;
    padding: 8px;
    background: rgba(255,255,255,0.8);
    border-radius: 8px;
    font-style: italic;
  }
`;

const InputArea = styled.div`
  padding: 20px;
  background: #FFF3E0;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 10px;
  background: white;
  border-radius: 24px;
  padding: 8px 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #FF9800;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 18px;

  &:hover {
    background: #F57C00;
    transform: rotate(90deg);
  }

  &:disabled {
    background: #ccc;
    transform: none;
  }
`;

const CreativeAgent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('mindmap');

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,
      { text: input, isUser: true },
      { 
        text: '让我们来激发创意灵感！',
        idea: '基于您的想法，我们可以从以下几个方向展开思考...',
        isUser: false 
      }
    ];
    
    setMessages(newMessages);
    setInput('');
  };

  const renderCreativeContent = () => {
    switch (activeTab) {
      case 'mindmap':
        return <div>思维导图工作区</div>;
      case 'sketch':
        return <div>草图绘制区</div>;
      case 'notes':
        return <div>灵感笔记区</div>;
      default:
        return null;
    }
  };

  return (
    <Container>
      <CreativePanel>
        <ToolBar>
          <ToolButton
            active={activeTab === 'mindmap'}
            onClick={() => setActiveTab('mindmap')}
          >
            思维导图
          </ToolButton>
          <ToolButton
            active={activeTab === 'sketch'}
            onClick={() => setActiveTab('sketch')}
          >
            草图绘制
          </ToolButton>
          <ToolButton
            active={activeTab === 'notes'}
            onClick={() => setActiveTab('notes')}
          >
            灵感笔记
          </ToolButton>
        </ToolBar>
        <Canvas>
          {renderCreativeContent()}
        </Canvas>
      </CreativePanel>
      <ChatPanel>
        <ChatHeader>
          <CreativeIcon>💡</CreativeIcon>
          <div>
            <h2 style={{ margin: 0 }}>创意助手</h2>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>激发灵感，碰撞创意</p>
          </div>
        </ChatHeader>
        <ChatArea>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              让我们开始头脑风暴吧！
            </div>
          )}
          {messages.map((message, index) => (
            <MessageBubble key={index} isUser={message.isUser}>
              {message.text}
              {message.idea && (
                <div className="idea">
                  {message.idea}
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
              placeholder="分享您的创意..."
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <SendButton onClick={handleSend} disabled={!input.trim()}>
              ✨
            </SendButton>
          </InputContainer>
        </InputArea>
      </ChatPanel>
    </Container>
  );
};

export default CreativeAgent; 