import React from 'react';
import ReactEcharts from 'echarts-for-react';

const ZabbixChart = ({ data, style = {}, showHeader = false }) => {
    // 确保数据存在且有效
    if (!Array.isArray(data) || data.length === 0) {
        return <div>No data available</div>;
    }

    const getChartOption = () => {
        // 提取时间和值的数组
        const times = data.map(item => item.metric_time);
        const values = data.map(item => parseFloat(item.value));
        
        // 使用第一个数据点获取基本信息
        const firstItem = data[0];

        // 计算统计值
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

        // 确定是否从0开始
        const shouldStartFromZero = minValue <= maxValue * 0.1;  // 如果最小值小于最大值的10%，则从0开始
        const yAxisMin = shouldStartFromZero ? 0 : minValue * 0.95;

        return {
            title: {
                text: firstItem.key_,
                left: 'center',
                top: 5,
                textStyle: {
                    color: '#666',
                    fontSize: 13
                },
                subtext: `min: ${minValue.toFixed(2)}${firstItem.units} • avg: ${avgValue.toFixed(2)}${firstItem.units} • max: ${maxValue.toFixed(2)}${firstItem.units}`
            },
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
                top: 70,  // 增加顶部空间以显示统计信息
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
                smooth: false,  // 改为false以更准确显示数据点
                symbol: 'circle',
                symbolSize: 4,
                sampling: 'lttb',
                lineStyle: {
                    width: 1.5,
                    color: '#1F78C1'  // Zabbix默认的蓝色
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
    };

    return (
        <div style={{ width: '100%', padding: '5px 0' }}>
            {showHeader && (
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '5px',
                    color: '#666',
                    fontSize: '12px'
                }}>
                    数据点数量: {data.length}
                </div>
            )}
            <ReactEcharts 
                option={getChartOption()} 
                style={{ height: '200px', ...style }}
                opts={{ renderer: 'svg' }}
            />
        </div>
    );
};

export default ZabbixChart; 