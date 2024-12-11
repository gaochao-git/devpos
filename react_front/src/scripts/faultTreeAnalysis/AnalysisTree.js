import React, { useState, useEffect } from 'react';
import { Tree, Card, Space, message, Dropdown } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';
import './index.css';
import G6Tree from './G6Tree';

const FaultTree = ({ treeData }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState(['Root']);

  // 获取所有非 info 状态的节点的 key
  const getNonInfoKeys = (node) => {
    let keys = [];
    if (node.node_status && node.node_status !== 'info') {
      keys.push(node.key);
    }
    if (node.children) {
      node.children.forEach(child => {
        keys = keys.concat(getNonInfoKeys(child));
      });
    }
    return keys;
  };

  // 初始化时设置展开的节点
  useEffect(() => {
    const nonInfoKeys = getNonInfoKeys(treeData);
    setExpandedKeys(prevKeys => [...new Set(['Root', ...nonInfoKeys])]);
  }, [treeData]);

  // Convert data to Tree component format
  const convertToTreeData = (node) => {
    const hasChildren = node.children && node.children.length > 0;
    
    // 根据节点状态设置标题样式
    const getTitleStyle = (status) => {
      switch (status) {
        case 'warning':
          return { color: '#d89614', backgroundColor: '#fffbe6', padding: '2px 4px', borderRadius: '4px' };  // 柔和的黄色
        case 'error':
          return { color: '#cf1322', backgroundColor: '#fff1f0', padding: '2px 4px', borderRadius: '4px' };  // 柔和的红色
        default:
          return {};  // 默认颜色
      }
    };

    const titleStyle = getTitleStyle(node.node_status);

    // 构建显示的标题，如果有 instance_info 则添加到节点名称后
    const displayTitle = node.instance_info 
      ? `${node.name} (${node.instance_info.ip}:${node.instance_info.port})`
      : node.name;

    const treeNode = {
      ...node,
      key: node.key,
      title: <span style={titleStyle}>{displayTitle}</span>,
      isLeaf: !hasChildren
    };

    if (hasChildren) {
      treeNode.children = node.children.map(child => convertToTreeData(child));
    }

    return treeNode;
  };

  // Handle node selection
  const onSelect = (selectedKeys, info) => {
    setSelectedNode(info.node);
    const nodeKeys = getAllNodeKeys(info.node);
    setExpandedKeys(prevKeys => [...new Set([...prevKeys, ...nodeKeys])]);
  };

  // Get all node keys for expansion
  const getAllNodeKeys = (node) => {
    let keys = [node.key];
    if (node.children) {
      node.children.forEach(child => {
        keys = keys.concat(getAllNodeKeys(child));
      });
    }
    return keys;
  };


  // Handle expand all
  // const handleExpandAll = (node) => {
  //   if (!node) return;
  //   const allKeys = getAllNodeKeys(node);
  //   setExpandedKeys(prevKeys => [...new Set([...prevKeys, ...allKeys])]);
  // };

  // 添加展开所有子节点的处理函数
  const handleExpandAll = (node) => {
    if (!node) {
      message.warning('请先选择一个节点');
      return;
    }
    const allKeys = getAllNodeKeys(node);
    setExpandedKeys(prevKeys => [...new Set([...prevKeys, ...allKeys])]);
    message.success('已展开所有子节点');
  };

  // Right-click menu items
  const menuItems = [{
    key: 'expandAll',
    label: '展开所有子节点',
    icon: <ExpandOutlined />,
    onClick: () => handleExpandAll(selectedNode)
  }];

  // 添加一个新的函数来收集所有子节点的触发规则信息
  const collectChildrenMetricInfo = (node, parentPath = []) => {
    let metricInfoList = [];
    // 如果当前节点有触发信息，添加到列表
    if (node.metric_extra_info) {
      metricInfoList.push({
        nodeName: node.name,
        nodePath: node.key,
        nodeStatus: node.node_status,
        ...node.metric_extra_info
      });
    }
    
    // 递归收集子节点的触发信息
    if (node.children) {
      node.children.forEach(child => {
        metricInfoList = metricInfoList.concat(collectChildrenMetricInfo(child, node.key));
      });
    }
    
    return metricInfoList;
  };

  // 修改 renderNodeInfo 函数
  const renderNodeInfo = () => {
    if (!selectedNode) return null;

    // 收集所有子节点的触发规则信息
    const allMetricInfo = collectChildrenMetricInfo(selectedNode);
    const hasMetricInfo = allMetricInfo.length > 0;

    return (
      <>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          {selectedNode.data_source && (
            <Card
              size="small"
              title="指标源"
              bodyStyle={{ padding: '12px' }}
              style={{ flex: 1 }}
            >
              <div className="info-item">
                <span className="label">数据源类型：</span>
                <span className="value">
                  {selectedNode.data_source.type === 'api' ? 'API' :
                   selectedNode.data_source.type === 'internal_function' ? '内部函数' :
                   selectedNode.data_source.type}
                </span>
              </div>
              <div className="info-item">
                <span className="label">数据源：</span>
                <span className="value">{selectedNode.data_source.source}</span>
              </div>
              <div className="info-item">
                <span className="label">指标名称：</span>
                <span className="value">{selectedNode.metric_name || '-'}</span>
              </div>
            </Card>
          )}
          <Card
            size="small"
            title="指标信息"
            bodyStyle={{ padding: '12px' }}
            style={{ flex: 1 }}
          >
            <div className="info-item">
              <span className="label">节点名称：</span>
              <span className="value">{selectedNode.name}</span>
            </div>
            <div className="info-item">
              <span className="label">节点状态：</span>
              <span className="value">{selectedNode.node_status || '-'}</span>
            </div>
            <div className="info-item">
              <span className="label">节点描述：</span>
              <span className="value">{selectedNode.description || '-'}</span>
            </div>
          </Card>
        </div>

        {/* 规则触发信息汇总卡片 */}
        {hasMetricInfo && (
          <Card
            size="small"
            title={`规则触发信息汇总 (共 ${allMetricInfo.length} 条)`}
            style={{ marginBottom: 16 }}
            bodyStyle={{ padding: '12px' }}
          >
            {allMetricInfo.map((info, index) => (
              <div key={index} style={{ 
                marginBottom: index < allMetricInfo.length - 1 ? '16px' : 0,
                padding: '12px',
                border: '1px solid #f0f0f0',
                borderRadius: '4px',
                backgroundColor: info.severity === 'error' ? '#fff1f0' :
                               info.severity === 'warning' ? '#fffbe6' : '#f6ffed'
              }}>
                <div style={{ 
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontWeight: 'bold' }}>
                    {info.nodePath}
                  </span>
                  <span style={{ 
                    color: info.severity === 'error' ? '#cf1322' :
                          info.severity === 'warning' ? '#d89614' : '#52c41a',
                    backgroundColor: info.severity === 'error' ? '#fff1f0' :
                                   info.severity === 'warning' ? '#fffbe6' : '#f6ffed',
                    padding: '2px 8px',
                    borderRadius: '2px',
                    fontSize: '12px'
                  }}>
                    {info.severity}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">指标名称：</span>
                  <span className="value">{info.metric_name}</span>
                </div>
                <div className="info-item">
                  <span className="label">当前值：</span>
                  <span className="value">{info.current_value}</span>
                </div>
                <div className="info-item">
                  <span className="label">触发时间：</span>
                  <span className="value">{info.trigger_time}</span>
                </div>
                {info.rule_condition_format && (
                  <div className="info-item">
                    <span className="label">规则条件：</span>
                    <span className="value">{info.rule_condition_format}</span>
                  </div>
                )}
                {info.status && (
                  <div className="info-item">
                    <span className="label">状态：</span>
                    <span className="value">{info.status}</span>
                  </div>
                )}
                {info.impact_analysis && info.impact_analysis !== '未提供影响分析' && (
                  <div className="info-item">
                    <span className="label">影响分析：</span>
                    <span className="value">{info.impact_analysis}</span>
                  </div>
                )}
                {info.suggestion && info.suggestion !== '未提供处理建议' && (
                  <div className="info-item">
                    <span className="label">处理建议：</span>
                    <span className="value">{info.suggestion}</span>
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}
      </>
    );
  };

  return (
      <G6Tree data={treeData} />
    // <div style={{ display: 'flex', height: 'calc(100vh - 180px)' }}>
    //   <div className="tree-container" style={{ width: '400px', borderRight: '1px solid #f0f0f0' }}>
    //     <div className="tree-scroll-container">
    //       <Dropdown
    //         menu={{ items: menuItems }}
    //         trigger={['contextMenu']}
    //       >
    //         <Tree
    //           treeData={[convertToTreeData(treeData)]}
    //           onSelect={onSelect}
    //           showLine
    //           showIcon
    //           expandedKeys={expandedKeys}
    //           onExpand={(keys) => setExpandedKeys(keys)}
    //           selectedKeys={selectedNode ? [selectedNode.key] : []}
    //         />
    //       </Dropdown>
    //     </div>
    //   </div>
    //   <div className="node-info" style={{ marginLeft: 24, flex: 1, overflowY: 'auto' }}>
    //     {renderNodeInfo()}
    //   </div>
    // </div>
  );
};

export default FaultTree;
