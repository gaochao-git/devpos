import React, { Component } from "react";
import { Input, Button, message, Spin, Icon, Card, Select } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

const { TextArea } = Input;
const { Option } = Select;

// Markdown 渲染配置
const markdownComponents = {
    // 代码块渲染
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
    },
    // 表格相关组件
    table: ({ children, ...props }) => (
        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table style={{ 
                borderCollapse: 'collapse',
                width: '100%',
                border: '1px solid #ddd'
            }} {...props}>
                {children}
            </table>
        </div>
    ),
    thead: ({ children, ...props }) => (
        <thead style={{ backgroundColor: '#f5f5f5' }} {...props}>
            {children}
        </thead>
    ),
    th: ({ children, ...props }) => (
        <th style={{ 
            border: '1px solid #ddd',
            padding: '8px',
            textAlign: 'left'
        }} {...props}>
            {children}
        </th>
    ),
    td: ({ children, ...props }) => (
        <td style={{ 
            border: '1px solid #ddd',
            padding: '8px'
        }} {...props}>
            {children}
        </td>
    ),
    // 图片渲染
    img: ({ node, ...props }) => (
        <img
            style={{ 
                maxWidth: '100%',
                height: 'auto'
            }}
            {...props}
            alt={props.alt || ''}
            onError={(e) => {
                e.target.style.display = 'none';
                message.error(`图片加载失败: ${props.src}`);
            }}
        />
    )
};

export default class KbRag extends Component {
    constructor(props) {
        super(props);
        this.state = {
            question: "",
            answer: "",
            algorithm: "es",
            searchKeyword: "",
            promptTemplate: "default",
            promptText: "",
            streaming: false
        };
    }

    render() {
        return (
            <div style={{ display: 'flex', height: 'calc(100vh - 64px)', padding: '20px' }}>
                {/* 左侧面板 - 20% */}
                <div style={{ width: '20%', marginRight: '20px', display: 'flex', flexDirection: 'column' }}>
                    {/* 上部分 - 提示词模版 */}
                    <Card title="提示词模版" style={{ marginBottom: '20px' }}>
                        <Select
                            style={{ width: '100%', marginBottom: '10px' }}
                            value={this.state.promptTemplate}
                            onChange={(value) => this.setState({ promptTemplate: value })}
                        >
                            <Option value="default">默认模版</Option>
                            <Option value="template1">模版1</Option>
                            <Option value="template2">模版2</Option>
                        </Select>
                        <TextArea
                            rows={4}
                            value={this.state.promptText}
                            onChange={e => this.setState({ promptText: e.target.value })}
                            placeholder="提示词内容..."
                        />
                    </Card>

                    {/* 下部分 - 搜索配置 */}
                    <Card title="搜索配置">
                        <Select
                            style={{ width: '100%', marginBottom: '10px' }}
                            value={this.state.algorithm}
                            onChange={(value) => this.setState({ algorithm: value })}
                        >
                            <Option value="vector">向量搜索</Option>
                            <Option value="es">ES搜索</Option>
                            <Option value="hybrid">混合搜索</Option>
                        </Select>
                        <Input
                            placeholder="搜索关键词"
                            value={this.state.searchKeyword}
                            onChange={e => this.setState({ searchKeyword: e.target.value })}
                        />
                    </Card>
                </div>

                {/* 右侧面板 - 80% */}
                <div style={{ width: '80%', display: 'flex', flexDirection: 'column' }}>
                    {/* 上部分 - 回答区域 */}
                    <div style={{ 
                        flex: 1, 
                        marginBottom: '20px', 
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        overflow: 'auto'
                    }}>
                        <div style={{ 
                            padding: '20px',
                            minHeight: '100%'
                        }}>
                            {this.state.streaming && (
                                <div style={{ marginBottom: '10px' }}>
                                    <Spin /> 正在生成回答...
                                </div>
                            )}
                            {this.state.answer ? (
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={markdownComponents}
                                    children={this.state.answer}
                                />
                            ) : (
                                <div style={{ color: '#999' }}>等待回答...</div>
                            )}
                        </div>
                    </div>

                    {/* 下部分 - 问题输入区域 */}
                    <div style={{ height: '150px', display: 'flex', flexDirection: 'column' }}>
                        <TextArea
                            style={{ flex: 1, marginBottom: '10px' }}
                            value={this.state.question}
                            onChange={e => this.setState({ question: e.target.value })}
                            placeholder="请输入您的问题..."
                        />
                        <Button 
                            type="primary"
                            onClick={this.handleStream}
                            loading={this.state.streaming}
                            icon={<Icon type="search" />}
                        >
                            提交问题
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    handleStream = async () => {
        if (!this.state.question) {
            message.error("请输入问题");
            return;
        }

        this.setState({ 
            streaming: true, 
            answer: "### 搜索进度\n\n", 
            searchStatus: [],
            metadata: null
        });

        try {
            const response = await fetch('http://127.0.0.1:8001/api/db/qa/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: this.state.question,
                    algorithm: this.state.algorithm,
                    search_keyword: this.state.searchKeyword
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() && line.startsWith('data: ')) {
                        const data = line.slice(5).trim();
                        this.handleSSEMessage(data);
                    }
                }
            }

        } catch (error) {
            message.error("请求失败: " + error.message);
            this.setState({ streaming: false });
        }
    };

    handleSSEMessage = (data) => {
        try {
            const {
                event,
                answer,
                conversation_id,
                message_id,
                task_id,
                metadata
            } = JSON.parse(data);
            
            switch (event) {
                case 'message':
                    if (answer.startsWith('正在搜索')) {
                        // 搜索状态信息
                        this.setState(prevState => ({
                            searchStatus: [...prevState.searchStatus, answer],
                            answer: prevState.answer + "- " + answer + "\n"
                        }));
                    } else {
                        // 答案内容
                        this.setState(prevState => ({
                            answer: prevState.answer + answer
                        }));
                    }
                    break;

                case 'message_end':
                    this.setState({ 
                        streaming: false,
                        searchStatus: [...this.state.searchStatus, "回答完成"],
                        // 如果需要显示统计信息
                        metadata: metadata
                    });
                    
                    // 如果需要显示token统计，可以添加到答案末尾
                    if (metadata?.usage) {
                        const usage = metadata.usage;
                        const statsText = `\n\n---\n\n**统计信息**:\n` +
                            `- 总Token数: ${usage.total_tokens}\n` +
                            `- 延迟: ${usage.latency.toFixed(2)}s\n` +
                            `- 总费用: ${usage.total_price} ${usage.currency}\n`;
                        
                        this.setState(prevState => ({
                            answer: prevState.answer + statsText
                        }));
                    }
                    break;

                case 'error':
                    message.error(answer);
                    this.setState({ 
                        streaming: false,
                        searchStatus: [...this.state.searchStatus, `错误: ${answer}`]
                    });
                    break;

                default:
                    console.log('Unknown event type:', event);
            }
        } catch (e) {
            console.error('Error parsing SSE message:', e);
            message.error('处理响应时出错');
        }
    };
} 