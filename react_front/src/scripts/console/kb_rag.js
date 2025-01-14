import React, { Component } from "react";
import { Input, Button, message, Spin, Icon, Card, Select } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';

const { TextArea } = Input;
const { Option } = Select;

// Markdown 渲染配置
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
                                    components={markdownRenderers}
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
            answer: "", 
            searchStatus: []
        });

        try {
            const response = await fetch('http://127.0.0.1:8001/api/db/qa/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: this.state.question,
                    algorithm: this.state.algorithm
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    
                    // 解析 SSE 消息
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        this.handleSSEMessage(data);
                    } else if (line.startsWith('event: ')) {
                        // 处理事件类型
                        const eventType = line.slice(7);
                        // 可以根据需要处理不同的事件类型
                    }
                }
            }

        } catch (error) {
            message.error("请求失败: " + error.message);
            this.setState({ streaming: false });
        }
    };

    // 处理 SSE 消息的辅助方法
    handleSSEMessage = (data) => {
        try {
            // 尝试解析 JSON
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'search_start':
                case 'search_progress':
                case 'search_result':
                    this.setState(prevState => ({
                        searchStatus: [...prevState.searchStatus, message.content]
                    }));
                    break;
                case 'answer':
                    this.setState(prevState => ({
                        answer: prevState.answer + message.content
                    }));
                    break;
                case 'done':
                    this.setState({ streaming: false });
                    break;
                case 'error':
                    message.error(message.content);
                    this.setState({ streaming: false });
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (e) {
            // 如果不是 JSON，直接添加到答案中
            this.setState(prevState => ({
                answer: prevState.answer + data
            }));
        }
    };
} 