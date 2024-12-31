import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, message, Button, Select, DatePicker, Radio, Modal, Icon, Tooltip, Switch } from 'antd';
import moment from 'moment';
import MyAxios from "../common/interface"
import './index.css';
import G6Tree from "./G6Tree";
import robotGif from '../../images/robot.gif';
import aiGif from '../../images/AI.gif';

const { Content } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 添加分析结果弹窗组件
const AnalysisModal = ({ visible, content, treeData, onClose }) => {
  console.log('Raw content:', content);

  // 修改 getSeverityInfo 的计算逻辑，根据所有指标的最高等级来确定
  const calculateMaxSeverity = (nodes) => {
    let maxSeverity = 'info';
    
    const traverse = (node) => {
      if (node.metric_name && node.node_status) {
        // 更新最高等级
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

  // 计算整个树的最高严重等级
  const maxSeverity = calculateMaxSeverity(treeData);

  const getSeverityInfo = (severity) => {
    return severity === 'error'
      ? { text: '严重', color: 'rgba(239,68,68,0.2)' }
      : severity === 'warning'
      ? { text: '警告', color: 'rgba(245,158,11,0.2)' }
      : { text: '正常', color: 'rgba(34,197,94,0.2)' };
  };

  // 使用计算出的最高等级
  const severityInfo = getSeverityInfo(maxSeverity);

  // 递归统计节点状态
  const calculateStats = (nodes) => {
    const stats = {
      info: 0,
      warning: 0,
      error: 0
    };
    
    const traverse = (node) => {
      // 只统计有metric_name的节点，包括正常、警告和严重状态
      if (node.metric_name) {
        if (node.node_status === 'info') stats.info++;
        else if (node.node_status === 'warning') stats.warning++;
        else if (node.node_status === 'error') stats.error++;
      }
      
      // 递归遍历子节点
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    
    if (nodes) traverse(nodes);
    return stats;
  };

  // 从treeData中获取各个部分的节点
  const dbNode = treeData?.children?.find(n => n.name === 'db');
  const proxyNode = treeData?.children?.find(n => n.name === 'proxy');
  const managerNode = treeData?.children?.find(n => n.name === 'manager');

  // 计算各部分的统计数据
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
          <div style={{ 
            background: '#2563eb',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '14px'
          }}>
            {new Date().toLocaleString()}
          </div>
        </div>

        {/* 标语和指标概览区域 - 合并在一行 */}
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
            flex: '0 0 300px' // 固定宽度
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

          {/* 右侧三个圆形指标 */}
          <div style={{
            display: 'flex',
            flex: 1,
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: '40px'
          }}>
            {/* 异常指标数 */}
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
                  color: '#ef4444'
                }}>
                  {(dbStats.warning + dbStats.error) +
                   (proxyStats.warning + proxyStats.error) +
                   (managerStats.warning + managerStats.error)}
                </div>
              </div>
              <div style={{ opacity: 0.8 }}>异常指标</div>
            </div>

            {/* 指标总数 */}
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
                  color: '#22c55e'
                }}>
                  {(dbStats.info + dbStats.warning + dbStats.error) +
                   (proxyStats.info + proxyStats.warning + proxyStats.error) +
                   (managerStats.info + managerStats.warning + managerStats.error)}
                </div>
              </div>
              <div style={{ opacity: 0.8 }}>指标总数</div>
            </div>

            {/* 严重等级 */}
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
                  color: maxSeverity === 'error' ? '#ef4444' :
                        maxSeverity === 'warning' ? '#f59e0b' :
                        '#22c55e'
                }}>
                  {severityInfo.text}
                </div>
              </div>
              <div style={{ opacity: 0.8 }}>严重等级</div>
            </div>
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
            {/* 数据库统计 */}
            <StatBox
              title={`数据库统计 (${dbStats.info + dbStats.warning + dbStats.error})`}
              stats={dbStats}
            />

            {/* 代理统计 */}
            <StatBox
              title={`代理节点统计 (${proxyStats.info + proxyStats.warning + proxyStats.error})`}
              stats={proxyStats}
            />

            {/* 管理节点统计 */}
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
              {content}  {/* 使用传入的 content prop */}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// 可以取一个通用的统计框组件
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

const FaultTreeAnalysis = ({ cluster_name }) => {
    const [treeData, setTreeData] = useState(null);
    const [selectedCase, setSelectedCase] = useState('选择场景');
    const [currentCluster, setCurrentCluster] = useState(cluster_name);
    const [timeRange, setTimeRange] = useState(null);
    const [timeMode, setTimeMode] = useState('realtime');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
    const [analysisContent, setAnalysisContent] = useState(null);
    const [enableStream, setEnableStream] = useState(false);

    // 更新时间范围的通用函数
    const updateTimeRange = (value) => {
        const end = moment();
        let start;
        let newTimeRange;

        if (value === 'realtime') {
            newTimeRange = null;
        } else if (value.endsWith('min')) {
            start = moment().subtract(parseInt(value), 'minutes');
            newTimeRange = [start, end];
        } else if (value.endsWith('h')) {
            start = moment().subtract(parseInt(value), 'hours');
            newTimeRange = [start, end];
        } else if (value.endsWith('d')) {
            start = moment().subtract(parseInt(value), 'days');
            newTimeRange = [start, end];
        }

        return newTimeRange;
    };

    const handleCaseChange = async (value, selectedTimeRange = timeRange) => {
        setSelectedCase(value);
        setTreeData(null); // 重置树数据

        try {
            const params = {
                fault_case: value,
                cluster_name: currentCluster,
                response_mode: enableStream ? 'stream' : 'block'
            };

            if (selectedTimeRange && selectedTimeRange[0] && selectedTimeRange[1]) {
                params.time_from = selectedTimeRange[0].format('YYYY-MM-DD HH:mm:ss');
                params.time_till = selectedTimeRange[1].format('YYYY-MM-DD HH:mm:ss');
            }

            if (enableStream) {
                // 流式处理
                await MyAxios.stream.fetch('/fault_tree/v1/get_fault_tree_data/', params, {
                    onData: (result) => {                        
                        if (result.type === 'node') {
                            setTreeData(prevTree => {
                                const newNode = result.data;
   
                                if (!prevTree) {
                                    return !result.data.parent_id ? newNode : null;
                                }

                                const updateNode = (node) => {
                                    if (node.key === result.data.parent_id) {
                                        const existingChild = node.children.find(child => child.key === newNode.key);
                                        if (!existingChild) {
                                            return {
                                                ...node,
                                                children: [...node.children, newNode]
                                            };
                                        }
                                        return node;
                                    }

                                    if (node.children) {
                                        return {
                                            ...node,
                                            children: node.children.map(child => updateNode(child))
                                        };
                                    }

                                    return node;
                                };

                                return updateNode(prevTree);
                            });
                        }
                    },
                    onError: (error) => {
                        console.error('Stream error:', error);
                        message.error('获取数据流失败，请稍后重试');
                    }
                });
            } else {
                // 阻塞式处理
                const response = await MyAxios.post('/fault_tree/v1/get_fault_tree_data/', params);
                if (response.data.status === 'ok') {
                    // 直接设置完整的树数据
                    setTreeData(response.data.data);
                } else {
                    message.error(response.data.msg || '获取数据失败');
                }
            }
        } catch (error) {
            console.error('Error in handleCaseChange:', error);
            message.error('获取故障树数据失败，请稍后重试');
            setTreeData(null);
        }
    };

    // 处理自义时间范围选择（手动输入）
    const handleCustomRangeChange = (dates) => {
        if (!dates) {
            setTimeMode('realtime');
            setTimeRange(null);
            return;
        }

        setTimeMode('custom');
        setTimeRange(dates);
        // 手动输入时不调用接口
    };

    // 快速时间范围选择处理
    const handleQuickRangeChange = (value) => {
        setTimeMode(value);
        
        // 先更新时间范围
        const newTimeRange = updateTimeRange(value);
        setTimeRange(newTimeRange);
        
        // 如果有选中的场景，则更新数据
        if (selectedCase) {
            handleCaseChange(selectedCase, newTimeRange);
        }
    };

    // 新增刷新按钮点击处理
    const handleRefreshClick = () => {
        // 使用当前的 timeMode 重新计算时间范围
        if (timeMode !== 'realtime') {
            updateTimeRange(timeMode);
        } else {
            handleRefresh();  // realtime 模式直接刷新
        }
    };

    // 刷新按钮处理函数
    const handleRefresh = () => {
        handleCaseChange(selectedCase, timeRange);
        message.success('数据刷新');
    };

    // 场景选择时自动刷新
    const handleCaseSelect = (value) => {
        setSelectedCase(value);
        // handleCaseChange(value, timeRange);
    };

    // 添加根因分析处理函数
    const handleRootCauseAnalysis = async () => {
        if (!treeData) {
            message.warning('暂无故障树数据');
            return;
        }

        setIsAnalyzing(true);
        try {
            const response = await MyAxios.post('/fault_tree/v1/analyze_root_cause/', {
                cluster_name: cluster_name,
                fault_case: selectedCase,
                tree_data: treeData
            });

            if (response.data.status === 'ok') {
                // 直接设置后端返回的数据
                setAnalysisContent(response.data.data);
                setAnalysisModalVisible(true);
            } else {
                message.error(response.data.msg || '分析失败');
            }
        } catch (error) {
            console.error('Root cause analysis failed:', error);
            message.error('分析失败，请稍后重试');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 处理弹窗关闭
    const handleModalClose = () => {
        setAnalysisModalVisible(false);
        setAnalysisContent(null);
    };

    // 展开所有节点
    const handleExpandAll = () => {
        if (!treeData) return;

        // 深拷贝当前树数据
        const newTreeData = JSON.parse(JSON.stringify(treeData));
        
        // 递归设置所有节点为展开状态
        const expandNode = (node) => {
            node.collapsed = false;
            if (node.children) {
                node.children.forEach(expandNode);
            }
        };

        expandNode(newTreeData);
        setTreeData(newTreeData);
    };

    // 展开异常节点
    const handleExpandError = () => {
        if (!treeData) return;

        // 深拷贝当前树数据
        const newTreeData = JSON.parse(JSON.stringify(treeData));
        
        // 递归设置节点展开状态
        const processNode = (node) => {
            node.collapsed = node.node_status !== 'error';
            if (node.children) {
                node.children.forEach(processNode);
            }
        };

        processNode(newTreeData);
        setTreeData(newTreeData);
    };

    return (
        <Layout className="fault-tree-analysis">
            <Content style={{ padding: '24px' }}>
                <Card bordered={false}>
                    {/* 顶部工具栏 */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {/* 左侧分析按钮组 */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginRight: '24px' }}>
                                    <div 
                                      style={{
                                        width: '80px',
                                        height: '80px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        cursor: 'pointer'
                                      }}
                                      onClick={handleRootCauseAnalysis}
                                    >
                                      <img 
                                        src={aiGif} 
                                        alt="AI"
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover'
                                        }}
                                      />
                                    </div>
                                    <div style={{ marginLeft: '16px' }}>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
                                            故障诊断分析
                                        </div>
                                        <div style={{ color: '#666' }}>
                                            实时监控 · 智能分析 · 快速定位
                                        </div>
                                    </div>
                                </div>

                                {/* 场景选择和按钮组 */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                                        <Select
                                            value={selectedCase}
                                            onChange={handleCaseSelect}
                                            style={{ width: '178px' }}
                                            size="large"
                                            placeholder="选择故障场景"
                                        >
                                            <Option value="数据库无法连接">数据库无法连接</Option>
                                            <Option value="数据库无法写入">数据库无法写入</Option>
                                            <Option value="数据库响应升高">数据库响应升高</Option>
                                        </Select>
                                            <Switch
                                                checkedChildren="流式"
                                                unCheckedChildren="阻塞"
                                                onChange={(checked) => setEnableStream(checked)}
                                                style={{ width: '58px' }}
                                            />
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Button
                                            type="primary"
                                            icon="fullscreen"
                                            onClick={handleExpandAll}
                                            disabled={!treeData}
                                            size="large"
                                            style={{ width: '120px' }}
                                        >
                                            全局视图
                                        </Button>
                                        <Button
                                            type="danger"
                                            icon="warning"
                                            onClick={handleExpandError}
                                            disabled={!treeData}
                                            size="large"
                                            style={{ width: '120px' }}
                                        >
                                            异常链路
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* 右侧时间选择器 */}
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Radio.Group
                                        value={timeMode}
                                        onChange={(e) => handleQuickRangeChange(e.target.value)}
                                        buttonStyle="solid"
                                        size="default"
                                    >
                                        <Radio.Button value="realtime">实时</Radio.Button>
                                        <Radio.Button value="1min">1分钟</Radio.Button>
                                        <Radio.Button value="5min">5分钟</Radio.Button>
                                        <Radio.Button value="10min">10分钟</Radio.Button>
                                        <Radio.Button value="15min">15分钟</Radio.Button>
                                        <Radio.Button value="30min">30分钟</Radio.Button>
                                        <Radio.Button value="1h">1小时</Radio.Button>
                                        <Radio.Button value="2h">2小时</Radio.Button>
                                    </Radio.Group>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <RangePicker
                                            showTime
                                            value={timeRange}
                                            onChange={handleCustomRangeChange}
                                            style={{ width: '360px', marginRight: '8px' }}
                                        />
                                        <Button
                                            type="primary"
                                            onClick={handleRefresh}
                                        >
                                            分析
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 故障树展示区域 */}
                    <div style={{ 
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        minHeight: 'calc(100vh - 280px)',
                    }}>
                        {treeData && (
                            <G6Tree 
                                data={treeData} 
                                initialTimeRange={timeRange}
                            />
                        )}
                    </div>
                </Card>

                {/* 分析结果弹窗 */}
                <AnalysisModal
                    visible={analysisModalVisible}
                    content={analysisContent}
                    treeData={treeData}
                    onClose={handleModalClose}
                />
            </Content>
        </Layout>
    );
};

export default FaultTreeAnalysis;
