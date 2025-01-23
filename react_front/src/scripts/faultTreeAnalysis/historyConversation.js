import React from 'react';
import { Button, Modal, Icon, Tag } from 'antd';

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
            <div style={{ 
                maxHeight: '600px', 
                overflowY: 'auto',
                paddingRight: '10px'
            }}>
                {historyData.map(conversation => {
                    const isExpanded = expandedConversations.has(conversation.id);
                    const isLoading = loadingConversations.has(conversation.id);
                    const messages = conversationMessages.get(conversation.id);

                    return (
                        <div 
                            key={conversation.id} 
                            style={{ 
                                marginBottom: '16px',
                                border: '1px solid #e8e8e8',
                                borderRadius: '8px',
                                background: '#fff'
                            }}
                        >
                            <div style={{ 
                                padding: '16px',
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: isExpanded ? '1px solid #e8e8e8' : 'none'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ 
                                        fontSize: '16px', 
                                        fontWeight: 500,
                                        color: '#1890ff'
                                    }}>
                                        {conversation.name || '未命名会话'}
                                    </div>
                                    <div style={{ 
                                        fontSize: '12px', 
                                        color: '#666',
                                        marginTop: '4px'
                                    }}>
                                        {new Date(conversation.created_at * 1000).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px'
                                }}>
                                    <Button
                                        type="primary"
                                        size="small"
                                        onClick={() => onContinueConversation(conversation)}
                                    >
                                        继续对话
                                    </Button>
                                    <div 
                                        onClick={() => onConversationToggle(conversation.id)}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            cursor: 'pointer',
                                            padding: '8px'
                                        }}
                                    >
                                        {isLoading && <Icon type="loading" />}
                                        <Icon 
                                            type={isExpanded ? 'up' : 'down'} 
                                            style={{ fontSize: '16px', color: '#666' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {isExpanded && messages && (
                                <div style={{ padding: '16px' }}>
                                    {messages.map((message, index) => (
                                        <div 
                                            key={message.id}
                                            style={{
                                                marginBottom: index === messages.length - 1 ? 0 : '16px',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                background: '#fff',
                                                border: '1px solid #e8e8e8'
                                            }}
                                        >
                                            {/* 问题部分 */}
                                            <div style={{
                                                padding: '12px',
                                                marginBottom: '8px',
                                                background: '#f0f5ff',
                                                borderRadius: '4px',
                                                border: '1px solid #d6e4ff'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '8px'
                                                }}>
                                                    <Tag color="blue">问题</Tag>
                                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                                        {new Date(message.created_at * 1000).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                                    {message.query}
                                                </div>
                                            </div>

                                            {/* 回答部分 */}
                                            <div style={{
                                                padding: '12px',
                                                background: '#f6ffed',
                                                borderRadius: '4px',
                                                border: '1px solid #b7eb8f'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '8px'
                                                }}>
                                                    <Tag color="green">回答</Tag>
                                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                                        {new Date(message.created_at * 1000).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                                    {message.answer}
                                                </div>
                                            </div>

                                            {/* 参考资料部分 */}
                                            {message.retriever_resources && message.retriever_resources.length > 0 && (
                                                <div style={{ 
                                                    marginTop: '12px',
                                                    padding: '12px',
                                                    background: '#fafafa',
                                                    borderRadius: '4px',
                                                    border: '1px solid #e8e8e8',
                                                    fontSize: '12px'
                                                }}>
                                                    <div style={{ 
                                                        fontWeight: 500, 
                                                        marginBottom: '8px',
                                                        color: '#666'
                                                    }}>
                                                        参考资料
                                                    </div>
                                                    {message.retriever_resources.map((resource, idx) => (
                                                        <div key={idx} style={{ 
                                                            padding: '4px 0',
                                                            borderBottom: idx < message.retriever_resources.length - 1 ? '1px dashed #e8e8e8' : 'none'
                                                        }}>
                                                            <div>来源：{resource.dataset_name} - {resource.document_name}</div>
                                                            <div>相关度：{(resource.score * 100).toFixed(1)}%</div>
                                                            <div style={{ 
                                                                marginTop: '4px',
                                                                padding: '8px',
                                                                background: '#fff',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                color: '#666'
                                                            }}>
                                                                {resource.content}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
};

export default HistoryConversationModal; 