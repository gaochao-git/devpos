import React, { Component } from 'react';
import { List, Card, Typography, Spin, Icon, Button } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { throttle } from '../common/throttle';
import OptimizedCodeBlock from './OptimizedCodeBlock';

const { Text, Paragraph } = Typography;

// 时间格式化方法
const formatTimestamp = (timestamp) => {
  return timestamp.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-');
};

// 共享的 Markdown 样式配置
const markdownComponents = {
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeContent = String(children).replace(/\n$/, '');
    
    if (!inline && codeContent) {
      // 使用优化的代码块组件处理大型代码
      return (
        <OptimizedCodeBlock
          language={language}
          codeContent={codeContent}
          onCopySQL={props.onCopySQL}
          onApplySQL={props.onApplySQL}
          isStreaming={props.isStreaming}
        />
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

// 工具调用组件 - 自定义比较函数，确保observation变化时重新渲染
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
}, (prevProps, nextProps) => {
  // 自定义比较函数：当tool对象的任何属性变化时，都重新渲染
  if (!prevProps.tool || !nextProps.tool) return false;
  return prevProps.tool.tool === nextProps.tool.tool &&
         prevProps.tool.tool_input === nextProps.tool.tool_input &&
         prevProps.tool.observation === nextProps.tool.observation &&
         prevProps.tool.id === nextProps.tool.id;
});

// 解析消息内容，分离文本、工具调用和思考内容
const parseMessageContent = (content, agentThoughts = []) => {
  if (!content) return [];

  const segments = [];
  
  // 使用一个正则表达式匹配所有特殊内容（思考块和工具调用）
  // 兼容两种思考格式：<details>...</details> 和 <think>...</think>
  // <think> 标签只需匹配开头，支持流式传输中的不完整内容
  const allPattern = /(<details[^>]*style[^>]*>\s*<summary[^>]*>\s*Thinking\.\.\.\s*<\/summary>([\s\S]*?)(?:<\/details>|$)|<think[^>]*>([\s\S]*?)(?:<\/think>|$)|\[TOOL:([^:]+):([^\]]+)\])/gi;
  
  let lastIndex = 0;
  let match;
  
  while ((match = allPattern.exec(content)) !== null) {
    // 添加前面的普通文本
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent
        });
      }
    }
    
    // 判断匹配到的是思考内容还是工具调用
    const matchType = match[0].startsWith('<details') ? 'details' :
                     match[0].startsWith('<think') ? 'think' :
                     match[0].startsWith('[TOOL:') ? 'tool' : 'unknown';
    
    switch (matchType) {
      case 'details':
        // <details> 格式的思考内容
        segments.push({
          type: 'thinking',
          content: match[2] ? match[2].trim() : ''
        });
        break;
        
      case 'think':
        // <think> 格式的思考内容
        segments.push({
          type: 'thinking',
          content: match[3] ? match[3].trim() : ''
        });
        break;
        
      case 'tool':
        // 工具调用
        const toolId = match[4];
        const toolName = match[5];
        const toolData = agentThoughts.find(t => t.id === toolId);
        
        // 只有当工具数据存在于当前消息的thoughts中时才显示
        // 这样可以避免显示其他消息的工具
        if (toolData) {
          segments.push({
            type: 'tool',
            data: toolData
          });
        }
        // 如果找不到工具数据，说明这个工具标记不属于当前消息，忽略它
        break;
        
      default:
        console.warn('Unknown match type:', match[0]);
        break;
    }
    
    lastIndex = allPattern.lastIndex;
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

// 思考内容组件
const ThinkingItem = React.memo(({ content }) => {
  const [isExpanded, setIsExpanded] = React.useState(true); // 默认展开
  
  return (
    <div style={{ marginBottom: '8px' }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          backgroundColor: '#f8f8f8',
          padding: '8px',
          borderRadius: isExpanded ? '4px 4px 0 0' : '4px',
          border: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <Text style={{ 
          color: '#666', 
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Icon type="bulb" style={{ marginRight: '4px' }} />
          Thinking...
        </Text>
        <Icon type={isExpanded ? 'up' : 'down'} style={{ fontSize: '12px', color: '#666' }} />
      </div>
      
      {isExpanded && (
        <div style={{ 
          backgroundColor: '#f8f8f8',
          padding: '8px', 
          borderRadius: '0 0 4px 4px',
          border: '1px solid #e0e0e0',
          borderTop: 'none',
          color: '#666'
        }}>
          <div style={{ 
            fontSize: '12px',
            lineHeight: '1.4',
            whiteSpace: 'pre-wrap'
          }}>
            {content}
          </div>
        </div>
      )}
    </div>
  );
});

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
                {segment.type === 'thinking' && (
                  <ThinkingItem content={segment.content} />
                )}
                {segment.type === 'text' && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    skipHtml={false}
                    components={{
                      ...markdownComponents,
                      code: (props) => markdownComponents.code({ ...props, onCopySQL, onApplySQL, isStreaming: !isComplete })
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
          border: item.type === 'user' ? '1px solid #91d5ff' : 
                  item.interrupted ? '1px solid #ff9c6e' : '1px solid #b7eb8f',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <Text strong style={{ color: item.type === 'user' ? '#1890ff' : '#52c41a' }}>
            <Icon type={item.type === 'user' ? 'user' : 'robot'} style={{ marginRight: '4px' }} />
            {item.type === 'user' ? '你' : 'SQL助手'}
            {item.interrupted && (
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px', color: '#fa8c16' }}>
                <Icon type="pause-circle" style={{ marginRight: '2px' }} />
                已打断
              </Text>
            )}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {formatTimestamp(item.timestamp)}
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
                  {segment.type === 'thinking' && (
                    <ThinkingItem content={segment.content} />
                  )}
                  {segment.type === 'text' && (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      skipHtml={false}
                      components={{
                        ...markdownComponents,
                        code: (props) => markdownComponents.code({ ...props, onCopySQL, onApplySQL, isStreaming: false })
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
                  code: (props) => markdownComponents.code({ ...props, onCopySQL, onApplySQL, isStreaming: false })
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

// 主要的消息渲染器组件，windows上这个组件的代码需要优化，否则会卡顿
class MessageRenderer extends Component {
  constructor(props) {
    super(props);
    this.chatContainerRef = React.createRef();
    
    // 自动滚动到底部节流 - 控制DOM滚动操作频率
    this.throttledScrollToBottom = throttle(() => {
      if (this.chatContainerRef.current) {
        requestAnimationFrame(() => {
          const { scrollHeight, clientHeight } = this.chatContainerRef.current;
          this.chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
        });
      }
    }, 30);

    // 滚动状态检查节流 - 控制智能滚动检测频率，windows上这个节流时间不能太长，否则会卡顿
    this.throttledScrollCheck = throttle(() => {
      if (this.chatContainerRef.current && this.props.onScrollStateChange) {
        const { scrollTop, scrollHeight, clientHeight } = this.chatContainerRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        
        this.props.onScrollStateChange(isAtBottom);
      }
    }, 10);
  }

  componentDidUpdate(prevProps) {
    // 解释这段代码作用 :这段代码的作用是当conversationHistory发生变化时，或者当isStreaming为true时，自动滚动到聊天窗口的底部。
    const shouldAutoScroll = 
      (prevProps.conversationHistory.length !== this.props.conversationHistory.length) ||
      (this.props.isStreaming && prevProps.currentStreamingMessage !== this.props.currentStreamingMessage);
    
    if (shouldAutoScroll && this.props.shouldAutoScroll) {
      this.throttledScrollToBottom(); // 直接调用，去掉外层RAF包装
    }
  }

  componentWillUnmount() {
    // 清理节流函数
    if (this.throttledScrollToBottom && this.throttledScrollToBottom.cancel) {
      this.throttledScrollToBottom.cancel();
    }
    if (this.throttledScrollCheck && this.throttledScrollCheck.cancel) {
      this.throttledScrollCheck.cancel();
    }
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