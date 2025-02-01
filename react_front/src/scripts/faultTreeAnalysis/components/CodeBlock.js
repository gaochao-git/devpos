import React from 'react';
import { Button, message } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = ({ content, language, executeCommand, executedCommands, executingCommands }) => {
    // 尝试解析JSON命令
    const parseCommand = (codeContent) => {
        try {
            const command = JSON.parse(codeContent);
            if (command.tool && command.server && command.command) {
                return command;
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
    const handleExecute = (command) => {
        executeCommand({
            tool: command.tool,
            address: command.server,
            cmd: command.command
        });
    };

    // 处理中断
    const handleInterrupt = () => {
        executeCommand({ type: 'interrupt' });
    };

    const command = parseCommand(content);
    const commandKey = command ? JSON.stringify({
        tool: command.tool,
        address: command.server,
        cmd: command.command
    }) : null;

    const isExecuting = commandKey && executingCommands.has(commandKey);
    const hasExecuted = commandKey && executedCommands.has(commandKey);

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