import React, { Component } from 'react';
import { Input, Button, message, Tag, Select, Typography, Icon, Drawer, List, Checkbox, Popover, Pagination, Modal } from 'antd';
import MessageRenderer from './MessageRenderer';
import DatasetManager from './DatasetManager';
import MyAxios from '../common/interface';
const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

class SQLAssistant extends Component {
  constructor(props) {
    super(props);
    
    // 节流开关配置 - 设为false可以完全禁用节流进行测试
    this.ENABLE_THROTTLING = false;
    
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
    };
    
    this.inputRef = React.createRef();
    this.messageRendererRef = React.createRef();
    
    // 优化的节流函数实现
    this.throttledScrollToBottom = this.throttle(() => {
      if (this.messageRendererRef.current) {
        this.messageRendererRef.current.scrollToBottom();
      }
    }, 300);
  }

  // 优化的节流函数 - 使用requestAnimationFrame适配不同刷新率
  throttle = (func, wait) => {
    // 如果禁用节流，直接返回原函数
    if (!this.ENABLE_THROTTLING) {
      return (...args) => {
        func.apply(this, args);
        return () => {}; // 返回空的清理函数
      };
    }
    
    let animationId = null;
    let previous = 0;
    
    return (...args) => {
      const now = Date.now();
      const remaining = wait - (now - previous);
      
      const later = () => {
        previous = now;
        animationId = null;
        func.apply(this, args);
      };
      
      if (remaining <= 0 || remaining > wait) {
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        previous = now;
        func.apply(this, args);
      } else if (!animationId) {
        animationId = requestAnimationFrame(later);
      }
      
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
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
    
    // 输出节流状态（仅在开发时）
    if (prevState.isStreaming !== this.state.isStreaming && this.state.isStreaming) {
      console.log(`🎛️ SQL Assistant - 节流状态: ${this.ENABLE_THROTTLING ? '启用' : '禁用'}`);
    }
  }

  // 发送消息并处理流式响应
  handleSendMessage = async () => {
    const { inputValue, instance, database, selectedTables, conversation_id, dify_url, dify_sql_asst_key, login_user_name, selectedDataset, useDatasetContext } = this.state;
    
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
    });

    console.log(`🚀 [开始流式] 设置isStreaming=true, streamingId=${Date.now() + 1}`);

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
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done || !this.state.isStreaming) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]' || !dataStr) continue;
                
                const data = JSON.parse(dataStr);
                
                // 处理不同类型的事件
                if (['message', 'agent_message'].includes(data.event)) {
                  // 处理文本消息
                  if (data.answer && data.answer.length > 0) {
                    assistantMessage += data.answer;
                    
                    console.log(`🔄 [流式更新] 长度: ${assistantMessage.length}, 新增: ${data.answer.length}字符`);
                    
                    // 直接使用requestAnimationFrame进行更新
                    requestAnimationFrame(() => {
                      console.log(`🎨 [RAF更新] 当前流式状态: ${this.state.isStreaming}, 消息长度: ${assistantMessage.length}`);
                      if (this.state.isStreaming) {
                        this.setState({ currentStreamingMessage: assistantMessage });
                        console.log(`✅ [状态已更新] currentStreamingMessage长度: ${assistantMessage.length}`);
                      }
                    });
                  }
                } else if (data.event === 'message_end') {
                  newConversationId = data.conversation_id;
                } else if (data.event === 'agent_thought') {
                  // 处理工具调用，只有当observation不为空时才认为是完整的工具调用
                  if (data.tool && data.observation) {
                    const newThought = {
                      id: data.id,
                      position: data.position,
                      thought: data.thought,
                      tool: data.tool,
                      tool_input: data.tool_input,
                      observation: data.observation
                    };
                    
                    currentThoughts.push(newThought);
                    
                    // 添加工具标记到assistantMessage中
                    assistantMessage += `\n[TOOL:${newThought.id}:${newThought.tool}]\n`;
                    
                    // 实时更新状态
                    this.setState({ 
                      agentThoughts: [...currentThoughts]
                    });
                    
                    // 直接使用requestAnimationFrame进行更新
                    requestAnimationFrame(() => {
                      if (this.state.isStreaming) {
                        this.setState({ currentStreamingMessage: assistantMessage });
                      }
                    });
                  }
                }
                
                // 统一更新流式消息
                // this.throttledUpdateStreamingMessage(assistantMessage);
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
          conversation_id: newConversationId || this.state.conversation_id,
          streamingComplete: true,
          agentThoughts: [] // 清空思考过程
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
        agentThoughts: [] // 清空思考过程
      });
    }
  };

  handleStopStreaming = () => {
    const { currentStreamingMessage, streamingId, agentThoughts } = this.state;
    
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
        agentThoughts: [] // 清空思考过程
      }));
    } else {
      // 如果没有内容，只清理状态
      this.setState({
        isStreaming: false,
        currentStreamingMessage: '',
        streamingId: null,
        streamingComplete: true,
        isUserScrolling: false,
        agentThoughts: [] // 清空思考过程
      });
    }
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
    // 清理所有节流函数
    [
      this.throttledScrollToBottom,
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
    } = this.state;

    // 调试控制面板 - 仅在开发环境显示
    const debugPanel = (
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px', 
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <div>节流状态: {this.ENABLE_THROTTLING ? '🟢 启用' : '🔴 禁用'}</div>
        <div>流式状态: {isStreaming ? '🟡 进行中' : '⚪ 空闲'}</div>
        <div>消息长度: {currentStreamingMessage?.length || 0}</div>
        <div>平台: {navigator.platform}</div>
        <button
          onClick={() => {
            this.ENABLE_THROTTLING = !this.ENABLE_THROTTLING;
            this.forceUpdate();
            console.log(`🎛️ 节流已${this.ENABLE_THROTTLING ? '启用' : '禁用'}`);
          }}
          style={{
            marginTop: '4px',
            padding: '2px 6px',
            fontSize: '11px',
            backgroundColor: this.ENABLE_THROTTLING ? '#ff4444' : '#44ff44',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        >
          {this.ENABLE_THROTTLING ? '禁用节流' : '启用节流'}
        </button>
      </div>
    );

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
                          padding: '8px', 
                          border: 'none',
                          borderRadius: '4px',
                          margin: '2px 0',
                          backgroundColor: 'transparent',
                          cursor: 'pointer'
                        }}
                        onClick={() => this.handleSelectDataset(dataset)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Icon 
                            type="database" 
                            style={{ 
                              marginRight: '8px', 
                              color: '#52c41a' 
                            }} 
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                              {dataset.dataset_name}
                              {dataset.is_shared === 1 && (
                                <Tag color="green" size="small" style={{ marginLeft: 4 }}>
                                  团队共享
                                </Tag>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                              {dataset.dataset_description || '无描述'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                              管理员: {dataset.admin_by}
                            </div>
                          </div>
                          <Button
                            type="link"
                            size="small"
                            icon="eye"
                            onClick={(e) => this.handlePreviewDataset(dataset, e)}
                            style={{ 
                              padding: '0 4px',
                              marginLeft: '8px',
                              color: '#1890ff'
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

        {debugPanel}
      </div>
    );
  }
}

export default SQLAssistant; 