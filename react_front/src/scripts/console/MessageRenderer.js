import React, { Component } from 'react';
import { List, Card, Typography, Spin, Icon, Button } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

// 处理工具输入和观察结果的格式化显示
const formatJsonString = (jsonStr) => {
  if (!jsonStr) return '';
  try {
    // 尝试解析JSON字符串
    const parsed = JSON.parse(jsonStr);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    // 如果解析失败，返回原始字符串
    return jsonStr;
  }
};

// 工具调用组件
const ToolCallItem = React.memo(({ tool }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // 如果没有工具名称，不显示
  if (!tool.tool) return null;
  
  return (
    <div style={{ marginBottom: '8px' }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          backgroundColor: '#fff2e8',
          padding: '4px 8px', 
          borderRadius: isExpanded ? '4px 4px 0 0' : '4px',
          border: '1px solid #ffcfad',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <Text strong style={{ 
          color: '#fa8c16', 
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Icon type="tool" style={{ marginRight: '4px' }} />
          工具调用: {tool.tool}
          {!tool.observation && (
            <span style={{ marginLeft: '8px', color: '#999', fontSize: '10px' }}>
              (执行中...)
            </span>
          )}
        </Text>
        <Icon type={isExpanded ? 'up' : 'down'} style={{ fontSize: '12px', color: '#fa8c16' }} />
      </div>
      
      {isExpanded && (
        <div style={{ 
          backgroundColor: '#fff',
          padding: '8px', 
          borderRadius: '0 0 4px 4px',
          border: '1px solid #ffcfad',
          borderTop: 'none'
        }}>
          {tool.tool_input && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>
                <Icon type="code" style={{ marginRight: '4px' }} />
                输入参数:
              </Text>
              <div style={{ 
                backgroundColor: '#f9f9f9', 
                padding: '4px', 
                borderRadius: '2px', 
                fontSize: '12px',
                fontFamily: 'monospace',
                overflowX: 'auto',
                marginBottom: '8px'
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {formatJsonString(tool.tool_input)}
                </pre>
              </div>
            </div>
          )}
          
          {tool.observation ? (
            <div>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>
                <Icon type="eye" style={{ marginRight: '4px' }} />
                观察结果:
              </Text>
              <div style={{ 
                backgroundColor: '#f9f9f9', 
                padding: '4px', 
                borderRadius: '2px', 
                fontSize: '12px',
                fontFamily: 'monospace',
                overflowX: 'auto'
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {formatJsonString(tool.observation)}
                </pre>
              </div>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: '#f0f0f0', 
              padding: '8px', 
              borderRadius: '2px', 
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              工具正在执行中，请稍候...
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// 解析消息内容，分离文本和工具调用
const parseMessageContent = (content, agentThoughts = []) => {
  if (!content) return [];
  
  // 简单的调试信息
  if (content.includes('[TOOL:')) {
    console.log('发现工具标记在内容中:', content);
    console.log('可用的agentThoughts:', agentThoughts);
  }
  
  const segments = [];
  const toolPattern = /\[TOOL:([^:]+):([^\]]+)\]/g;
  let lastIndex = 0;
  let match;
  
  while ((match = toolPattern.exec(content)) !== null) {
    // 添加工具调用前的文本
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent
        });
      }
    }
    
    // 添加工具调用
    const toolId = match[1];
    const toolName = match[2];
    const toolData = agentThoughts.find(t => t.id === toolId);
    
    if (toolData) {
      segments.push({
        type: 'tool',
        data: toolData
      });
    }
    
    lastIndex = toolPattern.lastIndex;
  }
  
  // 添加最后剩余的文本
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      segments.push({
        type: 'text',
        content: textContent
      });
    }
  }
  
  return segments;
};

// 流式消息组件
const StreamingMessage = React.memo(({ currentMessage, isComplete = false, onCopySQL, onApplySQL, agentThoughts = [] }) => {
  // 解析消息内容
  const segments = parseMessageContent(currentMessage, agentThoughts);
  
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
        
        {/* 按照流的顺序显示内容 */}
        {segments.length > 0 ? (
          <div>
            {segments.map((segment, index) => (
              <React.Fragment key={index}>
                {segment.type === 'tool' && (
                  <ToolCallItem tool={segment.data} />
                )}
                {segment.type === 'text' && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    skipHtml={false}
                    components={{
                      ...markdownComponents,
                      code: (props) => markdownComponents.code({ ...props, onCopySQL, onApplySQL })
                    }}
                  >
                    {segment.content}
                  </ReactMarkdown>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div style={{ color: '#999', fontStyle: 'italic' }}>
            正在思考中...
          </div>
        )}
      </Card>
    </List.Item>
  );
});

// 优化的消息项组件
const MessageItem = React.memo(({ item, onCopySQL, onApplySQL }) => {
  // 解析消息内容
  const segments = item.type === 'assistant' ? parseMessageContent(item.content, item.thoughts || []) : [];
  
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
          <>
            {/* 按照流的顺序显示内容 */}
            {segments.length > 0 ? (
              segments.map((segment, index) => (
                <React.Fragment key={index}>
                  {segment.type === 'tool' && (
                    <ToolCallItem tool={segment.data} />
                  )}
                  {segment.type === 'text' && (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      skipHtml={false}
                      components={{
                        ...markdownComponents,
                        code: (props) => markdownComponents.code({ ...props, onCopySQL, onApplySQL })
                      }}
                    >
                      {segment.content}
                    </ReactMarkdown>
                  )}
                </React.Fragment>
              ))
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
          </>
        )}
      </Card>
    </List.Item>
  );
});

// 主要的消息渲染器组件
class MessageRenderer extends Component {
  constructor(props) {
    super(props);
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

    this.throttledScrollCheck = this.throttle(() => {
      if (this.chatContainerRef.current && this.props.onScrollStateChange) {
        const { scrollTop, scrollHeight, clientHeight } = this.chatContainerRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        
        this.props.onScrollStateChange(isAtBottom);
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

  componentDidUpdate(prevProps) {
    // 智能滚动逻辑
    const shouldAutoScroll = 
      (prevProps.conversationHistory.length !== this.props.conversationHistory.length) ||
      (this.props.isStreaming && prevProps.currentStreamingMessage !== this.props.currentStreamingMessage);
    
    if (shouldAutoScroll && this.props.shouldAutoScroll) {
      requestAnimationFrame(this.throttledScrollToBottom);
    }
  }

  componentWillUnmount() {
    // 清理所有节流函数
    [
      this.throttledScrollToBottom,
      this.throttledScrollCheck
    ].forEach(fn => fn && fn.cancel && fn.cancel());
  }

  scrollToBottom = () => {
    this.throttledScrollToBottom();
  };

  render() {
    const {
      conversationHistory = [],
      isStreaming = false,
      currentStreamingMessage = '',
      agentThoughts = [],
      onCopySQL,
      onApplySQL,
      onMouseEnter,
      onMouseLeave,
      isUserBrowsing = false,
      isUserScrolling = false,
      onScrollToBottom,
      streamingComplete = false
    } = this.props;

    return (
      <div style={{ 
        position: 'relative', 
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div 
          ref={this.chatContainerRef}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
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
                onCopySQL={onCopySQL} 
                onApplySQL={onApplySQL} 
              />
            )}
          />
          
          {isStreaming && (
            <StreamingMessage 
              currentMessage={currentStreamingMessage} 
              isComplete={streamingComplete} 
              onCopySQL={onCopySQL}
              onApplySQL={onApplySQL}
              agentThoughts={agentThoughts}
            />
          )}
        </div>

        {(isUserBrowsing || isUserScrolling) && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 10
          }}>
            {isUserBrowsing && (
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
              onClick={onScrollToBottom}
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
    );
  }
}

export default MessageRenderer;
export { MessageItem, StreamingMessage, ToolCallItem, markdownComponents }; 