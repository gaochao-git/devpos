import React, { useState } from 'react';
import styled from 'styled-components';
import CodeAgent from './CodeAgent';

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

const CodeAgentWrapper = ({ config }) => {

    return (
        <Container>
            <Content>
                <CodeAgent/>
            </Content>
        </Container>
    );
};

export default CodeAgentWrapper; 