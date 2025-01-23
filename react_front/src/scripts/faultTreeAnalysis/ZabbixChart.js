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

        return {
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const value = params[0].value;
                    const time = params[0].axisValue;
                    return `${time}<br/>${value}${firstItem.units}`;
                }
            },
            grid: {
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
                }
            },
            yAxis: {
                type: 'value',
                name: firstItem.units,
                nameLocation: 'end',
                nameGap: 15,
                scale: true
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
                    end: 100
                }
            ],
            series: [{
                type: 'line',
                data: values,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                sampling: 'lttb',
                lineStyle: {
                    width: 2
                },
                itemStyle: {
                    color: '#1890ff'
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
                            color: 'rgba(24,144,255,0.3)'
                        }, {
                            offset: 1,
                            color: 'rgba(24,144,255,0.1)'
                        }]
                    }
                }
            }]
        };
    };

    return (
        <div style={{ width: '100%', padding: '10px 0' }}>
            {showHeader && (
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '10px',
                    color: '#666'
                }}>
                    数据点数量: {data.length}
                </div>
            )}
            <ReactEcharts 
                option={getChartOption()} 
                style={{ height: '220px', ...style }}
                opts={{ renderer: 'svg' }}
            />
        </div>
    );
};

export default ZabbixChart; 