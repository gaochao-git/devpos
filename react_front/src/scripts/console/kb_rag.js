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

export default class KbRag extends Component {
    constructor(props) {
        super(props);
        this.state = {
            question: "",
            answer: "",
            algorithm: "es",
            searchKeyword: "",
            selectedTemplate: 'default',
            promptText: promptTemplate.default.text,
            streaming: false,
            metadata: null,
            selectedDbs: [], // 选中的数据库
            dbOptions: [     // 数据库选项
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
            ]
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
        this.setState({
            selectedDbs: value
        });
    };

    // 处理清空
    handleClear = () => {
        this.setState({
            selectedDbs: []
        });
    };

    // 处理 Checkbox 变化
    handleCheckboxChange = (e) => {
        const checked = e.target.checked;
        const allValues = this.state.dbOptions.map(db => db.value);
        this.setState({
            selectedDbs: checked ? allValues : []
        });
    };

    // 处理模版变化
    handleTemplateChange = (value) => {
        this.setState({
            selectedTemplate: value,
            promptText: promptTemplate[value].text
        });
    };

    render() {
        const allSelected = this.state.selectedDbs.length === this.state.dbOptions.length;
        
        return (
            <div style={{ display: 'flex', height: 'calc(100vh - 64px)', padding: '20px' }}>
                {/* 左侧面板 - 增加宽度到 30% */}
                <div style={{ width: '30%', marginRight: '20px', display: 'flex', flexDirection: 'column' }}>
                    {/* 上部分 - 提示词模版 */}
                    <Card title="提示词模版" style={{ marginBottom: '20px' }}>
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

                    {/* 下部分 - 搜索配置 */}
                    <Card title="搜索配置">
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ marginBottom: '5px' }}>搜索类型</div>
                            <Select
                                style={{ width: '100%' }}
                                value={this.state.algorithm}
                                onChange={(value) => this.setState({ algorithm: value })}
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
                                value={this.state.selectedDbs}
                                onChange={this.handleDbChange}
                                allowClear
                            >
                                {this.state.dbOptions.map(db => (
                                    <Option key={db.value} value={db.value}>{db.label}</Option>
                                ))}
                            </Select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ marginBottom: '5px' }}>搜索关键词</div>
                            <Input
                                placeholder="搜索关键词（可选）"
                                value={this.state.searchKeyword}
                                onChange={e => this.setState({ searchKeyword: e.target.value })}
                            />
                        </div>
                    </Card>
                </div>

                {/* 右侧面板 - 减少宽度到 70% */}
                <div style={{ width: '70%', display: 'flex', flexDirection: 'column' }}>
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
                    search_keyword: this.state.searchKeyword,
                    db_types: this.state.selectedDbs.length > 0 ? this.state.selectedDbs : undefined,
                    prompt: this.state.promptText
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