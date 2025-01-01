// react_front/src/scripts/faultTreeAnalysis/components/AnalysisResultModal.js

import React, { useState, useEffect } from 'react';
import { Modal, Button, message, Input, Icon } from 'antd';
import robotGif from '../../images/robot.gif';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import ChatDialog from './ChatDialog';
const difyApiUrl = 'http://127.0.0.1/v1/chat-messages';
const difyApiKey = 'Bearer app-Wyp6uFhaeygmRNJJjTquB1ZO';
// StatBox 子组件
const StatBox = ({ title, stats }) => (
  <div style={{
    background: 'rgba(255,255,255,0.1)',
    padding: '15px',
    borderRadius: '8px',
    height: '160px',
    display: 'flex',
    flexDirection: 'column',
    border: '3px solid rgba(255,255,255,0.1)'
  }}>
    <div style={{
      marginBottom: '16px',
      fontSize: '16px',
      fontWeight: 'bold'
    }}>
      {title}
    </div>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      fontSize: '14px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          color: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e'
          }}></span>
          正常指标
        </span>
        <span style={{ fontWeight: 'bold' }}>{stats.info || 0}</span>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          color: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#fbbf24'
          }}></span>
          警告指标
        </span>
        <span style={{ fontWeight: 'bold' }}>{stats.warning || 0}</span>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          color: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ef4444'
          }}></span>
          错误指标
        </span>
        <span style={{ fontWeight: 'bold' }}>{stats.error || 0}</span>
      </div>
    </div>
  </div>
);

const AnalysisResultModal = ({ visible, content, treeData, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [streamContent, setStreamContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [inputValue, setInputValue] = useState('');

  // 添加助手列表
  const assistants = [
    {
      id: 'ssh',
      name: 'SSH助手',
      description: '可以帮助处理SSH连接、权限和配置问题',
      mode: 'ssh诊断'
    },
    {
      id: 'mysql',
      name: 'MySQL助手',
      description: '可以帮助查看MySQL状态、性能和配置信息',
      mode: 'mysql诊断'
    },
    {
      id: 'zabbix',
      name: 'Zabbix助手',
      description: '可以帮助查看监控指标和告警信息',
      mode: 'zabbix诊断'
    }
  ];

  // 添加助手选择状态
  const [showAssistants, setShowAssistants] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);

  // 创建解析器
  const createParser = (onEvent) => {
    return {
      feed(chunk) {
        try {
          // 按行分割并过滤空行
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            // 检查是否是 SSE 数据行
            if (line.startsWith('data: ')) {
              // 移除 'data: ' 前缀
              const jsonStr = line.slice(6);
              try {
                const jsonData = JSON.parse(jsonStr);
                if (jsonData.answer) {
                  onEvent(jsonData);
                }
              } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
              }
            }
          }
        } catch (e) {
          console.error('Parse error:', e, 'Chunk:', chunk);
        }
      }
    };
  };

  // 处理流式响应
  const handleStream = async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = ''; // 用于收集完整的响应内容

    const parser = createParser((data) => {
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }
      if (data.answer) {
        fullContent += data.answer; // 累积响应内容
        setStreamContent(fullContent); // 更新流式内容
      }
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        parser.feed(chunk);
      }

      // 流结束后，添加消息到历史记录
      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          content: fullContent,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      setStreamContent(''); // 清空流式内容
    } catch (error) {
      console.error('Stream processing error:', error);
      throw error;
    } finally {
      setIsStreaming(false);
    }
  };

  // 添加发送后续问题的函数
  const sendFollowUpQuestion = async (question) => {
    try {
      setIsStreaming(true);
      setStreamContent('');
      
      const response = await fetch(difyApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': difyApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: { "mode": "故障定位" },
          query: question,
          response_mode: 'streaming',
          conversation_id: conversationId,
          user: 'system'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await handleStream(response);
      
      setMessages(prev => [...prev, {
        type: 'user',
        content: question,
        timestamp: new Date().toLocaleTimeString()
      }, {
        type: 'assistant',
        content: streamContent,
        timestamp: new Date().toLocaleTimeString()
      }]);

    } catch (error) {
      console.error('Send question error:', error);
      setIsStreaming(false);
      message.error('发送问题失败，请重试');
    }
  };

  // 计算最高严重等级
  const calculateMaxSeverity = (nodes) => {
    let maxSeverity = 'info';
    
    const traverse = (node) => {
      if (node.metric_name && node.node_status) {
        if (node.node_status === 'error') {
          maxSeverity = 'error';
        } else if (node.node_status === 'warning' && maxSeverity !== 'error') {
          maxSeverity = 'warning';
        }
      }
      
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    
    if (nodes) traverse(nodes);
    return maxSeverity;
  };

  const getSeverityInfo = (severity) => {
    return severity === 'error'
      ? { text: '严重', color: 'rgba(239,68,68,0.2)' }
      : severity === 'warning'
      ? { text: '警告', color: 'rgba(245,158,11,0.2)' }
      : { text: '正常', color: 'rgba(34,197,94,0.2)' };
  };

  // 计算节点统计信息
  const calculateStats = (nodes) => {
    const stats = {
      info: 0,
      warning: 0,
      error: 0
    };
    
    const traverse = (node) => {
      if (node.metric_name) {
        if (node.node_status === 'info') stats.info++;
        else if (node.node_status === 'warning') stats.warning++;
        else if (node.node_status === 'error') stats.error++;
      }
      
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    
    if (nodes) traverse(nodes);
    return stats;
  };

  // 获取各个部分的节点
  const dbNode = treeData?.children?.find(n => n.name === 'db');
  const proxyNode = treeData?.children?.find(n => n.name === 'proxy');
  const managerNode = treeData?.children?.find(n => n.name === 'manager');

  // 计算统计数据
  const maxSeverity = calculateMaxSeverity(treeData);
  const severityInfo = getSeverityInfo(maxSeverity);
  const dbStats = calculateStats(dbNode);
  const proxyStats = calculateStats(proxyNode);
  const managerStats = calculateStats(managerNode);

  // 添加 Markdown 渲染器配置
  const renderers = {
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      return !inline && match ? (
        <div style={{ position: 'relative' }}>
          <CopyToClipboard text={codeString} onCopy={() => message.success('代码已复制!')}>
            <Button size="small" style={{ position: 'absolute', right: 0, top: 0, zIndex: 1 }}>复制</Button>
          </CopyToClipboard>
          <SyntaxHighlighter style={nightOwl} language={match[1]} {...props}>{codeString}</SyntaxHighlighter>
        </div>
      ) : (<code className={className} {...props}>{children}</code>);
    },
    pre: ({ children }) => <div style={{ overflow: 'auto' }}>{children}</div>,
  };

  // 组件挂载时初始化输入框内容
  useEffect(() => {
    if (content) {
      setInputValue(content);
    }
  }, [content]);

  // 修改发送消息函数，添加mode参数
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage = inputValue.trim();
    setIsStreaming(true);

    // 获取当前选中的助手模式
    const mode = selectedAssistant ? selectedAssistant.mode : "故障定位";

    setMessages(prev => [
      ...prev,
      {
        type: 'user',
        content: userMessage,
        timestamp: new Date().toLocaleTimeString(),
        assistant: selectedAssistant?.name // 记录使用的助手
      }
    ]);

    setInputValue('');
    setShowAssistants(false); // 关闭助手选择框
    setSelectedAssistant(null); // 清空选中的助手

    try {
      const response = await fetch(difyApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': difyApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: { "mode": mode },
          query: userMessage,
          response_mode: 'streaming',
          conversation_id: conversationId,
          user: 'system'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await handleStream(response);
    } catch (error) {
      console.error('Send message error:', error);
      message.error('发送消息失败，请重试');
      setIsStreaming(false);
    }
  };

  // 添加助手选择框组件
  const AssistantSelector = () => (
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
          onClick={() => {
            setSelectedAssistant(assistant);
            setShowAssistants(false);
            setInputValue(prev => `@${assistant.name} ${prev}`);
          }}
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
  );

  // 当弹窗打开时，只设置输入框的默认内容
  useEffect(() => {
    if (visible && content) {
      setInputValue(content);  // 设置输入框的默认内容
      setMessages([]); // 清空消息历史
    }
  }, [visible, content]);

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      bodyStyle={{ 
        padding: '24px',
        background: 'linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%)',
        borderRadius: '8px',
        color: 'white'
      }}
      style={{ top: 20 }}
    >
      {/* Modal Content */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* 头部信息 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            故障根因分析报告
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ 
              background: '#2563eb',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '14px'
            }}>
              {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {/* 智能助手区域 */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          border: '3px solid rgba(255,255,255,0.1)'
        }}>
          {/* 左侧标语 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: '0 0 300px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img 
                src={robotGif} 
                alt="Robot"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  marginLeft:'30%'
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
                智能助手故障分析
              </div>
              <div style={{ opacity: 0.8 }}>
                让数据库故障分析更智能、更高效
              </div>
            </div>
          </div>

          {/* 分隔线 */}
          <div style={{
            width: '1px',
            height: '60px',
            background: 'rgba(255,255,255,0.2)',
            margin: '0 12px'
          }} />

          {/* 指标统计 */}
          <div style={{
            display: 'flex',
            flex: 1,
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: '40px'
          }}>
            {/* 异常指标数 */}
            <MetricCircle
              value={(dbStats.warning + dbStats.error) +
                     (proxyStats.warning + proxyStats.error) +
                     (managerStats.warning + managerStats.error)}
              label="异常指标"
              color="#ef4444"
            />

            {/* 指标总数 */}
            <MetricCircle
              value={(dbStats.info + dbStats.warning + dbStats.error) +
                     (proxyStats.info + proxyStats.warning + proxyStats.error) +
                     (managerStats.info + managerStats.warning + managerStats.error)}
              label="指标总数"
              color="#22c55e"
            />

            {/* 严重等级 */}
            <MetricCircle
              value={severityInfo.text}
              label="严重等级"
              color={maxSeverity === 'error' ? '#ef4444' :
                     maxSeverity === 'warning' ? '#f59e0b' :
                     '#22c55e'}
            />
          </div>
        </div>

        {/* 主要内容区域 */}
        <div style={{
          display: 'flex',
          gap: '24px'
        }}>
          {/* 左侧统计信息 */}
          <div style={{
            width: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <StatBox
              title={`数据库统计 (${dbStats.info + dbStats.warning + dbStats.error})`}
              stats={dbStats}
            />
            <StatBox
              title={`代理节点统计 (${proxyStats.info + proxyStats.warning + proxyStats.error})`}
              stats={proxyStats}
            />
            <StatBox
              title={`管理节点计 (${managerStats.info + managerStats.warning + managerStats.error})`}
              stats={managerStats}
            />
          </div>

          {/* 右侧分析结果 - 使用 ChatDialog 组件替换 */}
          <div style={{ flex: 1 }}>
            <ChatDialog 
              messages={messages}
              streamContent={streamContent}
              isStreaming={isStreaming}
              inputValue={inputValue}
              onInputChange={(e) => setInputValue(e.target.value)}
              onSendMessage={handleSendMessage}
              disabled={isStreaming}
              placeholder="输入你的问题... 按 @ 键选择专业助手"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                height: '512px',
                width: '100%'
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

// 指标圆圈组件
const MetricCircle = ({ value, label, color }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }}>
    <div style={{
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: '#1d4ed8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      marginBottom: '8px'
    }}>
      <div style={{
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        fontWeight: 'bold',
        color: color
      }}>
        {value}
      </div>
    </div>
    <div style={{ opacity: 0.8 }}>{label}</div>
  </div>
);

export default AnalysisResultModal;