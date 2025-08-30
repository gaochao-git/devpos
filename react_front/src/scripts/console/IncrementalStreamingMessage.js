import React, { Component } from 'react';
import { Card, Typography, Spin, Icon } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolCallItem, markdownComponents } from './MessageRenderer';

const { Text } = Typography;

// 增量渲染的流式消息组件
class IncrementalStreamingMessage extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      // 将内容分段存储，避免重复渲染
      segments: [],
      lastProcessedIndex: 0,
      lastContent: '',
      renderedTools: new Set() // 已渲染的工具ID
    };
    
    this.segmentRefs = new Map();
  }
  
  componentDidUpdate(prevProps) {
    const { currentMessage, agentThoughts } = this.props;
    
    // 只在内容真正变化时更新
    if (currentMessage !== prevProps.currentMessage || 
        agentThoughts !== prevProps.agentThoughts) {
      this.processIncrementalUpdate(currentMessage, agentThoughts);
    }
  }
  
  // 处理增量更新
  processIncrementalUpdate = (currentMessage, agentThoughts) => {
    const { lastContent, segments, renderedTools } = this.state;
    
    // 如果消息被清空了，重置状态
    if (!currentMessage && lastContent) {
      this.setState({
        segments: [],
        lastProcessedIndex: 0,
        lastContent: '',
        renderedTools: new Set()
      });
      return;
    }
    
    // 计算新增的内容
    const newContent = currentMessage.slice(lastContent.length);
    if (!newContent && agentThoughts.length === renderedTools.size) {
      return; // 没有新内容，不需要更新
    }
    
    // 解析新增内容
    const newSegments = this.parseIncrementalContent(newContent, lastContent);
    
    // 处理新的工具调用
    const newTools = agentThoughts.filter(tool => 
      tool.id && !renderedTools.has(tool.id)
    );
    
    // 合并新段落到现有段落
    const updatedSegments = this.mergeSegments(segments, newSegments, newTools);
    
    // 更新已渲染的工具集合
    const updatedRenderedTools = new Set(renderedTools);
    newTools.forEach(tool => updatedRenderedTools.add(tool.id));
    
    this.setState({
      segments: updatedSegments,
      lastContent: currentMessage,
      lastProcessedIndex: currentMessage.length,
      renderedTools: updatedRenderedTools
    });
  };
  
  // 解析增量内容
  parseIncrementalContent = (newContent, previousContent) => {
    const segments = [];
    
    // 检查是否有未完成的代码块
    const previousCodeBlockOpen = (previousContent.match(/```/g) || []).length % 2 === 1;
    
    // 检查新内容中的特殊标记
    const toolMatches = [...newContent.matchAll(/\[TOOL:([^:]+):([^\]]+)\]/g)];
    const thinkingMatches = [...newContent.matchAll(/<think[^>]*>|<details[^>]*>/g)];
    
    let lastIndex = 0;
    
    // 处理工具标记
    toolMatches.forEach(match => {
      if (match.index > lastIndex) {
        const text = newContent.slice(lastIndex, match.index);
        if (text.trim()) {
          segments.push({
            type: 'text',
            content: text,
            id: `text-${Date.now()}-${lastIndex}`
          });
        }
      }
      
      segments.push({
        type: 'tool_marker',
        toolId: match[1],
        toolName: match[2],
        id: `tool-${match[1]}`
      });
      
      lastIndex = match.index + match[0].length;
    });
    
    // 添加剩余文本
    if (lastIndex < newContent.length) {
      const remainingText = newContent.slice(lastIndex);
      if (remainingText.trim()) {
        segments.push({
          type: 'text',
          content: remainingText,
          id: `text-${Date.now()}-${lastIndex}`,
          isIncomplete: previousCodeBlockOpen || remainingText.includes('```')
        });
      }
    }
    
    return segments;
  };
  
  // 合并段落
  mergeSegments = (existingSegments, newSegments, newTools) => {
    const segments = [...existingSegments];
    
    // 如果最后一个段落是不完整的文本，需要合并
    if (segments.length > 0 && newSegments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      const firstNewSegment = newSegments[0];
      
      if (lastSegment.isIncomplete && firstNewSegment.type === 'text') {
        // 合并文本
        lastSegment.content += firstNewSegment.content;
        lastSegment.isIncomplete = firstNewSegment.isIncomplete;
        newSegments.shift(); // 移除已合并的段落
      }
    }
    
    // 添加新段落
    segments.push(...newSegments);
    
    // 插入新工具到对应的标记位置
    newTools.forEach(tool => {
      const markerIndex = segments.findIndex(s => 
        s.type === 'tool_marker' && s.toolId === tool.id
      );
      
      if (markerIndex !== -1) {
        segments[markerIndex] = {
          type: 'tool',
          data: tool,
          id: `tool-${tool.id}`
        };
      }
    });
    
    return segments;
  };
  
  // 渲染单个段落
  renderSegment = (segment) => {
    const { onCopySQL, onApplySQL, isComplete } = this.props;
    
    switch (segment.type) {
      case 'tool':
        return <ToolCallItem key={segment.id} tool={segment.data} />;
        
      case 'tool_marker':
        // 工具标记，等待工具数据
        return (
          <div key={segment.id} style={{ 
            padding: '4px 8px',
            backgroundColor: '#fff2e8',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#fa8c16'
          }}>
            <Icon type="loading" spin style={{ marginRight: '4px' }} />
            正在调用工具: {segment.toolName}
          </div>
        );
        
      case 'text':
        return (
          <div key={segment.id} ref={el => this.segmentRefs.set(segment.id, el)}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml={false}
              components={{
                ...markdownComponents,
                code: (props) => markdownComponents.code({ 
                  ...props, 
                  onCopySQL, 
                  onApplySQL, 
                  isStreaming: !isComplete 
                })
              }}
            >
              {segment.content}
            </ReactMarkdown>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  render() {
    const { isComplete } = this.props;
    const { segments } = this.state;
    
    return (
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
        
        <div className="incremental-content">
          {segments.length > 0 ? (
            segments.map(segment => this.renderSegment(segment))
          ) : (
            <div style={{ color: '#999', fontStyle: 'italic' }}>
              正在思考中...
            </div>
          )}
        </div>
      </Card>
    );
  }
}

export default IncrementalStreamingMessage;