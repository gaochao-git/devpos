import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Spin, message, Drawer, Dropdown, Menu, Checkbox, Space, Icon, Table, DatePicker } from 'antd';
import ReactEcharts from 'echarts-for-react';
import MyAxios from "../common/interface";
import { Link } from 'react-router-dom';
import moment from 'moment';
import { SearchOutlined } from '@ant-design/icons';
import FaultTreeIndex from '../faultTreeAnalysis/index';

// Mock data generator functions
const generateTimeSeriesData = () => {
    const now = moment();
    const data = [];
    for (let i = 0; i < 30; i++) {
        const time = moment(now).subtract(29 - i, 'minutes').valueOf();
        data.push([time, Math.floor(Math.random() * 1000)]);
    }
    return data;
};

const generateMockBusinessData = () => {
    const datacenters = ['北京机房', '上海机房', '广州机房'];
    return [
        {
            id: 'business1',
            name: '订单系统',
            datacenters: datacenters.map((dcName, index) => ({
                name: dcName,
                responseTime: generateTimeSeriesData(),
                failureCount: generateTimeSeriesData().map(item => [item[0], Math.floor(Math.random() * 10)])
            }))
        },
        {
            id: 'business2',
            name: '支付系统',
            datacenters: datacenters.map((dcName, index) => ({
                name: dcName,
                responseTime: generateTimeSeriesData(),
                failureCount: generateTimeSeriesData().map(item => [item[0], Math.floor(Math.random() * 10)])
            }))
        },
        {
            id: 'business3',
            name: '用户系统',
            datacenters: datacenters.map((dcName, index) => ({
                name: dcName,
                responseTime: generateTimeSeriesData(),
                failureCount: generateTimeSeriesData().map(item => [item[0], Math.floor(Math.random() * 10)])
            }))
        },
        {
            id: 'business4',
            name: '商品系统',
            datacenters: datacenters.map((dcName, index) => ({
                name: dcName,
                responseTime: generateTimeSeriesData(),
                failureCount: generateTimeSeriesData().map(item => [item[0], Math.floor(Math.random() * 10)])
            }))
        }
    ];
};

const generateMockDetailedData = (businessName) => {
    // 为所有分库生成相同的时间点
    const timePoints = generateTimeSeriesData().map(point => point[0]);
    
    const getShardNames = (businessName) => {
        const prefix = businessName.replace('系统', '').toLowerCase();
        return Array.from({ length: 35 }, (_, i) => `${prefix}_shard${(i + 1).toString().padStart(2, '0')}`);
    };

    // 添加随机波动的辅助函数
    const addJitter = (baseValue, jitterPercent = 10) => {
        const jitterRange = (baseValue * jitterPercent) / 100;
        return baseValue + (Math.random() * jitterRange * 2 - jitterRange);
    };

    // 生成随机失败点
    const generateRandomFailures = (length) => {
        const failures = new Array(length).fill(0);
        // 随机选择2-3个时间点出现失败
        const failureCount = 2 + Math.floor(Math.random() * 2); // 2或3
        for (let i = 0; i < failureCount; i++) {
            const index = Math.floor(Math.random() * length);
            failures[index] = Math.floor(Math.random() * 2) + 1; // 1或2次失败
        }
        return failures;
    };

    const shardNames = getShardNames(businessName);
    return shardNames.map((shardName) => {
        const shardNumber = parseInt(shardName.slice(-2));
        let baseFailureCount = 0;
        let baseResponseTime = 3; // 默认响应时间为3ms

        // 设置特定分库的失败笔数
        if (shardNumber === 1) baseFailureCount = 4;
        if (shardNumber === 5) baseFailureCount = 9;

        // 设置特定分库的响应时间
        if (shardNumber === 3) baseResponseTime = 220;
        if (shardNumber === 8) baseResponseTime = 330;

        // 为正常库生成随机失败点
        const randomFailures = generateRandomFailures(timePoints.length);

        return {
            id: `${businessName}_${shardName}`,
            name: shardName,
            responseTime: timePoints.map(time => [
                time, 
                shardNumber === 3 || shardNumber === 8
                    ? Math.max(1, Math.round(addJitter(baseResponseTime, 15))) // 问题库保持15%波动
                    : Math.max(1, Math.round(3 + Math.random())) // 正常库在3-4ms之间波动
            ]),
            failureCount: timePoints.map((time, index) => [
                time,
                shardNumber === 1 || shardNumber === 5
                    ? Math.max(0, Math.round(addJitter(baseFailureCount, 20))) // 问题库保持原有波动
                    : randomFailures[index] // 正常库随机出现1-2次失败
            ])
        };
    });
};

export default function LinkSentinel() {
    const [businessData, setBusinessData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [selectedDatacenter, setSelectedDatacenter] = useState(null);
    const [detailedData, setDetailedData] = useState(null);
    const [drawerTitle, setDrawerTitle] = useState('');
    const [drawerWidth, setDrawerWidth] = useState('50%');
    const [metricType, setMetricType] = useState('responseTime'); // 'responseTime' or 'failureCount'
    const [selectedShards, setSelectedShards] = useState(new Set()); // 跟踪选中的分库
    const [detailMetricType, setDetailMetricType] = useState('responseTime'); // 第二级指标类型
    const [showFaultTree, setShowFaultTree] = useState(false);
    const [faultTreeKey, setFaultTreeKey] = useState(0);
    const [showDetails, setShowDetails] = useState(false);
    const [detailsData, setDetailsData] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [responseTimeThreshold, setResponseTimeThreshold] = useState({ min: 0, max: Infinity });
    const [failureCountThreshold, setFailureCountThreshold] = useState({ min: 0, max: Infinity });
    const [timeRange, setTimeRange] = useState([moment().subtract(30, 'minutes'), moment()]);
    const [autoRefresh, setAutoRefresh] = useState(true);
    
    // 添加快速选择选项
    const quickRanges = {
        '最近30分钟': [moment().subtract(30, 'minutes'), moment()],
        '最近1小时': [moment().subtract(1, 'hour'), moment()],
        '最近3小时': [moment().subtract(3, 'hours'), moment()],
        '最近6小时': [moment().subtract(6, 'hours'), moment()],
        '最近12小时': [moment().subtract(12, 'hours'), moment()],
        '最近24小时': [moment().subtract(24, 'hours'), moment()],
    };

    // 处理时间范围变化
    const handleTimeRangeChange = (dates) => {
        setTimeRange(dates);
        // 这里可以添加获取新时间范围的数据逻辑
        fetchBusinessData();
    };

    // Mock 数据
    const mockFailureData = [
        {
            id: 1,
            failureTime: '2025-02-15 08:28:30',
            failureType: 'Connection Timeout',
            errorMessage: '连接超时，无法访问数据库',
            sqlStatement: 'SELECT * FROM orders WHERE user_id = 123'
        },
        {
            id: 2,
            failureTime: '2025-02-15 08:28:35',
            errorMessage: '死锁，事务回滚',
            failureType: 'Deadlock',
            sqlStatement: 'UPDATE orders SET status = "paid" WHERE order_id = 456'
        },
        {
            id: 3,
            failureTime: '2025-02-15 08:28:40',
            failureType: 'Query Error',
            errorMessage: 'SQL语法错误',
            sqlStatement: 'INSERT INTO orders (id, user_id, amount) VALUES (789, 234, 100.00)'
        }
    ];

    useEffect(() => {
        fetchBusinessData();
        
        let timer;
        if (autoRefresh) {
            timer = setInterval(fetchBusinessData, 60000);
        }
        return () => timer && clearInterval(timer);
    }, [autoRefresh]);

    useEffect(() => {
        if (detailedData) {
            // 默认选中所有分库
            setSelectedShards(new Set(detailedData.map(db => db.name)));
        }
    }, [detailedData]);

    const fetchBusinessData = async () => {
        setLoading(true);
        try {
            // Mock API response with timeRange
            setTimeout(() => {
                const data = generateMockBusinessData();
                // 这里可以使用 timeRange[0] 和 timeRange[1] 来获取开始和结束时间
                setBusinessData(data);
                setLoading(false);
            }, 500);
        } catch (error) {
            message.error('获取业务数据失败');
            console.error(error);
            setLoading(false);
        }
    };

    const getBusinessChartOption = (business) => {
        const isResponseTime = metricType === 'responseTime';
        return {
            title: {
                text: isResponseTime ? '各机房平均响应时间' : '各机房失败笔数',
                left: 'center',
                top: 0,
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                enterable: true,
                confine: true,
                appendToBody: false,
                formatter: function(params) {
                    const sortedParams = [...params].sort((a, b) => {
                        const valueA = Array.isArray(a.value) ? a.value[1] : a.value;
                        const valueB = Array.isArray(b.value) ? b.value[1] : b.value;
                        return valueB - valueA;
                    });

                    // antd button 样式
                    const antdButtonStyle = `
                        line-height: 1.5715;
                        position: relative;
                        display: inline-block;
                        font-weight: 400;
                        white-space: nowrap;
                        text-align: center;
                        background-image: none;
                        border: 1px solid transparent;
                        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.015);
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
                        user-select: none;
                        touch-action: manipulation;
                        height: 24px;
                        padding: 0px 7px;
                        font-size: 12px;
                        border-radius: 2px;
                        color: rgba(0, 0, 0, 0.85);
                        border-color: #d9d9d9;
                        background: #fff;
                        margin-left: 4px;
                    `;

                    let content = `<div style="max-height: 400px; overflow-y: auto;">`;
                    content += `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #eee;">`;
                    content += `<div style="font-size: 12px; color: #666;">${params[0].axisValueLabel}</div>`;
                    content += `</div>`;
                    
                    sortedParams.forEach((param, index) => {
                        const marker = param.marker;
                        let value = Array.isArray(param.value) ? param.value[1] : param.value;
                        if (isResponseTime) {
                            value = `${Math.round(value)}ms`;
                        }
                        content += `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span>${marker} ${param.seriesName}: ${value}</span>
                                <div>
                                    <button 
                                        onclick="window.handleBusinessDetailClick && window.handleBusinessDetailClick({
                                            datacenter: '${param.seriesName}',
                                            business: '${business.name}'
                                        })"
                                        style="${antdButtonStyle}"
                                        onmouseover="this.style.color='#40a9ff';this.style.borderColor='#40a9ff'"
                                        onmouseout="this.style.color='rgba(0, 0, 0, 0.85)';this.style.borderColor='#d9d9d9'"
                                    >
                                        详情
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                    
                    content += '</div>';
                    return content;
                }
            },
            legend: {
                data: business.datacenters.map(dc => dc.name),
                top: 25
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: 60,
                containLabel: true
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                axisLabel: {
                    formatter: (value) => moment(value).format('HH:mm')
                }
            },
            yAxis: {
                type: 'value',
                name: isResponseTime ? '响应时间(ms)' : '失败笔数',
                axisLabel: {
                    formatter: '{value}' + (isResponseTime ? 'ms' : '')
                }
            },
            series: business.datacenters.map(dc => ({
                name: dc.name,
                type: 'line',
                smooth: true,
                data: dc[metricType],
                itemStyle: {
                    color: dc.name === '北京机房' ? '#1890ff' : 
                           dc.name === '上海机房' ? '#52c41a' : '#f5222d'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { 
                                offset: 0, 
                                color: dc.name === '北京机房' ? 'rgba(24,144,255,0.3)' :
                                       dc.name === '上海机房' ? 'rgba(82,196,26,0.3)' :
                                       'rgba(245,34,45,0.3)'
                            },
                            { 
                                offset: 1, 
                                color: dc.name === '北京机房' ? 'rgba(24,144,255,0.1)' :
                                       dc.name === '上海机房' ? 'rgba(82,196,26,0.1)' :
                                       'rgba(245,34,45,0.1)'
                            }
                        ]
                    }
                }
            }))
        };
    };

    const handleBusinessClick = async (business) => {
        try {
            setLoading(true);
            setDrawerVisible(true);
            
            // Mock API response
            const data = generateMockDetailedData(business.name);
            
            // 延迟设置数据，等待抽屉动画完成
            setTimeout(() => {
                setDetailedData(data);
                setSelectedBusiness(business);
                setDrawerTitle(`${business.name} - 分库监控`);
                setDrawerWidth('80%');
                setLoading(false);
            }, 300); // 等待抽屉动画完成
            
        } catch (error) {
            message.error('获取详细数据失败');
            setLoading(false);
        }
    };

    // 添加一个useEffect来监听detailedData的变化
    useEffect(() => {
        if (detailedData && selectedBusiness) {
            // 强制图表重新渲染
            const timer = setTimeout(() => {
                setDrawerVisible(true);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [detailedData, selectedBusiness]);

    const handleShardSelection = (shardName) => {
        setSelectedShards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(shardName)) {
                newSet.delete(shardName);
            } else {
                newSet.add(shardName);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (detailedData) {
            setSelectedShards(new Set(detailedData.map(db => db.name)));
        }
    };

    const handleUnselectAll = () => {
        setSelectedShards(new Set());
    };

    const getLegendMenu = (data) => (
        <Menu
            style={{ 
                maxHeight: '400px', 
                overflow: 'auto',
                minWidth: '200px'
            }}
        >
            <Menu.Item key="actions">
                <div style={{ padding: '0 8px' }}>
                    <Button.Group size="small" style={{ width: '100%', display: 'flex' }}>
                        <Button onClick={handleSelectAll} style={{ flex: 1 }}>
                            全部选中
                        </Button>
                        <Button onClick={handleUnselectAll} style={{ flex: 1 }}>
                            全部隐藏
                        </Button>
                    </Button.Group>
                </div>
            </Menu.Item>
            <Menu.Divider />
            {data.map(db => (
                <Menu.Item key={db.name}>
                    <Checkbox
                        checked={selectedShards.has(db.name)}
                        onChange={() => handleShardSelection(db.name)}
                    >
                        {db.name}
                    </Checkbox>
                </Menu.Item>
            ))}
        </Menu>
    );

    const getDetailedChartOption = (data, type) => {
        const isResponseTime = type === 'responseTime';
        // 生成35种渐变色
        const generateColors = (count) => {
            const baseColors = [
                { primary: '#1890ff', start: 'rgba(24,144,255,0.3)', end: 'rgba(24,144,255,0.1)' },  // 蓝色
                { primary: '#52c41a', start: 'rgba(82,196,26,0.3)', end: 'rgba(82,196,26,0.1)' },    // 绿色
                { primary: '#f5222d', start: 'rgba(245,34,45,0.3)', end: 'rgba(245,34,45,0.1)' },    // 红色
                { primary: '#722ed1', start: 'rgba(114,46,209,0.3)', end: 'rgba(114,46,209,0.1)' },  // 紫色
                { primary: '#faad14', start: 'rgba(250,173,20,0.3)', end: 'rgba(250,173,20,0.1)' },  // 黄色
            ];

            return Array.from({ length: count }, (_, i) => {
                const baseColor = baseColors[i % baseColors.length];
                const opacity = 1 - (Math.floor(i / baseColors.length) * 0.2);
                return {
                    primary: baseColor.primary,
                    areaStart: baseColor.start,
                    areaEnd: baseColor.end,
                    opacity
                };
            });
        };

        const colors = generateColors(35);

        // 修改过滤逻辑为范围判断
        const filteredData = data.filter(db => {
            const maxValue = Math.max(...db[type].map(point => point[1]));
            const threshold = isResponseTime ? responseTimeThreshold : failureCountThreshold;
            return maxValue >= threshold.min && maxValue <= threshold.max;
        });

        return {
            title: {
                text: isResponseTime ? '各分库平均响应时间' : '各分库失败笔数',
                left: 'center',
                top: 0,
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                enterable: true,
                confine: true,
                appendToBody: false,
                formatter: function(params) {
                    const sortedParams = [...params].sort((a, b) => {
                        const valueA = Array.isArray(a.value) ? a.value[1] : a.value;
                        const valueB = Array.isArray(b.value) ? b.value[1] : b.value;
                        return valueB - valueA;
                    });

                    const totalCount = sortedParams.reduce((sum, param) => {
                        const value = Array.isArray(param.value) ? param.value[1] : param.value;
                        return sum + value;
                    }, 0);

                    // antd button 样式
                    const antdButtonStyle = `
                        line-height: 1.5715;
                        position: relative;
                        display: inline-block;
                        font-weight: 400;
                        white-space: nowrap;
                        text-align: center;
                        background-image: none;
                        border: 1px solid transparent;
                        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.015);
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
                        user-select: none;
                        touch-action: manipulation;
                        height: 24px;
                        padding: 0px 7px;
                        font-size: 12px;
                        border-radius: 2px;
                        color: rgba(0, 0, 0, 0.85);
                        border-color: #d9d9d9;
                        background: #fff;
                        margin-left: 4px;
                    `;

                    let content = `<div style="max-height: 400px; overflow-y: auto;">`;
                    content += `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #eee;">`;
                    content += `<div style="font-size: 12px; color: #666;">${params[0].axisValueLabel}</div>`;
                    content += `<div style="font-weight: bold; margin-top: 4px;">总${isResponseTime ? '响应时间' : '失败笔数'}: ${isResponseTime ? Math.round(totalCount) + 'ms' : totalCount}</div>`;
                    content += `</div>`;
                    
                    sortedParams.forEach((param, index) => {
                        const marker = param.marker;
                        let value = Array.isArray(param.value) ? param.value[1] : param.value;
                        if (isResponseTime) {
                            value = `${Math.round(value)}ms`;
                        }
                        content += `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span>${marker} ${param.seriesName}: ${value}</span>
                                <div>
                                    <button 
                                        onclick="window.handleAnalyzeClick && window.handleAnalyzeClick({
                                            shard: '${param.seriesName}',
                                            time: '${params[0].axisValueLabel}',
                                            value: '${value}',
                                            type: '${isResponseTime ? 'responseTime' : 'failureCount'}'
                                        })"
                                        style="${antdButtonStyle}"
                                        onmouseover="this.style.color='#40a9ff';this.style.borderColor='#40a9ff'"
                                        onmouseout="this.style.color='rgba(0, 0, 0, 0.85)';this.style.borderColor='#d9d9d9'"
                                    >
                                        分析
                                    </button>
                                    <button 
                                        onclick="window.handleDetailClick && window.handleDetailClick({
                                            shard: '${param.seriesName}',
                                            time: '${params[0].axisValueLabel}',
                                            value: '${value}',
                                            type: '${isResponseTime ? 'responseTime' : 'failureCount'}'
                                        })"
                                        style="${antdButtonStyle}"
                                        onmouseover="this.style.color='#40a9ff';this.style.borderColor='#40a9ff'"
                                        onmouseout="this.style.color='rgba(0, 0, 0, 0.85)';this.style.borderColor='#d9d9d9'"
                                    >
                                        详情
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                    
                    content += '</div>';
                    return content;
                }
            },
            legend: {
                show: false, // 隐藏原有的图例
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: 60,
                containLabel: true
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                axisLabel: {
                    formatter: (value) => moment(value).format('HH:mm')
                }
            },
            yAxis: {
                type: 'value',
                name: isResponseTime ? '响应时间(ms)' : '失败笔数',
                axisLabel: {
                    formatter: '{value}' + (isResponseTime ? 'ms' : '')
                }
            },
            series: filteredData
                .filter(db => selectedShards.has(db.name))
                .map((db, index) => ({
                    name: db.name,
                    type: 'line',
                    smooth: true,
                    data: db[type],
                    itemStyle: {
                        color: colors[index].primary,
                        opacity: colors[index].opacity
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: colors[index].areaStart },
                                { offset: 1, color: colors[index].areaEnd }
                            ]
                        },
                        opacity: colors[index].opacity
                    }
                }))
        };
    };

    // 添加新的处理函数用于第一级图表的详情点击
    const handleBusinessDetailClick = useCallback((data) => {
        try {
            setLoading(true);
            setDrawerVisible(true);
            
            // Mock API response
            const detailData = generateMockDetailedData(data.business);
            
            // 延迟设置数据，等待抽屉动画完成
            setTimeout(() => {
                setDetailedData(detailData);
                setSelectedBusiness({ name: data.business });
                setSelectedDatacenter(data.datacenter);
                setDrawerTitle(`${data.business} - ${data.datacenter} - 分库监控`);
                setDrawerWidth('80%');
                setLoading(false);
            }, 300);
            
        } catch (error) {
            message.error('获取详细数据失败');
            setLoading(false);
        }
    }, []);

    // 处理分析点击
    const handleAnalyzeClick = useCallback((data) => {
        setShowFaultTree(true);
        setFaultTreeKey(prev => prev + 1);
    }, []);

    // 处理详情点击
    const handleDetailClick = useCallback((data) => {
        setDetailsLoading(true);
        setShowDetails(true);
        
        // 根据是否有datacenter属性来区分是第一级还是第二级图表
        const title = data.datacenter 
            ? `${data.business} - ${data.datacenter} - ${data.time}`
            : `${data.shard} - ${data.time}`;
        
        // 模拟 API 调用延迟
        setTimeout(() => {
            setDetailsData({
                title: title,
                data: mockFailureData
            });
            setDetailsLoading(false);
        }, 500);
    }, []);

    // 在组件挂载时设置全局函数
    useEffect(() => {
        window.handleBusinessDetailClick = handleBusinessDetailClick;
        window.handleAnalyzeClick = handleAnalyzeClick;
        window.handleDetailClick = handleDetailClick;
        
        // 清理函数
        return () => {
            window.handleBusinessDetailClick = undefined;
            window.handleAnalyzeClick = undefined;
            window.handleDetailClick = undefined;
        };
    }, [handleBusinessDetailClick, handleAnalyzeClick, handleDetailClick]);

    // 详情表格列定义
    const detailColumns = [
        {
            title: '失败时间',
            dataIndex: 'failureTime',
            key: 'failureTime',
            width: 180,
        },
        {
            title: '失败类型',
            dataIndex: 'failureType',
            key: 'failureType',
            width: 120,
        },
        {
            title: '错误信息',
            dataIndex: 'errorMessage',
            key: 'errorMessage',
            width: 200,
        },
        {
            title: 'SQL语句',
            dataIndex: 'sqlStatement',
            key: 'sqlStatement',
            ellipsis: true,
        }
    ];

    // 处理范围输入的变化
    const handleThresholdChange = (type, field, value) => {
        const setValue = type === 'responseTime' ? setResponseTimeThreshold : setFailureCountThreshold;
        setValue(prev => ({
            ...prev,
            [field]: value === '' ? (field === 'min' ? 0 : Infinity) : Number(value)
        }));
    };

    return (
        <div className="link-sentinel">
            <div className="sub-title">
                <div>
                    <Link className="title-text" to="/">Home</Link>
                    {' >> '}
                    <Link className="title-text" to="/linkSentinel">链路哨兵</Link>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Button.Group>
                        <Button 
                            type={metricType === 'responseTime' ? 'primary' : 'default'}
                            onClick={() => setMetricType('responseTime')}
                        >
                            响应时间
                        </Button>
                        <Button 
                            type={metricType === 'failureCount' ? 'primary' : 'default'}
                            onClick={() => setMetricType('failureCount')}
                        >
                            失败笔数
                        </Button>
                    </Button.Group>

                    <DatePicker.RangePicker
                        showTime
                        value={timeRange}
                        onChange={handleTimeRangeChange}
                        ranges={quickRanges}
                        allowClear={false}
                        format="YYYY-MM-DD HH:mm:ss"
                        style={{ width: '400px' }}
                    />

                    <Button.Group>
                        <Button 
                            type={autoRefresh ? 'primary' : 'default'}
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            icon={autoRefresh ? <Icon type="pause-circle" /> : <Icon type="play-circle" />}
                        >
                            {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
                        </Button>
                        <Button type="primary" onClick={fetchBusinessData}>
                            刷新
                        </Button>
                    </Button.Group>
                </div>
            </div>
            
            <Spin spinning={loading}>
                <Row gutter={[16, 16]}>
                    {businessData.map(business => (
                        <Col span={12} key={business.id}>
                            <Card 
                                title={business.name}
                                extra={
                                    <Button 
                                        type="link"
                                        onClick={() => handleBusinessClick(business)}
                                    >
                                        查看详情
                                    </Button>
                                }
                            >
                                <ReactEcharts
                                    option={getBusinessChartOption(business)}
                                    style={{ height: '300px' }}
                                    notMerge={true}
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Spin>

            <Drawer
                title={drawerTitle}
                placement="right"
                width="90%"
                onClose={() => {
                    setDrawerVisible(false);
                    // 延迟清除数据，等待抽屉关闭动画完成
                    setTimeout(() => {
                        setSelectedBusiness(null);
                        setDetailedData(null);
                        setDetailMetricType('responseTime');
                        setShowFaultTree(false);
                        setShowDetails(false);
                        setDetailsData(null);
                    }, 300);
                }}
                visible={drawerVisible}
                className="metrics-drawer"
                destroyOnClose={true}
                afterVisibleChange={(visible) => {
                    if (visible) {
                        // 强制重新计算图表大小
                        window.dispatchEvent(new Event('resize'));
                    }
                }}
            >
                {selectedBusiness && detailedData && (
                    <div>
                        <div style={{ 
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <Button.Group style={{ marginRight: '16px' }}>
                                <Button 
                                    type={detailMetricType === 'responseTime' ? 'primary' : 'default'}
                                    onClick={() => setDetailMetricType('responseTime')}
                                >
                                    响应时间
                                </Button>
                                <Button 
                                    type={detailMetricType === 'failureCount' ? 'primary' : 'default'}
                                    onClick={() => setDetailMetricType('failureCount')}
                                >
                                    失败笔数
                                </Button>
                            </Button.Group>

                            <div>
                                {detailMetricType === 'responseTime' ? (
                                    <span>
                                        响应时间范围：
                                        <input
                                            type="number"
                                            min="0"
                                            value={responseTimeThreshold.min}
                                            onChange={(e) => handleThresholdChange('responseTime', 'min', e.target.value)}
                                            style={{ 
                                                width: '60px',
                                                marginLeft: '8px',
                                                marginRight: '4px',
                                                padding: '4px 8px',
                                                border: '1px solid #d9d9d9',
                                                borderRadius: '2px'
                                            }}
                                        />
                                        {' - '}
                                        <input
                                            type="number"
                                            min="0"
                                            value={responseTimeThreshold.max === Infinity ? '' : responseTimeThreshold.max}
                                            onChange={(e) => handleThresholdChange('responseTime', 'max', e.target.value)}
                                            style={{ 
                                                width: '60px',
                                                marginLeft: '4px',
                                                marginRight: '4px',
                                                padding: '4px 8px',
                                                border: '1px solid #d9d9d9',
                                                borderRadius: '2px'
                                            }}
                                        /> ms
                                    </span>
                                ) : (
                                    <span>
                                        失败笔数范围：
                                        <input
                                            type="number"
                                            min="0"
                                            value={failureCountThreshold.min}
                                            onChange={(e) => handleThresholdChange('failureCount', 'min', e.target.value)}
                                            style={{ 
                                                width: '60px',
                                                marginLeft: '8px',
                                                marginRight: '4px',
                                                padding: '4px 8px',
                                                border: '1px solid #d9d9d9',
                                                borderRadius: '2px'
                                            }}
                                        />
                                        {' - '}
                                        <input
                                            type="number"
                                            min="0"
                                            value={failureCountThreshold.max === Infinity ? '' : failureCountThreshold.max}
                                            onChange={(e) => handleThresholdChange('failureCount', 'max', e.target.value)}
                                            style={{ 
                                                width: '60px',
                                                marginLeft: '4px',
                                                marginRight: '4px',
                                                padding: '4px 8px',
                                                border: '1px solid #d9d9d9',
                                                borderRadius: '2px'
                                            }}
                                        /> 笔
                                    </span>
                                )}
                            </div>
                        </div>

                        <Spin spinning={loading}>
                            <div style={{ position: 'relative' }}>
                                <ReactEcharts
                                    option={getDetailedChartOption(detailedData, detailMetricType)}
                                    style={{ height: '500px' }}
                                    notMerge={true}
                                    lazyUpdate={false}
                                    key={`${selectedBusiness.id}-${detailMetricType}`}
                                />
                            </div>
                        </Spin>

                                                {/* 失败详情 */}
                                                {showDetails && (
                            <div style={{ 
                                marginTop: '16px', 
                                padding: '16px',
                                background: '#fff',
                                border: '1px solid #f0f0f0',
                                borderRadius: '2px'
                            }}>
                                <div style={{ 
                                    marginBottom: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <h4 style={{ margin: 0 }}>
                                        失败详情: {detailsData?.title}
                                    </h4>
                                    <Button 
                                        type="text" 
                                        icon={<Icon type="close" />}
                                        onClick={() => {
                                            setShowDetails(false);
                                            setDetailsData(null);
                                        }}
                                    />
                                </div>
                                <Spin spinning={detailsLoading}>
                                    <Table
                                        columns={detailColumns}
                                        dataSource={detailsData?.data || []}
                                        rowKey="id"
                                        size="small"
                                        pagination={{
                                            pageSize: 10,
                                            showSizeChanger: true,
                                            showQuickJumper: true
                                        }}
                                        scroll={{ x: 'max-content' }}
                                    />
                                </Spin>
                            </div>
                        )}

                        {/* 添加故障树分析 */}
                        {showFaultTree && (
                            <div style={{ 
                                marginTop: '16px', 
                                padding: '16px',
                                background: '#fafafa',
                                border: '1px solid #f0f0f0',
                                borderRadius: '2px'
                            }}>
                                <div style={{ 
                                    marginBottom: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <h4 style={{ margin: 0 }}>故障分析</h4>
                                    <Button 
                                        type="text" 
                                        icon={<Icon type="close" />}
                                        onClick={() => setShowFaultTree(false)}
                                    />
                                </div>
                                <FaultTreeIndex
                                    // cluster_name={selectedBusiness?.name}
                                    cluster_name="devops_test"
                                    key={`fault-tree-new-${faultTreeKey}`}
                                />
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
}
