import React from 'react';
import { Input, Button, Icon } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 定义 Markdown 渲染器配置
const markdownRenderers = {
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={nightOwl}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }
};

// 单条消息组件
const ChatMessage = ({ message }) => {
  if (!message) return null;  // 添加空值检查

  return (
    <div style={{
      background: message.type === 'user' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.1)',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '8px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px' 
      }}>
        <div style={{ fontWeight: 'bold' }}>
          {message.type === 'user' ? '用户提问' : '系统回答'}
          {message.assistant && ` (@${message.assistant})`}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.7 }}>
          {message.timestamp}
        </div>
      </div>
      {message.type === 'user' ? (
        <Input.TextArea
          value={message.content}
          autoSize={{ minRows: 2 }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '14px',
            lineHeight: '1.6',
            padding: '0',
            resize: 'none'
          }}
          readOnly
        />
      ) : (
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <ReactMarkdown components={markdownRenderers}>
            {message.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

// 完整的对话组件
const ChatDialog = ({ 
  messages = [], 
  streamContent = '', 
  isStreaming = false,
  inputValue = '',
  onInputChange,
  onSendMessage,
  showAssistants = false,
  assistants = [],
  onSelectAssistant,
  disabled = false,
  placeholder = "输入你的问题..."
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 对话历史区域 */}
      <div style={{
        flex: 1,
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '8px',
        height: '512px',
        overflowY: 'auto',
        border: '3px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* 历史消息 */}
          {messages.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
          
          {/* 流式输出 */}
          {isStreaming && streamContent && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '12px',
              borderRadius: '8px'
            }}>
              <ReactMarkdown components={markdownRenderers}>
                {streamContent}
              </ReactMarkdown>
              <span className="loading-dots">...</span>
            </div>
          )}
        </div>
      </div>

      {/* 输入区域 */}
      <div style={{ 
        display: 'flex',
        width: '100%',
        position: 'relative'
      }}>
        {/* 助手选择器 */}
        {showAssistants && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            width: '300px',
            background: '#1e40af',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            padding: '8px',
            marginBottom: '8px',
            zIndex: 1000
          }}>
            {assistants.map(assistant => (
              <div
                key={assistant.id}
                onClick={() => onSelectAssistant(assistant)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  ':hover': {
                    background: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <div style={{ fontWeight: 'bold', color: 'white' }}>{assistant.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  {assistant.description}
                </div>
              </div>
            ))}
          </div>
        )}

        <Input.TextArea
          value={inputValue}
          onChange={onInputChange}
          placeholder={placeholder}
          disabled={disabled}
          autoSize={{ minRows: 2, maxRows: 6 }}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px 0 0 8px',
            color: 'white',
            fontSize: '14px',
            padding: '8px 12px',
            flex: 1,
          }}
        />
        <Button
          type="primary"
          onClick={onSendMessage}
          disabled={disabled || !inputValue.trim()}
          style={{
            height: 'auto',
            borderRadius: '0 8px 8px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
            background: disabled ? '#1d4ed8' : '#2563eb',
            borderColor: disabled ? '#1d4ed8' : '#2563eb',
          }}
        >
          {disabled ? (
            <>
              发送中
              <span className="loading-dots">...</span>
            </>
          ) : (
            <Icon type="enter" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatDialog;
