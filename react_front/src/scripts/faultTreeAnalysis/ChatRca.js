import React, { useState } from 'react';
import { Input, Button, message, Select, Tooltip, Tag, Popover } from 'antd';
import { Icon } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { PlusOutlined, SendOutlined } from '@ant-design/icons';

const { Option } = Select;

// 定义 Markdown 渲染器配置
const markdownRenderers = {
    code: ({ node, inline, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match ? (
            <SyntaxHighlighter
                style={nightOwl}
                language={match[1]}
                PreTag="div"
                {...props}
            >
                {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
        ) : (
            <code className={className} {...props}>
                {children}
            </code>
        );
    }
};

const difyApiUrl = 'http://127.0.0.1/v1/chat-messages';
const difyApiKey = 'Bearer app-ivi5AcOq9e90X20EpcNamjDj';

// 定义上下文类型
const CONTEXT_TYPES = [
    { key: 'tree', label: '故障树数据', icon: 'cluster', 
      description: '使用故障树结构和关联信息' },
    { key: 'zabbix', label: 'Zabbix可用指标列表', icon: 'line-chart', 
      description: '包含系统性能和状态指标' }
];

// 定义 Zabbix 指标列表
const ZABBIX_METRICS = [
    {
        key: 'mysql.status[Bytes_received]',
        label: 'MySQL bytes received per second',
        description: '每秒接收字节数'
    },
    {
        key: 'mysql.status[Bytes_sent]',
        label: 'MySQL bytes sent per second',
        description: '每秒发送字节数'
    },
    {
        key: 'mysql.status[Questions]',
        label: 'MySQL queries per second',
        description: '每秒查询数'
    },
    {
        key: 'mysql.status[Slow_queries]',
        label: 'MySQL slow queries',
        description: '慢查询数'
    }
    // ... 其他 Zabbix 指标
];

const ChatRca = ({ treeData, style }) => {
    // 消息列表状态
    const [messages, setMessages] = useState([]);
    // 流式响应内容
    const [streamContent, setStreamContent] = useState('');
    // 输入框值
    const [inputValue, setInputValue] = useState('');
    // 是否正在流式响应
    const [isStreaming, setIsStreaming] = useState(false);
    // 选中的上下文类型
    const [selectedContext, setSelectedContext] = useState(['tree']);
    // 会话ID
    const [conversationId, setConversationId] = useState('');

    // 创建解析器
    const createParser = (onEvent) => {
        return {
            feed(chunk) {
                try {
                    const lines = chunk.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.slice(6);
                            try {
                                const jsonData = JSON.parse(jsonStr);
                                if (jsonData.answer) {
                                    onEvent(jsonData);
                                }
                            } catch (jsonError) {
                                console.error('JSON parse error:', jsonError);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Parse error:', e, 'Chunk:', chunk);
                }
            }
        };
    };

    // 处理流式响应
    const handleStream = async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        const parser = createParser((data) => {
            if (data.conversation_id && !conversationId) {
                setConversationId(data.conversation_id);
            }
            if (data.answer) {
                fullContent += data.answer;
                setStreamContent(fullContent);
            }
        });

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                parser.feed(chunk);
            }

            setMessages(prev => [
                ...prev,
                {
                    type: 'assistant',
                    content: fullContent,
                    timestamp: new Date().toLocaleTimeString()
                }
            ]);
            setStreamContent('');
        } catch (error) {
            console.error('Stream processing error:', error);
            throw error;
        } finally {
            setIsStreaming(false);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isStreaming) return;
        
        // 构建消息对象，包含上下文信息
        const userMessage = {
            type: 'user',
            content: inputValue,
            contexts: selectedContext.map(key => 
                CONTEXT_TYPES.find(t => t.key === key)
            ),
            timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsStreaming(true);
        
        // 构建完整查询，包含所有选中的上下文数据
        let fullQuery = '';
        const contextData = [];

        // 添加故障树数据
        if (selectedContext.includes('tree') && treeData) {
            contextData.push(`故障树数据：${JSON.stringify(treeData)}`);
        }

        // 添加Zabbix可用指标列表数据
        if (selectedContext.includes('zabbix')) {
            contextData.push(`Zabbix可用指标列表：${JSON.stringify(ZABBIX_METRICS.map(metric => ({
                key: metric.key,
                label: metric.label
            })))}`);
        }

        // 组合查询
        if (contextData.length > 0) {
            fullQuery = `${contextData.join('\n\n')}\n\n问题：${inputValue}`;
        } else {
            fullQuery = inputValue;
        }
        
        try {
            const response = await fetch(difyApiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': difyApiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: { "mode": "故障定位" },
                    query: fullQuery,
                    response_mode: 'streaming',
                    conversation_id: conversationId,
                    user: 'system'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await handleStream(response);
            
            // 清空已选择的上下文
            setSelectedContext([]);
        } catch (error) {
            console.error('发送失败:', error);
            message.error('发送消息失败，请稍后重试');
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            background: '#f5f5f5',
            ...style  // 应用从父组件传递的样式
        }}>
            {/* 消息列表 */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px'
            }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{
                        marginBottom: '16px',
                        display: 'flex',
                        flexDirection: msg.type === 'user' ? 'row-reverse' : 'row'
                    }}>
                        <div style={{
                            maxWidth: '80%',
                            padding: '12px',
                            borderRadius: '8px',
                            background: msg.type === 'user' ? '#1890ff' : '#fff',
                            color: msg.type === 'user' ? '#fff' : '#333'
                        }}>
                            {msg.type === 'user' ? (
                                <div>
                                    <div className="context-tags">
                                        {msg.contexts.map(ctx => (
                                            <Tag key={ctx.key} icon={<Icon type={ctx.icon} />}>
                                                {ctx.label}
                                            </Tag>
                                        ))}
                                    </div>
                                    <div>{msg.content}</div>
                                </div>
                            ) : (
                                <ReactMarkdown components={markdownRenderers}>
                                    {msg.content}
                                </ReactMarkdown>
                            )}
                            <div className="message-time">{msg.timestamp}</div>
                        </div>
                    </div>
                ))}
                {/* 显示流式内容 */}
                {streamContent && (
                    <div style={{
                        marginBottom: '16px',
                        display: 'flex',
                        flexDirection: 'row'
                    }}>
                        <div style={{
                            maxWidth: '80%',
                            padding: '12px',
                            borderRadius: '8px',
                            background: '#fff',
                            color: '#333',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <ReactMarkdown components={markdownRenderers}>
                                {streamContent}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            {/* 输入区域 */}
            <div style={{
                padding: '16px',
                background: '#fff',
                borderTop: '1px solid #e8e8e8'
            }}>
                <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                }}>
                    {/* + 按钮 */}
                    <Popover
                        placement="topLeft"
                        content={
                            <div>
                                {CONTEXT_TYPES.map(type => (
                                    <div
                                        key={type.key}
                                        onClick={() => {
                                            if (!selectedContext.includes(type.key)) {
                                                setSelectedContext(prev => [...prev, type.key]);
                                            }
                                        }}
                                        style={{
                                            padding: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Icon type={type.icon} /> {type.label}
                                    </div>
                                ))}
                            </div>
                        }
                        trigger="click"
                    >
                        <Button 
                            icon="plus"
                            size="small"
                        />
                    </Popover>

                    {/* 已选上下文标签 */}
                    {selectedContext.map(key => {
                        const contextType = CONTEXT_TYPES.find(t => t.key === key);
                        return (
                            <Tag 
                                key={key}
                                closable
                                onClose={() => {
                                    setSelectedContext(prev => 
                                        prev.filter(k => k !== key)
                                    );
                                }}
                                style={{
                                    margin: 0,
                                    background: '#e6f4ff',
                                    borderColor: '#91caff'
                                }}
                            >
                                <Icon type={contextType.icon} /> {contextType.label}
                            </Tag>
                        );
                    })}
                </div>

                {/* 输入框和发送按钮 */}
                <div style={{ 
                    display: 'flex',
                    gap: '8px'
                }}>
                    <Input.TextArea
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onPressEnter={e => {
                            if (!e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="输入问题..."
                        disabled={isStreaming}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        style={{ flex: 1 }}
                    />
                    <Button
                        type="primary"
                        onClick={handleSend}
                        loading={isStreaming}
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
