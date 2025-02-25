import React, { useMemo } from 'react';
import ReactEcharts from 'echarts-for-react';

// 使用React.memo包装组件，避免不必要的重渲染
const ZabbixChart = React.memo(({ data, style = {}, showHeader = true }) => {
    // 确保数据存在且有效
    if (!Array.isArray(data) || data.length === 0) {
        return <div>No data available</div>;
    }

    // 使用useMemo缓存图表配置，避免每次渲染都重新计算
    const chartOption = useMemo(() => {
        // 使用全量数据，不进行采样
        const processedData = data;

        // 提取时间和值的数组
        const times = processedData.map(item => item.metric_time);
        const values = processedData.map(item => parseFloat(item.value));
        
        // 使用第一个数据点获取基本信息
        const firstItem = processedData[0];

        // 计算统计值
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

        // 确定是否从0开始
        const shouldStartFromZero = minValue <= maxValue * 0.1;  // 如果最小值小于最大值的10%，则从0开始
        const yAxisMin = shouldStartFromZero ? 0 : minValue * 0.95;

        return {
            title: showHeader ? {
                text: `${firstItem.key_} (${processedData.length} 个数据点)`,
                subtext: `最小值: ${minValue.toFixed(2)}${firstItem.units} • 平均值: ${avgValue.toFixed(2)}${firstItem.units} • 最大值: ${maxValue.toFixed(2)}${firstItem.units}`,
                left: 'center',
                top: 5,
                textStyle: {
                    color: '#666',
                    fontSize: 13
                },
                subtextStyle: {
                    color: '#666',
                    fontSize: 12
                }
            } : undefined,
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const value = params[0].value;
                    const time = params[0].axisValue;
                    return `${time}<br/>${value}${firstItem.units}`;
                },
                axisPointer: {
                    type: 'line',
                    lineStyle: {
                        color: '#666',
                        type: 'dashed'
                    }
                }
            },
            grid: {
                top: showHeader ? 70 : 30,
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: times,
                axisLabel: {
                    rotate: 45,
                    formatter: function(value) {
                        // 只显示时间部分，如果需要
                        return value.split(' ')[1];
                    }
                },
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                min: yAxisMin,
                axisLabel: {
                    formatter: (value) => {
                        return value + firstItem.units;
                    }
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        type: 'dashed',
                        color: '#E5E5E5'
                    }
                }
            },
            dataZoom: [
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                },
                {
                    type: 'slider',
                    start: 0,
                    end: 100,
                    height: 20
                }
            ],
            series: [{
                type: 'line',
                data: values,
                smooth: false,
                symbol: 'circle',
                // 大数据量时不显示所有点的标记
                symbolSize: data.length > 100 ? 0 : 4,
                // 保留LTTB采样算法，但仅在ECharts内部渲染优化时使用
                sampling: 'lttb',
                lineStyle: {
                    width: 1.5,
                    color: '#1F78C1'
                },
                itemStyle: {
                    color: '#1F78C1'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0,
                            color: 'rgba(31,120,193,0.2)'
                        }, {
                            offset: 1,
                            color: 'rgba(31,120,193,0.02)'
                        }]
                    }
                }
            }]
        };
    }, [data, showHeader]); // 只有当data或showHeader变化时才重新计算

    return (
        <div style={{ width: '100%', padding: '5px 0' }}>
            <ReactEcharts 
                option={chartOption} 
                style={{ height: '200px', ...style }}
                opts={{ 
                    renderer: 'canvas',  // 使用canvas渲染器提高性能
                    devicePixelRatio: window.devicePixelRatio  // 适配高DPI显示器
                }}
                lazyUpdate={true}  // 启用懒更新，减少不必要的图表更新
                notMerge={true}    // 完全替换配置，避免合并开销
            />
        </div>
    );
});

export default ZabbixChart; 