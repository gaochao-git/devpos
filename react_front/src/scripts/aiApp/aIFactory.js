import React, { useState } from 'react';
import styled from 'styled-components';
import ChatInterface from './components/ChatInterface';

const Container = styled.div`
  display: flex;
  height: 100vh;
  background-color: #f5f5f5;
`;

const Sidebar = styled.div`
  width: 280px;
  background-color: #ffffff;
  border-right: 1px solid #e0e0e0;
  padding: 20px;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
`;

const MainContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const AgentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AgentItem = styled.div`
  padding: 15px;
  background-color: ${props => props.active ? '#e3f2fd' : '#ffffff'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #e0e0e0;

  &:hover {
    background-color: #e3f2fd;
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const AIFactory = () => {
  const [selectedAgent, setSelectedAgent] = useState(null);

  // 示例智能体数据
  const agents = [
    { id: 1, name: '通用助手', description: '可以回答各种常见问题' },
    { id: 2, name: '代码助手', description: '专注于编程相关问题' },
    { id: 3, name: '数据分析助手', description: '协助数据分析和可视化' },
    { id: 4, name: '创意助手', description: '帮助激发创意和头脑风暴' },
  ];

  return (
    <Container>
      <Sidebar>
        <h2>智能体列表</h2>
        <AgentList>
          {agents.map(agent => (
            <AgentItem
              key={agent.id}
              active={selectedAgent?.id === agent.id}
              onClick={() => setSelectedAgent(agent)}
            >
              <h3>{agent.name}</h3>
              <p>{agent.description}</p>
            </AgentItem>
          ))}
        </AgentList>
      </Sidebar>
      <MainContent>
        {selectedAgent ? (
          <div>
            <h2>{selectedAgent.name}</h2>
            <ChatInterface agent={selectedAgent} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '40px', color: '#666' }}>
            请从左侧选择一个智能体开始对话
          </div>
        )}
      </MainContent>
    </Container>
  );
};

export default AIFactory; 