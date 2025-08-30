import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, message } from 'antd';

// 优化的代码块组件 - 使用虚拟渲染和懒加载
const OptimizedCodeBlock = React.memo(({ 
  language, 
  codeContent, 
  onCopySQL, 
  onApplySQL, 
  isStreaming 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleLines, setVisibleLines] = useState(30); // 初始显示30行
  const codeRef = useRef(null);
  
  // 计算代码行数和内容
  const { lines, lineCount, isTruncated } = useMemo(() => {
    const allLines = codeContent.split('\n');
    const count = allLines.length;
    const truncated = count > visibleLines && !isExpanded;
    const displayLines = truncated ? allLines.slice(0, visibleLines) : allLines;
    
    return {
      lines: displayLines,
      lineCount: count,
      isTruncated: truncated
    };
  }, [codeContent, visibleLines, isExpanded]);

  // 流式输出时自动滚动
  useEffect(() => {
    if (isStreaming && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [isStreaming, codeContent]);

  // 复制代码
  const handleCopy = () => {
    if (onCopySQL) {
      // 调用外部的复制处理函数
      onCopySQL(`\`\`\`${language}\n${codeContent}\n\`\`\``);
    } else {
      // 直接复制代码内容
      navigator.clipboard.writeText(codeContent)
        .then(() => message.success('代码已复制到剪贴板'))
        .catch(() => message.error('复制失败'));
    }
  };

  // 大型代码块的性能优化
  const shouldOptimize = lineCount > 100;
  const maxHeight = isExpanded ? '600px' : (lineCount > 10 ? '300px' : 'auto');

  return (
    <div style={{ margin: '8px 0' }}>
      <div style={{ 
        backgroundColor: '#f6f8fa', 
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        overflow: 'hidden'
      }}>
        {/* 头部信息栏 */}
        <div style={{ 
          backgroundColor: '#f1f3f4', 
          padding: '8px 12px', 
          fontSize: '12px',
          color: '#666',
          borderBottom: '1px solid #e1e4e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span>{language || 'code'}</span>
            {lineCount > 30 && (
              <span style={{ marginLeft: '12px', color: '#999' }}>
                ({lineCount} 行)
              </span>
            )}
          </div>
          {/* 流式输出中不显示操作按钮 */}
          {!isStreaming && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button size="small" icon="copy" onClick={handleCopy}>
                复制
              </Button>
              {language === 'sql' && onApplySQL && (
                <>
                  <Button 
                    size="small" 
                    onClick={() => onApplySQL(`\`\`\`${language}\n${codeContent}\n\`\`\``, false)}
                  >
                    应用到编辑器
                  </Button>
                  <Button 
                    size="small" 
                    type="primary"
                    onClick={() => onApplySQL(`\`\`\`${language}\n${codeContent}\n\`\`\``, true)}
                  >
                    应用并执行
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* 代码内容区 */}
        <div style={{ position: 'relative' }}>
          <pre 
            ref={codeRef}
            style={{ 
              margin: 0, 
              padding: '12px',
              backgroundColor: '#fff',
              fontSize: '13px',
              fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
              overflow: 'auto',
              maxHeight: maxHeight,
              lineHeight: '1.5',
              whiteSpace: 'pre',
              tabSize: 2,
              // 性能优化：大型代码块时禁用某些渲染特性
              ...(shouldOptimize ? {
                willChange: 'scroll-position',
                contain: 'layout style paint'
              } : {})
            }}
          >
            <code style={{
              display: 'block',
              color: language === 'sql' ? '#0066cc' : '#333',
            }}>
              {lines.join('\n')}
              {isTruncated && '\n...'}
            </code>
          </pre>
          
          {/* 展开/收起按钮 */}
          {lineCount > 30 && (
            <div style={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '8px',
              background: 'linear-gradient(to bottom, transparent, #f6f8fa)',
              textAlign: 'center',
              borderTop: isTruncated ? '1px solid #e1e4e8' : 'none'
            }}>
              <Button 
                size="small"
                onClick={() => {
                  if (isExpanded) {
                    setIsExpanded(false);
                    setVisibleLines(30);
                  } else {
                    setIsExpanded(true);
                    setVisibleLines(lineCount);
                  }
                }}
              >
                {isExpanded ? '收起' : `展开全部 (${lineCount} 行)`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default OptimizedCodeBlock;