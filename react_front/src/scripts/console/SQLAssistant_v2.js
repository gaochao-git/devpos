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
    this.throttledUpdateStreamingMessage = throttle((message, tools) => {
      this.setState({ 
        currentStreamingMessage: message,
        agentThoughts: tools 
      });
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

  // 解析 SSE 行
  parseSSELine = (line) => {
    if (line.startsWith('event: ')) {
      return { type: 'event', value: line.slice(7).trim() };
    } else if (line.startsWith('data: ')) {
      const dataStr = line.slice(6).trim();
      if (dataStr === '[DONE]') return null;
      try {
        return { type: 'data', value: JSON.parse(dataStr) };
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
        return null;
      }
    }
    return null;
  };

  // 简化的 SSE 流处理器
  processStreamResponse = async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    let currentEvent = null;
    let assistantMessage = '';
    const toolsMap = new Map();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || !this.state.isStreaming) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          const parsed = this.parseSSELine(line);
          if (!parsed) continue;
          
          if (parsed.type === 'event') {
            currentEvent = parsed.value;
          } else if (parsed.type === 'data' && currentEvent) {
            const result = this.processEventData(currentEvent, parsed.value, assistantMessage, toolsMap);
            if (result.message !== undefined) {
              assistantMessage = result.message;
              // 实时更新显示
              this.throttledUpdateStreamingMessage(assistantMessage, Array.from(toolsMap.values()));
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return { 
      assistantMessage, 
      tools: Array.from(toolsMap.values()) 
    };
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
            toolsMap.set(toolCall.id, {
              id: toolCall.id,
              tool: toolCall.name,
              args: toolCall.args || {},
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
                      args: toolCall.args || {},
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
              tool_calls: tools  // 使用 tool_calls 而不是 thoughts
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

  // 获取历史消息
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
          // 创建消息ID到工具结果的映射
          const toolResultsMap = new Map();
          
          // 首先收集所有工具结果
          latestCheckpoint.values.messages.forEach(msg => {
            if (msg.type === 'tool' && msg.tool_call_id) {
              toolResultsMap.set(msg.tool_call_id, msg);
            }
          });
          
          // 处理消息
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
                timestamp: new Date(),
                tool_calls: msg.tool_calls || []  // 直接使用 tool_calls
              });
            }
            // 工具消息会被 MessageRenderer 自动关联，不需要单独添加
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

  // 其他方法保持不变...
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
            tool_calls: [...agentThoughts],
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

  // ... 其他方法实现 ...

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
        // ... 其他方法 ...
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