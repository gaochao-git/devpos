import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spin, message, Drawer, Dropdown, Menu, Checkbox, Space, Icon } from 'antd';
import ReactEcharts from 'echarts-for-react';
import MyAxios from "../common/interface";
import { Link } from 'react-router-dom';
import moment from 'moment';
import { SearchOutlined } from '@ant-design/icons';

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

    const shardNames = getShardNames(businessName);
    return shardNames.map((shardName) => ({
        id: `${businessName}_${shardName}`,
        name: shardName,
        responseTime: timePoints.map(time => [time, Math.floor(Math.random() * 1000)]),
        failureCount: timePoints.map(time => [time, Math.floor(Math.random() * 5)])
    }));
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

    useEffect(() => {
        fetchBusinessData();
        // 设置定时刷新，每分钟更新一次数据
        const timer = setInterval(fetchBusinessData, 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (detailedData) {
            // 默认选中所有分库
            setSelectedShards(new Set(detailedData.map(db => db.name)));
        }
    }, [detailedData]);

    const fetchBusinessData = async () => {
        setLoading(true);
        try {
            // Mock API response
            setTimeout(() => {
                setBusinessData(generateMockBusinessData());
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
                    type: 'cross',
                    label: {
                        backgroundColor: '#6a7985'
                    }
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
            setDrawerVisible(true); // 先打开抽屉
            
            // Mock API response
            const data = generateMockDetailedData(business.name); // 注意这里传入business.name而不是id
            
            // 使用setTimeout模拟API调用，但确保状态更新是同步的
            setDetailedData(data);
            setSelectedBusiness(business);
            setDrawerTitle(`${business.name} - 分库监控`);
            setDrawerWidth('80%');
            
            // 延迟关闭loading状态，确保数据已经渲染
            setTimeout(() => {
                setLoading(false);
            }, 100);
            
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
                                <button 
                                    onclick="window.handleAnalyzeClick && window.handleAnalyzeClick({
                                        shard: '${param.seriesName}',
                                        time: '${params[0].axisValueLabel}',
                                        value: '${value}',
                                        type: '${isResponseTime ? 'responseTime' : 'failureCount'}'
                                    })"
                                    style="
                                        border: 1px solid #d9d9d9;
                                        border-radius: 2px;
                                        padding: 1px 6px;
                                        background: #fff;
                                        font-size: 12px;
                                        cursor: pointer;
                                        color: #666;
                                        margin-left: 8px;
                                    "
                                    onmouseover="this.style.borderColor='#40a9ff';this.style.color='#40a9ff'"
                                    onmouseout="this.style.borderColor='#d9d9d9';this.style.color='#666'"
                                >
                                    分析
                                </button>
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
            series: data
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

    const handleDetailClick = () => {
        // TODO: 后续实现查看原因的功能
        message.info('查看原因功能开发中...');
    };

    // 添加全局处理函数
    window.handleAnalyzeClick = (data) => {
        console.log('分析数据:', data);
        // TODO: 后续实现分析功能
        message.info(`分析 ${data.shard} 在 ${data.time} 的${data.type === 'responseTime' ? '响应时间' : '失败笔数'}: ${data.value}`);
    };

    return (
        <div className="link-sentinel">
            <div className="sub-title">
                <div>
                    <Link className="title-text" to="/">Home</Link>
                    {' >> '}
                    <Link className="title-text" to="/linkSentinel">链路哨兵</Link>
                </div>
                <div>
                    <Button.Group style={{ marginRight: '16px' }}>
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
                    <Button type="primary" onClick={fetchBusinessData}>刷新</Button>
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
                    setSelectedBusiness(null);
                    setDetailedData(null);
                    setDetailMetricType('responseTime');
                }}
                visible={drawerVisible}
                className="metrics-drawer"
                destroyOnClose={true}
            >
                {selectedBusiness && detailedData && (
                    <div>
                        <div style={{ 
                            marginBottom: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <Button.Group style={{ marginRight: '8px' }}>
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
                                <Button 
                                    onClick={handleDetailClick}
                                >
                                    <Icon type="search" /> 查看原因
                                </Button>
                            </div>

                            <Dropdown 
                                overlay={getLegendMenu(detailedData)}
                                trigger={['click']}
                            >
                                <Button>
                                    选择显示分库 ({selectedShards.size}/{detailedData.length})
                                </Button>
                            </Dropdown>
                        </div>

                        <Spin spinning={loading}>
                            <div style={{ position: 'relative' }}>
                                <ReactEcharts
                                    option={getDetailedChartOption(detailedData, detailMetricType)}
                                    style={{ height: '500px' }}
                                    notMerge={true}
                                    lazyUpdate={false}
                                    key={`${selectedBusiness.id}-${detailMetricType}-${selectedShards.size}`}
                                />
                            </div>
                        </Spin>

                        <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                            {detailedData.map(shard => (
                                <Col span={4} key={shard.id}>
                                    <Card 
                                        title={shard.name}
                                        size="small"
                                        style={{
                                            opacity: selectedShards.has(shard.name) ? 1 : 0.5
                                        }}
                                    >
                                        <div style={{ marginBottom: '8px' }}>
                                            <strong>
                                                {detailMetricType === 'responseTime' ? '平均响应时间：' : '失败笔数：'}
                                            </strong>
                                            {detailMetricType === 'responseTime' 
                                                ? `${Math.round(shard.responseTime[shard.responseTime.length - 1][1])} ms`
                                                : shard.failureCount[shard.failureCount.length - 1][1]
                                            }
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
