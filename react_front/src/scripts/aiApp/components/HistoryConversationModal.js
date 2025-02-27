import React from 'react';
import { Modal, Button, Spin } from 'antd';
import styled from 'styled-components';

const MessageContent = styled.div`
  padding: 12px;
  background: ${props => props.isUser ? '#f0f5ff' : '#f6ffed'};
  border-radius: 4px;
  border: 1px solid ${props => props.isUser ? '#d6e4ff' : '#b7eb8f'};
  margin-bottom: 8px;
`;

const HistoryConversationModal = ({
  visible,
  onCancel,
  historyData,
  expandedConversations,
  conversationMessages,
  loadingConversations,
  onConversationToggle,
  onContinueConversation
}) => {
  return (
    <Modal
      title="历史会话列表"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>
      ]}
      width={800}
    >
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {historyData.map(conversation => {
          const isExpanded = expandedConversations.has(conversation.id);
          const isLoading = loadingConversations.has(conversation.id);
          const messages = conversationMessages.get(conversation.id);

          return (
            <div key={conversation.id} style={{ marginBottom: '16px' }}>
              <div style={{ 
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{conversation.name || '未命名会话'}</h4>
                    <small>{new Date(conversation.created_at * 1000).toLocaleString()}</small>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => onContinueConversation(conversation)}
                    >
                      继续对话
                    </Button>
                    <Button
                      size="small"
                      onClick={() => onConversationToggle(conversation.id)}
                    >
                      {isExpanded ? '收起' : '展开'}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '12px' }}>
                    {isLoading ? (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <Spin />
                      </div>
                    ) : (
                      messages?.map((message, index) => (
                        <MessageContent key={index} isUser={message.role === 'user'}>
                          <div>{message.query || message.answer}</div>
                          {message.retriever_resources?.map((resource, idx) => (
                            <div key={idx} style={{ 
                              marginTop: '8px',
                              padding: '8px',
                              background: '#fff',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              <div>来源：{resource.dataset_name} - {resource.document_name}</div>
                              <div>相关度：{(resource.score * 100).toFixed(1)}%</div>
                              <div>{resource.content}</div>
                            </div>
                          ))}
                        </MessageContent>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

export default HistoryConversationModal; 