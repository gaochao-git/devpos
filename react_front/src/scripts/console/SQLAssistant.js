import React, { Component } from 'react';
import { Input, Button, message, Tag, Select, Typography, Icon, Drawer, List, Checkbox, Popover, Pagination } from 'antd';
import MessageRenderer from './MessageRenderer';
const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

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
      agentThoughts: [], // 添加思考过程状态
      messageSegments: [], // 添加消息段落状态
    };
    
    this.inputRef = React.createRef();
    this.messageRendererRef = React.createRef();
    
    // 优化的节流函数实现
    this.throttledScrollToBottom = this.throttle(() => {
      if (this.messageRendererRef.current) {
        this.messageRendererRef.current.scrollToBottom();
      }
    }, 300);
    
    this.throttledUpdateStreamingMessage = this.throttle((message) => {
      this.setState({ currentStreamingMessage: message });
    }, 200);
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
      isUserScrolling: false,
      agentThoughts: [], // 重置思考过程
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
      let currentThoughts = [];
      
      // 创建消息段落数组，包含文本和工具调用，按照流的顺序排列
      let messageSegments = [];
      let lastPosition = 0;
      let nextTextPosition = 0;

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
                
                // 处理不同类型的事件
                if (['message', 'agent_message'].includes(data.event)) {
                  // 如果有新的文本内容，添加到消息段落中
                  if (data.answer && data.answer.length > 0) {
                    const newText = data.answer;
                    assistantMessage += newText;
                    
                    // 检查是否需要创建或更新文本段落
                    const textSegmentIndex = messageSegments.findIndex(s => s.type === 'text');
                    
                    if (textSegmentIndex === -1) {
                      // 创建新的文本段落
                      messageSegments.push({
                        type: 'text',
                        position: nextTextPosition,
                        content: assistantMessage
                      });
                    } else {
                      // 更新现有文本段落
                      messageSegments[textSegmentIndex].content = assistantMessage;
                    }
                    
                    // 按位置排序所有段落
                    messageSegments.sort((a, b) => a.position - b.position);
                  }
                  
                  this.throttledUpdateStreamingMessage(assistantMessage);
                } else if (data.event === 'message_end') {
                  newConversationId = data.conversation_id;
                } else if (data.event === 'agent_thought') {
                  // 处理思考过程
                  const thoughtIndex = currentThoughts.findIndex(t => t.id === data.id);
                  
                  if (thoughtIndex === -1) {
                    // 新的思考
                    const newThought = {
                      id: data.id,
                      position: data.position,
                      thought: data.thought,
                      tool: data.tool,
                      tool_input: data.tool_input,
                      observation: data.observation
                    };
                    
                    currentThoughts.push(newThought);
                    
                    // 如果工具调用有完整信息，将其插入到消息段落中
                    if (newThought.tool && newThought.observation) {
                      // 按照位置顺序插入工具调用
                      messageSegments.push({
                        type: 'tool',
                        position: newThought.position,
                        data: newThought
                      });
                      
                      // 更新下一个文本位置
                      nextTextPosition = Math.max(nextTextPosition, newThought.position + 1);
                      
                      // 按位置排序所有段落
                      messageSegments.sort((a, b) => a.position - b.position);
                    }
                  } else {
                    // 更新现有思考
                    currentThoughts[thoughtIndex] = {
                      ...currentThoughts[thoughtIndex],
                      thought: data.thought || currentThoughts[thoughtIndex].thought,
                      tool: data.tool || currentThoughts[thoughtIndex].tool,
                      tool_input: data.tool_input || currentThoughts[thoughtIndex].tool_input,
                      observation: data.observation || currentThoughts[thoughtIndex].observation
                    };
                    
                    // 如果工具调用完成，更新消息段落
                    if (currentThoughts[thoughtIndex].tool && currentThoughts[thoughtIndex].observation) {
                      // 查找是否已存在该工具的段落
                      const segmentIndex = messageSegments.findIndex(s => 
                        s.type === 'tool' && s.data.id === currentThoughts[thoughtIndex].id
                      );
                      
                      if (segmentIndex === -1) {
                        // 如果不存在，添加新段落
                        messageSegments.push({
                          type: 'tool',
                          position: currentThoughts[thoughtIndex].position,
                          data: currentThoughts[thoughtIndex]
                        });
                        
                        // 更新下一个文本位置
                        nextTextPosition = Math.max(nextTextPosition, currentThoughts[thoughtIndex].position + 1);
                      } else {
                        // 如果存在，更新段落
                        messageSegments[segmentIndex].data = currentThoughts[thoughtIndex];
                      }
                      
                      // 按位置排序所有段落
                      messageSegments.sort((a, b) => a.position - b.position);
                    }
                  }
                  
                  // 按位置排序思考
                  currentThoughts.sort((a, b) => a.position - b.position);
                  
                  // 更新状态
                  this.setState({ 
                    agentThoughts: [...currentThoughts],
                    // 将排序后的消息段落传递给流式消息组件
                    messageSegments: [...messageSegments]
                  });
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
        // 保存最终消息，包括思考过程
        const finalThoughts = [...this.state.agentThoughts];
        
        this.setState({
          conversationHistory: [
            ...this.state.conversationHistory,
            {
              id: this.state.streamingId,
              type: 'assistant',
              content: assistantMessage,
              timestamp: new Date(),
              thoughts: finalThoughts, // 保存思考过程
              messageSegments: messageSegments // 保存消息段落
            }
          ],
          isStreaming: false,
          currentStreamingMessage: '',
          streamingId: null,
          conversation_id: newConversationId || this.state.conversation_id,
          streamingComplete: true,
          agentThoughts: [], // 清空思考过程
          messageSegments: [] // 清空消息段落
        });
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      message.error(`发送消息失败: ${error.message}`);
      this.setState({
        isStreaming: false,
        currentStreamingMessage: '',
        streamingId: null,
        streamingComplete: true,
        agentThoughts: [], // 清空思考过程
        messageSegments: [] // 清空消息段落
      });
    }
  };

  handleStopStreaming = () => {
    this.setState({
      isStreaming: false,
      currentStreamingMessage: '',
      streamingId: null,
      streamingComplete: true,
      isUserScrolling: false,
      agentThoughts: [], // 清空思考过程
      messageSegments: [] // 清空消息段落
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
  };

  componentWillUnmount() {
    // 清理所有节流函数
    [
      this.throttledScrollToBottom,
      this.throttledUpdateStreamingMessage
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
      isSearching,
      agentThoughts, // 添加思考过程
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

        <MessageRenderer
          ref={this.messageRendererRef}
          conversationHistory={conversationHistory}
          isStreaming={isStreaming}
          currentStreamingMessage={currentStreamingMessage}
          agentThoughts={agentThoughts}
          messageSegments={this.state.messageSegments}
          onCopySQL={this.handleCopySQL}
          onApplySQL={this.handleApplySQL}
          onMouseEnter={this.handleMouseEnterChat}
          onMouseLeave={this.handleMouseLeaveChat}
          isUserBrowsing={this.state.isUserBrowsing}
          isUserScrolling={this.state.isUserScrolling}
          onScrollToBottom={() => {
            this.setState({ 
              isUserScrolling: false, 
              isUserBrowsing: false 
            });
          }}
          shouldAutoScroll={!this.state.isUserBrowsing && !this.state.isUserScrolling}
          onScrollStateChange={(isAtBottom) => {
            if (isAtBottom && this.state.isUserScrolling) {
              this.setState({ isUserScrolling: false });
            }
            else if (!isAtBottom && !this.state.isUserBrowsing && !this.state.isUserScrolling) {
              this.setState({ isUserScrolling: true });
            }
          }}
          streamingComplete={streamingComplete}
        />

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