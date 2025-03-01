import React, { useState, useEffect } from 'react';
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
  padding: 40px 20px 20px 20px;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
`;

const SidebarTitle = styled.h2`
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
`;

const AgentList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #ffffff;
  height: 100%;
  box-sizing: border-box;
`;

const AgentCard = styled.div`
  padding: 12px;
  margin-bottom: 10px;
  background-color: ${props => props.active ? '#e3f2fd' : '#ffffff'};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    background-color: #e3f2fd;
  }
`;

const AgentIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 36px;
  flex-shrink: 0;
`;

const AIFactory = () => {
  const agentConfigs = getAgentConfigs();
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    const generalAgent = agentConfigs.find(agent => agent.id === 'general');
    if (generalAgent) {
      setSelectedAgent(generalAgent);
    }
  }, []);

  const renderAgentComponent = () => {
    if (!selectedAgent) return null;
    const AgentComponent = getAgentComponent(selectedAgent.id);
    return <AgentComponent config={selectedAgent} />;
  };

  return (
    <Container>
      <Sidebar>
        <SidebarTitle>智能体工厂</SidebarTitle>
        <AgentList>
          {agentConfigs.map(agent => (
            <AgentCard
              key={agent.id}
              active={selectedAgent?.id === agent.id}
              onClick={() => setSelectedAgent(agent)}
            >
              <AgentIcon color={agent.color}>{agent.icon}</AgentIcon>
              <h3 style={{ margin: 0 }}>{agent.name}</h3>
            </AgentCard>
          ))}
        </AgentList>
      </Sidebar>
      <MainContent>
        {renderAgentComponent()}
      </MainContent>
    </Container>
  );
};

export default AIFactory; 