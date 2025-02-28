import React, { Component } from "react";
import { Input, Button, message, Spin, Icon, Card, Select, Divider, Checkbox } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { BaseChatHeader, BaseChatFooter, BaseChatBox } from '../components/BaseLayout';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import {
    sendMessageToAssistant,
    getHistoryConversations,
    getConversationMessages,
    renameConversation,
    stopMessageGeneration
} from '../aIAssistantApi';
import MarkdownRenderer from '../components/MarkdownRenderer';

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
    { value: 'goldendb', label: 'GoldenDB' },
    { value: 'kadb', label: 'KADB' }
];

export default class DataAnalysisAgent extends Component {
    constructor(props) {
        super(props);
        this.state = {
            question: "",
            messages: [],
            conversationId: null,
            promptText: promptTemplate.default.text,
            selectedTemplate: 'default',
            streaming: false,
            taskId: null,
            inputValue: '',
            // RAG 配置统一管理
            ragConfig: {
                db_types: [],  // 初始化为空数组
                vector_store_config: {},
                rerank_config: {},
                vectorQuery: '',  // 添加矢量搜索字段
                scalarQuery: ''   // 添加标量搜索字段
            },
            isUserScrolling: false,
            isHistoryLoading: false // 添加历史加载状态
        };
        this.messagesEndRef = React.createRef();
        this.abortController = null;
    }

    // 添加自动滚动方法
    scrollToBottom = () => {
        if (this.messagesEndRef.current && !this.state.isUserScrolling) {
            const container = this.messagesEndRef.current.parentElement;
            const isScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            
            if (isScrolledToBottom || !this.state.isUserScrolling) {
                this.messagesEndRef.current.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'end'
                });
            }
        }
    }

    // 添加鼠标进入处理
    handleMouseEnter = () => {
        this.setState({ isUserScrolling: true });
    }

    // 添加鼠标离开处理
    handleMouseLeave = () => {
        this.setState({ isUserScrolling: false });
        this.scrollToBottom();
    }

    // 在组件更新后执行滚动
    componentDidUpdate(prevProps, prevState) {
        const messagesChanged = prevState.messages.length !== this.state.messages.length;
        const lastMessageChanged = prevState.messages.length > 0 && 
            this.state.messages.length > 0 && 
            prevState.messages[prevState.messages.length - 1].content !== 
            this.state.messages[this.state.messages.length - 1].content;
        const searchStatusChanged = prevState.messages.length > 0 && 
            this.state.messages.length > 0 && 
            JSON.stringify(prevState.messages[prevState.messages.length - 1].searchStatus) !== 
            JSON.stringify(this.state.messages[this.state.messages.length - 1].searchStatus);

        if (messagesChanged || lastMessageChanged || searchStatusChanged) {
            this.scrollToBottom();
        }
    }

    // 修改处理全选的方法
    handleSelectAll = (e) => {
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
        this.updateRagConfig({ 
            db_types: checked ? allValues : [] 
        });
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

    // 添加消息格式转换函数
    formatMessage = (message) => {
        if (message.type === 'user') {
            return {
                role: 'user',
                content: message.content,
                isCurrentMessage: false
            };
        } else {
            return {
                role: 'assistant',
                content: message.content,
                isCurrentMessage: false
            };
        }
    };

    handleSend = async (content) => {
        if (!content?.trim()) return;

        // 创建新的 abortController
        this.abortController = new AbortController();

        // 先添加用户消息
        const userMessage = {
            role: 'user',
            content: content,
            isCurrentMessage: false
        };

        this.setState(prevState => ({
            messages: [...prevState.messages, userMessage],
            streaming: true  // 设置 streaming 状态
        }));

        try {
            const inputs = {
                db_types: this.state.ragConfig.db_types,
                vector_query: this.state.ragConfig.vectorQuery,
                scalar_query: this.state.ragConfig.scalarQuery
            };

            await sendMessageToAssistant(
                {
                    query: content,
                    inputs,
                    files: [],
                    conversationId: this.state.conversationId,
                    abortController: this.abortController,
                    agentType: 'data-analysis'
                },
                {
                    setMessages: (messages) => {
                        if (typeof messages === 'function') {
                            this.setState(prevState => {
                                const newMessages = messages(prevState.messages);
                                return { messages: newMessages };
                            });
                        } else if (Array.isArray(messages)) {
                            this.setState({ messages });
                        }
                    },
                    setIsStreaming: (streaming) => this.setState({ streaming }),
                    getStandardTime: () => new Date().toLocaleTimeString(),
                    setTaskId: (taskId) => this.setState({ taskId }),
                    setConversationId: (conversationId) => this.setState({ conversationId })
                }
            );
        } catch (error) {
            console.error('Failed to send message:', error);
            message.error('发送消息失败');
        } finally {
            this.setState({ streaming: false });
            this.abortController = null;
        }
    };

    handleInterrupt = async () => {
        const { taskId } = this.state;
        if (taskId) {
            try {
                await stopMessageGeneration(taskId, 'data-analysis');
                this.setState({ streaming: false });
            } catch (error) {
                console.error('Failed to stop generation:', error);
            }
        }
    };

    loadHistoryMessages = async (conversationId) => {
        try {
            const response = await getConversationMessages(conversationId, 'data-analysis');
            if (response?.data) {
                // 确保消息格式正确
                const formattedMessages = response.data.map(msg => this.formatMessage(msg));
                this.setState({
                    messages: formattedMessages,
                    conversationId
                });
            }
        } catch (error) {
            console.error('Failed to load history messages:', error);
            message.error('加载历史消息失败');
        }
    };

    loadHistoryConversations = async () => {
        try {
            const response = await getHistoryConversations('data-analysis');
            return response?.data || [];
        } catch (error) {
            console.error('Failed to load history conversations:', error);
            message.error('加载历史会话失败');
            return [];
        }
    };

    handleRenameConversation = async (conversationId, name) => {
        try {
            await renameConversation(conversationId, name, 'data-analysis');
            return true;
        } catch (error) {
            console.error('Failed to rename conversation:', error);
            message.error('重命名会话失败');
            return false;
        }
    };

    render() {
        const { messages, streaming, ragConfig, isHistoryLoading } = this.state;
        const allSelected = (ragConfig.db_types || []).length === DB_OPTIONS.length;
        
        return (
            <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 128px)', 
                padding: '0px',
                background: '#f5f5f5'
            }}>
                <div style={{
                    flex: 1,
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #e8e8e8',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <BaseChatHeader 
                        icon="database"
                        title="知识库问答"
                        description="基于文档的智能问答系统"
                        iconBgColor="#e6f4ff"
                        iconColor="#1890ff"
                        onNewChat={() => {
                            this.setState({ 
                                messages: [],
                                conversationId: null,
                                question: "",
                                ragConfig: {
                                    ...this.state.ragConfig,
                                    enabled: false,
                                    db_types: []
                                }
                            });
                        }}
                        onViewHistory={() => {
                            this.setState({ isHistoryLoading: true });
                            setTimeout(() => {
                                this.setState({ isHistoryLoading: false });
                            }, 1000);
                        }}
                        isHistoryLoading={isHistoryLoading}
                    />

                    <div style={{
                        flex: 1,
                        display: 'flex',
                        overflow: 'hidden'
                    }}>
                        <ResizableBox
                            width={400}
                            axis="x"
                            resizeHandles={['e']}
                            style={{ 
                                borderRight: '1px solid #e8e8e8',
                                height: '100%'
                            }}
                        >
                            <div style={{ 
                                height: '100%',
                                padding: '5px',
                                overflow: 'auto'
                            }}>
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

                                <Card title="RAG配置">
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
                                            onChange={value => this.updateRagConfig({ db_types: value })}
                                            allowClear
                                        >
                                            {DB_OPTIONS.map(db => (
                                                <Option key={db.value} value={db.value}>{db.label}</Option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ marginBottom: '5px' }}>矢量搜索</div>
                                        <Input
                                            placeholder="输入自然语言描述，用于语义相似度搜索"
                                            value={ragConfig.vectorQuery}
                                            onChange={(event) => {
                                                if (event && event.target) {
                                                    this.updateRagConfig({ 
                                                        vectorQuery: event.target.value 
                                                    });
                                                }
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ marginBottom: '5px' }}>标量搜索</div>
                                        <Input
                                            placeholder="输入关键词，用于精确/模糊匹配搜索"
                                            value={ragConfig.scalarQuery}
                                            onChange={(event) => {
                                                if (event && event.target) {
                                                    this.updateRagConfig({ 
                                                        scalarQuery: event.target.value 
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                </Card>
                            </div>
                        </ResizableBox>

                        <div style={{ 
                            flex: 1,
                            height: '100%',
                            margin: '5px 0 0 0',  // 改为 5px
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#F8FBFF',
                            borderTopRightRadius: '8px'
                        }}>
                            <div style={{
                                flex: 1,
                                overflow: 'auto',
                                padding: '0 15px'
                            }}>
                                {Array.isArray(messages) && messages.map((msg, index) => (
                                    <div key={index} style={{
                                        marginBottom: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                    }}>
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#999',
                                            marginBottom: '4px'
                                        }}>
                                            {msg.time}
                                        </div>
                                        
                                        <div style={{
                                            maxWidth: '80%',
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            backgroundColor: msg.role === 'user' ? '#73f0be' : '#f9f9f9',
                                            color: '#000',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                            border: '1px solid #e0e0e0'
                                        }}>
                                            {msg.role === 'user' ? (
                                                <div>{msg.content}</div>
                                            ) : (
                                                <MarkdownRenderer 
                                                    content={msg.content}
                                                    isStreaming={streaming && index === messages.length - 1}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={this.messagesEndRef} />
                            </div>
                            <BaseChatFooter 
                                value={this.state.question}
                                onChange={(e) => this.setState({ question: e.target.value })}
                                onSend={() => {
                                    const content = this.state.question.trim();
                                    if (content) {
                                        this.handleSend(content);
                                        this.setState({ question: '' });
                                    }
                                }}
                                disabled={streaming}
                                isStreaming={streaming}
                                onInterrupt={this.handleInterrupt}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}