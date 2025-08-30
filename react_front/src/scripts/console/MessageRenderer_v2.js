import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Card, Button, Typography, Icon, Tag, Collapse, Empty, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 工具调用组件 - 使用 Collapse 实现更优雅的折叠效果
const ToolCall = React.memo(({ tool, result }) => {
  const statusIcon = result ? (
    result.status === 'success' ? 
      <Icon type="check-circle" style={{ color: '#52c41a' }} /> : 
      <Icon type="close-circle" style={{ color: '#f5222d' }} />
  ) : (
    <Icon type="loading" spin style={{ color: '#1890ff' }} />
  );

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon type="tool" style={{ color: '#fa8c16' }} />
      <Text strong>{tool.tool || tool.name}</Text>
      {statusIcon}
    </div>
  );

  return (
    <Collapse 
      defaultActiveKey={[]} 
      style={{ marginBottom: '8px', backgroundColor: '#fff2e8', border: '1px solid #ffcfad' }}
    >
      <Panel header={header} key="1">
        <div style={{ fontSize: '12px' }}>
          {/* 输入参数 */}
          <div style={{ marginBottom: '8px' }}>
            <Text type="secondary">输入参数：</Text>
            <pre style={{ 
              margin: '4px 0', 
              padding: '8px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '4px',
              fontSize: '11px',
              overflow: 'auto'
            }}>
              {JSON.stringify(tool.args || JSON.parse(tool.tool_input || '{}'), null, 2)}
            </pre>
          </div>
          
          {/* 执行结果 */}
          {result && (
            <div>
              <Text type="secondary">执行结果：</Text>
              <pre style={{ 
                margin: '4px 0', 
                padding: '8px', 
                backgroundColor: result.status === 'success' ? '#f6ffed' : '#fff1f0', 
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto',
                border: `1px solid ${result.status === 'success' ? '#b7eb8f' : '#ffa39e'}`
              }}>
                {result.content || tool.observation || '执行中...'}
              </pre>
            </div>
          )}
        </div>
      </Panel>
    </Collapse>
  );
});

// 消息组件 - 使用更清晰的结构
const Message = React.memo(({ message, onCopySQL, onApplySQL, allMessages }) => {
  const { type, content, tool_calls, thoughts } = message;
  
  // 查找工具执行结果
  const findToolResult = useCallback((toolCallId) => {
    const messageIndex = allMessages.findIndex(msg => msg.id === message.id);
    if (messageIndex === -1) return null;
    
    // 查找后续的工具消息
    for (let i = messageIndex + 1; i < allMessages.length; i++) {
      const nextMsg = allMessages[i];
      if (nextMsg.type === 'tool' && nextMsg.tool_call_id === toolCallId) {
        return nextMsg;
      }
      // 如果遇到下一个用户或AI消息，停止查找
      if (nextMsg.type === 'human' || nextMsg.type === 'ai') break;
    }
    return null;
  }, [allMessages, message.id]);

  // 渲染 Markdown 内容
  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      if (!inline && language) {
        return (
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
            {language === 'sql' && (
              <div style={{ 
                position: 'absolute', 
                top: '8px', 
                right: '8px', 
                display: 'flex', 
                gap: '4px' 
              }}>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon="copy"
                  onClick={() => onCopySQL(String(children))}
                >
                  复制
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon="play-circle"
                  onClick={() => onApplySQL(String(children), true)}
                >
                  执行
                </Button>
              </div>
            )}
          </div>
        );
      }
      
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    p({ children }) {
      return <Paragraph style={{ marginBottom: '8px' }}>{children}</Paragraph>;
    }
  }), [onCopySQL, onApplySQL]);

  if (type === 'user' || type === 'human') {
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ 
            maxWidth: '70%',
            padding: '12px 16px',
            backgroundColor: '#e6f7ff',
            borderRadius: '8px',
            border: '1px solid #91d5ff'
          }}>
            <Text>{content}</Text>
            {message.contextInfo && (
              <div style={{ marginTop: '4px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {message.contextInfo}
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'assistant' || type === 'ai') {
    // 获取所有工具调用（优先使用 tool_calls，其次使用 thoughts）
    const tools = tool_calls || thoughts || [];
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Icon 
            type="robot" 
            style={{ fontSize: '24px', color: '#1890ff', flexShrink: 0 }} 
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 工具调用列表 - 在消息内容之前显示 */}
            {tools.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                {tools.map(tool => (
                  <ToolCall 
                    key={tool.id} 
                    tool={tool} 
                    result={findToolResult(tool.id)}
                  />
                ))}
              </div>
            )}
            
            {/* 消息内容 */}
            <Card size="small" style={{ backgroundColor: '#f8f9fa' }}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {content}
              </ReactMarkdown>
            </Card>
            
            {/* 时间戳 */}
            {message.timestamp && (
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px' }}>
                {new Date(message.timestamp).toLocaleString()}
              </Text>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 工具消息通常不直接显示（已经在 ToolCall 组件中显示）
  if (type === 'tool') {
    return null;
  }

  return null;
});

// 主组件 - 使用 Hooks 实现更好的性能
const MessageRenderer = ({
  conversationHistory = [],
  isStreaming = false,
  currentStreamingMessage = '',
  agentThoughts = [],
  onCopySQL,
  onApplySQL,
  onScrollToBottom,
  shouldAutoScroll = true,
  streamingComplete = false
}) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // 自动滚动逻辑
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (shouldAutoScroll && !userScrolled) {
      scrollToBottom();
    }
  }, [conversationHistory, currentStreamingMessage, shouldAutoScroll, userScrolled, scrollToBottom]);

  // 检测用户滚动
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (!isAtBottom) {
      setUserScrolled(true);
    } else if (userScrolled) {
      setUserScrolled(false);
    }
  }, [userScrolled]);

  // 合并历史消息和流式消息
  const allMessages = useMemo(() => {
    const messages = [...conversationHistory];
    
    if (isStreaming && currentStreamingMessage) {
      messages.push({
        id: 'streaming',
        type: 'assistant',
        content: currentStreamingMessage,
        tool_calls: agentThoughts,
        timestamp: new Date()
      });
    }
    
    return messages;
  }, [conversationHistory, isStreaming, currentStreamingMessage, agentThoughts]);

  if (allMessages.length === 0) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Empty description="暂无对话" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      style={{ 
        height: '100%', 
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#f5f5f5'
      }}
    >
      {allMessages.map((message, index) => (
        <Message
          key={message.id || index}
          message={message}
          onCopySQL={onCopySQL}
          onApplySQL={onApplySQL}
          allMessages={allMessages}
        />
      ))}
      
      {isStreaming && !currentStreamingMessage && (
        <div style={{ textAlign: 'center', padding: '16px' }}>
          <Spin tip="AI 正在思考..." />
        </div>
      )}
      
      <div ref={messagesEndRef} />
      
      {userScrolled && (
        <Button
          type="primary"
          shape="circle"
          icon="vertical-align-bottom"
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            zIndex: 1000
          }}
          onClick={() => {
            scrollToBottom();
            setUserScrolled(false);
          }}
        />
      )}
    </div>
  );
};

export default MessageRenderer;