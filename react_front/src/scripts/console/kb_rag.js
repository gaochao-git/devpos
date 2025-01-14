import React, { Component } from "react";
import { Table, Input, Button, message, Tabs, Select, Spin, Icon, Card } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';

const { TextArea } = Input;
const { TabPane } = Tabs;
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
            algorithm: "es", // 可选: vector, es, hybrid
            searchStatus: [],  // 用于显示搜索进度
            streaming: false,
            history: []
        };
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

    render() {
        return (
            <div style={{ display: 'flex', padding: '20px', height: '100%' }}>
                {/* 左侧面板 */}
                <Card 
                    title={<div style={{ fontWeight: 'bold' }}>知识库问答</div>}
                    style={{ 
                        width: '60%', 
                        marginRight: '20px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    bodyStyle={{ flex: 1 }}
                >
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ marginBottom: '10px' }}>
                            <Select
                                value={this.state.algorithm}
                                onChange={(value) => this.setState({ algorithm: value })}
                                style={{ width: 120, marginRight: '10px' }}
                            >
                                <Option value="vector">向量搜索</Option>
                                <Option value="es">ES搜索</Option>
                                <Option value="hybrid">混合搜索</Option>
                            </Select>
                        </div>
                        <TextArea
                            rows={4}
                            value={this.state.question}
                            onChange={e => this.setState({ question: e.target.value })}
                            placeholder="请输入您的问题..."
                        />
                        <Button 
                            type="primary"
                            onClick={this.handleStream}
                            loading={this.state.streaming}
                            style={{ marginTop: '10px' }}
                        >
                            <Icon type="search" /> 提交问题
                        </Button>
                    </div>

                    {/* 搜索状态显示 */}
                    <div style={{ 
                        marginBottom: '20px',
                        padding: '10px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        display: this.state.searchStatus.length ? 'block' : 'none'
                    }}>
                        {this.state.searchStatus.map((status, index) => (
                            <div key={index} style={{ marginBottom: '5px' }}>
                                {status}
                            </div>
                        ))}
                        {this.state.streaming && <Spin size="small" />}
                    </div>
                </Card>

                {/* 右侧面板 */}
                <Card 
                    style={{ 
                        width: '40%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Markdown 预览 */}
                    <Card
                        title="预览"
                        type="inner"
                        style={{ marginBottom: '20px' }}
                    >
                        <div style={{ 
                            minHeight: '200px',
                            backgroundColor: '#f5f5f5',
                            padding: '10px',
                            borderRadius: '4px',
                            overflow: 'auto'
                        }}>
                            {this.state.answer ? (
                                <ReactMarkdown 
                                    components={markdownRenderers}
                                    children={this.state.answer}
                                />
                            ) : (
                                "等待回答..."
                            )}
                        </div>
                    </Card>

                    <TabPane tab="历史记录" key="2">
                        <Table
                            dataSource={this.state.history}
                            columns={[
                                {
                                    title: '时间',
                                    dataIndex: 'timestamp',
                                    key: 'timestamp',
                                    width: '150px'
                                },
                                {
                                    title: '搜索方式',
                                    dataIndex: 'algorithm',
                                    key: 'algorithm',
                                    width: '100px',
                                    render: (text) => ({
                                        'vector': '向量搜索',
                                        'es': 'ES搜索',
                                        'hybrid': '混合搜索'
                                    }[text] || text)
                                },
                                {
                                    title: '问题',
                                    dataIndex: 'question',
                                    key: 'question',
                                    width: '30%'
                                },
                                {
                                    title: '回答',
                                    dataIndex: 'answer',
                                    key: 'answer',
                                    width: '40%'
                                }
                            ]}
                            rowKey={(record, index) => index}
                            pagination={{
                                showTotal: (total) => `共 ${total} 条`
                            }}
                        />
                    </TabPane>
                </Card>
            </div>
        );
    }
} 