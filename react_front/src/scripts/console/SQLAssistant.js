import React, { Component } from 'react';
import { message } from 'antd';
import SQLAssistantUI from './SQLAssistantUI';
import MyAxios from '../common/interface';
import { throttle } from '../common/throttle';

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
      thread_id: null,
      streamingComplete: false,
      isUserBrowsing: false,
      isUserScrolling: false,
      historicalConversations: [],
      isHistoryDrawerVisible: false,
      isLoadingHistory: false,
      hasMoreConversations: false,
      selectedConversation: null,
      lastConversationId: null,
      tablePageSize: 20,
      currentTablePage: 1,
      searchTimeout: null,
      isSearching: false,
      isSelectingAll: false,
      instance: props.defaultInstance || '',
      database: props.defaultDatabase || '',
      cluster: props.defaultCluster || '',
      api_url: props.defaultApiUrl || 'http://localhost:3000',
      api_key: props.defaultApiKey || 'sk-wVfiZyuebwQf2LX3kk3u53cnIWn32',
      selected_model: props.defaultModel || 'deepseek-chat',
      assistant_id: props.assistantId || 'diagnostic_agent',
      login_user_name: props.defaultUser || '',
      agentThoughts: [],
      showDatasetManager: false,
      showUnifiedSelector: false,
      selectedCategory: 'tables',
      datasets: [],
      loadingDatasets: false,
      datasetSearchKeyword: '',
      selectedDataset: null,
      useDatasetContext: false,
      previewDataset: null,
      showDatasetPreview: false,
      showSharedDatasets: true,
      showOwnDatasets: true,
      currentRunId: null,
    };
    
    this.inputRef = React.createRef();
    this.messageRendererRef = React.createRef();
    
    // 流式消息更新节流
    this.throttledUpdateStreamingMessage = throttle((message) => {
      this.setState({ currentStreamingMessage: message });
    }, 20);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.allTables !== prevProps.allTables) {
      this.setState({ allTables: this.props.allTables || [] });
    }
  }

  // 创建新的会话线程
  createThread = async () => {
    const { api_url, api_key } = this.state;
    const response = await fetch(`${api_url}/api/chat/threads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (!response.ok) {
      throw new Error(`创建会话失败: ${response.status}`);
    }
    
    const threadData = await response.json();
    return threadData.thread_id;
  };

  // 发送消息到 LangGraph API
  sendMessage = async (threadId, completeQuery) => {
    const { api_url, api_key, selected_model, assistant_id } = this.state;
    
    const response = await fetch(`${api_url}/api/chat/threads/${threadId}/runs/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          messages: [{
            type: 'human',
            content: completeQuery
          }]
        },
        config: {
          configurable: {
            selected_model: selected_model,
          }
        },
        stream_mode: [
          'messages-tuple',
          'updates'
        ],
        assistant_id: assistant_id,
        on_disconnect: 'cancel'
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  };

  // 简化的 SSE 流处理器
  processStreamResponse = async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    let currentEvent = null;
    let assistantMessage = '';
    const toolsMap = new Map(); // 使用 Map 避免重复
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || !this.state.isStreaming) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              const result = this.processEventData(currentEvent, data, assistantMessage, toolsMap);
              if (result.message !== undefined) {
                assistantMessage = result.message;
                this.updateStreamingDisplay(assistantMessage, toolsMap);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // 直接返回累积的消息和工具，不再额外添加工具标记
    // 因为工具标记已经在流式过程中添加到正确的位置了
    const tools = Array.from(toolsMap.values());
    
    return { assistantMessage, tools };
  };

  // 处理事件数据
  processEventData = (event, data, currentMessage, toolsMap) => {
    switch (event) {
      case 'messages':
        return this.processMessagesEvent(data, currentMessage, toolsMap);
      case 'updates':
        return this.processUpdatesEvent(data, currentMessage, toolsMap);
      default:
        return { message: currentMessage };
    }
  };

  // 处理 messages 事件
  processMessagesEvent = (data, currentMessage, toolsMap) => {
    if (!Array.isArray(data) || data.length < 2) {
      return { message: currentMessage };
    }
    
    const [messageChunk, metadata] = data;
    
    if (messageChunk.type === 'AIMessageChunk') {
      // 累积文本内容
      if (messageChunk.content) {
        currentMessage += messageChunk.content;
      }
      
      // 处理工具调用
      if (messageChunk.tool_calls && messageChunk.tool_calls.length > 0) {
        messageChunk.tool_calls.forEach(toolCall => {
          if (toolCall.name && toolCall.id) {
            // 如果是新的工具调用，添加工具标记到消息中
            if (!toolsMap.has(toolCall.id)) {
              currentMessage += `\n[TOOL:${toolCall.id}:${toolCall.name}]\n`;
            }
            
            // 使用 Map 的 set 方法自动去重
            toolsMap.set(toolCall.id, {
              id: toolCall.id,
              tool: toolCall.name,
              tool_input: JSON.stringify(toolCall.args || {}, null, 2),
              observation: null
            });
          }
        });
      }
    }
    
    return { message: currentMessage };
  };

  // 处理 updates 事件
  processUpdatesEvent = (data, currentMessage, toolsMap) => {
    if (data && typeof data === 'object') {
      Object.values(data).forEach(nodeData => {
        if (nodeData && nodeData.messages && Array.isArray(nodeData.messages)) {
          nodeData.messages.forEach(msg => {
            // 处理工具消息（工具执行结果）
            if (msg.type === 'tool' && msg.content && msg.tool_call_id) {
              const tool = toolsMap.get(msg.tool_call_id);
              if (tool) {
                tool.observation = msg.content;
              }
            }
            // 处理 AI 消息中的工具调用
            else if (msg.type === 'ai' && msg.tool_calls) {
              msg.tool_calls.forEach(toolCall => {
                if (toolCall.name && toolCall.id) {
                  const existingTool = toolsMap.get(toolCall.id);
                  if (!existingTool) {
                    toolsMap.set(toolCall.id, {
                      id: toolCall.id,
                      tool: toolCall.name,
                      tool_input: JSON.stringify(toolCall.args || {}, null, 2),
                      observation: null
                    });
                  }
                }
              });
            }
          });
        }
      });
    }
    
    return { message: currentMessage };
  };

  // 处理 values 事件 - 包含完整的消息历史
  processValuesEvent = (data, currentMessage, toolsMap) => {
    if (data && data.messages && Array.isArray(data.messages)) {
      // 找到最新的 AI 消息
      const lastAiMessage = data.messages.filter(msg => msg.type === 'ai').pop();
      
      if (lastAiMessage) {
        // 使用完整的消息内容
        currentMessage = lastAiMessage.content || currentMessage;
        
        // 处理工具调用
        if (lastAiMessage.tool_calls && lastAiMessage.tool_calls.length > 0) {
          // 清空之前的工具，使用 values 中的完整信息
          toolsMap.clear();
          
          lastAiMessage.tool_calls.forEach(toolCall => {
            if (toolCall.name && toolCall.id) {
              toolsMap.set(toolCall.id, {
                id: toolCall.id,
                tool: toolCall.name,
                tool_input: JSON.stringify(toolCall.args || {}, null, 2),
                observation: null
              });
            }
          });
        }
        
        // 查找工具执行结果
        data.messages.forEach(msg => {
          if (msg.type === 'tool' && msg.content && msg.tool_call_id) {
            const tool = toolsMap.get(msg.tool_call_id);
            if (tool) {
              tool.observation = msg.content;
            }
          }
        });
      }
    }
    
    return { message: currentMessage };
  };

  // 更新流式显示
  updateStreamingDisplay = (message, toolsMap) => {
    // 直接显示消息，工具标记已经在正确的位置了
    this.throttledUpdateStreamingMessage(message);
    
    // 更新工具状态供 UI 使用
    const tools = Array.from(toolsMap.values());
    this.setState({ agentThoughts: tools });
  };

  // 主要的发送消息方法
  handleSendMessage = async () => {
    const { inputValue, instance, database, selectedTables, thread_id, selectedDataset, useDatasetContext } = this.state;
    
    if (!inputValue.trim()) {
      message.warning('请输入问题');
      return;
    }

    if (!instance || !database) {
      message.warning('请先选择实例和数据库');
      return;
    }

    // 构建查询内容和上下文信息
    let completeQuery = '';
    let contextInfo = '';

    if (useDatasetContext && selectedDataset) {
      completeQuery = `实例: ${instance}, 数据库: ${database}, 数据集信息:\n${selectedDataset.dataset_content}\n\n用户问题: ${inputValue}`;
      contextInfo = `实例: ${instance}, 数据库: ${database}, 数据集: ${selectedDataset.dataset_name}`;
    } else {
      const tables = selectedTables.length > 0 ? `，表名: ${selectedTables.join(', ')}` : '';
      completeQuery = `实例: ${instance}, 数据库: ${database}${tables}。问题: ${inputValue}`;
      contextInfo = `实例: ${instance}, 数据库: ${database}${tables ? tables : ''}`;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      contextInfo: contextInfo,
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
      agentThoughts: [],
      currentRunId: null,
    });

    try {
      // 创建或使用现有线程
      let currentThreadId = thread_id;
      if (!currentThreadId) {
        currentThreadId = await this.createThread();
        this.setState({ thread_id: currentThreadId });
      }

      // 发送消息
      const response = await this.sendMessage(currentThreadId, completeQuery);
      
      // 处理流式响应
      const { assistantMessage, tools } = await this.processStreamResponse(response);
      
      // 保存最终消息
      if (this.state.isStreaming) {
        this.setState({
          conversationHistory: [
            ...this.state.conversationHistory,
            {
              id: this.state.streamingId,
              type: 'assistant',
              content: assistantMessage,
              timestamp: new Date(),
              thoughts: tools
            }
          ],
          isStreaming: false,
          currentStreamingMessage: '',
          streamingId: null,
          thread_id: currentThreadId,
          streamingComplete: true,
          agentThoughts: [],
          currentRunId: null
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
        agentThoughts: [],
        currentRunId: null
      });
    }
  };

  handleStopStreaming = async () => {
    const { currentStreamingMessage, streamingId, agentThoughts } = this.state;
    
    if (currentStreamingMessage.trim()) {
      const interruptedMessage = currentStreamingMessage + '\n\n---\n*[用户已打断输出]*';
      
      this.setState(prevState => ({
        conversationHistory: [
          ...prevState.conversationHistory,
          {
            id: streamingId,
            type: 'assistant',
            content: interruptedMessage,
            timestamp: new Date(),
            thoughts: [...agentThoughts],
            interrupted: true
          }
        ],
        isStreaming: false,
        currentStreamingMessage: '',
        streamingId: null,
        streamingComplete: true,
        isUserScrolling: false,
        agentThoughts: [],
        currentRunId: null
      }));
    } else {
      this.setState({
        isStreaming: false,
        currentStreamingMessage: '',
        streamingId: null,
        streamingComplete: true,
        isUserScrolling: false,
        agentThoughts: [],
        currentRunId: null
      });
    }
  };

  handleClearHistory = () => {
    this.setState({
      conversationHistory: [],
      thread_id: null,
      isUserBrowsing: false,
      isUserScrolling: false,
      historicalConversations: [],
      isHistoryDrawerVisible: false,
      isLoadingHistory: false,
      hasMoreConversations: false,
      selectedConversation: null,
      lastConversationId: null,
      selectedDataset: null,
      useDatasetContext: false,
      selectedTables: []
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
    if (this.throttledUpdateStreamingMessage && this.throttledUpdateStreamingMessage.cancel) {
      this.throttledUpdateStreamingMessage.cancel();
    }
  }

  // 其他方法保持不变...
  fetchConversationHistory = async () => {
    const { api_url, api_key, login_user_name, assistant_id } = this.state;
    this.setState({ isLoadingHistory: true });
    try {
      const response = await fetch(`${api_url}/api/chat/threads?limit=20&offset=0`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'ok' && data.data && data.data.threads) {
        this.setState({
          historicalConversations: data.data.threads.map(thread => ({
            id: thread.thread_id,
            name: thread.thread_title,
            created_at: new Date(thread.create_at).getTime() / 1000,
            message_count: thread.message_count
          })),
          hasMoreConversations: data.data.threads.length >= 20
        });
      }
    } catch (error) {
      message.error('获取历史会话失败');
      console.error('获取历史会话失败:', error);
    } finally {
      this.setState({ isLoadingHistory: false });
    }
  };

  fetchConversationMessages = async (threadId) => {
    const { api_url, api_key } = this.state;
    try {
      const response = await fetch(`${api_url}/api/chat/threads/${threadId}/history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const messages = [];
      
      // Process LangGraph history format
      if (Array.isArray(data) && data.length > 0) {
        const latestCheckpoint = data[0];
        if (latestCheckpoint.values && latestCheckpoint.values.messages) {
          // 先建立工具结果的映射
          const toolResultsMap = new Map();
          latestCheckpoint.values.messages.forEach(msg => {
            if (msg.type === 'tool' && msg.tool_call_id) {
              toolResultsMap.set(msg.tool_call_id, msg.content);
            }
          });
          
          // 用于跟踪连续的 AI 消息
          let lastAiMessageIndex = -1;
          
          latestCheckpoint.values.messages.forEach((msg, index) => {
            if (msg.type === 'human') {
              messages.push({
                id: msg.id || `msg-${index}-human`,
                type: 'user',
                content: msg.content,
                timestamp: new Date()
              });
              lastAiMessageIndex = -1; // 重置
            } else if (msg.type === 'ai') {
              // 构建消息内容，如果有工具调用，添加工具标记
              let messageContent = msg.content || '';
              const thoughts = msg.tool_calls ? msg.tool_calls.map(tc => {
                // 查找工具执行结果
                const observation = toolResultsMap.get(tc.id) || null;
                return {
                  id: tc.id,
                  tool: tc.name,
                  tool_input: JSON.stringify(tc.args || {}, null, 2),
                  observation: observation
                };
              }) : [];
              
              // 为每个工具调用添加标记到内容中
              if (msg.tool_calls && msg.tool_calls.length > 0) {
                msg.tool_calls.forEach(tc => {
                  if (tc.id && tc.name) {
                    messageContent += `\n[TOOL:${tc.id}:${tc.name}]\n`;
                  }
                });
              }
              
              console.log(`[History] AI Message ${index}:`, {
                content: messageContent,
                tool_calls: msg.tool_calls,
                thoughts: thoughts,
                lastAiMessageIndex
              });
              
              // 如果上一条也是 AI 消息，合并到上一条
              if (lastAiMessageIndex !== -1 && messages[lastAiMessageIndex]) {
                const lastMessage = messages[lastAiMessageIndex];
                // 合并内容
                lastMessage.content += '\n\n' + messageContent;
                // 合并工具调用
                if (thoughts.length > 0) {
                  lastMessage.thoughts = [...(lastMessage.thoughts || []), ...thoughts];
                }
              } else {
                // 新的 AI 消息
                messages.push({
                  id: msg.id || `msg-${index}-ai`,
                  type: 'assistant',
                  content: messageContent,
                  timestamp: new Date(),
                  thoughts: thoughts
                });
                lastAiMessageIndex = messages.length - 1;
              }
            }
          });
        }
      }

      this.setState({
        conversationHistory: messages,
        thread_id: threadId,
        isHistoryDrawerVisible: false,
        selectedConversation: { id: threadId }
      });
    } catch (error) {
      message.error('获取会话消息失败');
      console.error('获取会话消息失败:', error);
    }
  };

  toggleHistoryDrawer = () => {
    const { isHistoryDrawerVisible } = this.state;
    this.setState({ isHistoryDrawerVisible: !isHistoryDrawerVisible });
    if (!isHistoryDrawerVisible && this.state.historicalConversations.length === 0) {
      this.fetchConversationHistory();
    }
  };

  handleTableSelect = (table) => {
    if (!table || !table.table_name) return;
    
    const tableName = table.table_name;
    this.setState(prevState => {
      const isSelected = prevState.selectedTables.includes(tableName);
      let newSelectedTables;
      
      if (isSelected) {
        newSelectedTables = prevState.selectedTables.filter(t => t !== tableName);
      } else {
        if (prevState.selectedTables.length >= 10) {
          message.warning('最多只能选择10个表');
          return prevState;
        }
        newSelectedTables = [...prevState.selectedTables, tableName];
      }
      
      return { selectedTables: newSelectedTables };
    });
  };

  handleSearchTable = (value) => {
    if (this.state.searchTimeout) {
      clearTimeout(this.state.searchTimeout);
    }
    
    this.setState({ 
      searchTableValue: value,
      isSearching: true,
      currentTablePage: 1
    });
    
    const timeout = setTimeout(() => {
      this.setState({ isSearching: false });
    }, 300);
    
    this.setState({ searchTimeout: timeout });
  };

  handleCategoryChange = (category) => {
    this.setState({ selectedCategory: category });
    if (category === 'datasets' && this.state.datasets.length === 0) {
      this.loadDatasets();
    }
  };

  handleSelectAllTables = () => {
    const { allTables, searchTableValue, selectedTables } = this.state;
    const filteredTables = allTables.filter(table => 
      table.toLowerCase().includes(searchTableValue.toLowerCase())
    );
    
    const isAllSelected = filteredTables.length > 0 && 
      filteredTables.every(table => selectedTables.includes(table));
    
    if (isAllSelected) {
      const newSelectedTables = selectedTables.filter(table => 
        !filteredTables.includes(table)
      );
      this.setState({ selectedTables: newSelectedTables });
    } else {
      const tablesToAdd = filteredTables.filter(table => 
        !selectedTables.includes(table)
      );
      const newSelectedTables = [...selectedTables, ...tablesToAdd];
      if (newSelectedTables.length > 10) {
        message.warning('最多只能选择10个表');
        return;
      }
      this.setState({ selectedTables: newSelectedTables });
    }
  };

  handleClearAllTables = () => {
    this.setState({ selectedTables: [] });
  };

  handleTablePageChange = (page) => {
    this.setState({ currentTablePage: page });
  };

  loadDatasets = async () => {
    const { instance, database } = this.state;
    if (!instance || !database) return;
    
    this.setState({ loadingDatasets: true });
    try {
      const res = await MyAxios.post('/api/sql_dataset/get_datasets', {
        instance_name: instance,
        database_name: database
      });
      
      if (res.data.success) {
        this.setState({ datasets: res.data.data || [] });
      } else {
        message.error(res.data.message || '获取数据集失败');
      }
    } catch (error) {
      console.error('加载数据集失败:', error);
      message.error('加载数据集失败');
    } finally {
      this.setState({ loadingDatasets: false });
    }
  };

  handleSelectDataset = (dataset) => {
    this.setState({ 
      selectedDataset: dataset, 
      useDatasetContext: true,
      selectedTables: [],
      showUnifiedSelector: false 
    });
    message.success(`已选择数据集: ${dataset.dataset_name}`);
  };

  handlePreviewDataset = (dataset, e) => {
    e.stopPropagation();
    this.setState({ 
      previewDataset: dataset,
      showDatasetPreview: true 
    });
  };

  handleClosePreview = () => {
    this.setState({ 
      previewDataset: null,
      showDatasetPreview: false 
    });
  };

  handleGoToDatasetManager = () => {
    this.setState({ 
      showUnifiedSelector: false,
      showDatasetManager: true 
    });
  };

  loadMoreHistory = async () => {
    const { api_url, api_key, historicalConversations } = this.state;
    const offset = historicalConversations.length;
    
    this.setState({ isLoadingHistory: true });
    try {
      const response = await fetch(`${api_url}/api/chat/threads?limit=20&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'ok' && data.data && data.data.threads) {
        this.setState(prevState => ({
          historicalConversations: [
            ...prevState.historicalConversations,
            ...data.data.threads.map(thread => ({
              id: thread.thread_id,
              name: thread.thread_title,
              created_at: new Date(thread.create_at).getTime() / 1000,
              message_count: thread.message_count
            }))
          ],
          hasMoreConversations: data.data.threads.length >= 20
        }));
      }
    } catch (error) {
      message.error('加载更多会话失败');
      console.error('加载更多会话失败:', error);
    } finally {
      this.setState({ isLoadingHistory: false });
    }
  };

  render() {
    return (
      <SQLAssistantUI
        {...this.state}
        {...this.props}
        // Methods
        handleSendMessage={this.handleSendMessage}
        handleStopStreaming={this.handleStopStreaming}
        handleClearHistory={this.handleClearHistory}
        handleCopySQL={this.handleCopySQL}
        handleApplySQL={this.handleApplySQL}
        handleMouseEnterChat={this.handleMouseEnterChat}
        handleMouseLeaveChat={this.handleMouseLeaveChat}
        toggleHistoryDrawer={this.toggleHistoryDrawer}
        fetchConversationMessages={this.fetchConversationMessages}
        handleTableSelect={this.handleTableSelect}
        handleSearchTable={this.handleSearchTable}
        handleCategoryChange={this.handleCategoryChange}
        handleSelectAllTables={this.handleSelectAllTables}
        handleClearAllTables={this.handleClearAllTables}
        handleTablePageChange={this.handleTablePageChange}
        handleSelectDataset={this.handleSelectDataset}
        handlePreviewDataset={this.handlePreviewDataset}
        handleClosePreview={this.handleClosePreview}
        handleGoToDatasetManager={this.handleGoToDatasetManager}
        loadMoreHistory={this.loadMoreHistory}
        // Refs
        inputRef={this.inputRef}
        messageRendererRef={this.messageRendererRef}
        // setState
        setState={this.setState.bind(this)}
      />
    );
  }
}

export default SQLAssistant;