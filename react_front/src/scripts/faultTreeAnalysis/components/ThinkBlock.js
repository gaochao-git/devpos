import React from 'react';
import styled from 'styled-components';

const ThinkContainer = styled.details`
  margin: 8px 0;
  
  /* 默认展开状态的样式 */
  &[open] summary::before {
    transform: rotate(90deg);
  }
`;

const ThinkSummary = styled.summary`
  color: #666;
  font-weight: 500;
  cursor: pointer;
  padding-left: 8px;
  display: flex;
  align-items: center;
  user-select: none;
  
  &::before {
    content: '▶';
    display: inline-block;
    margin-right: 8px;
    transition: transform 0.3s;
  }
`;

const ThinkContent = styled.div`
  color: #666;
  padding: 12px;
  margin-left: 8px;
  background-color: #f8f8f8;
  border-left: 2px solid #ddd;
`;

const ThinkBlock = ({ children }) => {
  return (
    <ThinkContainer open>
      <ThinkSummary>思考过程</ThinkSummary>
      <ThinkContent>
        {children}
      </ThinkContent>
    </ThinkContainer>
  );
};

export default ThinkBlock; 