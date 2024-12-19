// src/FaultTree.js
import React, { useEffect, useRef, useState } from 'react';
import G6 from '@antv/g6';
import { message, Drawer, DatePicker, Button, Input, Icon, Spin } from 'antd';
import ReactECharts from 'echarts-for-react';
import moment from 'moment';
import MyAxios from "../common/interface"

const { RangePicker } = DatePicker;
const { TextArea, Search } = Input;

const FaultTree = ({ data }) => {
  const ref = useRef(null);
  const graphRef = useRef(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [timeRange, setTimeRange] = useState([
    moment().subtract(15, 'minutes'),
    moment()
  ]);
  const [chartData, setChartData] = useState({unit: '', data: []});
  const [loading, setLoading] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const mountedRef = useRef(true);
  const [drawerType, setDrawerType] = useState(null); // 'monitor' 或 'logs'
  const [logData, setLogData] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const textAreaRef = useRef(null);
  const [graph, setGraph] = useState(null);
  const treeDataRef = useRef({ nodes: [], edges: [] });  // 添加树数据引用
  const prevDataRef = useRef(null);  // 添加前一次数据的引用

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 数据准备状态的监听
  useEffect(() => {
    if (mountedRef.current) {
      if (data) {
        // 延迟设置数据准备，确保DOM已经准备好
        setTimeout(() => {
          if (mountedRef.current) {
            setIsDataReady(true);
          }
        }, 0);
      } else {
        setIsDataReady(false);
      }
    }
  }, [data]);

  // 修改原有的 useEffect，添加数据准备和组件挂载检查
  useEffect(() => {
    if (!isDataReady || !data || !mountedRef.current || !ref.current) return;
    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, [isDataReady, data]);

  // 添加居中方法
  const handleFitView = () => {
    if (graphRef.current) {
      graphRef.current.fitView([100, 260, 100, 100]);
    }
  };


  // 获取历史监控数据
  const handleGetHistoryData = async (nodeInfo, startTime, endTime) => {
    setLoading(true);
    setChartData([]);

    try {
      const params = {
        "time_from": moment(startTime).format('YYYY-MM-DD HH:mm:ss'),
        "time_till": moment(endTime).format('YYYY-MM-DD HH:mm:ss'),
        "node_info": nodeInfo,
        "get_type": "data"
      }
      const res = await MyAxios.post('/fault_tree/v1/get_metric_history/', params);

      if (res.data.status === 'ok') {
        const dataPoints = res.data.data;
        // 获取第一个数据点的单位（如果存在）
        const metric_units = dataPoints.length > 0 ? dataPoints[0].metric_units : '';

        const transformedData = dataPoints.map(item => [
          moment(item.metric_time).valueOf(),
          Number(item.metric_value)
        ]);

        setChartData({
          unit: metric_units,
          data: transformedData
        });
        message.success('获取成功');
      } else {
        message.error(res.data.message || '获取失败');
      }
    } catch (err) {
      console.error('获取监控日志出现异常:', err);
      message.error('获取监控日志出现异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 修改日志数据处理方法
  const handleGetLogs = async (nodeInfo, startTime, endTime) => {
    setLoading(true);
    setLogData('');
    try {
      // 模拟API调用延
      const params = {
        "time_from": moment(startTime).format('YYYY-MM-DD HH:mm:ss'),
        "time_till": moment(endTime).format('YYYY-MM-DD HH:mm:ss'),
        "node_info": nodeInfo,
        "get_type": "log"
      }
      const res = await MyAxios.post('/fault_tree/v1/get_metric_history/', params);
      if (res.data.status === 'ok') {
        // 直接生成文本格式的日志
        let logText = res.data.data;
        setLogData(logText.trim());
        setLoading(false);
        message.success('获取日志成功');
      } else {
        message.error(res.data.message || '获取失败');
      }
    } catch (err) {
      console.error('获取监控日志出现异常:', err);
      message.error('获取监控日志出现异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 时间范围变化处理
  const handleTimeRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setTimeRange(dates);
      if (selectedNode) {
        if (drawerType === 'monitor') {
          handleGetHistoryData(selectedNode, dates[0], dates[1]);
        } else {
          handleGetLogs(selectedNode, dates[0], dates[1]);
        }
      }
    }
  };

  // ECharts 配置
  const getOption = () => ({
    title: {
      text: '监控数据趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const time = moment(params[0].value[0]).format('YYYY-MM-DD HH:mm:ss');
        const value = params[0].value[1] + (chartData.unit || '');
        return `时间：${time}<br/>值：${value}`;
      }
    },
    toolbox: {
      show: true,
      feature: {
        dataZoom: {
          show: true,
          yAxisIndex: 'none',
          title: {
            zoom: '区域缩放',
            back: '还原'
          },
          iconStyle: {
            borderColor: '#666'  // 默认边框颜色
          },
          emphasis: {
            iconStyle: {
              borderColor: '#69c0ff',
              borderWidth: 2,
              color: '#69c0ff'
            }
          }
        }
      },
      right: 20
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '10%',
      bottom: '20%',
      containLabel: true
    },
    dataZoom: [
      {
        type: 'slider',
        showDetail: true,
        show: true,
        xAxisIndex: [0],
        bottom: '5%',
        start: 0,
        end: 100,
        height: 30,
        borderColor: '#ddd',
        backgroundColor: '#f7f7f7',
        fillerColor: 'rgba(24,144,255,0.2)',
        handleStyle: {
          color: '#1890ff'
        }
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        start: 0,
        end: 100
      }
    ],
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: function(value) {
          return moment(value).format('YYYY-MM-DD HH:mm:ss');
        }
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value) => value + (chartData.unit || '')
      },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    series: [{
      name: '监控值',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: chartData.data || [],
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
  });


  // 在初始化图时，为每个节点添加父节点引用
  useEffect(() => {
    if (!graphRef.current) {
      // 使用你���有的完整节点注册代码
      G6.registerNode('custom-node', {
        draw(cfg, group) {
          const {
            name,
            node_status,
            instance_info,
            metric_extra_info
          } = cfg;

          const statusStrokeColors = {
            info: '#bad6f1',
            error: '#e32629',
            warning: '#edc677'
          };
          const statusFillColors = {
            info: '#bad6f1',
            error: '#efacac',
            warning: '#edc677'
          };

          const width = 260;
          const height = 60;

          // 主矩形
          const rect = group.addShape('rect', {
            attrs: {
              x: -width / 2,
              y: -height / 2,
              width,
              height,
              radius: metric_extra_info ? [4, 4, 0, 0] : 4,
              fill: '#fff',
              stroke: statusStrokeColors[node_status] || statusStrokeColors.info,
              lineWidth: 2,
              cursor: 'pointer',
            },
            name: 'node-box',
          });

          group.addShape('text', {
            attrs: {
              text: name,
              x: 0,
              y: instance_info ? -15 : 0,
              fontSize: 20,
              fontWeight: 'bold',
              textAlign: 'center',
              textBaseline: 'middle',
              fill: '#333',
            },
            name: 'node-label',
          });

          if (instance_info) {
            group.addShape('text', {
              attrs: {
                text: `${instance_info.ip}_${instance_info.port}`,
                x: 0,
                y: 15,
                fontSize: 15,
                textAlign: 'center',
                textBaseline: 'middle',
                fill: '#666',
              },
              name: 'description',
            });
          }

          if (metric_extra_info) {
            group.addShape('rect', {
              attrs: {
                x: -width / 2,
                y: height - 30,
                width,
                height: 100,
                radius: [0, 0, 4, 4],
                fill: statusFillColors[node_status] || statusFillColors.info,
                stroke: statusStrokeColors[node_status] || statusStrokeColors.info,
                lineWidth: 2,
              },
              name: 'title-box',
            });

            // 监控按钮
            group.addShape('rect', {
              attrs: {
                x: -width / 2 + 10,
                y: height / 2 + 70,
                width: 24,
                height: 24,
                radius: 4,
                fill: '#1890ff',
                cursor: 'pointer',
              },
              name: 'history-btn-box',
            });

            // 监控按钮图标
            group.addShape('path', {
              attrs: {
                path: [
                  ['M', -width / 2 + 22, height / 2 + 82],
                  ['M', -width / 2 + 22, height / 2 + 77],
                  ['L', -width / 2 + 22, height / 2 + 82],
                  ['L', -width / 2 + 27, height / 2 + 82],
                ],
                stroke: '#fff',
                lineWidth: 1.5,
                cursor: 'pointer',
              },
              name: 'history-btn-icon',
            });

            // 日志按钮
            group.addShape('rect', {
              attrs: {
                x: -width / 2 + 44, // 位置在监控按钮右侧
                y: height / 2 + 70,
                width: 24,
                height: 24,
                radius: 4,
                fill: '#52c41a',
                cursor: 'pointer',
              },
              name: 'log-btn-box',
            });

            // 日志按钮图标（简单的文档图标）
            group.addShape('path', {
              attrs: {
                path: [
                  ['M', -width / 2 + 50, height / 2 + 75],
                  ['L', -width / 2 + 62, height / 2 + 75],
                  ['M', -width / 2 + 50, height / 2 + 80],
                  ['L', -width / 2 + 62, height / 2 + 80],
                  ['M', -width / 2 + 50, height / 2 + 85],
                  ['L', -width / 2 + 62, height / 2 + 85],
                ],
                stroke: '#fff',
                lineWidth: 1.5,
                cursor: 'pointer',
              },
              name: 'log-btn-icon',
            });

            group.addShape('circle', {
              attrs: {
                x: -width / 2 + 22,
                y: height / 2 + 82,
                r: 6,
                stroke: '#fff',
                lineWidth: 1.5,
                fill: 'transparent',
                cursor: 'pointer',
              },
              name: 'history-btn-circle',
            });

            // 指标信息
            group.addShape('text', {
              attrs: {
                text: `指标值：${metric_extra_info.metric_value_units_human}`,
                x: -width / 2 + 10,
                y: height / 2 + 10,
                fontSize: 12,
                textAlign: 'left',
                textBaseline: 'middle',
                fill: '#666',
              },
              name: 'metric-value',
            });

            group.addShape('text', {
              attrs: {
                text: `时间：${metric_extra_info.metric_time}`,
                x: -width / 2 + 10,
                y: height / 2 + 30,
                fontSize: 12,
                textAlign: 'left',
                textBaseline: 'middle',
                fill: '#666',
              },
              name: 'trigger-time',
            });

            group.addShape('text', {
              attrs: {
                text: `规则条件：${metric_extra_info.rule_condition_format_human}`,
                x: -width / 2 + 10,
                y: height / 2 + 50,
                fontSize: 12,
                textAlign: 'left',
                textBaseline: 'middle',
                fill: '#666',
              },
              name: 'rule-condition',
            });
          }

          // 折叠按钮
          if (cfg.children && cfg.children.length) {
            group.addShape('circle', {
              attrs: {
                x: -width / 2 - 15,
                y: 0,
                r: height / 5,
                fill: '#fff',
                stroke: '#666',
                cursor: 'pointer',
              },
              name: 'collapse-back',
            });

            group.addShape('text', {
              attrs: {
                x: -width / 2 - 15,
                y: 0,
                text: cfg.collapsed ? '+' : '-',
                fontSize: 25,
                textAlign: 'center',
                textBaseline: 'middle',
                fill: '#666',
                cursor: 'pointer',
              },
              name: 'collapse-text',
            });
          }

          return rect;
        },
      });

      const graph = new G6.TreeGraph({
        container: ref.current,
        width: 1200,
        height: 800,
        modes: {
          default: ['drag-canvas', 'zoom-canvas'],
        },
        defaultNode: {
          type: 'custom-node',
        },
        defaultEdge: {
          type: 'polyline',
          style: {
            stroke: '#AAB7C4',
            lineWidth: 2,
          },
        },
        layout: {
          type: 'compactBox',
          direction: 'TB',
          getId: d => d.id,
          getHeight: () => 80,
          getWidth: () => 180,
          getVGap: (d) => {
            return d.children && d.children.length > 0 ? 100 : 50;
          },
          getHGap: () => 60,
        },
        animate: true,
      });

      // 使用你原有的事件处理代码，但添加历史监控功能
      graph.on('node:click', (evt) => {
        const { item, target } = evt;
        const targetName = target.get('name');
        const model = item.getModel();

        if (targetName === 'collapse-back' || targetName === 'collapse-text') {
          graph.updateItem(item, {
            collapsed: !model.collapsed
          });
          graph.layout();
        } else if (targetName.includes('history-btn')) {
          if (model.metric_extra_info) {
            setDrawerType('monitor');
            setSelectedNode(model);
            setDrawerVisible(true);
            handleGetHistoryData(model, timeRange[0], timeRange[1]);
          }
        } else if (targetName.includes('log-btn')) {
          if (model.metric_extra_info) {
            setDrawerType('logs');
            setSelectedNode(model);
            setDrawerVisible(true);
            handleGetLogs(model, timeRange[0], timeRange[1]);
          }
        }
      });

      graphRef.current = graph;
    }

    // 使用你原有的数据处理代码
    if (graphRef.current && data) {
      // 直接使用转换好的数据
      graphRef.current.data(data);
      graphRef.current.render();
      graphRef.current.fitView([100, 260, 100, 100]);
    }

    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
      }
    };
  }, [data]);

  // 修改数据更新的 useEffect
  useEffect(() => {
    if (!graphRef.current || !data) return;

    const graph = graphRef.current;
    const existingNodes = new Set(graph.getNodes().map(node => node.get('id')));
    
    // 递归处理节点
    const processNode = (node, parentId = null) => {
      const nodeExists = existingNodes.has(node.id);
      
      if (!nodeExists) {
        // 添加新节点
        graph.addItem('node', {
          ...node,
          x: 0,  // 初始位置将由布局调整
          y: 0
        });

        // 如果有父节点，添加边
        if (parentId) {
          graph.addItem('edge', {
            source: parentId,
            target: node.id
          });
        }
      }

      // 递归处理子节点
      if (node.children) {
        node.children.forEach(child => processNode(child, node.id));
      }
    };

    // 从根节点开始处理
    processNode(data);

    // 重新布局
    graph.layout();
    graph.fitView([100, 260, 100, 100]);

  }, [data]);

  // 添加搜索处理函数
  const handleSearch = (value) => {
    if (!value.trim()) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      return;
    }

    const results = [];
    let pos = 0;
    const text = logData.toLowerCase();
    const keyword = value.toLowerCase();

    while ((pos = text.indexOf(keyword, pos)) !== -1) {
      results.push(pos);
      pos += 1;
    }

    setSearchResults(results);
    setCurrentResultIndex(results.length > 0 ? 0 : -1);
    setSearchKeyword(value);

    // 如果有搜索结果，滚动到第一个匹配项
    if (results.length > 0) {
      scrollToResult(results[0]);
    }
  };

  // 修改滚动到指定位置的函数
  const scrollToResult = (position) => {
    if (textAreaRef.current) {
      const textarea = textAreaRef.current.resizableTextArea.textArea;
      const text = textarea.value;

      // 设置选中状态
      textarea.setSelectionRange(position, position + searchKeyword.length);
      textarea.focus();

      // 获取 TextArea 的行高和可视区域高度
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      const visibleHeight = textarea.clientHeight;

      // 计算目标位置的行号
      const beforeText = text.substring(0, position);
      const targetLine = beforeText.split('\n').length;

      // 计算目标位置应该滚动到的位置
      const targetPosition = (targetLine - 1) * lineHeight;

      // 确保目标位置在可视区域的中间
      const scrollPosition = Math.max(
        0, // 不小于0
        targetPosition - (visibleHeight / 2) // 将目标行置于可视区域中间
      );

      textarea.scrollTop = scrollPosition;
    }
  };

  // 修改处理上一个/下一个结果的函数
  const handlePrevResult = () => {
    if (searchResults.length > 0 && currentResultIndex > 0) {
      const newIndex = currentResultIndex - 1;
      setCurrentResultIndex(newIndex);
      scrollToResult(searchResults[newIndex]);
    }
  };

  const handleNextResult = () => {
    if (searchResults.length > 0 && currentResultIndex < searchResults.length - 1) {
      const newIndex = currentResultIndex + 1;
      setCurrentResultIndex(newIndex);
      scrollToResult(searchResults[newIndex]);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute',
        right: 20,
        top: 20,
        zIndex: 10,
      }}>
        <Button
          type="primary"
          onClick={handleFitView}
          title="居中显示"
          style={{ opacity: 0.8 }}
        >
          <Icon type="arrows-alt" /> 居中
        </Button>
      </div>
      <div
        ref={ref}
        style={{
          width: '100%',
          height: '800px',
          border: '1px solid #ccc',
          margin: 'auto',
          overflow: 'hidden'
        }}
      />
      <Drawer
        title={drawerType === 'monitor' ? "历史监控" : "日志查看"}
        placement="bottom"
        closable={true}
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        height={400}
      >
        {selectedNode && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>节点：{selectedNode.id}</h4>
                <RangePicker
                  showTime
                  value={timeRange}
                  onChange={handleTimeRangeChange}
                  ranges={{
                    '最近1分钟': [moment().subtract(1, 'minutes'), moment()],
                    '最近5分钟': [moment().subtract(5, 'minutes'), moment()],
                    '最近15分钟': [moment().subtract(15, 'minutes'), moment()],
                    '最近30分钟': [moment().subtract(30, 'minutes'), moment()],
                    '最近1小时': [moment().subtract(1, 'hours'), moment()],
                    '最近24小时': [moment().subtract(24, 'hours'), moment()],
                    '最近7天': [moment().subtract(7, 'days'), moment()],
                  }}
                />
              </div>
              <Spin spinning={loading}>
                <div style={{ width: '100%', height: 280 }}>
                  {!loading && drawerType === 'monitor' && chartData.data.length > 0 && (
                    <ReactECharts
                      option={getOption()}
                      style={{ height: '100%', width: '100%' }}
                      notMerge={true}
                      lazyUpdate={true}
                    />
                  )}
                  {!loading && drawerType === 'logs' && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                        <Search
                          placeholder="输入搜索关键词"
                          onSearch={handleSearch}
                          style={{ width: 200, marginRight: 8 }}
                        />
                        {searchResults.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: 8 }}>{`${currentResultIndex + 1}/${searchResults.length}`}</span>
                            <Button.Group>
                              <Button 
                                onClick={handlePrevResult}
                                disabled={searchResults.length === 0 || currentResultIndex === 0}
                              >
                                <Icon type="up" />
                              </Button>
                              <Button 
                                onClick={handleNextResult}
                                disabled={searchResults.length === 0 || currentResultIndex === searchResults.length - 1}
                              >
                                <Icon type="down" />
                              </Button>
                            </Button.Group>
                          </div>
                        )}
                      </div>
                      <TextArea
                        ref={textAreaRef}
                        value={logData}
                        readOnly
                        style={{ 
                          width: '100%',
                          height: '280px',
                          resize: 'vertical',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          backgroundColor: '#f5f5f5',
                          minHeight: '100px',
                          maxHeight: '600px'
                        }}
                      />
                    </div>
                  )}
                </div>
              </Spin>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default FaultTree;