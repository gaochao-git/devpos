import React, { useState } from 'react';
import { Input, Button, message, Select, Tooltip } from 'antd';
import { Icon } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
    { key: 'zabbix', label: 'Zabbix监控', icon: 'line-chart', 
      description: '包含系统性能和状态指标' }
];

const ChatRca = ({ treeData }) => {
    const [messages, setMessages] = useState([]);
    const [streamContent, setStreamContent] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedContext, setSelectedContext] = useState(['tree']);
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

        setIsStreaming(true);
        setStreamContent('');

        // 添加用户消息（只显示用户输入的问题）
        const userMessage = {
            type: 'user',
            content: inputValue,
            timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');

        try {
            // 构建完整的查询文本，包含上下文信息
            let fullQuery = inputValue;
            
            // 添加故障树上下文
            if (selectedContext.includes('tree') && treeData) {
                fullQuery = `故障树数据：${JSON.stringify(treeData)}\n\n问题：${inputValue}`;
            }

            const response = await fetch(difyApiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': difyApiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: { "mode": "故障定位" },
                    query: fullQuery,  // 发送包含上下文的完整查询
                    response_mode: 'streaming',
                    conversation_id: conversationId,
                    user: 'system'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            const parser = createParser((data) => {
                if (data.conversation_id && !conversationId) {
                    setConversationId(data.conversation_id);
                }
                if (data.answer) {
                    fullContent += data.answer;
                    setStreamContent(fullContent); // 实时显示流式内容
                }
            });

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    parser.feed(chunk);
                }

                // 流结束后，添加完整消息
                setMessages(prev => [
                    ...prev,
                    {
                        type: 'assistant',
                        content: fullContent,
                        timestamp: new Date().toLocaleTimeString()
                    }
                ]);
                setStreamContent(''); // 清空流式内容
            } catch (error) {
                console.error('Stream processing error:', error);
                throw error;
            }
        } catch (error) {
            console.error('发送失败:', error);
            message.error('发送消息失败，请稍后重试');
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div style={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#f5f5f5'
        }}>
            {/* 顶部工具栏 */}
            <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid #e8e8e8',
                background: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Select
                    mode="multiple"
                    style={{ width: '300px' }}
                    placeholder="选择上下文"
                    value={selectedContext}
                    onChange={setSelectedContext}
                    optionLabelProp="label"
                >
                    {CONTEXT_TYPES.map(type => (
                        <Option 
                            key={type.key} 
                            value={type.key}
                            label={
                                <span>
                                    <Icon type={type.icon} /> {type.label}
                                </span>
                            }
                        >
                            <Tooltip title={type.description}>
                                <span>
                                    <Icon type={type.icon} /> {type.label}
                                </span>
                            </Tooltip>
                        </Option>
                    ))}
                </Select>
            </div>

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
                            color: msg.type === 'user' ? '#fff' : '#333',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            {msg.type === 'user' ? (
                                <div>{msg.content}</div>
                            ) : (
                                <ReactMarkdown components={markdownRenderers}>
                                    {msg.content}
                                </ReactMarkdown>
                            )}
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
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Input.TextArea
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onPressEnter={e => {
                            if (!e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={`输入问题... ${selectedContext.length ? `(已选择 ${selectedContext.map(key => 
                            CONTEXT_TYPES.find(t => t.key === key)?.label
                        ).join(', ')})` : '(无上下文)'}`}
                        disabled={isStreaming}
                        autoSize={{ minRows: 1, maxRows: 4 }}
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
