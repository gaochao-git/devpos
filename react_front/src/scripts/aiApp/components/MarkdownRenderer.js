import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const CodeBlock = ({ className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'plaintext';
  const code = String(children).replace(/\n$/, '');
  
  return (
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
  );
};

export const ThinkingBlock = ({ content }) => (
  <details
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
        code: CodeBlock
      }}
    >
      {content.replace(/<summary>.*?<\/summary>/g, '').trim()}
    </ReactMarkdown>
  </details>
);

export const OutputBlock = ({ content }) => (
  <ReactMarkdown
    components={{
      code: CodeBlock
    }}
  >
    {content}
  </ReactMarkdown>
);

export const MarkdownRenderer = ({ content, isStreaming = false }) => {
  if (!content) return null;
  
  const parts = content.split(/(<think>|<\/think>|<details.*?>|<\/details>)/);
  let isInsideDetails = false;
  
  return parts.map((part, index) => {
    if (part.startsWith('<details') || part.startsWith('<think')) {
      isInsideDetails = true;
      return null;
    }
    
    if (part === '</details>' || part === '</think>') {
      isInsideDetails = false;
      return null;
    }
    
    if (isInsideDetails) {
      return <ThinkingBlock key={index} content={part} />;
    }
    
    return part ? <OutputBlock key={index} content={part} /> : null;
  });
}; 