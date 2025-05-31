import React, { Component } from 'react';
import { List, Card, Typography, Spin, Icon, Button } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
            
            <pre 
              ref={(el) => {
                // 流式输出时自动滚动到底部
                if (el && props.isStreaming) {
                  setTimeout(() => {
                    if (el) {
                      el.scrollTop = el.scrollHeight;
                    }
                  }, 0);
                }
              }}
              style={{ 
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
              }}
            >
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
const ToolCallItem = ({ tool }) => {
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
};

// 解析消息内容，分离文本、工具调用和思考内容
const parseMessageContent = (content, agentThoughts = []) => {
  console.log(`🔍 [解析开始] 输入内容: "${content}", 长度: ${content?.length || 0}`);
  
  if (!content) {
    console.log(`❌ [解析结束] 内容为空`);
    return [];
  }

  const segments = [];
  
  // 使用一个正则表达式匹配所有特殊内容（思考块和工具调用）
  // 兼容两种思考格式：<details>...</details> 和 <think>...</think>
  // <think> 标签只需匹配开头，支持流式传输中的不完整内容
  const allPattern = /(<details[^>]*style[^>]*>\s*<summary[^>]*>\s*Thinking\.\.\.\s*<\/summary>([\s\S]*?)(?:<\/details>|$)|<think[^>]*>([\s\S]*?)(?:<\/think>|$)|\[TOOL:([^:]+):([^\]]+)\])/gi;
  
  let lastIndex = 0;
  let match;
  let matchCount = 0;
  
  console.log(`🔎 [正则匹配] 开始匹配特殊内容...`);
  
  while ((match = allPattern.exec(content)) !== null) {
    matchCount++;
    console.log(`🎯 [匹配${matchCount}] 位置: ${match.index}-${allPattern.lastIndex}, 内容: "${match[0]}"`);
    
    // 添加前面的普通文本
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        console.log(`📝 [添加文本] "${textContent}"`);
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
    
    console.log(`🏷️ [匹配类型] ${matchType}`);
    
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
        
        segments.push({
          type: 'tool',
          data: toolData || {
            id: toolId,
            tool: toolName,
            tool_input: null,
            observation: null
          }
        });
        break;
        
      default:
        console.warn('Unknown match type:', match[0]);
        break;
    }
    
    lastIndex = allPattern.lastIndex;
  }
  
  console.log(`🔍 [正则完成] 共匹配${matchCount}个特殊内容, lastIndex: ${lastIndex}, 内容总长度: ${content.length}`);
  
  // 添加最后剩余的文本
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    console.log(`📝 [最后文本] "${textContent}", 长度: ${textContent.length}`);
    if (textContent) {
      segments.push({
        type: 'text',
        content: textContent
      });
    }
  }
  
  console.log(`✅ [解析完成] 总段数: ${segments.length}, 文本段: ${segments.filter(s => s.type === 'text').length}, 工具段: ${segments.filter(s => s.type === 'tool').length}, 思考段: ${segments.filter(s => s.type === 'thinking').length}`);
  
  return segments;
};

// 思考内容组件
const ThinkingItem = ({ content }) => {
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
};

// 流式消息组件
const StreamingMessage = ({ currentMessage, isComplete = false, onCopySQL, onApplySQL, agentThoughts = [] }) => {
  console.log(`🖼️ [StreamingMessage渲染] 消息长度: ${currentMessage?.length || 0}, isComplete: ${isComplete}`);
  
  // 解析消息内容
  const segments = parseMessageContent(currentMessage, agentThoughts);
  
  console.log(`📝 [消息解析] 分段数量: ${segments.length}, 文本段数量: ${segments.filter(s => s.type === 'text').length}`);
  
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
};

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

// 主要的消息渲染器组件
class MessageRenderer extends Component {
  constructor(props) {
    super(props);
    
    // 节流开关配置 - 设为false可以完全禁用节流进行测试
    this.ENABLE_THROTTLING = false;
    
    this.chatContainerRef = React.createRef();
    
    // 优化的节流函数 - 使用requestAnimationFrame适配不同刷新率
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
    }, 16); // 约等于60fps的一帧时间
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

  componentDidUpdate(prevProps) {
    console.log(`🔄 [MessageRenderer更新] 历史消息数: ${this.props.conversationHistory.length}, 流式状态: ${this.props.isStreaming}, 流式消息长度: ${this.props.currentStreamingMessage?.length || 0}`);
    
    // 智能滚动逻辑
    const shouldAutoScroll = 
      (prevProps.conversationHistory.length !== this.props.conversationHistory.length) ||
      (this.props.isStreaming && prevProps.currentStreamingMessage !== this.props.currentStreamingMessage);
    
    console.log(`📜 [滚动检查] shouldAutoScroll: ${shouldAutoScroll}, shouldAutoScroll配置: ${this.props.shouldAutoScroll}`);
    
    if (shouldAutoScroll && this.props.shouldAutoScroll) {
      console.log(`🔽 [触发滚动] 执行自动滚动到底部`);
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