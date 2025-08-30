import React, { Component } from 'react';
import { Input, Button, message, Tag, Select, Typography, Icon, Drawer, List, Checkbox, Popover, Pagination, Modal } from 'antd';
import MessageRenderer from './MessageRenderer';
import DatasetManager from './DatasetManager';
import MyAxios from '../common/interface';
import { throttle } from '../common/throttle';
const { TextArea } = Input
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
      tablePageSize: 20, // 每页显示的表数量
      currentTablePage: 1, // 当前页码
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
      agentThoughts: [], // 添加思考过程状态
      
      // 数据集管理相关状态
      showDatasetManager: false,
      
      // 新的选择器相关状态
      showUnifiedSelector: false,
      selectedCategory: 'tables', // 'tables' 或 'datasets'
      datasets: [],
      loadingDatasets: false,
      datasetSearchKeyword: '',
      selectedDataset: null,
      useDatasetContext: false,
      
      // 数据集预览相关状态
      previewDataset: null,
      showDatasetPreview: false,
      
      // 数据集筛选状态
      showSharedDatasets: true,   // 显示共享数据集
      showOwnDatasets: true,      // 显示自己的数据集
      
      // 添加run_id用于停止接口
      currentRunId: null,
    };
    
    this.inputRef = React.createRef();
    this.messageRendererRef = React.createRef();
    
    // 流式消息更新节流 - 控制React状态更新频率
    this.throttledUpdateStreamingMessage = throttle((message) => {
      this.setState({ currentStreamingMessage: message });
    }, 20);
  }

  componentDidUpdate(prevProps, prevState) {
    // 更新表格选择
    if (this.props.allTables !== prevProps.allTables) {
      this.setState({ allTables: this.props.allTables || [] });
    }
  }

  // 发送消息并处理流式响应
  handleSendMessage = async () => {
    const { inputValue, instance, database, selectedTables, thread_id, api_url, api_key, login_user_name, selectedDataset, useDatasetContext, selected_model, assistant_id } = this.state;
    
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
      // 使用数据集上下文，也包含实例和数据库信息
      completeQuery = `实例: ${instance}, 数据库: ${database}, 数据集信息:\n${selectedDataset.dataset_content}\n\n用户问题: ${inputValue}`;
      contextInfo = `实例: ${instance}, 数据库: ${database}, 数据集: ${selectedDataset.dataset_name}`;
    } else {
      // 使用表名上下文
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
      agentThoughts: [], // 重置思考过程
      currentRunId: null, // 重置run_id
    });

    try {
      // 如果没有thread_id，先创建一个新的会话
      let currentThreadId = this.state.thread_id;
      if (!currentThreadId) {
        const createThreadResponse = await fetch(`${api_url}/api/chat/threads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        
        if (!createThreadResponse.ok) {
          throw new Error(`创建会话失败: ${createThreadResponse.status}`);
        }
        
        const threadData = await createThreadResponse.json();
        currentThreadId = threadData.thread_id;
        this.setState({ thread_id: currentThreadId });
      }

      // 发送消息
      const response = await fetch(`${api_url}/api/chat/threads/${currentThreadId}/runs/stream`, {
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
            'values',
            'updates'
          ],
          assistant_id: assistant_id,
          on_disconnect: 'cancel'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let newThreadId = currentThreadId;
      let currentThoughts = [];
      let buffer = '';
      let currentRunId = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done || !this.state.isStreaming) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          let currentEvent = null;
          let currentData = null;
          
          for (const line of lines) {
            // 调试输出
            console.log('SSE line:', line);
            
            if (line.startsWith('id: ')) {
              // 跳过id行
              continue;
            } else if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                // 添加微小延时，解决Windows输出按块输出问题
                await new Promise(resolve => setTimeout(resolve, 0));
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]' || !dataStr) continue;
                
                currentData = JSON.parse(dataStr);
                
                // 处理LangGraph的SSE事件
                if (currentEvent && currentData) {
                  console.log('Processing event:', currentEvent, 'with data:', currentData);
                  
                  if (currentEvent === 'messages') {
                    // 处理消息事件
                    if (Array.isArray(currentData) && currentData.length >= 2) {
                      const message = currentData[0];
                      const metadata = currentData[1];
                      
                      // 获取run_id
                      if (metadata && metadata.langgraph_node && !currentRunId) {
                        currentRunId = `run-${Date.now()}`; // 使用时间戳作为run_id
                        this.setState({ currentRunId });
                      }
                      
                      // 处理AI消息
                      if (message && message.type === 'AIMessageChunk') {
                        // 处理文本内容
                        if (message.content) {
                          console.log('Adding content:', message.content);
                          assistantMessage += message.content;
                        }
                        
                        // 处理工具调用
                        if (message.tool_calls && message.tool_calls.length > 0) {
                          console.log('Tool calls:', message.tool_calls);
                          message.tool_calls.forEach(toolCall => {
                            if (toolCall.name && toolCall.type === 'tool_call') {
                              const newThought = {
                                id: toolCall.id || `tool-${Date.now()}`,
                                position: currentThoughts.length + 1,
                                thought: `调用工具: ${toolCall.name}`,
                                tool: toolCall.name,
                                tool_input: JSON.stringify(toolCall.args || {}, null, 2),
                                observation: '执行中...'
                              };
                              
                              currentThoughts.push(newThought);
                              
                              // 添加工具标记到assistantMessage中
                              assistantMessage += `\n[TOOL:${newThought.id}:${newThought.tool}]\n`;
                              
                              // 实时更新状态
                              this.setState({ 
                                agentThoughts: [...currentThoughts]
                              });
                            }
                          });
                        }
                      }
                    }
                  } else if (currentEvent === 'updates') {
                    // 处理更新事件，可能包含工具调用信息
                    console.log('Updates event:', currentData);
                    
                    // 检查是否有工具调用
                    if (currentData && typeof currentData === 'object') {
                      // 遍历更新数据查找工具调用
                      Object.entries(currentData).forEach(([key, value]) => {
                        if (value && value.messages && Array.isArray(value.messages)) {
                          value.messages.forEach(msg => {
                            if (msg.type === 'AIMessage' && msg.tool_calls && msg.tool_calls.length > 0) {
                              // 处理工具调用
                              msg.tool_calls.forEach(toolCall => {
                                const newThought = {
                                  id: toolCall.id || `tool-${Date.now()}`,
                                  position: currentThoughts.length + 1,
                                  thought: `调用工具: ${toolCall.name}`,
                                  tool: toolCall.name,
                                  tool_input: JSON.stringify(toolCall.args, null, 2),
                                  observation: '执行中...'
                                };
                                
                                currentThoughts.push(newThought);
                                
                                // 添加工具标记到assistantMessage中
                                assistantMessage += `\n[TOOL:${newThought.id}:${newThought.tool}]\n`;
                                
                                // 实时更新状态
                                this.setState({ 
                                  agentThoughts: [...currentThoughts]
                                });
                              });
                            }
                          });
                        }
                      });
                    }
                  } else if (currentEvent === 'tasks') {
                    // 处理任务事件
                    console.log('Tasks event:', currentData);
                    
                    // 任务事件可能包含工具执行信息
                    if (currentData && currentData.name) {
                      console.log('Task name:', currentData.name);
                    }
                  } else if (currentEvent === 'values') {
                    // 处理values事件 - 可能包含工具执行结果
                    console.log('Values event:', currentData);
                    
                    if (currentData && currentData.messages) {
                      currentData.messages.forEach(msg => {
                        // 处理工具消息（工具执行结果）
                        if (msg.type === 'tool' && msg.content) {
                          // 查找对应的工具调用
                          const toolThought = currentThoughts.find(t => t.id === msg.tool_call_id);
                          if (toolThought) {
                            // 更新工具执行结果
                            toolThought.observation = msg.content;
                            
                            // 更新状态
                            this.setState({ 
                              agentThoughts: [...currentThoughts]
                            });
                          }
                        }
                      });
                    }
                  } else if (currentEvent === 'checkpoints') {
                    // 处理checkpoints事件
                    console.log('Checkpoints event:', currentData);
                  }
                  
                  // 重置事件和数据
                  currentEvent = null;
                  currentData = null;
                }
                
                // 统一更新流式消息
                this.throttledUpdateStreamingMessage(assistantMessage);
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
              thoughts: finalThoughts // 保存思考过程
            }
          ],
          isStreaming: false,
          currentStreamingMessage: '',
          streamingId: null,
          thread_id: newThreadId || this.state.thread_id,
          streamingComplete: true,
          agentThoughts: [], // 清空思考过程
          currentRunId: null // 清空task_id
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
        currentRunId: null // 清空task_id
      });
    }
  };

  handleStopStreaming = async () => {
    const { currentStreamingMessage, streamingId, agentThoughts } = this.state;
    
    // LangGraph API目前可能不支持停止流式输出，只能在前端停止
    // 如果需要后端停止支持，可以考虑使用WebSocket或其他方式
    
    // 如果有正在生成的内容，保存到历史记录中
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
            thoughts: [...agentThoughts], // 保存已有的思考过程
            interrupted: true // 标记为被打断的消息
          }
        ],
        isStreaming: false,
        currentStreamingMessage: '',
        streamingId: null,
        streamingComplete: true,
        isUserScrolling: false,
        agentThoughts: [], // 清空思考过程
        currentRunId: null // 清空task_id
      }));
    } else {
      // 如果没有内容，只清理状态
      this.setState({
        isStreaming: false,
        currentStreamingMessage: '',
        streamingId: null,
        streamingComplete: true,
        isUserScrolling: false,
        agentThoughts: [], // 清空思考过程
        currentRunId: null // 清空task_id
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
      
      // 清空数据集选择
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
    // 清理节流函数
    if (this.throttledUpdateStreamingMessage && this.throttledUpdateStreamingMessage.cancel) {
      this.throttledUpdateStreamingMessage.cancel();
    }
  }

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
          latestCheckpoint.values.messages.forEach((msg, index) => {
            if (msg.type === 'human') {
              messages.push({
                id: msg.id || `msg-${index}-human`,
                type: 'user',
                content: msg.content,
                timestamp: new Date()
              });
            } else if (msg.type === 'ai') {
              messages.push({
                id: msg.id || `msg-${index}-ai`,
                type: 'assistant',
                content: msg.content,
                timestamp: new Date()
              });
            }
          });
        }
      }

      this.setState({
        conversationHistory: messages,
        thread_id: threadId,
        isHistoryDrawerVisible: false,
        selectedConversation: threadId
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
        : [...prevState.selectedTables, table],
      
      // 选择表时清空数据集
      selectedDataset: null,
      useDatasetContext: false
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
        ])],
        
        // 选择表时清空数据集
        selectedDataset: null,
        useDatasetContext: false
      }));
    }
  };

  // 处理分页变化
  handleTablePageChange = (page) => {
    this.setState({ currentTablePage: page });
  };

  // 获取数据集列表
  fetchDatasets = async () => {
    const { instance, database } = this.state;
    if (!instance || !database) return [];

    this.setState({ loadingDatasets: true });
    try {
      const response = await MyAxios.post('/web_console/v1/get_datasets/', {
        cluster_group_name: instance,
        database_name: database
      });
      
      if (response.data.status === 'ok') {
        this.setState({ datasets: response.data.data });
        return response.data.data;
      } else {
        message.error(response.data.message);
        return [];
      }
    } catch (error) {
      message.error('获取数据集列表失败');
      console.error(error);
      return [];
    } finally {
      this.setState({ loadingDatasets: false });
    }
  };

  // 选择数据集
  handleSelectDataset = (dataset) => {
    this.setState({
      selectedDataset: dataset,
      useDatasetContext: true,
      selectedTables: [], // 清空表选择
      showUnifiedSelector: false
    });
    message.success(`已选择数据集: ${dataset.dataset_name}`);
  };

  // 切换分类
  handleCategoryChange = async (category) => {
    this.setState({ selectedCategory: category });
    if (category === 'datasets' && this.state.datasets.length === 0) {
      await this.fetchDatasets();
    }
  };

  // 跳转到数据集管理
  handleGoToDatasetManager = () => {
    this.setState({ 
      showUnifiedSelector: false,
      showDatasetManager: true 
    });
  };

  // 预览数据集
  handlePreviewDataset = (dataset, event) => {
    event.stopPropagation(); // 阻止冒泡，避免触发选择
    this.setState({
      previewDataset: dataset,
      showDatasetPreview: true
    });
  };

  // 关闭预览
  handleClosePreview = () => {
    this.setState({
      previewDataset: null,
      showDatasetPreview: false
    });
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
      
      // 新的选择器状态
      showUnifiedSelector,
      selectedCategory,
      datasets,
      loadingDatasets,
      datasetSearchKeyword,
      selectedDataset,
      useDatasetContext,
      
      // 数据集预览相关状态
      previewDataset,
      showDatasetPreview,
      
      // 数据集筛选状态
      showSharedDatasets,   // 显示共享数据集
      showOwnDatasets,      // 显示自己的数据集
      
      // 添加task_id用于停止接口
      currentRunId,
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

    // 统一选择器组件
    const unifiedSelector = (
      <div style={{ width: '500px', height: '400px', display: 'flex' }}>
        {/* 左侧分类选择 */}
        <div style={{ 
          width: '120px', 
          backgroundColor: '#f5f5f5', 
          borderRight: '1px solid #d9d9d9',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div 
            style={{
              padding: '12px',
              cursor: 'pointer',
              backgroundColor: selectedCategory === 'tables' ? '#1890ff' : 'transparent',
              color: selectedCategory === 'tables' ? '#fff' : '#333',
              borderBottom: '1px solid #d9d9d9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px'
            }}
            onClick={() => this.handleCategoryChange('tables')}
          >
            <Icon type="table" />
            <span>数据表</span>
          </div>
          <div 
            style={{
              padding: '12px',
              cursor: 'pointer',
              backgroundColor: selectedCategory === 'datasets' ? '#1890ff' : 'transparent',
              color: selectedCategory === 'datasets' ? '#fff' : '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px'
            }}
            onClick={() => this.handleCategoryChange('datasets')}
          >
            <Icon type="database" />
            <span>AI数据集</span>
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 搜索框 */}
          <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
            <Input.Search
              placeholder={selectedCategory === 'tables' ? '搜索表名' : '搜索数据集'}
              value={selectedCategory === 'tables' ? searchTableValue : datasetSearchKeyword}
              onChange={e => {
                if (selectedCategory === 'tables') {
                  this.handleSearchTable(e.target.value);
                } else {
                  this.setState({ datasetSearchKeyword: e.target.value });
                }
              }}
              size="small"
              style={{ width: '100%' }}
            />
          </div>

          {/* 列表内容 */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {selectedCategory === 'tables' ? (
              // 表列表
              <>
                <div style={{ padding: '8px 12px', fontSize: '12px', color: '#666', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>已选择 {selectedTables.length} 个表</span>
                    <div>
                      <Button 
                        size="small" 
                        type="link"
                        onClick={this.handleSelectAllTables}
                        style={{ padding: 0, marginRight: 8 }}
                      >
                        {isAllSelected ? '取消全选' : '全选'}
                      </Button>
                      <Button 
                        size="small" 
                        type="link"
                        onClick={this.handleClearAllTables}
                        disabled={selectedTables.length === 0}
                        style={{ padding: 0 }}
                      >
                        清空
                      </Button>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                  <List
                    dataSource={paginatedTables}
                    renderItem={(table) => (
                      <List.Item 
                        style={{ 
                          padding: '6px 8px', 
                          border: 'none',
                          borderRadius: '4px',
                          margin: '2px 0',
                          backgroundColor: selectedTables.includes(table) ? '#e6f7ff' : 'transparent',
                          cursor: 'pointer'
                        }}
                        onClick={() => this.handleTableSelect(table)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Icon 
                            type="table" 
                            style={{ 
                              marginRight: '8px', 
                              color: selectedTables.includes(table) ? '#1890ff' : '#8c8c8c' 
                            }} 
                          />
                          <span style={{ 
                            fontSize: '12px',
                            color: selectedTables.includes(table) ? '#1890ff' : '#333'
                          }}>
                            {table}
                          </span>
                          {selectedTables.includes(table) && (
                            <Icon 
                              type="check" 
                              style={{ 
                                marginLeft: 'auto', 
                                color: '#1890ff' 
                              }} 
                            />
                          )}
                        </div>
                      </List.Item>
                    )}
                  />
                  {filteredTables.length > tablePageSize && (
                    <div style={{ textAlign: 'center', padding: '8px' }}>
                      <Pagination
                        size="small"
                        current={currentTablePage}
                        pageSize={tablePageSize}
                        total={filteredTables.length}
                        onChange={this.handleTablePageChange}
                        showSizeChanger={false}
                        simple
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              // 数据集列表
              <>
                <div style={{ padding: '8px 12px', fontSize: '12px', color: '#666', borderBottom: '1px solid #f0f0f0' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span>数据集列表</span>
                     <Button 
                       size="small" 
                       type="link"
                       onClick={this.handleGoToDatasetManager}
                       style={{ padding: 0, fontSize: '12px' }}
                     >
                       管理数据集
                     </Button>
                   </div>
                   
                   {/* 筛选选项 */}
                   <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                     <Checkbox
                       checked={showSharedDatasets}
                       onChange={(e) => this.setState({ showSharedDatasets: e.target.checked })}
                       style={{ fontSize: '11px' }}
                     >
                       共享数据集
                     </Checkbox>
                     <Checkbox
                       checked={showOwnDatasets}
                       onChange={(e) => this.setState({ showOwnDatasets: e.target.checked })}
                       style={{ fontSize: '11px' }}
                     >
                       我的数据集
                     </Checkbox>
                   </div>
                 </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                  <List
                    dataSource={(datasets || []).filter(dataset => {
                      // 关键词筛选
                      const keyword = datasetSearchKeyword || '';
                      const matchesKeyword = dataset.dataset_name.toLowerCase().includes(keyword.toLowerCase()) ||
                        (dataset.dataset_description && dataset.dataset_description.toLowerCase().includes(keyword.toLowerCase()));
                      
                      // 类型筛选：根据勾选框状态筛选
                      const isShared = dataset.is_shared === 1;
                      const isOwn = dataset.create_by === this.state.login_user_name;
                      const matchesType = (showSharedDatasets && isShared) || (showOwnDatasets && isOwn);
                      
                      return matchesKeyword && matchesType;
                    })}
                    loading={loadingDatasets}
                    renderItem={(dataset) => (
                      <List.Item 
                        style={{ 
                          padding: '6px 8px', 
                          border: 'none',
                          borderRadius: '4px',
                          margin: '2px 0',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          minHeight: '32px'
                        }}
                        onClick={() => this.handleSelectDataset(dataset)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                          <Icon 
                            type="database" 
                            style={{ 
                              color: '#52c41a',
                              flexShrink: 0
                            }} 
                          />
                          
                          {/* 数据集名称 */}
                          <span style={{ 
                            fontSize: '12px', 
                            fontWeight: 'bold', 
                            color: '#333',
                            flexShrink: 0,
                            marginRight: '4px'
                          }}>
                            {dataset.dataset_name}
                          </span>
                          
                          {/* 团队共享标签 */}
                          {dataset.is_shared === 1 && (
                            <Tag color="green" size="small" style={{ margin: 0, flexShrink: 0 }}>
                              共享
                            </Tag>
                          )}
                          
                          {/* 描述 */}
                          <span style={{ 
                            fontSize: '11px', 
                            color: '#666',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginRight: '8px'
                          }}>
                            {dataset.dataset_description || '无描述'}
                          </span>
                          
                          {/* 管理员 */}
                          <span style={{ 
                            fontSize: '10px', 
                            color: '#999',
                            flexShrink: 0,
                            marginRight: '8px'
                          }}>
                            {dataset.admin_by}
                          </span>
                          
                          {/* 预览按钮 */}
                          <Button
                            type="link"
                            size="small"
                            icon="eye"
                            onClick={(e) => this.handlePreviewDataset(dataset, e)}
                            style={{ 
                              padding: '0 4px',
                              color: '#1890ff',
                              flexShrink: 0,
                              height: '20px',
                              minWidth: '20px'
                            }}
                            title="预览数据集内容"
                          />
                        </div>
                      </List.Item>
                    )}
                    locale={{ emptyText: '暂无数据集，请先创建数据集' }}
                  />
                </div>
              </>
            )}
          </div>

          {/* 底部操作区 */}
          <div style={{ 
            padding: '12px', 
            borderTop: '1px solid #f0f0f0',
            backgroundColor: '#fafafa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {selectedCategory === 'tables' 
                ? `已选择 ${selectedTables.length} 个表` 
                : '点击选择数据集'
              }
            </span>
            <Button 
              size="small"
              type="primary"
              disabled={selectedCategory === 'tables' && selectedTables.length === 0}
              onClick={() => this.setState({ showUnifiedSelector: false })}
            >
              确认
            </Button>
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

        <DatasetManager 
          visible={this.state.showDatasetManager}
          onCancel={() => this.setState({ showDatasetManager: false })}
          instance={this.state.instance}
          database={this.state.database}
          allTables={this.state.allTables}
          currentUser={this.state.login_user_name}
        />

        {/* 数据集预览模态框 */}
        <Modal
          title={`数据集预览: ${previewDataset ? previewDataset.dataset_name : ''}`}
          visible={showDatasetPreview}
          onCancel={this.handleClosePreview}
          width={800}
          footer={[
            <Button key="close" onClick={this.handleClosePreview}>
              关闭
            </Button>,
            <Button 
              key="select" 
              type="primary" 
              onClick={() => {
                this.handleSelectDataset(previewDataset);
                this.handleClosePreview();
              }}
              disabled={!previewDataset}
            >
              选择此数据集
            </Button>
          ]}
        >
          {previewDataset && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <Text strong>创建人：</Text>
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  {previewDataset.create_by}
                </span>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <Text strong>管理员：</Text>
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  {previewDataset.admin_by}
                </span>
                {previewDataset.is_shared === 1 && (
                  <Tag color="green" size="small" style={{ marginLeft: 8 }}>
                    团队共享
                  </Tag>
                )}
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <Text strong>描述：</Text>
                <div style={{ marginTop: '4px', color: '#666' }}>
                  {previewDataset.dataset_description || '无描述'}
                </div>
              </div>
              <div>
                <Text strong>数据集内容：</Text>
                <div style={{ 
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  maxHeight: '400px',
                  overflow: 'auto',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid #d9d9d9'
                }}>
                  {previewDataset.dataset_content}
                </div>
              </div>
            </div>
          )}
        </Modal>

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
              content={unifiedSelector}
              title="选择数据表或AI数据集"
              trigger="click"
              visible={showUnifiedSelector}
              onVisibleChange={visible => this.setState({ showUnifiedSelector: visible })}
              placement="topLeft"
              overlayStyle={{ width: '520px' }}
            >
              <Button 
                size="small" 
                icon="plus" 
                style={{ marginRight: '8px', flexShrink: 0 }}
              >
                选择数据表或AI数据集
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
              {useDatasetContext && selectedDataset ? (
                <Tag
                  closable
                  onClose={() => this.setState({ 
                    selectedDataset: null, 
                    useDatasetContext: false 
                  })}
                  style={{ 
                    margin: '2px', 
                    flexShrink: 0, 
                    backgroundColor: '#52c41a', 
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  <Icon type="database" style={{ marginRight: '4px' }} />
                  {selectedDataset.dataset_name}
                </Tag>
              ) : (
                selectedTables.map(table => (
                  <Tag
                    key={table}
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      this.handleTableSelect(table);
                    }}
                    style={{ margin: '2px', flexShrink: 0 }}
                  >
                    <Icon type="table" style={{ marginRight: '4px' }} />
                    {table}
                  </Tag>
                ))
              )}
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
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ color: '#999' }}>
              {useDatasetContext && selectedDataset ? (
                <span style={{ color: '#52c41a' }}>
                  <Icon type="database" style={{ marginRight: '4px' }} />
                  使用数据集: {selectedDataset.dataset_name}
                </span>
              ) : selectedTables.length > 0 ? (
                <span style={{ color: '#1890ff' }}>
                  <Icon type="table" style={{ marginRight: '4px' }} />
                  已选择 {selectedTables.length} 个表
                </span>
              ) : (
                '请选表或AI数据集'
              )}
            </div>
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