import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, message, Button, Select, DatePicker, Radio, Modal, Icon, Tooltip, Switch } from 'antd';
import moment from 'moment';
import MyAxios from "../common/interface"
import './index.css';
import G6Tree from "./G6Tree";
import aiGif from '../../images/AI.gif';
import AnalysisResultModal from './AnalysisResultModal';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import ChatRca from './ChatRca';


const { Content } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;


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
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);
    const [chatWidth, setChatWidth] = useState(400);

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

                    {/* 故障树和对话助手区域 */}
                    <div style={{ 
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        minHeight: 'calc(100vh - 280px)',
                        display: 'flex',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {treeData && (
                            <>
                                {/* 故障树区域 */}
                                <div style={{
                                    width: `calc(100% - ${isChatCollapsed ? 40 : chatWidth}px)`,
                                    height: 'calc(100vh - 328px)',
                                    overflow: 'hidden'
                                }}>
                                    <G6Tree 
                                        data={treeData} 
                                        initialTimeRange={timeRange}
                                    />
                                </div>

                                {/* 对话助手区域 */}
                                <ResizableBox
                                    width={isChatCollapsed ? 40 : chatWidth}
                                    height={'calc(100vh - 328px)'}
                                    minConstraints={[40, 100]}
                                    maxConstraints={[800, 1000]}
                                    axis="x"
                                    resizeHandles={['w']}
                                    onResize={(e, { size }) => {
                                        setChatWidth(size.width);
                                    }}
                                    style={{
                                        transition: isChatCollapsed ? 'width 0.3s' : 'none',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{
                                        height: 'calc(100vh - 328px)',
                                        background: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        borderLeft: '4px solid #e5e7eb',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <ChatRca 
                                            treeData={treeData}
                                            style={{
                                                flex: 1,
                                                minHeight: 0,
                                                overflow: 'hidden'
                                            }}
                                        />
                                    </div>
                                </ResizableBox>
                            </>
                        )}
                    </div>
                </Card>

                {/* 分析结果弹窗 */}
              <AnalysisResultModal
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
