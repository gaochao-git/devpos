import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { message } from 'antd';


//代码块样式
export const CodeBlock = ({ className, children, ...props }) => {
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopyStatus('success');
        message.success('代码已复制到剪贴板');
        // 1秒后重置状态
        setTimeout(() => setCopyStatus('idle'), 1000);
      })
      .catch(err => {
        setCopyStatus('error');
        message.error('复制失败: ' + err.message);
        setTimeout(() => setCopyStatus('idle'), 1000);
      });
  };
  
  if (!language) {
    return <code {...props}>{code}</code>;
  }
  
  // 根据复制状态决定按钮样式
  const getButtonStyle = () => {
    const baseStyle = {
      position: 'absolute',
      right: '10px',
      top: '10px',
      padding: '4px 8px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'all 0.3s'
    };

    switch (copyStatus) {
      case 'success':
        return {
          ...baseStyle,
          background: '#52c41a',
          color: '#fff'
        };
      case 'error':
        return {
          ...baseStyle,
          background: '#ff4d4f',
          color: '#fff'
        };
      default:
        return {
          ...baseStyle,
          background: 'rgba(255,255,255,0.1)',
          color: '#fff'
        };
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleCopy}
        style={getButtonStyle()}
      >
        {copyStatus === 'success' ? '已复制' : 
         copyStatus === 'error' ? '复制失败' : '复制'}
      </button>
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
    </div>
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  
  if (!children) return null;
  
  const content = String(children);
  const filePathMatch = content.match(/<doc_file_path>(.*?)<\/doc_file_path>/);
  if (!filePathMatch) return <>{children}</>;
  
  const filePath = filePathMatch[1];
  const pageNo = content.match(/<doc_page_no>(.*?)<\/doc_page_no>/)?.[1] || '';
  
  const handleOpen = () => {
    fetch('http://172.20.10.2:8003/openFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath })
    })
    .then(response => response.blob())
    .then(blob => {
      setFileUrl(window.URL.createObjectURL(blob));
      setIsModalOpen(true);
    })
    .catch(err => console.error('打开文件失败:', err));
  };

  const handleClose = () => {
    setIsModalOpen(false);
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
  };

  return (
    <>
      <a onClick={handleOpen} style={{ color: '#1890ff', textDecoration: 'underline', cursor: 'pointer' }}>
        {filePath}, {pageNo}
      </a>
      
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
                     display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ position: 'relative', backgroundColor: 'white', padding: '20px', 
                       borderRadius: '8px', width: '80%', height: '80%' }}>
            <button onClick={handleClose} style={{ position: 'absolute', right: 10, top: 10 }}>关闭</button>
            <iframe src={fileUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
          </div>
        </div>
      )}
    </>
  );
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