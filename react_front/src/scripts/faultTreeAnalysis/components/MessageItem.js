import React, { useState, useMemo } from 'react';
import { Button, Tag, Checkbox, Icon, Collapse } from 'antd';
import ReactMarkdown from 'react-markdown';
import { markdownRenderers, MESSAGE_DISPLAY_THRESHOLD, formatValueWithUnit } from '../util';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { registry } from '../assistants';
import CodeBlock from './CodeBlock';
import ZabbixChart from './ZabbixChart';
import { ThinkingBlock } from '../../aiApp/components/MarkdownRenderer';

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
    messages,
    isLatestMessage,
    executeCommand,
    executedCommands,
    executingCommands
}) => {
    const [expandedContext, setExpandedContext] = useState(null);
    const [expandedSteps, setExpandedSteps] = useState(new Set());
    const [expandedTools, setExpandedTools] = useState(new Set());
    const [expandedThoughts, setExpandedThoughts] = useState(new Set());
    
    // 如果是最新消息，则始终展开
    const shouldDisplayFull = isLatestMessage || isExpanded || msg.content.length <= MESSAGE_DISPLAY_THRESHOLD;
    const displayContent = shouldDisplayFull
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

    // 在MessageItem组件内部修改markdown渲染器配置
    const customRenderers = {
        ...markdownRenderers,
        code: ({node, inline, className, children, ...props}) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
                <CodeBlock
                    content={String(children).replace(/\n$/, '')}
                    language={match ? match[1] : ''}
                    executeCommand={executeCommand}
                    executedCommands={executedCommands}
                    executingCommands={executingCommands}
                />
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        }
    };

    // 处理工具展开/收起
    const handleToolToggle = (index) => {
        setExpandedTools(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    // 渲染消息内容
    const renderContent = (content) => {
        if (!content) return null;
        // 分割思考过程和工具调用
        const parts = content.split(/(<think>|<\/think>|<details.*?>|<\/details>|<tool>[\s\S]*?<\/tool>)/);
        let isInsideDetails = false;
        return parts.map((part, index) => {
            // 处理 details 开始标签
            if (part.startsWith('<details') || part.startsWith('<think')) {
                isInsideDetails = true;
                return null;
            }
            
            // 处理结束标签
            if (part === '</details>' || part === '</think>') {
                isInsideDetails = false;
                return null;
            }

            // 如果在 details 内部，显示为思考内容
            if (isInsideDetails) {
                return (
                    <ThinkingBlock content={part} />
                );
            }
            
            // 处理工具调用
            const toolMatch = part.match(/<tool>([\s\S]*?)<\/tool>/);
            if (toolMatch) {
                const toolContent = toolMatch[1];
                const [toolName, toolInput, toolOutput, position] = toolContent.split('\n').map(s => s.trim());
                
                // 解析工具输入
                let parsedInput = toolInput;
                try {
                    parsedInput = JSON.stringify(JSON.parse(toolInput), null, 2);
                } catch (e) {
                    console.warn('Failed to parse tool input:', e);
                }

                // 解析工具输出
                let parsedOutput = toolOutput;
                let zabbixData = null;

                try {
                    const outputObj = JSON.parse(toolOutput);

                    // 对 getZabbixMetricHistory 的值进行二次解析
                    if (toolName === 'getZabbixMetricHistory' && outputObj.getZabbixMetricHistory) {
                        const zabbixResult = JSON.parse(outputObj.getZabbixMetricHistory);
                        
                        if (zabbixResult.status === 'ok' && Array.isArray(zabbixResult.data)) {
                            zabbixData = zabbixResult.data.map(point => {
                                const formatted = formatValueWithUnit(point.value, point.units);
                                return {
                                    ...point,
                                    value: formatted.value,
                                    units: formatted.unit
                                };
                            });
                        }
                    }
                    
                    // 格式化显示的输出
                    if (zabbixData) {
                        parsedOutput = JSON.stringify({
                            getZabbixMetricHistory: JSON.parse(outputObj.getZabbixMetricHistory)
                        }, null, 2);
                    } else {
                        parsedOutput = JSON.stringify(outputObj, null, 2);
                    }
                } catch (e) {
                    console.error('Error parsing tool output:', e);
                }

                return (
                    <div key={index} style={{
                        marginBottom: '12px',
                        border: '1px solid #e8e8e8',
                        borderRadius: '4px',
                        background: '#fafafa'
                    }}>
                        <details>
                            <summary style={{ 
                                padding: '8px 12px',
                            }}>
                                <span>工具{position}-{toolName}</span>
                            </summary>
                            
                            <div style={{ padding: '12px' }}>
                                <div style={{ marginBottom: '8px' }}>
                                    <strong>请求：</strong>
                                    <div style={{ 
                                        background: '#fff',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        marginTop: '4px',
                                        fontFamily: 'monospace'
                                    }}>
                                        <pre style={{ margin: 0 }}>{parsedInput}</pre>
                                    </div>
                                </div>
                                <div>
                                    <strong>响应：</strong>
                                    <div style={{ 
                                        background: '#fff',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        marginTop: '4px',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                    }}>
                                        <pre style={{ margin: 0 }}>{parsedOutput}</pre>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* Zabbix 图表保持在 details 外部 */}
                        {zabbixData && (
                            <div style={{ padding: '12px', borderTop: '1px solid #e8e8e8' }}>
                                <ZabbixChart 
                                    data={zabbixData}
                                    showHeader={true}
                                />
                            </div>
                        )}
                    </div>
                );
            }
            
            // 渲染普通文本
            return part ? (
                <ReactMarkdown key={index} components={customRenderers}>
                    {part}
                </ReactMarkdown>
            ) : null;
        });
    };

    // 使用 useMemo 缓存历史消息的渲染结果
    const cachedContent = useMemo(() => {
        // 只对历史消息使用缓存，当前消息不缓存
        if (!msg.isCurrentMessage) {
            return renderContent(displayContent);
        }
        return null;
    }, [displayContent, msg.isCurrentMessage, expandedTools, expandedThoughts]);

    // 修改 renderMessageContent 函数
    const renderMessageContent = () => {
        // 如果是当前消息，直接渲染而不使用缓存
        if (msg.isCurrentMessage) {
            return (
                <div className="message-content current-message">
                    {renderContent(displayContent)}
                    {!shouldDisplayFull && (
                        <Button type="link" onClick={() => onExpandChange(true)}>
                            显示更多
                        </Button>
                    )}
                    {msg.metadata?.usage && (
                        <div style={{ 
                            marginTop: '8px',
                            padding: '8px',
                            background: '#fafafa',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#999'
                        }}>
                            <div>Tokens: {msg.metadata.usage.total_tokens} (Prompt: {msg.metadata.usage.prompt_tokens}, Completion: {msg.metadata.usage.completion_tokens})</div>
                            <div>Cost: ¥{msg.metadata.usage.total_price} (Prompt: ¥{msg.metadata.usage.prompt_price}, Completion: ¥{msg.metadata.usage.completion_price})</div>
                            <div>Response Time: {msg.metadata.usage.latency.toFixed(2)}s</div>
                        </div>
                    )}
                </div>
            );
        }

        if (msg.type === 'llm') {
            return (
                <div className="message-content">
                    {cachedContent}
                    {!shouldDisplayFull && (
                        <Button type="link" onClick={() => onExpandChange(true)}>
                            显示更多
                        </Button>
                    )}
                    {msg.metadata?.usage && (
                        <div style={{ 
                            marginTop: '8px',
                            padding: '8px',
                            background: '#fafafa',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#999'
                        }}>
                            <div>Tokens: {msg.metadata.usage.total_tokens} (Prompt: {msg.metadata.usage.prompt_tokens}, Completion: {msg.metadata.usage.completion_tokens})</div>
                            <div>Cost: ¥{msg.metadata.usage.total_price} (Prompt: ¥{msg.metadata.usage.prompt_price}, Completion: ¥{msg.metadata.usage.completion_price})</div>
                            <div>Response Time: {msg.metadata.usage.latency.toFixed(2)}s</div>
                        </div>
                    )}
                </div>
            );
        }

        // 如果是助手消息，使用对应助手的渲染方法
        if (msg.type === 'assistant' && msg.command) {
            const assistantName = msg.command.split(' ')[0].slice(1);
            const assistant = registry.get(assistantName);
            if (assistant) {
                return assistant.renderMessage(msg, messageViewModes, setMessageViewModes, isLatestMessage);
            }
        }

        // 其他类型消息的默认渲染
        return (
            <div className="message-content">
                {cachedContent || renderContent(displayContent)}
                {!shouldDisplayFull && (
                    <Button type="link" onClick={() => onExpandChange(true)}>
                        显示更多
                    </Button>
                )}
            </div>
        );
    };

    // 获取消息操作按钮的渲染方法
    const renderMessageActions = () => {
        // 如果是助手消息，使用对应助手的渲染方法
        if (msg.type === 'assistant' && msg.command) {
            const assistantName = msg.command.split(' ')[0].slice(1);
            const assistant = registry.get(assistantName);
            if (assistant) {
                return assistant.renderMessageActions(
                    msg, 
                    messageViewModes, 
                    setMessageViewModes,
                    handleResultSelect,
                    selectedResults,
                    copyToClipboard
                );
            }
        }

        // 默认的操作按钮
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <Checkbox
                    checked={selectedResults.has(msg.timestamp)}
                    onChange={(e) => handleResultSelect(msg.timestamp)}
                    style={{ marginRight: '8px' }}
                />
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
        );
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
                    {renderMessageActions()}
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
                {renderMessageContent()}
            </div>
        </div>
    );
};

// 使用 React.memo 包装组件，但只对历史消息进行记忆
export default React.memo(MessageItem, (prevProps, nextProps) => {
    // 如果是当前消息，始终返回false允许重新渲染
    if (nextProps.msg.isCurrentMessage) {
        return false;
    }
    
    // 对于历史消息，检查关键状态是否变化
    const contentUnchanged = prevProps.msg.content === nextProps.msg.content;
    const expandedStateUnchanged = prevProps.isExpanded === nextProps.isExpanded;
    const messageViewModesUnchanged = prevProps.messageViewModes === nextProps.messageViewModes;
    const selectedResultsUnchanged = prevProps.selectedResults === nextProps.selectedResults;
    
    return contentUnchanged && 
           expandedStateUnchanged && 
           messageViewModesUnchanged && 
           selectedResultsUnchanged;
}); 