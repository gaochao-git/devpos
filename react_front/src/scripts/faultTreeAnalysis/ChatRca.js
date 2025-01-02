import React, { useState } from 'react';
import { Input, Button, message } from 'antd';
import { Icon } from 'antd';

const ChatRca = () => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!inputValue.trim()) {
            return;
        }

        const newMessage = {
            type: 'user',
            content: inputValue,
            timestamp: new Date().toLocaleTimeString()
        };

        setMessages(prev => [...prev, newMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // TODO: 调用API获取响应
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const responseMessage = {
                type: 'system',
                content: '这是一个示例响应',
                timestamp: new Date().toLocaleTimeString()
            };

            setMessages(prev => [...prev, responseMessage]);
        } catch (error) {
            message.error('发送消息失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* 消息列表 */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                background: '#f5f5f5'
            }}>
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        style={{
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: msg.type === 'user' ? 'row-reverse' : 'row'
                        }}
                    >
                        <div
                            style={{
                                maxWidth: '80%',
                                padding: '12px',
                                borderRadius: '8px',
                                background: msg.type === 'user' ? '#1890ff' : '#fff',
                                color: msg.type === 'user' ? '#fff' : '#333',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            <div>{msg.content}</div>
                            <div style={{
                                fontSize: '12px',
                                color: msg.type === 'user' ? '#e6f7ff' : '#999',
                                marginTop: '4px'
                            }}>
                                {msg.timestamp}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 输入框区域 */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid #e8e8e8',
                background: '#fff'
            }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Input
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onPressEnter={handleSend}
                        placeholder="输入消息..."
                        disabled={isLoading}
                    />
                    <Button
                        type="primary"
                        onClick={handleSend}
                        loading={isLoading}
                        icon={<Icon type="message" />}
                    >
                        发送
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ChatRca;
