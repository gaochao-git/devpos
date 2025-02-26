import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, message, Button, Select, DatePicker, Radio, Modal, Icon, Tooltip, Switch } from 'antd';
import moment from 'moment';
import MyAxios from "../common/interface"
import './index.css';
import G6Tree from "./components/G6Tree";
import aiGif from '../../images/AI.gif';
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
    const [enableStream, setEnableStream] = useState(false);
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);
    const [chatWidth, setChatWidth] = useState(400);

    // 定义快捷时间范围
    const ranges = {
        '实时': [null, null],
        '1分钟': [moment().subtract(1, 'minutes'), moment()],
        '5分钟': [moment().subtract(5, 'minutes'), moment()],
        '10分钟': [moment().subtract(10, 'minutes'), moment()],
        '15分钟': [moment().subtract(15, 'minutes'), moment()],
        '30分钟': [moment().subtract(30, 'minutes'), moment()],
        '1小时': [moment().subtract(1, 'hours'), moment()],
        '2小时': [moment().subtract(2, 'hours'), moment()],
    };

    // 修改时间选择处理函数
    const handleTimeChange = (dates, dateStrings) => {
        if (!dates) {
            setTimeMode('realtime');
            setTimeRange(null);
            if (selectedCase) {
                handleCaseChange(selectedCase, null);
            }
            return;
        }

        setTimeMode('custom');
        setTimeRange(dates);
        if (selectedCase) {
            handleCaseChange(selectedCase, dates);
        }
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
            <Content style={{ padding: '5px' }}>
                <Card bordered={false}>
                    {/* 顶部工具栏 */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {/* 左侧分析按钮组 */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {/* 场景选择和按钮组 */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '12px' }}>
                                        <Select
                                            value={selectedCase}
                                            onChange={handleCaseSelect}
                                            style={{ width: '178px' }}
                                            size="middle"
                                            placeholder="选择故障场景"
                                        >
                                            <Option value="数据库写入超时">数据库写入超时</Option>
                                            <Option value="数据库响应升高">数据库响应升高</Option>
                                            <Option value="数据库无法连接">数据库无法连接</Option>
                                        </Select>
                                            {/* <Switch
                                                checkedChildren="流式"
                                                unCheckedChildren="阻塞"
                                                onChange={(checked) => setEnableStream(checked)}
                                                style={{ width: '58px' }}
                                            /> */}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                        <RangePicker
                                            showTime
                                            value={timeRange}
                                            onChange={handleTimeChange}
                                            ranges={ranges}
                                            style={{ flex: 1 }}
                                        />
                                        <Button type="primary" onClick={handleRefresh}>
                                            刷新
                                        </Button>
                                    </div>
                                        <Button type="primary" icon="fullscreen" onClick={handleExpandAll} disabled={!treeData} size="middle"></Button>
                                        <Button type="danger" icon="warning" onClick={handleExpandError} disabled={!treeData} size="middle"></Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 故障树和对话助手区域 */}
                    <div style={{ 
                        background: 'white',
                        borderRadius: '12px',
                        padding: '5px',
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
                                    height: 'calc(115vh - 328px)',
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
                                    height={`calc(115vh - 10px)`}
                                    minConstraints={[20, 1000]}
                                    maxConstraints={[1200, 1000]}
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
                                        height: 'calc(115vh - 328px)',
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
                                            clusterName={cluster_name}
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
            </Content>
        </Layout>
    );
};

export default FaultTreeAnalysis;
