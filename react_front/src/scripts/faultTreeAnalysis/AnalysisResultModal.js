// react_front/src/scripts/faultTreeAnalysis/components/AnalysisResultModal.js

import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'antd';
import robotGif from '../../images/robot.gif';

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
  const [streamContent, setStreamContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // 创建解析器
  const createParser = (onEvent) => {
    return {
      feed(chunk) {
        try {
          const jsonData = JSON.parse(chunk);
          if (jsonData.answer) {
            onEvent(jsonData.answer);
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    };
  };

  // 处理流式响应
  const handleStream = async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = createParser((text) => {
      setStreamContent(prev => prev + text);
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        parser.feed(chunk);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // 生成分析报告
  const generateAnalysisReport = async () => {
    try {
      setIsStreaming(true);
      setStreamContent('');
      
      const response = await fetch('your_dify_api_endpoint', {
        method: 'POST',
        headers: {
          'Authorization': 'your_api_key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: { "mode": "故障定位" },
          query: content,
          response_mode: 'streaming'
        })
      });

      await handleStream(response);
    } catch (error) {
      console.error('Stream error:', error);
      setIsStreaming(false);
    }
  };

  // 获取分析结果
  useEffect(() => {
    if (visible && content) {
      setIsStreaming(true);
      setStreamContent('');
      
      // 模拟调用 dify 接口
      fetch('your_dify_api_endpoint', {
        method: 'POST',
        headers: {
          'Authorization': 'your_api_key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: { "mode": "故障定位" },
          query: content,
          response_mode: 'streaming'
        })
      })
      .then(response => handleStream(response))
      .catch(error => {
        console.error('Stream error:', error);
        setIsStreaming(false);
      });
    }
  }, [visible, content]);

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
            <Button
              type="primary"
              onClick={generateAnalysisReport}
              style={{
                background: '#2563eb',
                borderColor: '#2563eb',
              }}
            >
              生成分析报告
            </Button>
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

          {/* 右侧分析结果 */}
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
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'white'
            }}>
              {isStreaming ? streamContent : content}
              {isStreaming && (
                <span style={{ display: 'inline-block', marginLeft: '4px' }}>
                  <span className="loading-dots">...</span>
                </span>
              )}
            </div>
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