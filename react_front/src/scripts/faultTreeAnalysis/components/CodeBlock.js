import React from 'react';
import { Button, message } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { registry } from '../assistants';
import { getStandardTime } from '../util';
import moment from 'moment';
import MyAxios from '../../common/interface';

const CodeBlock = ({ content, language, executeCommand, executedCommands, executingCommands }) => {
    // 尝试解析JSON命令
    const parseCommand = (codeContent) => {
        try {
            const command = JSON.parse(codeContent);
            if (command.tool && command.command) {
                // 直接使用工具名获取助手
                const assistant = registry.get(command.tool);
                if (assistant) {
                    return {
                        ...command,
                        assistant
                    };
                }
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    // 处理复制
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            message.success('已复制到剪贴板');
        } catch (err) {
            message.error('复制失败');
        }
    };

    // 处理执行
    const handleExecute = async (command) => {
        // 构建用户命令消息
        const userCommand = `@${command.assistant.name} ${command.server} ${command.command}`;
        
        // 添加用户消息
        executeCommand({
            type: 'user',
            content: userCommand,
            timestamp
        });

        // 添加到执行中的命令
        executingCommands.add(commandKey);

        try {
            // 如果是zabbix助手，使用特定的API
            if (command.tool === 'zabbix') {
                const params = {
                    address: command.server,
                    cmd: command.command,
                    time_from: command.time_from || moment().subtract(1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
                    time_till: command.time_till || moment().format('YYYY-MM-DD HH:mm:ss')
                };

                const response = await MyAxios.post('/fault_tree/v1/get_metric_history_by_ip/', params);
                
                if (response.data.status === "ok") {
                    const metricsData = response.data.data;
                    const firstItem = metricsData[0];
                    
                    const headerRow = `指标名称: (${firstItem.key_})\n`;
                    const dataRows = metricsData.map(point => 
                        `${point.metric_time} | ${point.value}${firstItem.units}`
                    ).join('\n');

                    const formattedCommand = `> ${userCommand}`;
                    const formatMessage = `${formattedCommand}\n\`\`\`\n${headerRow}${dataRows}\n\`\`\``;

                    executeCommand({
                        type: 'assistant',
                        content: formatMessage,
                        rawContent: response.data.data,
                        command: userCommand,
                        timestamp,
                        isZabbix: true,
                        status: 'ok',
                        viewMode: 'chart'
                    });
                } else {
                    executeCommand({
                        type: 'assistant',
                        content: `执行失败: ${response.data.message || '未知错误'}`,
                        rawContent: response.data.message || '未知错误',
                        command: userCommand,
                        timestamp,
                        isError: true,
                        status: 'error'
                    });
                }
            } else {
                // 其他助手使用通用执行方法
                const params = {
                    tool: command.tool,
                    address: command.server,
                    cmd: command.command
                };

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
                    const formatMessage = `${formattedCommand}\n\`\`\`\n${data.data}\n\`\`\``;

                    executeCommand({
                        type: 'assistant',
                        content: formatMessage,
                        rawContent: data.data,
                        command: userCommand,
                        timestamp,
                        status: 'ok'
                    });
                } else {
                    executeCommand({
                        type: 'assistant',
                        content: `执行失败: ${data.message || '未知错误'}`,
                        rawContent: data.message || '未知错误',
                        command: userCommand,
                        timestamp,
                        isError: true,
                        status: 'error'
                    });
                }
            }
        } catch (error) {
            console.error('执行命令失败:', error);
            message.error(error.message || '执行命令失败');
            executeCommand({
                type: 'assistant',
                content: `执行失败: ${error.message || '未知错误'}`,
                command: userCommand,
                timestamp,
                isError: true
            });
        } finally {
            executingCommands.delete(commandKey);
        }
    };

    // 处理中断
    const handleInterrupt = () => {
        executeCommand({ type: 'interrupt' });
    };

    const command = parseCommand(content);
    // 对于已执行命令的检查，只比较命令内容，不比较时间戳
    const commandContent = command ? JSON.stringify({
        tool: command.tool,
        server: command.server,
        command: command.command
    }) : null;

    // 构建命令键，加入时间戳确保唯一性
    const timestamp = getStandardTime();
    const commandKey = command ? JSON.stringify({
        ...command,
        timestamp
    }) : null;

    const isExecuting = commandKey && executingCommands.has(commandKey);
    const hasExecuted = commandContent && Array.from(executedCommands).some(executed => {
        const executedContent = JSON.parse(executed);
        return executedContent.tool === command.tool &&
               executedContent.server === command.server &&
               executedContent.command === command.command;
    });

    return (
        <div className="code-block-wrapper" style={{ position: 'relative' }}>
            <div className="code-block-buttons" style={{
                position: 'absolute',
                top: 5,
                right: 5,
                display: 'flex',
                gap: '8px',
                zIndex: 1
            }}>
                {command && (
                    isExecuting ? (
                        <Button
                            type="primary"
                            danger
                            size="small"
                            icon="stop"
                            onClick={handleInterrupt}
                        >
                            终止
                        </Button>
                    ) : (
                        <Button
                            type="primary"
                            size="small"
                            icon={hasExecuted ? "check" : "thunderbolt"}
                            onClick={() => handleExecute(command)}
                        >
                            {hasExecuted ? '再次执行' : '执行'}
                        </Button>
                    )
                )}
                <Button
                    size="small"
                    icon="copy"
                    onClick={handleCopy}
                >
                    复制
                </Button>
            </div>
            <SyntaxHighlighter
                language={language || 'json'}
                style={nightOwl}
                customStyle={{
                    padding: '24px 12px 12px',
                    borderRadius: '6px',
                    margin: '8px 0'
                }}
            >
                {content}
            </SyntaxHighlighter>
        </div>
    );
};

export default CodeBlock; 