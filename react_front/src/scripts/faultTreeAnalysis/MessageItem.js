import React, { useState } from 'react';
import { Button, Tag, Checkbox, Icon } from 'antd';
import ReactMarkdown from 'react-markdown';
import ZabbixChart from './ZabbixChart';
import { markdownRenderers } from './util';

const MESSAGE_DISPLAY_THRESHOLD = 500;

const MessageItem = ({
    msg,
    index,
    selectedResults,
    handleResultSelect,
    messageViewModes,
    setMessageViewModes,
    copyToClipboard,
    isExpanded,
    onExpandChange,
    messages
}) => {
    const [expandedContext, setExpandedContext] = useState(null);
    
    const displayContent = isExpanded || msg.content.length <= MESSAGE_DISPLAY_THRESHOLD 
        ? msg.content 
        : msg.content.slice(0, MESSAGE_DISPLAY_THRESHOLD) + '...';

    // 判断内容是否为 JSON
    const isJsonString = (str) => {
        try {
            const result = JSON.parse(str);
            return typeof result === 'object';
        } catch (e) {
            return false;
        }
    };

    // 获取展开的内容
    const getExpandedContent = () => {
        const content = msg.contexts?.find(c => c.key === expandedContext)?.content || 
                       msg.references?.find(r => r.timestamp === expandedContext)?.content || '';
        
        if (isJsonString(content)) {
            try {
                return JSON.stringify(JSON.parse(content), null, 2);
            } catch (e) {
                return content;
            }
        }
        return content;
    };

    // 获取引用的内容
    const getReferencedContent = (timestamp) => {
        return messages.find(m => m.timestamp === timestamp)?.content || '';
    };

    // 获取标签文本
    const getTagText = (msg) => {
        switch (msg.type) {
            case 'user':
                return '用户';
            case 'llm':
                return '大模型';
            case 'assistant':
                return msg.command ? msg.command.split(' ')[0].slice(1) : '助手';
            default:
                return '未知';
        }
    };

    return (
        <div key={index} style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
        }}>
            <div style={{
                maxWidth: '80%',
                padding: '12px',
                borderRadius: '8px',
                background: msg.type === 'user' ? '#91d5ff' : '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                {/* 消息头部 */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                }}>
                    {/* 左侧角色和时间 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Tag color={
                            msg.type === 'user' ? '#fa8c16' : 
                            msg.command ? '#52c41a' : 
                            '#1890ff'
                        }>
                            {getTagText(msg)}
                        </Tag>
                        <span style={{ 
                            fontSize: '12px', 
                            color: 'rgba(0, 0, 0, 0.45)'
                        }}>
                            {msg.timestamp}
                        </span>
                    </div>

                    {/* 右侧操作按钮 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        {/* 引用勾选框 */}
                        <Checkbox
                            checked={selectedResults.has(msg.timestamp)}
                            onChange={(e) => handleResultSelect(msg.timestamp)}
                            style={{ marginRight: '8px' }}
                        />
                        
                        {/* Zabbix视图切换按钮 */}
                        {msg.isZabbix && (
                            <>
                                <Button
                                    type="link"
                                    size="small"
                                    icon="file-text"
                                    style={{
                                        color: messageViewModes.get(msg.timestamp) === 'text' ? '#1890ff' : '#999',
                                        padding: '4px 8px'
                                    }}
                                    onClick={() => setMessageViewModes(prev => new Map(prev).set(msg.timestamp, 'text'))}
                                >
                                    文本
                                </Button>
                                <Button
                                    type="link"
                                    size="small"
                                    icon="line-chart"
                                    style={{
                                        color: messageViewModes.get(msg.timestamp) === 'chart' ? '#1890ff' : '#999',
                                        padding: '4px 8px'
                                    }}
                                    onClick={() => setMessageViewModes(prev => new Map(prev).set(msg.timestamp, 'chart'))}
                                >
                                    图表
                                </Button>
                            </>
                        )}
                        
                        {/* 复制按钮 */}
                        {msg.type === 'assistant' && (
                            <Button
                                type="link"
                                size="small"
                                icon="copy"
                                style={{ padding: '4px 8px' }}
                                onClick={() => copyToClipboard(msg)}
                            >
                                复制
                            </Button>
                        )}
                    </div>
                </div>

                {/* 显示上下文和引用标签 */}
                {msg.type === 'user' && (
                    <div style={{ 
                        marginBottom: '8px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px'
                    }}>
                        {/* 显示上下文标签 */}
                        {msg.contexts && msg.contexts.map(context => (
                            <Tag
                                key={context.key}
                                color="blue"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setExpandedContext(expandedContext === context.key ? null : context.key)}
                            >
                                <Icon type={context.icon} /> {context.label}
                            </Tag>
                        ))}
                        {/* 显示引用标签 */}
                        {msg.references && msg.references.map(ref => (
                            <Tag
                                key={ref.timestamp}
                                color="purple"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setExpandedContext(expandedContext === ref.timestamp ? null : ref.timestamp)}
                            >
                                <Icon type="link" /> 引用内容
                            </Tag>
                        ))}
                    </div>
                )}

                {/* 展开的上下文内容 */}
                {expandedContext && (
                    <div style={{
                        marginBottom: '8px',
                        padding: '8px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        border: '1px solid #e8e8e8'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px'
                        }}>
                            <span style={{ color: '#666' }}>
                                {msg.contexts?.find(c => c.key === expandedContext)?.label || '引用内容'}
                            </span>
                            <Icon
                                type="close"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setExpandedContext(null)}
                            />
                        </div>
                        {isJsonString(getExpandedContent()) ? (
                            <pre style={{ 
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                margin: 0,
                                fontSize: '12px'
                            }}>
                                {getExpandedContent()}
                            </pre>
                        ) : (
                            <ReactMarkdown components={markdownRenderers}>
                                {getExpandedContent()}
                            </ReactMarkdown>
                        )}
                    </div>
                )}

                {/* 消息内容 */}
                {msg.isZabbix ? (
                    messageViewModes.get(msg.timestamp) === 'text' ? (
                        <ReactMarkdown components={markdownRenderers}>
                            {msg.content}
                        </ReactMarkdown>
                    ) : (
                        <div style={{ 
                            marginTop: '10px',
                            width: '100%',
                            overflow: 'hidden'
                        }}>
                            <ZabbixChart 
                                data={msg.rawContent} 
                                style={{ height: '220px' }}
                                showHeader={false}
                            />
                        </div>
                    )
                ) : (
                    <>
                        <ReactMarkdown components={markdownRenderers}>
                            {displayContent}
                        </ReactMarkdown>
                        {msg.content.length > MESSAGE_DISPLAY_THRESHOLD && (
                            <Button 
                                type="link" 
                                onClick={() => onExpandChange(!isExpanded)}
                                style={{ padding: '4px 0' }}
                            >
                                {isExpanded ? '收起' : '展开'}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MessageItem; 