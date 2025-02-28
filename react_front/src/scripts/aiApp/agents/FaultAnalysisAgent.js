import React, { useState } from 'react';
import styled from 'styled-components';
import ChatRca from '../../faultTreeAnalysis/ChatRca';

const Container = styled.div`
  height: calc(100vh - 100px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Content = styled.div`
  flex: 1;
  overflow: auto;
  padding: 0px;
`;

const FaultAnalysisAgent = ({ config }) => {
  const [currentCluster, setCurrentCluster] = useState(null);

  return (
    <Container>
      <Content>
        <ChatRca
          clusterName={currentCluster?.cluster_name}
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

export default FaultAnalysisAgent;
