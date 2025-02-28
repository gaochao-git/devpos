import React from 'react';
import { Modal, Button, Spin } from 'antd';
import styled from 'styled-components';
import MarkdownRenderer from './MarkdownRenderer';

const MessageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  margin: 4px 0;
`;

const MessageBubble = styled.div`
  max-width: 70%;
  margin: 10px 0;
  padding: 12px 16px;
  border-radius: 12px;
  word-break: break-word;
  background-color: ${props => props.isUser ? '#c1e0c1' : '#ffffff'};
  
  .markdown-content {
    * {
      color: inherit;
    }

    pre {
      margin: 8px 0;
      border-radius: 6px;
      background: ${props => props.isUser ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    }

    code {
      font-family: monospace;
    }

    p {
      margin: 8px 0;
    }

    ul, ol {
      margin: 8px 0;
      padding-left: 20px;
    }
  }
`;

const Timestamp = styled.div`
  font-size: 12px;
  color: #666;
  margin: ${props => props.isUser ? '4px 8px 0 0' : '4px 0 0 8px'};
`;

const ResourceContainer = styled.div`
  margin-top: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  max-width: 70%;
  align-self: flex-start;
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
                        <div key={index}>
                          {/* 用户提问 */}
                          {message.query && (
                            <MessageContainer isUser={true}>
                              <MessageBubble isUser={true}>
                                <div>{message.query}</div>
                              </MessageBubble>
                              <Timestamp isUser={true}>
                                {new Date(message.created_at * 1000).toLocaleString()}
                              </Timestamp>
                            </MessageContainer>
                          )}
                          {/* 助手回复 */}
                          {message.answer && (
                            <MessageContainer isUser={false}>
                              <MessageBubble isUser={false}>
                                <div className="markdown-content">
                                  <MarkdownRenderer content={message.answer} />
                                </div>
                              </MessageBubble>
                              <Timestamp isUser={false}>
                                {new Date(message.created_at * 1000).toLocaleString()}
                              </Timestamp>
                            </MessageContainer>
                          )}
                          {/* 相关资源 */}
                          {message.retriever_resources?.map((resource, idx) => (
                            <ResourceContainer key={idx}>
                              <div>来源：{resource.dataset_name} - {resource.document_name}</div>
                              <div>相关度：{(resource.score * 100).toFixed(1)}%</div>
                              <div>{resource.content}</div>
                            </ResourceContainer>
                          ))}
                        </div>
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