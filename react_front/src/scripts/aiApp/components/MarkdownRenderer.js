import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styled from 'styled-components';

const MessageBubble = styled.div`
  max-width: 70%;
  margin: 10px 0;
  padding: 16px;
  border-radius: 8px;
  word-break: break-word;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.isUser ? '#007AFF' : props.isError ? '#ffebee' : '#f7f7f8'};
  color: ${props => props.isUser ? 'white' : props.isError ? '#d32f2f' : '#333'};

  .markdown-content {
    * {
      color: inherit;
    }

    p {
      margin: 8px 0;
      line-height: 1.6;
    }

    ul, ol {
      margin: 8px 0;
      padding-left: 24px;
      line-height: 1.6;
    }
  }
`;

const Pre = styled.pre`
  position: relative;
  margin: 12px 0;
  border-radius: 8px;
  
  &:hover .copy-button {
    opacity: 1;
  }
`;

const CopyButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 6px 12px;
  background: #3d3d3d;
  border: 1px solid #505050;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: #505050;
    border-color: #666666;
    color: #ffffff;
  }

  &.copied {
    background: #115e3b;
    border-color: #2ea043;
    color: #7ee787;
    opacity: 1;
  }
`;

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');

    if (!inline && match) {
      const language = match[1];
      
      const CodeBlock = () => {
        const [copied, setCopied] = useState(false);

        const handleCopy = async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        };

        return (
          <Pre>
            <CopyButton 
              onClick={handleCopy}
              className={`copy-button ${copied ? 'copied' : ''}`}
            >
              {copied ? (
                <>
                  <span>✓</span>
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>复制代码</span>
                </>
              )}
            </CopyButton>
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              customStyle={{
                padding: '16px',
                borderRadius: '8px',
                margin: 0
              }}
              {...props}
            >
              {code}
            </SyntaxHighlighter>
          </Pre>
        );
      };

      return <CodeBlock />;
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }
};

const MarkdownRenderer = ({ content, isStreaming = false }) => {
  return (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }) {
          // 如果是行内代码，直接返回
          if (inline) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }

          // 获取语言，如果没有指定则默认为 plaintext
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : 'plaintext';
          const code = String(children).replace(/\n$/, '');
          
          const CodeBlock = () => {
            const [copied, setCopied] = useState(false);

            const handleCopy = async () => {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            };

            return (
              <Pre>
                <CopyButton 
                  onClick={handleCopy}
                  className={`copy-button ${copied ? 'copied' : ''}`}
                  show={!isStreaming}
                >
                  {copied ? (
                    <>
                      <span>✓</span>
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>复制代码</span>
                    </>
                  )}
                </CopyButton>
                <SyntaxHighlighter
                  style={oneDark}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    padding: '16px',
                    borderRadius: '8px',
                    margin: 0
                  }}
                  {...props}
                >
                  {code}
                </SyntaxHighlighter>
              </Pre>
            );
          };

          return <CodeBlock />;
        }
      }}
      children={content}
    />
  );
};

export default MarkdownRenderer; 