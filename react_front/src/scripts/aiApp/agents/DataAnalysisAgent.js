import React, { useState } from 'react';
import styled from 'styled-components';
import KbRag from '../../console/kb_rag';

const Container = styled.div`
  height: calc(100vh - 100px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  background: #9C27B0;
  color: white;
`;

const Icon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 20px;
`;

const Content = styled.div`
  flex: 1;
  overflow: auto;
  padding: 20px;
`;

const DataAnalysisAgent = ({ config }) => {
  return (
    <Container>
      <Header>
        <Icon>{config.icon}</Icon>
        <div>
          <h2 style={{ margin: 0 }}>{config.name}</h2>
          <p style={{ margin: '4px 0 0 0', opacity: 0.8 }}>{config.description}</p>
        </div>
      </Header>
      <Content>
        <KbRag
          style={{
            overflow: 'auto',
            height: '100%',
            width: '100%'
          }}
        />
      </Content>
    </Container>
  );
};

export default DataAnalysisAgent; 