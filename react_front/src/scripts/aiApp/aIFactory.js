import React, { useState } from 'react';
import styled from 'styled-components';
import { getAgentConfigs, getAgentComponent } from './config/componentMapping';

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
  overflow-y: auto;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const AgentCard = styled.div`
  padding: 15px;
  margin-bottom: 15px;
  background-color: ${props => props.active ? '#e3f2fd' : '#ffffff'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #e0e0e0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    background-color: #e3f2fd;
  }
`;

const AgentIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${props => props.color};
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
`;

const AIFactory = () => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const agentConfigs = getAgentConfigs();

  const renderAgentComponent = () => {
    if (!selectedAgent) return null;
    const AgentComponent = getAgentComponent(selectedAgent.id);
    return <AgentComponent config={selectedAgent} />;
  };

  return (
    <Container>
      <Sidebar>
        <h2>智能体列表</h2>
        {agentConfigs.map(agent => (
          <AgentCard
            key={agent.id}
            active={selectedAgent?.id === agent.id}
            onClick={() => setSelectedAgent(agent)}
          >
            <AgentIcon color={agent.color}>{agent.icon}</AgentIcon>
            <h3 style={{ margin: '0 0 8px 0' }}>{agent.name}</h3>
            <p style={{ margin: 0, color: '#666' }}>{agent.description}</p>
          </AgentCard>
        ))}
      </Sidebar>
      <MainContent>
        {selectedAgent ? (
          renderAgentComponent()
        ) : (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '40px', 
            color: '#666',
            padding: '20px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <h3>👋 欢迎使用智能助手</h3>
            <p>请从左侧选择一个智能体开始对话</p>
          </div>
        )}
      </MainContent>
    </Container>
  );
};

export default AIFactory; 