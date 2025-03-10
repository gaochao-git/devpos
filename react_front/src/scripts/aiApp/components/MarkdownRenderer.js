import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { message } from 'antd';
import { FixedSizeList as List } from 'react-window';


//代码块样式
export const CodeBlock = ({ className, children, ...props }) => {
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');
  const codeLines = code.split('\n');
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // 监听容器宽度变化
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
      const handleResize = () => setContainerWidth(containerRef.current?.offsetWidth || 0);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current && codeLines.length > 0) {
      listRef.current.scrollToItem(codeLines.length - 1);
    }
  }, [code, codeLines.length]);
  
  // 复制代码
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopyStatus('success');
        message.success('代码已复制到剪贴板');
        setTimeout(() => setCopyStatus('idle'), 1000);
      })
      .catch(err => {
        setCopyStatus('error');
        message.error('复制失败: ' + err.message);
        setTimeout(() => setCopyStatus('idle'), 1000);
      });
  };
  
  if (!language) return <code {...props}>{code}</code>;
  
  // 计算高度
  const lineHeight = 24;
  const maxVisibleLines = 20;
  const height = Math.min(codeLines.length * lineHeight, maxVisibleLines * lineHeight);
  
  // 复制按钮样式
  const buttonStyle = {
    position: 'absolute',
    right: '10px',
    top: '10px',
    padding: '4px 8px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.3s',
    zIndex: 10,
    background: copyStatus === 'success' ? '#52c41a' : '#ffffff1a',
    color: '#fff'
  };

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <button onClick={handleCopy} style={buttonStyle}>
        {copyStatus === 'success' ? '已复制' : '复制'}
      </button>
      <div style={{
        backgroundColor: '#282c34',
        borderRadius: '8px',
        padding: '16px 0',
        overflow: 'hidden'
      }}>
        {containerWidth > 0 && (
          <List
            ref={listRef}
            height={height}
            itemCount={codeLines.length}
            itemSize={lineHeight}
            width={containerWidth}
            overscanCount={5}
            initialScrollOffset={(codeLines.length - 1) * lineHeight}
          >
            {({ index, style }) => (
              <div style={style}>
                <SyntaxHighlighter
                  style={oneDark}
                  language={language}
                  PreTag="span"
                  customStyle={{
                    margin: 0,
                    padding: '0 16px',
                    backgroundColor: 'transparent',
                    display: 'block'
                  }}
                >
                  {codeLines[index]}
                </SyntaxHighlighter>
              </div>
            )}
          </List>
        )}
      </div>
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