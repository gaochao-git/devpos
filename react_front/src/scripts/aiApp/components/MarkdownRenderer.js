import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styled from 'styled-components';
import { handler_dify_think } from '../util';


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

const MarkdownRenderer = ({ content, isStreaming = false }) => {
  if (!content) return null;
  
  // 按 details 开始标签和结束标签分割
  const parts = content.split(/(<think>|<\/think>|<details.*?open>|<\/details>)/);
  let isInsideDetails = false;
  
  return parts.map((part, index) => {
    // 处理 details 开始标签
    if (part.startsWith('<details') || part.startsWith('<think')) {
      isInsideDetails = true;
      return null;
    }
    
    // 处理结束标签
    if (part === '</details>' || part === '</think>') {
      isInsideDetails = false;
      return null;
    }
    
    // 如果在 details 内部，显示为思考内容
    if (isInsideDetails) {
      return (
        <details
          key={index}
          style={{
            color: 'gray',
            backgroundColor: '#f8f8f8',
            padding: '8px',
            borderRadius: '4px'
          }}
          open
        >
          <summary>Thinking...</summary>
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
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
          >
            {part.replace(/<summary>.*?<\/summary>/g, '').trim()}
          </ReactMarkdown>
        </details>
      );
    }
    
    // 非 details 内容正常渲染
    return part ? (
      <ReactMarkdown
        key={index}
        components={{
          code({ node, inline, className, children, ...props }) {
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
      >
        {part}
      </ReactMarkdown>
    ) : null;
  });
};

export default MarkdownRenderer; 