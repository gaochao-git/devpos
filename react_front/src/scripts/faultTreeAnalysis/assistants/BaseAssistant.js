import React from 'react';
import { Select, Icon, message, Checkbox, Button } from 'antd';
import { getStandardTime, markdownRenderers, MESSAGE_DISPLAY_THRESHOLD } from '../util';
import ReactMarkdown from 'react-markdown';

export default class BaseAssistant {
    constructor(config = {}) {
        this.name = config.name || '';
        this.prefix = config.prefix || '';
        this.commands = config.commands || [];
        this.serverFormat = config.serverFormat || ((ip) => ip);
    }

    // 基础UI渲染方法
    render({ 
        config,
        assistantInputs,
        setAssistantInputs,
        handleCloseAssistant,
        executingAssistants,
        executeCommand,
        handleServerSelect,
        servers,
        setExecutingAssistants,
        setMessages
    }) {
        return (
            <div style={{ 
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                padding: '4px 11px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                background: '#fff',
                width: '100%'
            }}>
                <span style={{ 
                    color: '#ff4d4f',
                    fontFamily: 'monospace',
                    marginRight: '12px',
                    whiteSpace: 'nowrap'
                }}>
                    {this.prefix}
                </span>
                
                {this.renderContent({
                    config,
                    assistantInputs,
                    setAssistantInputs,
                    handleCloseAssistant,
                    executingAssistants,
                    executeCommand,
                    handleServerSelect,
                    servers,
                    setExecutingAssistants,
                    setMessages
                })}
            </div>
        );
    }

    // 默认的内容渲染方法，可被子类重写
    renderContent({ 
        config,
        assistantInputs,
        setAssistantInputs,
        handleCloseAssistant,
        executingAssistants,
        executeCommand,
        handleServerSelect,
        servers,
        setExecutingAssistants,
        setMessages
    }) {
        return (
            <>
                {/* 服务器选择 */}
                <Select
                    style={{ width: '30%', marginRight: '12px' }}
                    placeholder="选择服务器"
                    value={config?.ip ? this.serverFormat(config.ip, config.port) : undefined}
                    onChange={async value => {
                        const [ip, port] = value.split(':');
                        handleServerSelect(this.name, value);
                        // 调用子类的服务器选择处理方法
                        if (this.handleServerSelect) {
                            await this.handleServerSelect(ip, port);
                        }
                    }}
                >
                    {servers.map(server => (
                        <Select.Option 
                            key={server.ip} 
                            value={this.serverFormat(server.ip, server.port)}
                        >
                            {this.serverFormat(server.ip, server.port)}
                        </Select.Option>
                    ))}
                </Select>

                {/* 命令选择 */}
                <Select
                    style={{ flex: 1, marginRight: '12px' }}
                    placeholder={this.commands.length ? "选择命令" : "请先选择服务器"}
                    showSearch
                    value={assistantInputs.get(this.name) || undefined}
                    onChange={(value) => {
                        setAssistantInputs(prev => new Map(prev).set(this.name, value));
                    }}
                    optionLabelProp="label"
                    filterOption={(input, option) => {
                        const value = option.props.value || '';
                        const label = option.props.label || '';
                        return (
                            value.toLowerCase().includes(input.toLowerCase()) ||
                            label.toLowerCase().includes(input.toLowerCase())
                        );
                    }}
                >
                    {this.commands.map(cmd => (
                        <Select.Option 
                            key={cmd.value}
                            value={cmd.value}
                            label={cmd.label.split(': ')[1] || cmd.label}
                            title={`${cmd.label}\n${cmd.value}`}
                        >
                            <div style={{ padding: '4px 0' }}>
                                <div style={{ fontWeight: 'bold' }}>{cmd.label.split(': ')[1] || cmd.label}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{cmd.value}</div>
                            </div>
                        </Select.Option>
                    ))}
                </Select>

                {/* 执行和关闭按钮 */}
                <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                }}>
                    <div 
                        style={{ 
                            cursor: 'pointer', 
                            color: '#1890ff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onClick={() => {
                            // 先添加用户消息
                            const value = assistantInputs.get(this.name);
                            const userCommand = `@${this.name} ${this.serverFormat(config?.ip, config?.port)} ${value}`;
                            setMessages(prev => [...prev, {
                                type: 'user',
                                content: userCommand,
                                timestamp: getStandardTime()
                            }]);

                            // 然后执行命令
                            this.handleExecute({
                                assistantInputs,
                                config,
                                executingAssistants,
                                executeCommand,
                                setExecutingAssistants
                            });
                        }}
                    >
                        {executingAssistants.has(this.name) ? (
                            <>
                                <Icon type="pause-circle" />
                                暂停
                            </>
                        ) : (
                            <>
                                <Icon type="arrow-right" />
                                执行
                            </>
                        )}
                    </div>
                    <Icon 
                        type="close" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleCloseAssistant(this.name)}
                    />
                </div>
            </>
        );
    }

    // 处理命令执行
    async handleExecute({ assistantInputs, config, executingAssistants, executeCommand, setExecutingAssistants }) {
        const isExecuting = executingAssistants.has(this.name);
        const value = assistantInputs.get(this.name);
        
        if (isExecuting) {
            // 如果正在执行，则取消执行
            setExecutingAssistants(new Set());
            return;
        }

        if (!value) {
            message.warning('请选择要执行的命令');
            return;
        }
        if (!config?.ip) {
            message.warning('请先选择服务器');
            return;
        }

        // 构建用户命令
        const userCommand = `@${this.name} ${this.serverFormat(config.ip, config.port)} ${value}`;

        try {
            // 设置执行状态
            setExecutingAssistants(new Set([this.name]));
            
            // 发送用户消息到对话框
            executeCommand({
                type: 'user',
                content: userCommand,
                timestamp: getStandardTime()
            });

            // 执行命令
            const params = this.buildExecuteParams(value, config);
            const response = await fetch('http://127.0.0.1:8002/execute/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });
            
            const data = await response.json();
            
            if (data.status === "ok") {
                const formattedCommand = `> ${userCommand}`;
                const formattedResult = `\`\`\`bash\n${data.data}\n\`\`\``;
                const formatMessage = `${formattedCommand}\n${formattedResult}`;
                
                executeCommand({
                    type: 'assistant',
                    content: formatMessage,
                    rawContent: data.data,
                    command: userCommand,
                    timestamp: getStandardTime(),
                    status: 'ok'
                });
            } else {
                executeCommand({
                    type: 'assistant',
                    content: `执行失败: ${data.message || '未知错误'}`,
                    rawContent: data.message || '未知错误',
                    command: userCommand,
                    timestamp: getStandardTime(),
                    isError: true,
                    status: 'error'
                });
            }
        } catch (error) {
            console.error('执行命令失败:', error);
            message.error(error.message || '执行命令失败');
            executeCommand({
                type: 'assistant',
                content: `执行失败: ${error.message || '未知错误'}`,
                rawContent: error.message || '未知错误',
                command: userCommand,
                timestamp: getStandardTime(),
                isError: true,
                status: 'error'
            });
        } finally {
            // 清除执行状态
            setExecutingAssistants(new Set());
        }
    }

    // 构建执行参数（可被子类重写）
    buildExecuteParams(value, config) {
        return {
            tool: this.name.toLowerCase().replace('助手', ''),
            address: config.ip,
            cmd: value
        };
    }

    // 格式化消息（可被子类重写）
    formatMessage(response) {
        return {
            type: 'assistant',
            content: response.data,
            timestamp: getStandardTime()
        };
    }

    // 渲染消息内容（可被子类重写）
    renderMessage(msg, messageViewModes, setMessageViewModes) {
        const isExpanded = messageViewModes.get(msg.timestamp) === 'expanded';
        const displayContent = isExpanded || msg.content.length <= MESSAGE_DISPLAY_THRESHOLD 
            ? msg.content 
            : msg.content.slice(0, MESSAGE_DISPLAY_THRESHOLD) + '...';

        return (
            <>
                <ReactMarkdown components={markdownRenderers}>
                    {displayContent}
                </ReactMarkdown>
                {msg.content.length > MESSAGE_DISPLAY_THRESHOLD && (
                    <Button 
                        type="link" 
                        onClick={() => {
                            const newMode = isExpanded ? undefined : 'expanded';
                            setMessageViewModes(new Map(messageViewModes).set(msg.timestamp, newMode));
                        }}
                        style={{ padding: '4px 0' }}
                    >
                        {isExpanded ? '收起' : '展开'}
                    </Button>
                )}
            </>
        );
    }

    // 渲染消息操作按钮（可被子类重写）
    renderMessageActions(msg, messageViewModes, setMessageViewModes, handleResultSelect, selectedResults, copyToClipboard) {
        return (
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
        );
    }

    // 获取默认视图模式（可被子类重写）
    getDefaultViewMode() {
        return null;
    }

    // 初始化消息视图模式（可被子类重写）
    initMessageViewMode(msg, messageViewModes) {
        const defaultMode = this.getDefaultViewMode();
        if (defaultMode && !messageViewModes.has(msg.timestamp)) {
            messageViewModes.set(msg.timestamp, defaultMode);
        }
    }
} 