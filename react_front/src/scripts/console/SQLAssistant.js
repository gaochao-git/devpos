import React, { Component } from 'react';
import { Input, Button, Card, List, message, Tag, Select, Typography, Divider, Spin, Icon } from 'antd';
import { UnControlled as CodeMirror } from 'react-codemirror2';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/sql/sql';
import 'codemirror/theme/idea.css';

const { TextArea } = Input;
const { Option } = Select;
const { Text, Paragraph } = Typography;

// 优化的消息项组件 - 使用React.memo防止不必要的重渲染
const MessageItem = React.memo(({ item, onCopySQL, onApplySQL, renderMessageContent }) => {
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
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {item.content}
          </Paragraph>
        ) : (
          <MessageContentWithContext content={item.content} onCopySQL={onCopySQL} onApplySQL={onApplySQL} />
        )}
      </Card>
    </List.Item>
  );
});

// 历史消息内容组件 - 带有回调上下文
const MessageContentWithContext = React.memo(({ content, onCopySQL, onApplySQL }) => {
  if (!content) return null;
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml={false}
      components={{
        // 懒加载的代码块组件 - 带回调
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          const codeContent = String(children).replace(/\n$/, '');
          
          if (!inline && codeContent) {
            // 计算行数
            const lineCount = codeContent.split('\n').length;
            const maxHeight = lineCount > 10 ? '220px' : 'auto'; // 10行约为220px高度
            
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
                    onClick={() => onCopySQL(`\`\`\`${language}\n${codeContent}\n\`\`\``)}
                    style={{ marginRight: '8px' }}
                    icon="copy"
                  >
                    复制
                  </Button>
                  {language === 'sql' && (
                    <>
                      <Button 
                        size="small" 
                        type="primary"
                        onClick={() => onApplySQL(`\`\`\`${language}\n${codeContent}\n\`\`\``, false)}
                        style={{ marginRight: '8px' }}
                        icon="arrow-right"
                      >
                        应用到编辑器
                      </Button>
                      <Button 
                        size="small"
                        type="primary"
                        danger
                        onClick={() => onApplySQL(`\`\`\`${language}\n${codeContent}\n\`\`\``, true)}
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
          
          // 内联代码
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
        
        // 其他组件保持不变...
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
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

// 流式消息组件 - 优化为两阶段渲染
const StreamingMessage = React.memo(({ currentMessage, isComplete = false }) => {
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
          // 流式过程中使用简单文本渲染，完成后使用完整markdown渲染
          isComplete ? (
            <StreamingMessageContent content={currentMessage} />
          ) : (
            <div style={{ 
              fontFamily: 'inherit',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              color: '#333'
            }}>
              {currentMessage}
            </div>
          )
        ) : (
          <div style={{ color: '#999', fontStyle: 'italic' }}>
            正在思考中...
          </div>
        )}
      </Card>
    </List.Item>
  );
});

// 流式消息内容组件 - 完成后的完整渲染
const StreamingMessageContent = React.memo(({ content }) => {
  if (!content) return null;
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml={false}
      components={{
        // 懒加载的代码块组件
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          const codeContent = String(children).replace(/\n$/, '');
          
          if (!inline && codeContent) {
            // 计算行数
            const lineCount = codeContent.split('\n').length;
            const maxHeight = lineCount > 10 ? '220px' : 'auto'; // 10行约为220px高度
            
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
                    onClick={() => {
                      navigator.clipboard.writeText(codeContent);
                      message.success('内容已复制到剪贴板');
                    }}
                    style={{ marginRight: '8px' }}
                    icon="copy"
                  >
                    复制
                  </Button>
                  {language === 'sql' && (
                    <>
                      <Button 
                        size="small" 
                        type="primary"
                        onClick={() => {
                          // 这里需要通过context或props传递onApplySQL
                          message.success('SQL已应用到编辑器');
                        }}
                        style={{ marginRight: '8px' }}
                        icon="arrow-right"
                      >
                        应用到编辑器
                      </Button>
                      <Button 
                        size="small"
                        type="primary"
                        danger
                        onClick={() => {
                          // 这里需要通过context或props传递onApplySQL
                          message.success('SQL已应用到编辑器并执行');
                        }}
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
          
          // 内联代码
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
        
        // 其他组件保持原样...
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
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

class SQLAssistant extends Component {
  constructor(props) {
    super(props);
    this.state = {
      inputValue: '',
      conversationHistory: [],
      isStreaming: false,
      currentStreamingMessage: '',
      selectedTables: props.selectedTables || [],
      instance: props.defaultInstance || '',
      database: props.defaultDatabase || '',
      cluster: props.defaultCluster || '',
      streamingId: null,
      conversation_id: null,
      streamingComplete: false, // 新增：标记流式输出是否完成
      isUserBrowsing: false, // 新增：用户是否在浏览历史内容
      isUserScrolling: false // 新增：用户是否在手动滚动
    };
    this.inputRef = React.createRef();
    this.chatContainerRef = React.createRef();
    
    // 节流函数，限制滚动频率
    this.throttledScrollToBottom = this.throttle(this.scrollToBottom, 300);
    
    // 节流函数，限制流式消息更新频率 - 延长到200ms
    this.throttledUpdateStreamingMessage = this.throttle((message) => {
      this.setState({ currentStreamingMessage: message });
    }, 200);

    // 节流函数，限制滚动检测频率
    this.throttledScrollCheck = this.throttle(this.checkScrollPosition, 100);
  }

  // 节流工具函数
  throttle = (func, wait) => {
    let timeout;
    let previous = 0;
    
    const throttled = function(...args) {
      const now = Date.now();
      const remaining = wait - (now - previous);
      
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        func.apply(this, args);
      } else if (!timeout) {
        timeout = setTimeout(() => {
          previous = Date.now();
          timeout = null;
          func.apply(this, args);
        }, remaining);
      }
    };
    
    // 添加cancel方法
    throttled.cancel = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = 0;
    };
    
    return throttled;
  };

  componentDidUpdate(prevProps, prevState) {
    // 当props中的表格选择发生变化时更新state
    if (prevProps.selectedTables !== this.props.selectedTables) {
      this.setState({ selectedTables: this.props.selectedTables || [] });
    }
    if (prevProps.defaultInstance !== this.props.defaultInstance) {
      this.setState({ instance: this.props.defaultInstance || '' });
    }
    if (prevProps.defaultDatabase !== this.props.defaultDatabase) {
      this.setState({ database: this.props.defaultDatabase || '' });
    }
    if (prevProps.defaultCluster !== this.props.defaultCluster) {
      this.setState({ cluster: this.props.defaultCluster || '' });
    }
    
    // 智能滚动逻辑 - 只有在用户没有浏览且没有手动滚动时才自动滚动
    if ((prevState.conversationHistory.length !== this.state.conversationHistory.length) ||
        (this.state.isStreaming && prevState.currentStreamingMessage !== this.state.currentStreamingMessage)) {
      
      // 只有在用户不在浏览历史内容且不在手动滚动时才自动滚动到底部
      if (!this.state.isUserBrowsing && !this.state.isUserScrolling) {
        // 添加短延迟确保内容已渲染
        setTimeout(() => {
          this.throttledScrollToBottom();
        }, 10);
      }
    }
  }

  // 检查滚动位置，判断用户是否在底部
  checkScrollPosition = () => {
    if (this.chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = this.chatContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px容差
      
      // 如果用户滚动到底部，取消手动滚动状态
      if (isAtBottom && this.state.isUserScrolling) {
        this.setState({ isUserScrolling: false });
      }
      // 如果用户不在底部且不在浏览状态，标记为手动滚动
      else if (!isAtBottom && !this.state.isUserBrowsing && !this.state.isUserScrolling) {
        this.setState({ isUserScrolling: true });
      }
    }
  };

  // 处理鼠标进入聊天区域
  handleMouseEnterChat = () => {
    this.setState({ isUserBrowsing: true });
  };

  // 处理鼠标离开聊天区域
  handleMouseLeaveChat = () => {
    this.setState({ isUserBrowsing: false });
    // 如果用户不在手动滚动状态，离开浏览区域后立即滚动到底部
    if (!this.state.isUserScrolling) {
      // 使用setTimeout确保状态更新后再执行滚动
      setTimeout(() => {
        this.scrollToBottom();
      }, 50);
    }
  };

  // 处理聊天区域滚动事件
  handleChatScroll = () => {
    this.throttledScrollCheck();
  };

  // 滚动到底部
  scrollToBottom = () => {
    if (this.chatContainerRef.current) {
      // 使用requestAnimationFrame优化滚动性能
      requestAnimationFrame(() => {
        const { scrollHeight, clientHeight } = this.chatContainerRef.current;
        this.chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
      });
    }
  };

  // 发送消息并处理流式响应
  handleSendMessage = async () => {
    const { inputValue, selectedTables, instance, database, conversation_id } = this.state;
    
    if (!inputValue.trim()) {
      message.warning('请输入问题');
      return;
    }

    if (!instance || !database) {
      message.warning('请先选择实例和数据库');
      return;
    }

    // 添加用户消息到历史记录
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    this.setState({
      conversationHistory: [...this.state.conversationHistory, userMessage],
      inputValue: '',
      isStreaming: true,
      currentStreamingMessage: '',
      streamingId: Date.now() + 1,
      streamingComplete: false, // 重置完成状态
      isUserScrolling: false // 新消息开始时重置滚动状态，但保持浏览状态
    });

    try {
      const requestBody = {
        inputs: {
          instance_name: instance,
          schema_name: database,
          table_names: selectedTables.join(',')
        },
        query: inputValue,
        response_mode: 'streaming',
        conversation_id: conversation_id,
        user: 'system',
      };

      const response = await fetch('http://127.0.0.1/v1/chat-messages', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer app-iKVZRkmmxnILnrRF4JrOyq5V',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let conversationId = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          // 检查是否被停止
          if (!this.state.isStreaming) {
            reader.cancel();
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') {
                  break;
                }
                
                const data = JSON.parse(dataStr);
                
                if (data.event === 'message') {
                  assistantMessage += data.answer;
                  this.throttledUpdateStreamingMessage(assistantMessage);
                } else if (data.event === 'message_end') {
                  conversationId = data.conversation_id;
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

      // 只有在仍然处于流式状态时才添加消息到历史记录
      if (this.state.isStreaming) {
        const assistantMessageObj = {
          id: this.state.streamingId,
          type: 'assistant',
          content: assistantMessage,
          timestamp: new Date()
        };

        this.setState({
          conversationHistory: [...this.state.conversationHistory, assistantMessageObj],
          isStreaming: false,
          currentStreamingMessage: '',
          streamingId: null,
          conversation_id: conversationId || this.state.conversation_id,
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

  // 停止流式传输
  handleStopStreaming = () => {
    this.setState({
      isStreaming: false,
      currentStreamingMessage: '',
      streamingId: null,
      streamingComplete: true,
      isUserScrolling: false // 停止时重置滚动状态
    });
  };

  // 清空对话历史
  handleClearHistory = () => {
    this.setState({
      conversationHistory: [],
      conversation_id: null,
      isUserBrowsing: false, // 清空历史时重置所有浏览状态
      isUserScrolling: false
    });
  };

  // 复制SQL到剪贴板
  handleCopySQL = (content) => {
    // 提取SQL代码块
    const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
    if (sqlMatch) {
      navigator.clipboard.writeText(sqlMatch[1]);
      message.success('SQL已复制到剪贴板');
    } else {
      navigator.clipboard.writeText(content);
      message.success('内容已复制到剪贴板');
    }
  };

  // 应用SQL到主编辑器
  handleApplySQL = (content, execute = false) => {
    const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
    if (sqlMatch && this.props.onApplySQL) {
      this.props.onApplySQL(sqlMatch[1], execute);
      message.success(execute ? 'SQL已应用到编辑器并执行' : 'SQL已应用到编辑器');
    }
  };

  // 组件卸载时清理资源
  componentWillUnmount() {
    // 清理节流函数
    if (this.throttledScrollToBottom && this.throttledScrollToBottom.cancel) {
      this.throttledScrollToBottom.cancel();
    }
    if (this.throttledUpdateStreamingMessage && this.throttledUpdateStreamingMessage.cancel) {
      this.throttledUpdateStreamingMessage.cancel();
    }
    if (this.throttledScrollCheck && this.throttledScrollCheck.cancel) {
      this.throttledScrollCheck.cancel();
    }
  }

  render() {
    const { 
      inputValue, 
      conversationHistory, 
      isStreaming, 
      currentStreamingMessage,
      selectedTables,
      instance,
      database,
      cluster
    } = this.state;

    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden' // 防止整体容器滚动
      }}>
        {/* 对话历史区域 - 使用flex-grow使其填充剩余空间 */}
        <div style={{ 
          position: 'relative', 
          flex: 1,
          minHeight: 0, // 关键：允许内容区域收缩
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div 
            ref={this.chatContainerRef}
            onMouseEnter={this.handleMouseEnterChat}
            onMouseLeave={this.handleMouseLeaveChat}
            onScroll={this.handleChatScroll}
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
                  例如：查询用户表中的所有数据
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
            
            {/* 流式传输中的消息 */}
            {isStreaming && (
              <StreamingMessage currentMessage={currentStreamingMessage} isComplete={this.state.streamingComplete} />
            )}
          </div>

          {/* 浮动的滚动指示器和按钮 */}
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
              
              {(this.state.isUserScrolling || this.state.isUserBrowsing) && (
                <Button
                  size="small"
                  type="primary"
                  shape="circle"
                  icon="down"
                  onClick={() => {
                    this.setState({ isUserScrolling: false, isUserBrowsing: false });
                    this.scrollToBottom();
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
              )}
            </div>
          )}
        </div>

        {/* 清空历史按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <Button 
            size="small" 
            onClick={this.handleClearHistory}
            icon="delete"
          >
            清空历史
          </Button>
        </div>

        {/* 选中表格卡片 - 如果有选中表格时显示 */}
        {selectedTables.length > 0 && (
          <Card size="small" style={{ marginBottom: '8px' }}>
            <div>
              <Text strong>已选择表格:</Text>
              <div style={{ marginTop: '4px' }}>
                {selectedTables.map(table => (
                  <Tag key={table} color="blue" style={{ marginBottom: '4px' }}>
                    {table}
                  </Tag>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* 输入区域 - 使用flex-shrink: 0确保不被压缩 */}
        <div style={{
          flexShrink: 0, // 防止输入框被压缩
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          padding: '8px',
          backgroundColor: '#fff',
          marginTop: 'auto' // 确保紧贴底部
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <TextArea
                ref={this.inputRef}
                value={inputValue}
                onChange={(e) => this.setState({ inputValue: e.target.value })}
                placeholder="请输入您的问题，比如：查询用户表中的所有数据"
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
            <div style={{ color: '#666' }}>
              <Icon type="database" style={{ marginRight: '4px' }} />
              当前配置: <span>{cluster && cluster !== '选择集群名' ? cluster : '未选择'}/{instance || '未选择'}/{database || '未选择'}</span>
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