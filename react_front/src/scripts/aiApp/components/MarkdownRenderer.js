import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';


//代码块样式
export const CodeBlock = ({ className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');
  
  if (!language) {
    return <code {...props}>{code}</code>;
  }
  
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


//推理模型思考区域
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
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock
      }}
    >
      {content.replace(/<summary>.*?<\/summary>/g, '').trim()}
    </ReactMarkdown>
  </details>
);

// 文件引用样式
const FileReference = ({ children }) => {
  if (!children) return null;  // 添加空值检查
  
  const content = String(children);
  const file_server_url = 'http://172.20.10.2:8003/openFile'
  
  // 使用正则表达式匹配 <file_path> 标签
  const filePathMatch = content.match(/<doc_file_path>(.*?)<\/doc_file_path>/);
  
  if (filePathMatch) {
    const filePath = filePathMatch[1];
    return (
      <a 
        onClick={() => {
          fetch(file_server_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: filePath })
          })
          .then(response => response.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
          })
          .catch(err => console.error('打开文件失败:', err));
        }}
        style={{
          color: '#1890ff',
          textDecoration: 'underline',
          cursor: 'pointer'
        }}
      >
        {filePath}
      </a>
    );
  }

  return <>{children}</>; // 使用 Fragment 包装非文件路径内容
};


// 主文本输出区域
export const OutputBlock = ({ content }) => (
  <div style={{ overflowX: 'auto' }}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock,
        table: ({node, ...props}) => (
          <table style={{ 
            borderCollapse: 'collapse',
            width: '100%',
            margin: '16px 0',
            minWidth: '600px'
          }} {...props} />
        ),
        th: ({node, ...props}) => (
          <th style={{ border: '1px solid #ddd', padding: '12px 8px', backgroundColor: '#f5f5f5' }} {...props} />
        ),
        td: ({node, ...props}) => (
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            <FileReference>{props.children}</FileReference>
          </td>
        ),
        p: ({node, ...props}) => (
          <p {...props}>
            <FileReference>{props.children}</FileReference>
          </p>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

//主渲染区域
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