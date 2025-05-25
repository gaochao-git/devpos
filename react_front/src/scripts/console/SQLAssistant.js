import React, { Component } from 'react';
import { Input, Button, Card, List, message, Tag, Select, Typography, Spin, Icon, Drawer, Timeline, Checkbox, Popover, Pagination } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const { TextArea } = Input;
const { Option } = Select;
const { Text, Paragraph } = Typography;

// 共享的 Markdown 样式配置
const markdownComponents = {
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeContent = String(children).replace(/\n$/, '');
    
    if (!inline && codeContent) {
      const lineCount = codeContent.split('\n').length;
      const maxHeight = lineCount > 10 ? '220px' : 'auto';
      
      return (
        <div style={{ margin: '8px 0' }}>
          <div style={{ 
            backgroundColor: '#f6f8fa', 
            border: '1px solid #e1e4e8',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            {language && (
              <div style={{ 
                backgroundColor: '#f1f3f4', 
                padding: '4px 8px', 
                fontSize: '12px',
                color: '#666',
                borderBottom: '1px solid #e1e4e8'
              }}>
                {language}
              </div>
            )}
            
            <pre style={{ 
              margin: 0, 
              padding: '12px',
              backgroundColor: '#fff',
              fontSize: '14px',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              overflow: lineCount > 10 ? 'auto' : 'visible',
              maxHeight: maxHeight,
              lineHeight: '1.5',
              whiteSpace: 'pre',
              overflowX: 'auto',
              width: '100%'
            }}>
              <code
                className={className}
                style={{
                  display: 'block',
                  padding: 0,
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  color: language === 'sql' ? '#0000ff' : 'inherit',
                }}
                {...props}
              >
                {children}
              </code>
            </pre>
          </div>
          
          <div style={{ marginTop: '4px' }}>
            <Button 
              size="small" 
              onClick={() => props.onCopySQL && props.onCopySQL(`\`\`\`${language}\n${codeContent}\n\`\`\``)}
              style={{ marginRight: '8px' }}
              icon="copy"
            >
              复制
            </Button>
            {language === 'sql' && props.onApplySQL && (
              <>
                <Button 
                  size="small" 
                  type="primary"
                  onClick={() => props.onApplySQL(`\`\`\`${language}\n${codeContent}\n\`\`\``, false)}
                  style={{ marginRight: '8px' }}
                  icon="arrow-right"
                >
                  应用到编辑器
                </Button>
                <Button 
                  size="small"
                  type="primary"
                  danger
                  onClick={() => props.onApplySQL(`\`\`\`${language}\n${codeContent}\n\`\`\``, true)}
                  icon="play-circle"
                >
                  应用并执行
                </Button>
              </>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <code 
        style={{ 
          backgroundColor: '#f1f3f4',
          padding: '2px 4px',
          borderRadius: '3px',
          fontSize: '85%',
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  
  table: ({ children, ...props }) => (
    <div style={{ overflow: 'auto', margin: '8px 0', maxHeight: '400px' }}>
      <table 
        style={{ 
          borderCollapse: 'collapse',
          width: '100%',
          border: '1px solid #e1e4e8',
          fontSize: '14px'
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  
  th: ({ children, ...props }) => (
    <th 
      style={{ 
        backgroundColor: '#f6f8fa',
        border: '1px solid #e1e4e8',
        padding: '8px 12px',
        textAlign: 'left',
        fontWeight: 'bold',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}
      {...props}
    >
      {children}
    </th>
  ),
  
  td: ({ children, ...props }) => (
    <td 
      style={{ 
        border: '1px solid #e1e4e8',
        padding: '8px 12px',
        maxWidth: '200px',
        wordBreak: 'break-word'
      }}
      {...props}
    >
      {children}
    </td>
  ),
  
  ul: ({ children, ...props }) => (
    <ul style={{ marginLeft: '20px', marginBottom: '8px' }} {...props}>
      {children}
    </ul>
  ),
  
  ol: ({ children, ...props }) => (
    <ol style={{ marginLeft: '20px', marginBottom: '8px' }} {...props}>
      {children}
    </ol>
  ),
  
  a: ({ children, ...props }) => (
    <a 
      style={{ color: '#1890ff', textDecoration: 'underline' }}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  
  blockquote: ({ children, ...props }) => (
    <blockquote 
      style={{ 
        borderLeft: '4px solid #dfe2e5',
        paddingLeft: '16px',
        margin: '8px 0',
        color: '#6a737d',
        fontStyle: 'italic'
      }}
      {...props}
    >
      {children}
    </blockquote>
  ),
  
  h1: ({ children, ...props }) => (
    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '16px 0 8px 0' }} {...props}>
      {children}
    </h1>
  ),
  
  h2: ({ children, ...props }) => (
    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '14px 0 6px 0' }} {...props}>
      {children}
    </h2>
  ),
  
  h3: ({ children, ...props }) => (
    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '12px 0 4px 0' }} {...props}>
      {children}
    </h3>
  ),
  
  p: ({ children, ...props }) => (
    <p style={{ margin: '4px 0', lineHeight: '1.5' }} {...props}>
      {children}
    </p>
  )
};

// 优化的消息项组件
const MessageItem = React.memo(({ item, onCopySQL, onApplySQL }) => {
  return (
    <List.Item style={{ padding: '8px 0', border: 'none' }}>
      <Card 
        size="small" 
        style={{ 
          width: '100%',
          backgroundColor: item.type === 'user' ? '#e6f7ff' : '#f6ffed',
          border: item.type === 'user' ? '1px solid #91d5ff' : '1px solid #b7eb8f',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <Text strong style={{ color: item.type === 'user' ? '#1890ff' : '#52c41a' }}>
            <Icon type={item.type === 'user' ? 'user' : 'robot'} style={{ marginRight: '4px' }} />
            {item.type === 'user' ? '你' : 'SQL助手'}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {item.timestamp.toLocaleTimeString()}
          </Text>
        </div>
        {item.type === 'user' ? (
          <>
            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {item.content}
            </Paragraph>
            {item.contextInfo && (
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px', color: '#888' }}>
                <Icon type="info-circle" style={{ marginRight: '4px' }} />
                系统自动添加上下文：{item.contextInfo}
              </Text>
            )}
          </>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            skipHtml={false}
            components={{
              ...markdownComponents,
              code: (props) => markdownComponents.code({ ...props, onCopySQL, onApplySQL })
            }}
          >
            {item.content}
          </ReactMarkdown>
        )}
      </Card>
    </List.Item>
  );
});

// 流式消息组件
const StreamingMessage = React.memo(({ currentMessage, isComplete = false, onCopySQL, onApplySQL }) => {
  return (
    <List.Item style={{ padding: '8px 0', border: 'none' }}>
      <Card 
        size="small" 
        style={{ 
          width: '100%', 
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <Text strong style={{ color: '#52c41a' }}>
            <Icon type="robot" style={{ marginRight: '4px' }} />
            SQL助手
          </Text>
          {!isComplete && <Spin size="small" />}
        </div>
        {currentMessage ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            skipHtml={false}
            components={{
              ...markdownComponents,
              code: (props) => markdownComponents.code({ ...props, onCopySQL, onApplySQL })
            }}
          >
            {currentMessage}
          </ReactMarkdown>
        ) : (
          <div style={{ color: '#999', fontStyle: 'italic' }}>
            正在思考中...
          </div>
        )}
      </Card>
    </List.Item>
  );
});

class SQLAssistant extends Component {
  constructor(props) {
    super(props);
    this.nlInputRef = React.createRef();
    this.state = {
      inputValue: '',
      conversationHistory: [],
      isStreaming: false,
      currentStreamingMessage: '',
      selectedTables: props.selectedTables || [],
      allTables: props.allTables || [],
      showTableSelector: false,
      searchTableValue: '',
      streamingId: null,
      conversation_id: null,
      streamingComplete: false,
      isUserBrowsing: false,
      isUserScrolling: false,
      historicalConversations: [],
      isHistoryDrawerVisible: false,
      isLoadingHistory: false,
      hasMoreConversations: false,
      selectedConversation: null,
      lastConversationId: null,
      tablePageSize: 20, // 每页显示的表数量
      currentTablePage: 1, // 当前页码
      searchTimeout: null,
      isSearching: false,
      isSelectingAll: false,
      instance: props.defaultInstance || '',
      database: props.defaultDatabase || '',
      cluster: props.defaultCluster || '',
      dify_url: props.defaultDifyUrl || '',
      dify_sql_asst_key: props.defaultDifyKey || '',
      login_user_name: props.defaultUser || '',
    };
    
    this.inputRef = React.createRef();
    this.chatContainerRef = React.createRef();
    
    // 优化的节流函数实现
    this.throttledScrollToBottom = this.throttle(() => {
      if (this.chatContainerRef.current) {
        requestAnimationFrame(() => {
          const { scrollHeight, clientHeight } = this.chatContainerRef.current;
          this.chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
        });
      }
    }, 300);
    
    this.throttledUpdateStreamingMessage = this.throttle((message) => {
      this.setState({ currentStreamingMessage: message });
    }, 200);

    this.throttledScrollCheck = this.throttle(() => {
      if (this.chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = this.chatContainerRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        
        if (isAtBottom && this.state.isUserScrolling) {
          this.setState({ isUserScrolling: false });
        }
        else if (!isAtBottom && !this.state.isUserBrowsing && !this.state.isUserScrolling) {
          this.setState({ isUserScrolling: true });
        }
      }
    }, 100);
  }

  // 优化的节流函数
  throttle = (func, wait) => {
    let timeout = null;
    let previous = 0;
    
    return (...args) => {
      const now = Date.now();
      const remaining = wait - (now - previous);
      
      const later = () => {
        previous = now;
        timeout = null;
        func.apply(this, args);
      };
      
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        func.apply(this, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      
      return () => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
          previous = 0;
        }
      };
    };
  };

  componentDidUpdate(prevProps, prevState) {
    // 更新表格选择
    if (this.props.allTables !== prevProps.allTables) {
      this.setState({ allTables: this.props.allTables || [] });
    }
   
    
    // 智能滚动逻辑
    const shouldAutoScroll = 
      (prevState.conversationHistory.length !== this.state.conversationHistory.length) ||
      (this.state.isStreaming && prevState.currentStreamingMessage !== this.state.currentStreamingMessage);
    
    if (shouldAutoScroll && !this.state.isUserBrowsing && !this.state.isUserScrolling) {
      requestAnimationFrame(this.throttledScrollToBottom);
    }
  }

  // 发送消息并处理流式响应
  handleSendMessage = async () => {
    const { inputValue, instance, database, selectedTables, conversation_id, dify_url, dify_sql_asst_key, login_user_name } = this.state;
    
    if (!inputValue.trim()) {
      message.warning('请输入问题');
      return;
    }

    if (!instance || !database) {
      message.warning('请先选择实例和数据库');
      return;
    }

    // 将实例名、数据库名和表名与用户问题拼接为一个完整的查询
    const tables = selectedTables.length > 0 ? `，表名: ${selectedTables.join(', ')}` : '';
    const completeQuery = `实例: ${instance}, 数据库: ${database}${tables}。问题: ${inputValue}`;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      contextInfo: `实例: ${instance}, 数据库: ${database}${tables ? tables : ''}`,
      timestamp: new Date()
    };

    this.setState({
      conversationHistory: [...this.state.conversationHistory, userMessage],
      inputValue: '',
      isStreaming: true,
      currentStreamingMessage: '',
      streamingId: Date.now() + 1,
      streamingComplete: false,
      isUserScrolling: false
    });

    try {
      const response = await fetch(`${dify_url}/v1/chat-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dify_sql_asst_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        inputs:{},
          query: completeQuery, // 使用拼接后的完整查询
          response_mode: 'streaming',
          conversation_id,
          user: login_user_name,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let newConversationId = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done || !this.state.isStreaming) break;

          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') break;
                
                const data = JSON.parse(dataStr);
                if (['message', 'agent_message'].includes(data.event)) {
                  assistantMessage += data.answer;
                  this.throttledUpdateStreamingMessage(assistantMessage);
                } else if (data.event === 'message_end') {
                  newConversationId = data.conversation_id;
                }
              } catch (e) {
                console.warn('解析流式数据失败:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (this.state.isStreaming) {
        this.setState({
          conversationHistory: [
            ...this.state.conversationHistory,
            {
              id: this.state.streamingId,
              type: 'assistant',
              content: assistantMessage,
              timestamp: new Date()
            }
          ],
          isStreaming: false,
          currentStreamingMessage: '',
          streamingId: null,
          conversation_id: newConversationId || this.state.conversation_id,
          streamingComplete: true
        });
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      message.error(`发送消息失败: ${error.message}`);
      this.setState({
        isStreaming: false,
        currentStreamingMessage: '',
        streamingId: null,
        streamingComplete: true
      });
    }
  };

  handleStopStreaming = () => {
    this.setState({
      isStreaming: false,
      currentStreamingMessage: '',
      streamingId: null,
      streamingComplete: true,
      isUserScrolling: false
    });
  };

  handleClearHistory = () => {
    this.setState({
      conversationHistory: [],
      conversation_id: null,
      isUserBrowsing: false,
      isUserScrolling: false,
      historicalConversations: [],
      isHistoryDrawerVisible: false,
      isLoadingHistory: false,
      hasMoreConversations: false,
      selectedConversation: null,
      lastConversationId: null
    });
  };

  handleCopySQL = (content) => {
    const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
    if (sqlMatch) {
      navigator.clipboard.writeText(sqlMatch[1]);
      message.success('SQL已复制到剪贴板');
    } else {
      navigator.clipboard.writeText(content);
      message.success('内容已复制到剪贴板');
    }
  };

  handleApplySQL = (content, execute = false) => {
    const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
    if (sqlMatch && this.props.onApplySQL) {
      this.props.onApplySQL(sqlMatch[1], execute);
      message.success(execute ? 'SQL已应用到编辑器并执行' : 'SQL已应用到编辑器');
    }
  };

  handleMouseEnterChat = () => {
    this.setState({ isUserBrowsing: true });
  };

  handleMouseLeaveChat = () => {
    this.setState({ isUserBrowsing: false });
    if (!this.state.isUserScrolling) {
      requestAnimationFrame(this.throttledScrollToBottom);
    }
  };

  componentWillUnmount() {
    // 清理所有节流函数
    [
      this.throttledScrollToBottom,
      this.throttledUpdateStreamingMessage,
      this.throttledScrollCheck
    ].forEach(fn => fn && fn.cancel && fn.cancel());
  }

  fetchConversationHistory = async () => {
    const { lastConversationId, dify_url, dify_sql_asst_key, login_user_name } = this.state;
    this.setState({ isLoadingHistory: true });
    try {
      const response = await fetch(`${dify_url}/v1/conversations?user=${login_user_name}&last_id=${lastConversationId || ''}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${dify_sql_asst_key}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.setState(prevState => ({
        historicalConversations: [...prevState.historicalConversations, ...data.data],
        hasMoreConversations: data.has_more,
        lastConversationId: data.data.length > 0 ? data.data[data.data.length - 1].id : null
      }));
    } catch (error) {
      message.error('获取历史会话失败');
      console.error('获取历史会话失败:', error);
    } finally {
      this.setState({ isLoadingHistory: false });
    }
  };

  fetchConversationMessages = async (conversationId) => {
    const { dify_url, dify_sql_asst_key, login_user_name } = this.state;
    try {
      const response = await fetch(`${dify_url}/v1/messages?user=${login_user_name}&conversation_id=${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${dify_sql_asst_key}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const messages = [];
      
      // Process each message and create both user and assistant entries
      data.data.forEach(msg => {
        if (msg.query) {
          messages.push({
            id: `${msg.id}-query`,
            type: 'user',
            content: msg.query,
            timestamp: new Date(msg.created_at * 1000)
          });
        }
        if (msg.answer) {
          messages.push({
            id: `${msg.id}-answer`,
            type: 'assistant',
            content: msg.answer,
            timestamp: new Date(msg.created_at * 1000)
          });
        }
      });

      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);

      this.setState({
        conversationHistory: messages,
        conversation_id: conversationId,
        isHistoryDrawerVisible: false,
        selectedConversation: conversationId
      });
    } catch (error) {
      message.error('获取会话消息失败');
      console.error('获取会话消息失败:', error);
    }
  };

  toggleHistoryDrawer = () => {
    const { isHistoryDrawerVisible } = this.state;
    this.setState({ 
      isHistoryDrawerVisible: !isHistoryDrawerVisible 
    }, () => {
      if (!isHistoryDrawerVisible && this.state.historicalConversations.length === 0) {
        this.fetchConversationHistory();
      }
    });
  };

  loadMoreHistory = () => {
    if (!this.state.isLoadingHistory && this.state.hasMoreConversations) {
      this.fetchConversationHistory();
    }
  };

  handleTableSelect = (table) => {
    this.setState(prevState => ({
      selectedTables: prevState.selectedTables.includes(table) 
        ? prevState.selectedTables.filter(t => t !== table)
        : [...prevState.selectedTables, table]
    }));
  };

  // 优化的表格搜索方法
  handleSearchTable = (value) => {
    // 清除之前的定时器
    if (this.state.searchTimeout) {
      clearTimeout(this.state.searchTimeout);
    }

    // 设置搜索状态
    this.setState({ 
      searchTableValue: value,
      isSearching: true 
    });

    // 使用防抖进行搜索
    const timeout = setTimeout(() => {
      this.setState({ 
        currentTablePage: 1,
        isSearching: false 
      });
    }, 300);

    this.setState({ searchTimeout: timeout });
  };

  // 处理虚拟列表滚动到底部
  handleTableListScroll = (e) => {
    if (e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight) {
      this.setState(prevState => ({
        currentTablePage: prevState.currentTablePage + 1
      }));
    }
  };

  handleClearAllTables = () => {
    this.setState({ selectedTables: [] });
  };

  // 添加全选/取消全选方法
  handleSelectAllTables = () => {
    const { allTables, selectedTables, searchTableValue } = this.state;
    
    // 获取当前过滤后的表
    const filteredTables = allTables.filter(table => 
      table.toLowerCase().includes(searchTableValue.toLowerCase())
    );
    
    // 检查是否所有过滤后的表都已被选中
    const isAllSelected = filteredTables.every(table => 
      selectedTables.includes(table)
    );

    if (isAllSelected) {
      // 如果全部已选，则取消选择过滤后的表
      this.setState(prevState => ({
        selectedTables: prevState.selectedTables.filter(table => 
          !filteredTables.includes(table)
        )
      }));
    } else {
      // 如果未全选，则添加未选择的表
      this.setState(prevState => ({
        selectedTables: [...new Set([
          ...prevState.selectedTables,
          ...filteredTables
        ])]
      }));
    }
  };

  // 处理分页变化
  handleTablePageChange = (page) => {
    this.setState({ currentTablePage: page });
  };

  render() {
    const { 
      inputValue, 
      conversationHistory, 
      isStreaming, 
      currentStreamingMessage,
      selectedTables,
      allTables,
      showTableSelector,
      searchTableValue,
      instance,
      database,
      cluster,
      streamingComplete,
      isHistoryDrawerVisible,
      historicalConversations,
      isLoadingHistory,
      hasMoreConversations,
      selectedConversation,
      tablePageSize,
      currentTablePage,
      isSearching
    } = this.state;

    // 获取过滤后的表格
    const filteredTables = allTables.filter(table => 
      table.toLowerCase().includes(searchTableValue.toLowerCase())
    );

    // 检查当前过滤后的表是否全部选中
    const isAllSelected = filteredTables.length > 0 && 
      filteredTables.every(table => selectedTables.includes(table));

    // 修改分页数据的计算逻辑
    const startIndex = (currentTablePage - 1) * tablePageSize;
    const paginatedTables = filteredTables.slice(startIndex, startIndex + tablePageSize);

    const tableSelector = (
      <div style={{ width: '300px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '16px', 
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <Input.Search
            placeholder="搜索表名"
            value={searchTableValue}
            onChange={e => this.handleSearchTable(e.target.value)}
            style={{ width: 'calc(100% - 180px)' }}
            size="small"
            loading={isSearching}
          />
          <Button 
            size="small" 
            onClick={this.handleSelectAllTables}
            style={{ height: '24px', lineHeight: '22px', width: '80px' }}
            type={isAllSelected ? 'primary' : 'default'}
          >
            {isAllSelected ? '取消全选' : '全选'}
          </Button>
          <Button 
            size="small" 
            onClick={this.handleClearAllTables}
            disabled={selectedTables.length === 0}
            style={{ height: '24px', lineHeight: '22px', width: '80px' }}
          >
            清空选择
          </Button>
        </div>
        <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
          {`当前选中 ${selectedTables.length} 个表${searchTableValue ? `，过滤显示 ${filteredTables.length} 个表` : ''}`}
        </div>
        <div style={{ height: '400px', overflow: 'hidden' }}>
          
              <List
                dataSource={paginatedTables}
                renderItem={(table) => (
                  <List.Item
                    onClick={() => this.handleTableSelect(table)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedTables.includes(table) ? '#e6f7ff' : 'transparent',
                      padding: '8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Checkbox checked={selectedTables.includes(table)} style={{ marginRight: '8px' }} />
                    {table}
                  </List.Item>
                )}
                style={{ maxHeight: 340, overflow: 'auto' }}
              />
              <div style={{ 
                padding: '8px', 
                textAlign: 'center',
                borderTop: '1px solid #f0f0f0'
              }}>
                <Pagination
                  size="small"
                  current={currentTablePage}
                  pageSize={tablePageSize}
                  total={filteredTables.length}
                  onChange={this.handleTablePageChange}
                  showSizeChanger={false}
                  showQuickJumper
                />
              </div>
        </div>
      </div>
    );

    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          marginBottom: '8px', 
          gap: '8px' 
        }}>
          <Button 
            size="small" 
            onClick={this.toggleHistoryDrawer}
            icon="history"
          >
            历史会话
          </Button>
          <Button 
            size="small" 
            onClick={this.handleClearHistory}
            icon="plus"
          >
            新建会话
          </Button>
        </div>

        <div style={{ 
          position: 'relative', 
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div 
            ref={this.chatContainerRef}
            onMouseEnter={this.handleMouseEnterChat}
            onMouseLeave={this.handleMouseLeaveChat}
            onScroll={this.throttledScrollCheck}
            style={{ 
              flex: 1,
              overflow: 'auto',
              marginBottom: '8px',
              padding: '0 4px',
              backgroundColor: '#fafafa',
              borderRadius: '4px',
              border: '1px solid #f0f0f0',
              cursor: 'default'
            }}
          >
            {conversationHistory.length === 0 && !isStreaming && (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: '#999',
                fontSize: '14px'
              }}>
                <Icon type="message" style={{ fontSize: '24px', marginBottom: '8px' }} />
                <div>开始你的SQL查询对话吧！</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  例如：查询最近一周新增的用户数量
                </div>
              </div>
            )}
            
            <List
              dataSource={conversationHistory}
              renderItem={(item) => (
                <MessageItem 
                  key={item.id} 
                  item={item} 
                  onCopySQL={this.handleCopySQL} 
                  onApplySQL={this.handleApplySQL} 
                />
              )}
            />
            
            {isStreaming && (
              <StreamingMessage 
                currentMessage={currentStreamingMessage} 
                isComplete={streamingComplete} 
                onCopySQL={this.handleCopySQL}
                onApplySQL={this.handleApplySQL}
              />
            )}
          </div>

          {(this.state.isUserBrowsing || this.state.isUserScrolling) && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 10
            }}>
              {this.state.isUserBrowsing && (
                <div style={{
                  backgroundColor: 'rgba(24, 144, 255, 0.9)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginBottom: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <Icon type="eye" style={{ marginRight: '4px' }} />
                  浏览模式 - 自动滚动已暂停
                </div>
              )}
              
              <Button
                size="small"
                type="primary"
                shape="circle"
                icon="down"
                onClick={() => {
                  this.setState({ 
                    isUserScrolling: false, 
                    isUserBrowsing: false 
                  }, this.throttledScrollToBottom);
                }}
                style={{
                  backgroundColor: '#52c41a',
                  borderColor: '#52c41a',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  display: 'block',
                  margin: '0 auto'
                }}
                title="滚动到底部并恢复自动滚动"
              />
            </div>
          )}
        </div>

        <Drawer
          title="历史会话"
          placement="right"
          closable={true}
          onClose={this.toggleHistoryDrawer}
          visible={isHistoryDrawerVisible}
          width={320}
        >
          <List
            dataSource={historicalConversations}
            loading={isLoadingHistory}
            renderItem={item => (
              <List.Item
                key={item.id}
                onClick={() => this.fetchConversationMessages(item.id)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedConversation === item.id ? '#e6f7ff' : 'transparent',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '4px'
                }}
              >
                <List.Item.Meta
                  avatar={<Icon type="message" />}
                  title={item.name || '未命名会话'}
                  description={new Date(item.created_at * 1000).toLocaleString()}
                />
              </List.Item>
            )}
            loadMore={
              hasMoreConversations && (
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <Button onClick={this.loadMoreHistory} loading={isLoadingHistory}>
                    加载更多
                  </Button>
                </div>
              )
            }
          />
        </Drawer>

        <div style={{
          flexShrink: 0,
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          padding: '8px',
          backgroundColor: '#fff',
          marginTop: 'auto'
        }}>
          <div style={{ 
            marginBottom: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px' 
          }}>
            <Popover
              content={tableSelector}
              title="选择表"
              trigger="click"
              visible={showTableSelector}
              onVisibleChange={visible => this.setState({ showTableSelector: visible })}
              placement="topLeft"
              overlayStyle={{ width: '320px' }}
            >
              <Button 
                size="small" 
                icon="plus" 
                style={{ marginRight: '8px', flexShrink: 0 }}
              >
                选择表
              </Button>
            </Popover>
            <div style={{ 
              flex: 1, 
              overflow: 'auto', 
              whiteSpace: 'nowrap', 
              paddingBottom: '4px',
              maxHeight: '64px',
              display: 'flex',
              flexWrap: 'wrap',
              alignContent: 'flex-start'
            }}>
              {selectedTables.map(table => (
                <Tag
                  key={table}
                  closable
                  onClose={(e) => {
                    e.preventDefault();
                    this.handleTableSelect(table);
                  }}
                  style={{ margin: '2px', flexShrink: 0 }}
                >
                  {table}
                </Tag>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <TextArea
                ref={this.inputRef}
                value={inputValue}
                onChange={(e) => this.setState({ inputValue: e.target.value })}
                placeholder="请直接输入您的问题，系统会自动添加数据库和表的上下文信息"
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ 
                  border: 'none',
                  boxShadow: 'none',
                  resize: 'none',
                  padding: 0
                }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                  }
                }}
                disabled={isStreaming}
              />
            </div>
            
            {isStreaming ? (
              <Button 
                danger
                onClick={this.handleStopStreaming}
                icon="pause-circle"
                style={{ 
                  height: '32px',
                  minWidth: '80px'
                }}
              >
                停止
              </Button>
            ) : (
              <Button 
                type="primary" 
                onClick={this.handleSendMessage}
                icon="send"
                style={{ 
                  height: '32px',
                  minWidth: '80px'
                }}
              >
                发送
              </Button>
            )}
          </div>
          
          <div style={{ 
            marginTop: '8px', 
            fontSize: '12px', 
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}>
            <div style={{ color: '#999' }}>
              按Enter发送，Shift+Enter换行
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default SQLAssistant; 