import React, { Component } from "react";
import { Input, Button, message, Spin, Icon, Card, Select, Divider, Checkbox } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

const { TextArea } = Input;
const { Option } = Select;
const promptTemplate = {
    default: {
        label: "默认模版",
        text: "请回答以下问题：\n\n上下文信息：\n{context}\n\n问题：{question}\n\n请基于上下文信息回答问题。"
    },
    feature_compare: {
        label: "功能对比分析",
        text: "你是一个专业的数据库功能对比分析专家。本次需要分析的数据库包括：{db_types}。请基于以下规则回答问题：\n\n1. 只使用上下文中提供的信息进行分析和对比\n2. 必须对上述列出的所有数据库进行分析，使用表格形式清晰展示各个数据库对所查询功能的支持情况：\n   - ✓ 表示支持\n   - ✗ 表示不支持\n   - ? 表示上下文中未提及\n3. 明确指出哪些数据库在上下文中完全没有相关信息\n4. 给出信息来源，包括文档名称和页码\n5. 不要推测或编造未在上下文中明确提到的信息\n6. 即使某些数据库在上下文中没有找到相关信息，也要在表格中列出并标记为 ?\n\n上下文信息：\n{context}\n\n问题：{question}\n\n请按照上述规则进行分析和对比。如果是功能对比，请务必使用表格形式展示结果，并确保包含所有指定的数据库。"
    }
};
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

// 常量配置
const DB_OPTIONS = [
    { value: 'shentong', label: '神通数据库' },
    { value: 'gaussdb', label: 'GaussDB' },
    { value: 'ob', label: 'OceanBase' },
    { value: 'gbase', label: 'GBase' },
    { value: 'tdsql', label: 'TDSQL' },
    { value: 'polardb', label: 'PolarDB' },
    { value: 'tidb', label: 'TiDB' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'dm', label: '达梦' },
    { value: 'xugu', label: '虚谷' },
    { value: 'goldendb', label: 'GoldenDB' }
];

export default class KbRag extends Component {
    constructor(props) {
        super(props);
        this.state = {
            question: "",
            messages: [],
            conversationId: null,
            promptText: promptTemplate.default.text,
            selectedTemplate: 'default',
            streaming: false,
            // RAG 配置统一管理
            ragConfig: {
                enabled: false,
                algorithm: "es",
                db_types: [],
                search_keyword: ""
            }
        };
    }

    // 修改处理全选的方法
    handleSelectAll = (e) => {
        message.success(11111)
        if (e) {
            e.preventDefault();  // 阻止默认行为
            e.stopPropagation(); // 阻止冒泡
        }
        
        // 直接调用 Select 的 onChange
        const allValues = this.state.dbOptions.map(db => db.value);
        this.handleDbChange(allValues);
    };

    // 修改数据库选择变化的处理方法
    handleDbChange = (value) => {
        this.setState(prevState => ({
            ragConfig: {
                ...prevState.ragConfig,
                db_types: value
            }
        }));
    };

    // 处理清空
    handleClear = () => {
        this.setState({
            db_types: []
        });
    };

    // 处理 Checkbox 变化
    handleCheckboxChange = (e) => {
        const checked = e.target.checked;
        const allValues = DB_OPTIONS.map(db => db.value);
        this.setState(prevState => ({
            ragConfig: {
                ...prevState.ragConfig,
                db_types: checked ? allValues : []
            }
        }));
    };

    // 处理模版变化
    handleTemplateChange = (value) => {
        this.setState({
            selectedTemplate: value,
            promptText: promptTemplate[value].text
        });
    };

    // 处理 RAG 启用状态变化
    handleRagEnableChange = (e) => {
        this.setState(prevState => ({
            ragConfig: {
                ...prevState.ragConfig,
                enabled: e.target.checked
            }
        }));
    };

    updateRagConfig = (updates) => {
        this.setState(prevState => ({
            ragConfig: {
                ...prevState.ragConfig,
                ...updates
            }
        }));
    };

    render() {
        const { ragConfig } = this.state;
        const allSelected = ragConfig.db_types.length === DB_OPTIONS.length;
        
        return (
            <div style={{ display: 'flex', height: 'calc(100vh - 64px)', padding: '20px' }}>
                {/* 左侧面板 */}
                <div style={{ 
                    width: '30%', 
                    marginRight: '20px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100%'
                }}>
                    {/* 提示词模版 Card */}
                    <Card title="提示词模版" style={{ marginBottom: '20px', flex: '0 0 auto' }}>
                        <div style={{ marginBottom: '10px' }}>
                            <Select
                                style={{ width: '100%' }}
                                value={this.state.selectedTemplate}
                                onChange={this.handleTemplateChange}
                                placeholder="选择提示词模版"
                            >
                                {Object.entries(promptTemplate).map(([key, value]) => (
                                    <Option key={key} value={key}>
                                        {value.label}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <TextArea
                            rows={6}
                            value={this.state.promptText}
                            onChange={e => this.setState({ promptText: e.target.value })}
                            placeholder="提示词内容..."
                        />
                    </Card>

                    {/* RAG配置 Card */}
                    <Card 
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>RAG配置</span>
                                <Checkbox 
                                    checked={ragConfig.enabled}
                                    onChange={this.handleRagEnableChange}
                                >
                                    启用RAG
                                </Checkbox>
                            </div>
                        } 
                        style={{ flex: '1 1 auto', overflow: 'auto' }}
                    >
                        {ragConfig.enabled ? (
                            <>
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ marginBottom: '5px' }}>搜索类型</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        value={ragConfig.algorithm}
                                        onChange={(value) => this.updateRagConfig({ algorithm: value })}
                                    >
                                        <Option value="vector">向量搜索</Option>
                                        <Option value="es">ES搜索</Option>
                                        <Option value="hybrid">混合搜索</Option>
                                    </Select>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ 
                                        marginBottom: '5px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span>选择数据库</span>
                                        <Checkbox 
                                            checked={allSelected}
                                            onChange={this.handleCheckboxChange}
                                        >
                                            全选
                                        </Checkbox>
                                    </div>
                                    <Select
                                        mode="multiple"
                                        style={{ width: '100%' }}
                                        placeholder="请选择数据库（可多选）"
                                        value={ragConfig.db_types}
                                        onChange={this.handleDbChange}
                                        allowClear
                                    >
                                        {DB_OPTIONS.map(db => (
                                            <Option key={db.value} value={db.value}>{db.label}</Option>
                                        ))}
                                    </Select>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ marginBottom: '5px' }}>搜索关键词</div>
                                    <Input
                                        placeholder="搜索关键词（可选）"
                                        value={ragConfig.search_keyword}
                                        onChange={(event) => {
                                            if (event && event.target) {
                                                this.updateRagConfig({ 
                                                    search_keyword: event.target.value 
                                                });
                                            }
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                                请启用 RAG 以配置搜索选项
                            </div>
                        )}
                    </Card>
                </div>

                {/* 右侧面板 */}
                <div style={{ 
                    width: '70%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100%'  // 确保高度填满
                }}>
                    {/* 对话历史区域 */}
                    <div style={{ 
                        flex: '1 1 auto',
                        marginBottom: '20px', 
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        overflow: 'auto',
                        padding: '20px'
                    }}>
                        {this.state.messages.map((msg, index) => (
                            <div key={index} style={{
                                marginBottom: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                {/* 时间戳 */}
                                <div style={{
                                    fontSize: '12px',
                                    color: '#999',
                                    marginBottom: '4px'
                                }}>
                                    {msg.time}
                                </div>
                                
                                {/* 消息内容 */}
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: msg.type === 'user' ? '#1890ff' : '#f5f5f5',
                                    color: msg.type === 'user' ? '#fff' : '#000'
                                }}>
                                    {msg.type === 'user' ? (
                                        <div>{msg.content}</div>
                                    ) : (
                                        <div>
                                            {/* 系统消息（搜索状态） */}
                                            {msg.searchStatus && msg.searchStatus.map((status, idx) => (
                                                <div key={idx} style={{ 
                                                    marginBottom: '8px', 
                                                    color: '#666',
                                                    fontSize: '12px',
                                                    fontStyle: 'italic'
                                                }}>
                                                    {status}
                                                </div>
                                            ))}
                                            {/* AI 回答内容 */}
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                components={markdownComponents}
                                                children={msg.content}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 输入区域 */}
                    <div style={{ flex: '0 0 auto' }}>
                        <Input.Search
                            value={this.state.question}
                            onChange={e => this.setState({ question: e.target.value })}
                            onSearch={this.handleStream}
                            placeholder="请输入您的问题..."
                            enterButton={
                                <Button 
                                    type="primary" 
                                    loading={this.state.streaming}
                                >
                                    <Icon type="search" />
                                    提交问题
                                </Button>
                            }
                            disabled={this.state.streaming}
                        />
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

        // 添加用户问题到对话历史
        const userMessage = {
            type: 'user',
            content: this.state.question,
            time: new Date().toLocaleTimeString()
        };

        this.setState(prevState => ({
            streaming: true,
            messages: [...prevState.messages, userMessage],
            answer: "",
            searchStatus: [],
            metadata: null
        }));

        try {
            const { ragConfig } = this.state;
            
            // 构建请求体，直接使用 ragConfig
            const requestBody = {
                question: this.state.question,
                prompt: this.state.promptText,
                conversation_id: this.state.conversationId,
                rag_config: ragConfig
            };

            const response = await fetch('http://127.0.0.1:8001/api/db/qa/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            // 添加 AI 回答到对话历史
            const aiMessage = {
                type: 'assistant',
                content: '',
                searchStatus: [],
                time: new Date().toLocaleTimeString()
            };

            this.setState(prevState => ({
                messages: [...prevState.messages, aiMessage]
            }));

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() && line.startsWith('data: ')) {
                        const data = line.slice(5).trim();
                        try {
                            const parsedData = JSON.parse(data);
                            const { event, answer, conversation_id } = parsedData;  // 解析会话ID

                            // 如果收到会话ID且与当前不同，则更新
                            if (conversation_id && conversation_id !== this.state.conversationId) {
                                this.setState({ conversationId: conversation_id });
                            }

                            this.setState(prevState => {
                                const messages = [...prevState.messages];
                                const lastMessage = messages[messages.length - 1];
                                
                                if (lastMessage && lastMessage.type === 'assistant') {
                                    if (event === 'message') {
                                        if (answer.startsWith('正在')) {
                                            lastMessage.searchStatus = [...(lastMessage.searchStatus || []), answer];
                                        } else {
                                            lastMessage.content = (lastMessage.content || '') + answer;
                                        }
                                    } else if (event === 'message_end' && parsedData.metadata?.usage) {
                                        const usage = parsedData.metadata.usage;
                                        const statsText = "\n\n---\n\n**统计信息**:\n" +
                                            "- 总Token数: " + usage.total_tokens + "\n" +
                                            "- 延迟: " + usage.latency.toFixed(2) + "s\n";
                                        lastMessage.content += statsText;
                                    }
                                }
                                return { messages };
                            });
                        } catch (error) {
                            console.error('Error parsing SSE data:', error);
                        }
                    }
                }
            }

            this.setState({ 
                streaming: false,
                question: "" // 清空输入框
            });

        } catch (error) {
            message.error("请求失败: " + error.message);
            this.setState({ streaming: false });
        }
    };
}