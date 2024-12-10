import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  Tree,
  Card,
  Form,
  Input,
  Select,
  Button,
  Modal,
  Space,
  Table,
  message,
  Tooltip,
  Upload,
  Switch,
  Dropdown,
  Typography, Radio, Menu, Drawer, Row, Col,
  Icon  // 从 antd 直接导入 Icon
} from 'antd';
import './index.css';
import MyAxios from "../common/interface"
import ReactDiffViewer from 'react-diff-viewer';

const { Option } = Select;
const { Title } = Typography;

const FaultTreeConfigNew = forwardRef(({ initialValues, onSave, onFormChange }, ref) => {
  // 状态初始化
  const [treeData, setTreeData] = useState(() => {
    const rootData = initialValues && initialValues.ft_content || {
      name: 'Root',
      description: '',
      node_status: 'info',
      children: []
    };
    return {
      ...rootData,
      key: 'Root'  // 根节点的key就是'Root'
    };
  });

  const [selectedNode, setSelectedNode] = useState(null);
  const [isAddNodeModalVisible, setIsAddNodeModalVisible] = useState(false);
  const [isLeafNode, setIsLeafNode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [addNodeForm] = Form.useForm();
  const [expandedKeys, setExpandedKeys] = useState(['Root']);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isEditLeafNode, setIsEditLeafNode] = useState(false);
  const [newNodeRules, setNewNodeRules] = useState([]);
  const [ftName, setFtName] = useState(initialValues && initialValues.ft_name || '');
  const [ftDesc, setFtDesc] = useState(initialValues && initialValues.ft_desc || '');
  const [ftStatus, setFtStatus] = useState(initialValues && initialValues.ft_status || 'draft');

  // 添加状态记录初始值，用于比较是否有变更
  const [initialState] = useState({
    ftName: initialValues && initialValues.ft_name || '',
    ftDesc: initialValues && initialValues.ft_desc || '',
    ftStatus: initialValues && initialValues.ft_status || 'draft'
  });

  // 检查是否有未保存的更改
  const checkForChanges = () => {
    const hasBasicInfoChanges =
      ftName !== initialState.ftName ||
      ftDesc !== initialState.ftDesc ||
      ftStatus !== initialState.ftStatus;

    if (hasBasicInfoChanges) {
      console.log('检测到基本信息变更:', {
        name: { old: initialState.ftName, new: ftName },
        desc: { old: initialState.ftDesc, new: ftDesc },
        status: { old: initialState.ftStatus, new: ftStatus }
      });
      onFormChange && onFormChange();
    }
  };

  // 使用 useEffect 监听 initialValues 的变化
  useEffect(() => {
    if (initialValues) {
      setTreeData(initialValues.ft_content);
      setFtName(initialValues.ft_name);
      setFtDesc(initialValues.ft_desc);
      setFtStatus(initialValues.ft_status);
    }
  }, [initialValues]);

  // 修改数据转换函数，添加父节点路径参数
  const convertToTreeData = (node, parentPath = '') => {
    const hasChildren = node.children && node.children.length > 0;
    const currentPath = parentPath ? `${parentPath}->${node.name}` : node.name;

    // 只保留必要的属性
    const treeNode = {
      key: currentPath,  // 使用完整路径作为key
      title: node.name,
      name: node.name,
      description: node.description || '',
      node_status: node.node_status || 'info',
      children: hasChildren ? node.children.map(child => convertToTreeData(child, currentPath)) : [],
    };

    // 如果是指标节点，添加相关属性
    if (node.data_source) {
      treeNode.data_source = node.data_source;
      treeNode.metric_name = node.metric_name;
      treeNode.rules = node.rules || [];
    }

    return treeNode;
  };

  // 修改清理数据的函数
  const cleanNodeData = (node) => {
    // 保留必要的字段
    const cleanedNode = {
      key: node.key,
      name: node.name,
      title: node.title,
      description: node.description || '',
      node_status: node.node_status || 'info',
      isLeaf: node.children.length===0,
      children: node.children ? node.children.map(cleanNodeData) : []
    };

    // 如果有数据采集相关的属性，则保留
    if (node.data_source) {
      cleanedNode.data_source = node.data_source;
    }
    if (node.metric_name) {
      cleanedNode.metric_name = node.metric_name;
    }
    if (node.rules) {
      cleanedNode.rules = node.rules;
    }
    if (node.ip_port) {
      cleanedNode.ip_port = node.ip_port;
    }

    return cleanedNode;
  };

  // 修改处理节点选择的逻辑
  const onSelect = (selectedKeys, info) => {
    if (isEditing) {
      message.warning('当前节点正在编辑，请先保存或取消编辑');
      return;
    }
    setSelectedNode(info.node);
  };

  // 添加节点按钮的处函数
  const handleAddButtonClick = () => {
    if (!selectedNode) {
      message.warning('请先选择一个节点');
      return;
    }
    addNodeForm.setFieldsValue({
      data_source_type: 'api',
      data_source_source: 'HandleZabbixMetrics'
    });
    setIsAddNodeModalVisible(true);
  };

  // 找到当前节点的父节点
  const findParentNode = (node, targetKey) => {
    if (node.children) {
      for (const child of node.children) {
        if (child.key === targetKey) {
          return node;
        }
        const found = findParentNode(child, targetKey);
        if (found) return found;
      }
    }
    return null;
  };

  // 检查同一层级节点名称是否重复
  const isNodeNameExist = (name, parentNode = null, currentKey = null) => {
    // 如果是根节点
    if (!parentNode) {
      return treeData.name === name;
    }

    // 检查同一层级的节点
    const siblings = parentNode.children || [];
    return siblings.some(node => node.name === name && node.key !== currentKey);
  };

  // 表单验证规
  const getNameValidationRules = () => [
    { required: true, message: '请输入节点名称' },
    {
      validator: (_, value) => {
        if (isEditing) {
          // 编辑模式
          const parentNode = findParentNode(treeData, selectedNode.key);
          if (value && value !== selectedNode.name && isNodeNameExist(value, parentNode, selectedNode.key)) {
            return Promise.reject(new Error('同一层级下已存在相同名称的节点'));
          }
        } else {
          // 添加模式
          if (value && isNodeNameExist(value, selectedNode)) {
            return Promise.reject(new Error('同一层级下已存在相同名称的节点'));
          }
        }
        return Promise.resolve();
      }
    }
  ];

  // 修改添加节点的函数
  const handleAddNode = (values) => {
    if (!selectedNode) return;

    // 获取新节点的完整路径key
    const parentPath = selectedNode.key;  // 直接使用父节点的完路径key
    const newNodeKey = `${parentPath}->${values.name}`;  // 添加新节点名称到路径

    const newNode = {
      key: newNodeKey,  // 使用完整路径作为key
      name: values.name,
      title: values.name,
      description: values.description || '',
      node_status: values.node_status || 'info',
      children: [],
      isLeaf: true
    };

    if (values.isLeafNode) {
      newNode.data_source = {
        type: values.data_source_type,
        source: values.data_source_source
      };
      newNode.metric_name = values.metric_name;
      newNode.rules = newNodeRules;
    }

    const updateNodeInTree = (node) => {
      if (node.key === selectedNode.key) {
        return {
          ...node,
          isLeaf: false,
          children: [...(node.children || []), newNode]
        };
      }
      if (node.children) {
        return {
          ...node,
          isLeaf: false,
          children: node.children.map(child => updateNodeInTree(child))
        };
      }
      return node;
    };

    setTreeData(prevData => updateNodeInTree(prevData));
    setExpandedKeys(prevKeys => [...new Set([...prevKeys, newNodeKey])]);
    setIsAddNodeModalVisible(false);
    setIsLeafNode(false);
    setNewNodeRules([]);
    addNodeForm.resetFields();
    message.success('节点添加成功');
  };

  // 修改处理规则变更的函数
  const handleRuleChange = (index, field, value) => {
    if (!selectedNode) return;

    const updatedRules = selectedNode.rules.map((rule, i) => {
      if (i === index) {
        return { ...rule, [field]: value };
      }
      return rule;
    });

    // 更新树中的节点，使用key来匹配
    const updateNodeInTree = (node) => {
      if (node.key === selectedNode.key) {  // 使用key而不是name来匹配
        return {
          ...node,
          rules: updatedRules
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(child => updateNodeInTree(child))
        };
      }
      return node;
    };

    setTreeData(prevData => updateNodeInTree(prevData));
    setSelectedNode({...selectedNode, rules: updatedRules});
  };

  // 修改添加规则的函数
  const handleAddRule = () => {
    if (!selectedNode) return;

    const newRule = {
      type: '数值型',  // 修改默认类型为"数值型"
      condition: '>',
      threshold: 0,
      status: 'warning',
      impact_analysis: '',
      suggestion: ''
    };

    const updatedRules = [...(selectedNode.rules || []), newRule];

    // 更新树中的节点
    const updateNodeInTree = (node) => {
      if (node.key === selectedNode.key) {  // 使用key而不是name来匹配
        return {
          ...node,
          rules: updatedRules
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(child => updateNodeInTree(child))
        };
      }
      return node;
    };

    setTreeData(prevData => updateNodeInTree(prevData));
    setSelectedNode({...selectedNode, rules: updatedRules});
  };

  // 修改删除规则的函数
  const handleDeleteRule = (index) => {
    if (!selectedNode) return;

    const updatedRules = selectedNode.rules.filter((_, i) => i !== index);

    // 更新树中的节点
    const updateNodeInTree = (node) => {
      if (node.key === selectedNode.key) {  // 使用key而不是name来匹配
        return {
          ...node,
          rules: updatedRules
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(child => updateNodeInTree(child))
        };
      }
      return node;
    };

    setTreeData(prevData => updateNodeInTree(prevData));
    setSelectedNode({...selectedNode, rules: updatedRules});
  };

  // 获取阈值输入框的 placeholder
  const getThresholdPlaceholder = (type, condition) => {
    if (type === 'numeric') {
      return '请输入数值';
    }
    // 字符串类型的不同条件对应不同提示
    switch (condition) {
      case 'in':
        return '请输入逗号分隔的字符串，如：error,warning,critical';
      case 'not_in':
        return '请输入逗号分隔的字符串，如：error,warning,critical';
      case 'match':
        return '请输入匹配表达式';
      default:
        return '请输入字符';
    }
  };

  // 只读的规则列配置
  const readOnlyRuleColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: '15%',
      render: (text) => ({
        'numeric': '数值型',
        'float': '浮点型',
        'string': '字符串'
      }[text] || text)
    },
    {
      title: '条件',
      dataIndex: 'condition',
      key: 'condition',
      width: '15%',
      render: (text) => ({
        '>': '大于',
        '<': '小于',
        '>=': '大于等于',
        '<=': '小于等于',
        '==': '等于',
        '!=': '不等于',
        'in': '包含',
        'not_in': '不包含',
        'match': '匹配'
      }[text] || text)
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      width: '25%',
      render: (text, record) => {
        const tooltip = record.type === 'string' &&
          (record.condition === 'in' || record.condition === 'not_in')
          ? '逗号分隔的字符串列表'
          : '';

        return tooltip ? (
          <Tooltip title={tooltip}>
            <span>{text}</span>
          </Tooltip>
        ) : text;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '15%',
    },
    {
      title: '影响分析',
      dataIndex: 'impact_analysis',
      key: 'impact_analysis',
      width: '20%',
      render: text => text || '-'
    },
    {
      title: '处置建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
      width: '20%',
      render: text => text || '-'
    }
  ];

  // 可编辑的规则列配置
  const editableRuleColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: '8%',
      render: (text, record, index) => (
        <Select
          value={text}
          style={{ width: '100%' }}
          onChange={(value) => handleRuleChange(index, 'type', value)}
        >
          <Option value="numeric">数值型</Option>
          <Option value="float">浮点型</Option>
          <Option value="string">字符串</Option>
        </Select>
      )
    },
    {
      title: '条件',
      dataIndex: 'condition',
      key: 'condition',
      width: '8%',
      render: (text, record, index) => (
        <Select
          value={text}
          style={{ width: '100%' }}
          onChange={(value) => handleRuleChange(index, 'condition', value)}
        >
          {record.type === 'numeric' ? (
            <>
              <Option value=">">大于</Option>
              <Option value="<">小于</Option>
              <Option value=">=">大于等于</Option>
              <Option value="<=">小于等于</Option>
              <Option value="==">等于</Option>
              <Option value="!=">不等于</Option>
            </>
          ) : (
            <>
              <Option value="==">等于</Option>
              <Option value="!=">不等于</Option>
              <Option value="in">包含</Option>
              <Option value="not_in">不包含</Option>
              <Option value="match">匹配</Option>
            </>
          )}
        </Select>
      )
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      width: '5%',
      render: (text, record, index) => (
        <Input
          value={text}
          placeholder={getThresholdPlaceholder(record.type, record.condition)}
          onChange={(e) => handleRuleChange(index, 'threshold', e.target.value)}
        />
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '8%',
      render: (text, record, index) => (
        <Select
          value={text}
          style={{ width: '100%' }}
          onChange={(value) => handleRuleChange(index, 'status', value)}
        >
          <Option value="info">info</Option>
          <Option value="warning">warning</Option>
          <Option value="error">error</Option>
        </Select>
      )
    },
    {
      title: '影响分析',
      dataIndex: 'impact_analysis',
      key: 'impact_analysis',
      width: '20%',
      render: (text, record, index) => (
        <Input.TextArea
          value={text}
          placeholder="请输入影响分析"
          onChange={(e) => handleRuleChange(index, 'impact_analysis', e.target.value)}
        />
      )
    },
    {
      title: '处置建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
      width: '20%',
      render: (text, record, index) => (
        <Input.TextArea
          value={text}
          placeholder="请输入处置建议"
          onChange={(e) => handleRuleChange(index, 'suggestion', e.target.value)}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: '5%',
      fixed: 'right',  // 固到右边
      render: (_, record, index) => (
        <Button
          type="link"
          danger
          onClick={() => handleDeleteRule(index)}
        >
          删除
        </Button>
      )
    }
  ];

  // 进入编辑状态时，初始表单数据
  const handleEdit = () => {
    // 判断是否为指标节
    const isLeaf = !!selectedNode.data_source;
    setIsEditLeafNode(isLeaf);

    form.setFieldsValue({
      name: selectedNode.name,
      description: selectedNode.description,
      node_status: selectedNode.node_status || 'info',
      isLeafNode: isLeaf,
      data_source_type: selectedNode.data_source?.type,
      data_source_source: selectedNode.data_source?.source,
      metric_name: selectedNode.metric_name
    });
    setIsEditModalVisible(true);
  };

  // 取消编辑
  const handleCancel = () => {
    form.resetFields();
    setIsEditModalVisible(false);
  };

  // 修改保存编辑的函数
  const handleSave = (values) => {
    if (!selectedNode) return;

    // 判断是否为叶子节点
    const hasChildren = selectedNode.children && selectedNode.children.length > 0;
    const isLeafNode = !hasChildren;  // 根据是否有子节点来判断

    // 创建更新后的节点数据
    const updatedNode = {
      ...selectedNode,
      name: values.name,
      title: values.name,
      description: values.description || '',
      node_status: values.node_status || 'info',
      isLeaf: isLeafNode,  // 使用计算得到的值
      children: selectedNode.children || []
    };

    // 如果是指标，添加数据采集相关属性
    if (updatedNode.metric_name ) {
      updatedNode.data_source = {
        type: values.data_source_type,
        source: values.data_source_source
      };
      updatedNode.metric_name = values.metric_name;
      updatedNode.rules = selectedNode.rules || [];
    }

    // 更新树中的节点，并清理无用属性
    const updateNodeInTree = (node) => {
      if (node.key === selectedNode.key) {
        return cleanNodeData(updatedNode);
      }
      if (node.children) {
        return {
          ...cleanNodeData(node),
          children: node.children.map(child => updateNodeInTree(child))
        };
      }
      return cleanNodeData(node);
    };

    // 更新树数据
    const newTreeData = updateNodeInTree(treeData);
    setTreeData(newTreeData);

    // 更新选中节点
    setSelectedNode(cleanNodeData(updatedNode));
    setIsEditModalVisible(false);
    form.resetFields();
    message.success('保存成功');
  };

  // 添加删除节点函数
  const handleDeleteNode = () => {
    if (!selectedNode || selectedNode.key === 'Root') {
      message.warning('不能删除根节点');
      return;
    }

    const deleteNodeFromTree = (node) => {
      if (node.children) {
        const filteredChildren = node.children.filter(child => child.key !== selectedNode.key);
        if (filteredChildren.length !== node.children.length) {
          return {
            ...node,
            children: filteredChildren,
            isLeaf: filteredChildren.length === 0
          };
        }
        return {
          ...node,
          children: node.children.map(child => deleteNodeFromTree(child))
        };
      }
      return node;
    };

    setTreeData(prevData => deleteNodeFromTree(prevData));
    setSelectedNode(null);
    message.success('节点删除成功');
  };

      // 获取历史本列表
    const fetchHistoryList = async () => {
        setHistoryLoading(true);
        try {
            const res = await MyAxios.post('/fault_tree/v1/get_history_list/', {
                ft_id: initialValues && initialValues.ft_id
            });
            if (res.data.status === 'ok') {
                setHistoryList(res.data.data);
            } else {
                message.error(res.data.message || '获取历史版本失败');
            }
        } catch (error) {
            console.error('Fetch history error:', error);
            message.error('获取历史版本失败');
        } finally {
            setHistoryLoading(false);
        }
    };

  // 导出配置
  const handleExport = () => {
    if (!treeData) {
      message.warning('暂无数据导');
      return;
    }

    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(treeData, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = 'fault-tree-config.json';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 导入配置
  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setTreeData(data);
        message.success('导入成功');
      } catch (error) {
        message.error('导入失败：无效的 JSON 文件');
      }
    };
    reader.readAsText(file);
    return false;
  };

  // 修改渲染函数
  const renderNodeInfo = () => {
    if (!selectedNode) return null;

    return isEditing ? (
      <>
        <Form
          form={form}
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 20 }}
          style={{ padding: '0 12px' }}
        >
          <Form.Item
            name="name"
            label="节点名称"
            rules={getNameValidationRules()}
          >
            <Input placeholder="请输入节点名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="节点描述"
          >
            <Input.TextArea placeholder="请输入节点描述" />
          </Form.Item>

          <Form.Item
            name="node_status"
            label="节点状态"
            rules={[{ required: true, message: '请选择节点状态' }]}
          >
            <Select placeholder="请选择节点状态">
              <Option value="info">info</Option>
              <Option value="warning">warning</Option>
              <Option value="error">error</Option>
            </Select>
          </Form.Item>

          {selectedNode.data_source && (
            <>
              <Form.Item
                name="data_source_type"
                label="数据源类型"
                rules={[{ required: true, message: '请选择数据源类型' }]}
              >
                <Select onChange={() => form.setFieldsValue({ data_source_source: undefined })}>
                  <Option value="api">API</Option>
                  <Option value="internal_function">内部函数</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="data_source_source"
                label="数据源"
                rules={[{ required: true, message: '请选择数据源' }]}
              >
                {form.getFieldValue('data_source_type') === 'internal_function' ? (
                  <Input placeholder="请输入函数名称" />
                ) : (
                  <Select placeholder="请选择数据源">
                    <Option value="HandleZabbixMetrics">Zabbix</Option>
                    <Option value="HandleElasticSearchMetrics">Elasticsearch</Option>
                    <Option value="HandleCustomFunction">自定义函数</Option>
                  </Select>
                )}
              </Form.Item>

              <Form.Item
                name="metric_name"
                label="指标名称"
                rules={[{ required: true, message: '请输入指标名称' }]}
              >
                <Input placeholder="请输入指标名称" />
              </Form.Item>
            </>
          )}

          {selectedNode.rules && (
            <Form.Item label="规则配置">
              <Table
                columns={isEditing ? editableRuleColumns : readOnlyRuleColumns}
                dataSource={selectedNode.rules}
                pagination={false}
                size="small"
                bordered
                rowKey={(record, index) => index}
                scroll={{ x: 1300 }}
                style={{
                  width: '100%',
                  overflowX: 'auto'
                }}
              />
              <Button
                type="dashed"
                style={{ width: '100%', marginTop: 16 }}
                icon="plus"
                onClick={handleAddRule}
              >
                添加规则
              </Button>
            </Form.Item>
          )}
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
            <Button onClick={handleCancel}>
              取消
            </Button>
          </div>
        </div>
      </>
    ) : (
      <>
        <div className="node-info-display">
          <div className="info-item">
            <span className="label">节点名称：</span>
            <span className="value">{selectedNode.name}</span>
          </div>
          <div className="info-item">
            <span className="label">节点描述：</span>
            <span className="value">{selectedNode.description || '-'}</span>
          </div>
          <div className="info-item">
            <span className="label">节点状态：</span>
            <span className="value">
              {selectedNode.node_status || '-'}
            </span>
          </div>
          {selectedNode.data_source && (
            <>
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
            </>
          )}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button type="primary" onClick={() => setIsEditing(true)}>
              编辑
            </Button>
          </div>
        </div>
      </>
    );
  };

  // 添加右键菜单处理函数
  const onRightClick = ({ event, node }) => {
    event.preventDefault();
    setSelectedNode(node);
  };

  // 定义右键菜单项
  const menuItems = [
    {
      key: 'add',
      label: '添加子节点',
      icon: <Icon type="plus" />,
      onClick: () => handleAddButtonClick()
    },
    {
      key: 'edit',
      label: '编辑节点',
      icon: <Icon type="edit" />,
      onClick: () => handleEdit()
    },
    {
      key: 'expandAll',  // 新增展开所有子点选项
      label: '展开所有子节点',
      icon: <Icon type="expand" />,
      onClick: () => handleExpandAll(selectedNode)
    },
    {
      key: 'delete',
      label: '删除节点',
      icon: <Icon type="delete" />,
      danger: true,
      onClick: () => {
        if (selectedNode.name === 'Root') {
          message.error('不能删除根节点');
          return;
        }
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除节点 "${selectedNode.name}" 及其所有子节点吗？`,
          okText: '确认',
          cancelText: '取消',
          onOk: () => handleDeleteNode()
        });
      }
    }
  ];

  // 添加键盘事件处理函数
  const handleKeyDown = (event) => {
    // 如果按下 Tab 键且有选中节点
    if (event.key === 'Tab' && selectedNode) {
      event.preventDefault(); // 阻止默认的 Tab 行为
      setIsAddNodeModalVisible(true);
    }
  };

  // 在组件挂载时添加键盘事件监听
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNode]); // 依赖 selectedNode

  // 添加处理规则变更的函数
  const handleNewRuleChange = (index, field, value) => {
    const updatedRules = newNodeRules.map((rule, i) => {
      if (i === index) {
        return { ...rule, [field]: value };
      }
      return rule;
    });
    setNewNodeRules(updatedRules);
  };

  // 添加删除新规则的函数
  const handleDeleteNewRule = (index) => {
    setNewNodeRules(prevRules => prevRules.filter((_, i) => i !== index));
    message.success('规则删除成功');
  };

  // 添加新节点规则的列配置
  const newNodeRuleColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: '8%',
      render: (text, record, index) => (
        <Select
          value={text}
          style={{ width: '100%' }}
          onChange={(value) => handleNewRuleChange(index, 'type', value)}
        >
          <Option value="numeric">数值型</Option>
          <Option value="float">浮点型</Option>
          <Option value="string">字符串</Option>
        </Select>
      )
    },
    {
      title: '条件',
      dataIndex: 'condition',
      key: 'condition',
      width: '8%',
      render: (text, record, index) => (
        <Select
          value={text}
          style={{ width: '100%' }}
          onChange={(value) => handleNewRuleChange(index, 'condition', value)}
        >
          {record.type === 'numeric' ? (
            <>
              <Option value=">">大于</Option>
              <Option value="<">小于</Option>
              <Option value=">=">大于等于</Option>
              <Option value="<=">小于等于</Option>
              <Option value="==">等于</Option>
              <Option value="!=">不等于</Option>
            </>
          ) : (
            <>
              <Option value="==">等于</Option>
              <Option value="!=">不等于</Option>
              <Option value="in">包含</Option>
              <Option value="not_in">不包含</Option>
              <Option value="match">匹配</Option>
            </>
          )}
        </Select>
      )
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      width: '15%',
      render: (text, record, index) => (
        <Input
          value={text}
          placeholder={getThresholdPlaceholder(record.type, record.condition)}
          onChange={(e) => handleNewRuleChange(index, 'threshold', e.target.value)}
        />
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '8%',
      render: (text, record, index) => (
        <Select
          value={text}
          style={{ width: '100%' }}
          onChange={(value) => handleNewRuleChange(index, 'status', value)}
        >
          <Option value="info">info</Option>
          <Option value="warning">warning</Option>
          <Option value="error">error</Option>
        </Select>
      )
    },
    {
      title: '影响分析',
      dataIndex: 'impact_analysis',
      key: 'impact_analysis',
      width: '20%',
      render: (text, record, index) => (
        <Input.TextArea
          value={text}
          placeholder="请输入影响分析"
          onChange={(e) => handleNewRuleChange(index, 'impact_analysis', e.target.value)}
        />
      )
    },
    {
      title: '处置建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
      width: '20%',
      render: (text, record, index) => (
        <Input.TextArea
          value={text}
          placeholder="请输入处置建议"
          onChange={(e) => handleNewRuleChange(index, 'suggestion', e.target.value)}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: '5%',
      fixed: 'right',
      render: (_, record, index) => (
        <Button
          type="link"
          danger
          onClick={() => handleDeleteNewRule(index)}
        >
          删除
        </Button>
      )
    }
  ];

  // 添加清理节点数据的函数
  const cleanNodeForSave = (node) => {
    // 提取需要保存的属性
    const cleanNode = {
      key: node.key,
      name: node.name,
      title: node.title,
      description: node.description,
      node_status: node.node_status,
      children: node.children ? node.children.map(cleanNodeForSave) : [],
      isLeaf: node.isLeaf
    };

    // ���果有数据采集相关的属性，则保留
    if (node.data_source) {
      cleanNode.data_source = node.data_source;
    }
    if (node.metric_name) {
      cleanNode.metric_name = node.metric_name;
    }
    if (node.rules) {
      cleanNode.rules = node.rules;
    }
    if (node.ip_port) {
      cleanNode.ip_port = node.ip_port;
    }

    return cleanNode;
  };

  // 修改保存函数
  const handleSaveCreate = async () => {
    if (!ftName.trim()) {
      message.error('请输入场景名称');
      return;
    }

    // 清理数据后再保存
    const cleanedTreeData = cleanNodeForSave(treeData);

    const submitData = {
      ft_name: ftName,
      ft_desc: ftDesc,
      ft_status: ftStatus,
      ft_content: JSON.stringify(cleanedTreeData)
    };

    try {
      const res = await MyAxios.post('/fault_tree/v1/create_config/', submitData);
      // ... 其余代码保持不变
    } catch (error) {
      console.error('新建故障树配置失败:', error);
      message.error('保存失败，请稍后重试');
    }
  };

  // 修改更新函数
  const handleSaveUpdate = async () => {
    if (!ftName.trim()) {
      message.error('请输入场景名称');
      return;
    }

    // 清理数据后再保存
    const cleanedTreeData = cleanNodeForSave(treeData);

    const submitData = {
      ft_id: initialValues.ft_id,
      ft_name: ftName,
      ft_desc: ftDesc,
      ft_status: ftStatus,
      ft_content: JSON.stringify(cleanedTreeData)
    };

    try {
      const res = await MyAxios.post('/fault_tree/v1/update_config/', submitData);
      // ... 其余代码保持不变
    } catch (error) {
      console.error('更新故障树配置失败:', error);
      message.error('更新失败，请稍后重试');
    }
  };

  // 修改获取所有节点key的函数
  const getAllNodeKeys = (node) => {
    let keys = [node.key];
    if (node.children) {
      node.children.forEach(child => {
        keys = keys.concat(getAllNodeKeys(child));
      });
    }
    return keys;
  };

  // 添加展开所有节点的理函数
  const handleExpandAll = (node) => {
    if (!node) {
      message.warning('请先选择一个节点');
      return;
    }
    const allKeys = getAllNodeKeys(node);
    setExpandedKeys(prevKeys => [...new Set([...prevKeys, ...allKeys])]);
    message.success('已展开所有子节点');
  };

  // 添加表单变更处理
  const handleContentChange = () => {
    onFormChange && onFormChange();
  };

  // 添加对比框显示状态
  const [isDiffModalVisible, setIsDiffModalVisible] = useState(false);
  const [diffContent, setDiffContent] = useState({ old: null, new: null });

  // 创建用于比较的数据对象
  const createCompareData = (data) => {
    const formatted = {
      ft_name: data.ft_name || ftName,
      ft_desc: data.ft_desc || ftDesc,
      ft_status: data.ft_status || ftStatus,
      ft_content: data.ft_content || treeData
    };
    return JSON.stringify(formatted, null, 2);
  };

  // 处理更新按钮点击
  const handleUpdateClick = () => {
    if (!ftName.trim()) {
      message.error('请输入场景名称');
      return;
    }

    // 准备对比数据
    const oldData = createCompareData(initialValues);
    const newData = createCompareData({
      ft_name: ftName,
      ft_desc: ftDesc,
      ft_status: ftStatus,
      ft_content: treeData
    });

    // 设置对比内容
    setDiffContent({
      old: oldData,
      new: newData
    });

    // 显示对比框
    setIsDiffModalVisible(true);
  };

  // 修改确认更新函数
  const handleConfirmUpdate = async () => {
    try {
      const res = await MyAxios.post('/fault_tree/v1/update_config/', {
        ft_id: initialValues.ft_id,
        ft_name: ftName,
        ft_desc: ftDesc,
        ft_status: ftStatus,
        ft_content: JSON.stringify(treeData)
      });

      if (res.data.status === 'ok') {
        message.success('更���成功');
        setIsDiffModalVisible(false);  // 关闭对比弹窗
        setIsEditModalVisible(false);  // 关闭编辑弹窗
        if (onSave) {
          onSave();
        }
      } else {
        message.error(res.data.message || '更新失败');
      }
    } catch (error) {
      console.error('更新故障树配置失败:', error);
      message.error('更新失败，请稍后重试');
    }
  };

  // 检查是否有实际变化的函数
  const checkHasActualChanges = useCallback((current, initial) => {
    if (!initial) return false;

    const formatData = (data) => ({
      ft_name: data.ft_name || '',
      ft_desc: data.ft_desc || '',
      ft_status: data.ft_status || 'draft',
      ft_content: JSON.stringify(data.ft_content || {})
    });

    const currentData = formatData(current);
    const initialData = formatData(initial);

    return JSON.stringify(currentData) !== JSON.stringify(initialData);
  }, []);

  // 检查是否有变化的函数（用于制更新按钮显示）
  const hasChanges = useCallback(() => {
    return checkHasActualChanges(
      {
        ft_name: ftName,
        ft_desc: ftDesc,
        ft_status: ftStatus,
        ft_content: treeData
      },
      initialValues
    );
  }, [ftName, ftDesc, ftStatus, treeData, initialValues, checkHasActualChanges]);

  // 暴露获取当值的方法
  useImperativeHandle(ref, () => ({
    getFtName: () => ftName,
    getFtDesc: () => ftDesc,
    getFtStatus: () => ftStatus,
    getTreeData: () => treeData
  }));

  // 添加历史版本相关状态
  const [diffVisible, setDiffVisible] = useState(false);
  const [diffData, setDiffData] = useState({ old: null, new: null });
  const [selectedHistory, setSelectedHistory] = useState(null);

  // 查看版本差异
  const handleViewDiff = async (historyId) => {
    try {
      const historyRes = await MyAxios.post('/fault_tree/v1/get_history_detail/', {
        history_id: historyId
      });

      if (historyRes.data.status === "ok") {
        const historyData = historyRes.data.data;
        setSelectedHistory(historyData);

        // 确保内容是字符串格式
        const historyContent = typeof historyData.ft_content === 'string'
          ? historyData.ft_content
          : JSON.stringify(historyData.ft_content);

        const currentContent = typeof initialValues.ft_content === 'string'
          ? initialValues.ft_content
          : JSON.stringify(initialValues.ft_content);

        try {
          // 格式化 JSON 以便更好地展示
          const formattedHistoryContent = JSON.stringify(
            JSON.parse(historyContent),
            null,
            2
          );
          const formattedCurrentContent = JSON.stringify(
            JSON.parse(currentContent),
            null,
            2
          );

          setDiffData({
            old: formattedHistoryContent,
            new: formattedCurrentContent
          });
          setDiffVisible(true);
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError);
          message.error('解析配置内容失败');
        }
      } else {
        message.error(historyRes.data.message || '获取历史版本失败');
      }
    } catch (error) {
      console.error('View diff error:', error);
      message.error('获取版本差异失败');
    }
  };

  // 删除历史版本
  const handleDeleteHistory = async (historyId) => {
    try {
      const res = await MyAxios.post('/fault_tree/v1/delete_history/', {
        history_id: historyId
      });
      if (res.data.status === 'ok') {
        message.success('删除成功');
        fetchHistoryList();  // 刷新列表
      } else {
        message.error(res.data.message || '删除失败');
      }
    } catch (error) {
      console.error('Delete history error:', error);
      message.error('删除失败');
    }
  };

  // 回滚到历史版本
  const handleRollback = async (historyId) => {
    try {
      const res = await MyAxios.post('/fault_tree/v1/rollback_config/', {
        history_id: historyId
      });
      if (res.data.status === 'ok') {
        message.success('回滚成功');
        setHistoryVisible(false);
        if (onSave) {
          onSave();
        }
      } else {
        message.error(res.data.message || '回滚失败');
      }
    } catch (error) {
      console.error('Rollback error:', error);
      message.error('回滚失败');
    }
  };

  // 历史版本列表列定义
  const historyColumns = [
    {
      title: '版本号',
      dataIndex: 'version_num',
      key: 'version_num',
    },
    {
      title: '操作时间',
      dataIndex: 'create_time',
      key: 'create_time',
    },
    {
      title: '操作人',
      dataIndex: 'create_by',
      key: 'create_by',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button type="link" onClick={() => handleViewDiff(record.history_id)}>
            查看差异
          </Button>
          <Button type="link" onClick={() => handleDeleteHistory(record.history_id)}>
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="fault-tree-config-new">
      <Card
        title="故障树配置"
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {initialValues && initialValues.ft_id && hasChanges() && (
              <Button type="primary" onClick={handleUpdateClick} icon="save">
                更新
              </Button>
            )}
            {!initialValues || !initialValues.ft_id && (
              <Button type="primary" onClick={handleSaveCreate} icon="save">
                保存
              </Button>
            )}
            <Input
              placeholder="场景名称"
              value={ftName}
              onChange={e => {
                setFtName(e.target.value);
                checkForChanges();
              }}
              style={{ width: 200 }}
            />
            <Input
              placeholder="场景描述"
              value={ftDesc}
              onChange={e => {
                setFtDesc(e.target.value);
                checkForChanges();
              }}
              style={{ width: 300 }}
            />
            <Select
              value={ftStatus}
              onChange={value => {
                setFtStatus(value);
                checkForChanges();
              }}
              style={{ width: 100 }}
            >
              <Option value="draft">草稿</Option>
              <Option value="active">启用</Option>
            </Select>
            <Button icon="history" onClick={() => {
              fetchHistoryList();
              setHistoryVisible(true);
            }}>
              历史
            </Button>
            <Upload
              beforeUpload={handleImport}
              showUploadList={false}
              accept=".json"
            >
              <Button icon="import">导入配置</Button>
            </Upload>
            <Button icon="export" onClick={handleExport}>
              导出配置
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', height: 'calc(100vh - 180px)' }}>
          <div className="tree-container">
            <div className="tree-scroll-container">
              <Dropdown
                menu={{ items: menuItems }}
                trigger={['contextMenu']}
              >
                <Tree
                  treeData={[treeData]}  // 直接使用 treeData，不调用 convertToTreeData
                  onSelect={onSelect}
                  onRightClick={onRightClick}
                  showLine
                  showIcon
                  expandedKeys={expandedKeys}
                  onExpand={(keys) => setExpandedKeys(keys)}
                  selectedKeys={selectedNode ? [selectedNode.key] : []}
                  tabIndex={0}
                />
              </Dropdown>
            </div>
          </div>
          <div className="node-info" style={{ marginLeft: 24, flex: 1, overflowY: 'auto' }}>
            {selectedNode && !isEditing ? (
              // 查看模式
              <>
                <Card
                  size="small"
                  title="节点基础信息"
                  style={{ marginBottom: 16 }}
                >
                  <div className="info-item">
                    <span className="label">节点名称：</span>
                    <span className="value">{selectedNode.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">节点状态：</span>
                    <span className="value">
                      {selectedNode.node_status || '-'}
                    </span>
                  </div>
                    <div className="info-item">
                      <span className="label">节点描述：</span>
                      <span className="value">{selectedNode.description || '-'}</span>
                    </div>
                  {selectedNode.solution && (
                    <div className="info-item">
                      <span className="label">解决方案：</span>
                      <span className="value">{selectedNode.solution}</span>
                    </div>
                  )}
                </Card>

                {selectedNode.data_source && (
                    <Card
                    size="small"
                    title="指标基础信息"
                    bodyStyle={{ padding: '12px' }}
                  >
                      <div className="info-item">
                        <span className="value">
                          <span className="label">数据源类型：</span>
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
                {selectedNode.rules && selectedNode.rules.length > 0 && (
                  <Card
                    size="small"
                    title="指标规则配置"
                    bodyStyle={{ padding: '12px' }}
                  >
                    <Table
                      columns={readOnlyRuleColumns}
                      dataSource={selectedNode.rules}
                      pagination={false}
                      size="small"
                      bordered
                      rowKey={(record, index) => index}
                    />
                  </Card>
                )}
              </>
            ) : selectedNode && isEditing ? (
              // 编辑模式
              <Card
                title="编辑节点"
                extra={
                  <Button
                    type="link"
                    onClick={() => {
                      setIsEditing(false);
                      form.resetFields();
                    }}
                  >
                    取消
                  </Button>
                }
              >
                {renderNodeInfo()}
              </Card>
            ) : null}
          </div>
        </div>
      </Card>

      {/* 添加节点的Modal */}
      <Modal
        title="添加节点"
        visible={isAddNodeModalVisible}
        onCancel={() => {
          setIsAddNodeModalVisible(false);
          addNodeForm.resetFields();
          setNewNodeRules([]);
          setIsLeafNode(false);
        }}
        footer={null}
        destroyOnClose
        width={1200}
        style={{ padding: '24px' }}
      >
        <Form
          form={addNodeForm}
          onFinish={handleAddNode}
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 20 }}
          style={{ padding: '0 24px' }}
        >
          <Form.Item
            name="name"
            label="节点名称"
            rules={[{ required: true, message: '请输入节点名称' }]}
          >
            <Input placeholder="请输入节点名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="节点描述"
          >
            <Input.TextArea placeholder="请输入节点描述" />
          </Form.Item>

          <Form.Item
            name="node_status"
            label="节点状态"
            rules={[{ required: true, message: '请选择节点状态' }]}
            initialValue="info"
          >
            <Select placeholder="请选择节点状态">
              <Option value="info">info</Option>
              <Option value="warning">warning</Option>
              <Option value="error">error</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="isLeafNode"
            label="是否为指标节点"
            valuePropName="checked"
          >
            <Switch onChange={setIsLeafNode} />
          </Form.Item>

          {isLeafNode && (
            <>
              <Form.Item
                name="data_source_type"
                label="数据源类"
                initialValue="api"
                rules={[{ required: true, message: '请选择数据源类型' }]}
              >
                <Select onChange={() => addNodeForm.setFieldsValue({ data_source_source: undefined })}>
                  <Option value="api">API</Option>
                  <Option value="internal_function">内部函数</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="data_source_source"
                label="数据源"
                initialValue="HandleZabbixMetrics"
                rules={[{ required: true, message: '请选择数据源' }]}
              >
                {addNodeForm.getFieldValue('data_source_type') === 'internal_function' ? (
                  <Input placeholder="请输入函数称" />
                ) : (
                  <Select placeholder="请选择数据源">
                    <Option value="HandleZabbixMetrics">Zabbix</Option>
                    <Option value="HandleZabbixMetrics">Elasticsearch</Option>
                    <Option value="HandleCustomFunction">自定义函数</Option>
                  </Select>
                )}
              </Form.Item>

              <Form.Item
                name="metric_name"
                label="指标名称"
                rules={[{ required: true, message: '请输入指标名称' }]}
              >
                 <Input placeholder="请输入指标名称" />
              </Form.Item>

              <Form.Item label="规则配置">
                <Table
                  columns={newNodeRuleColumns}  // 使用专门的列配置
                  dataSource={newNodeRules}
                  pagination={false}
                  size="small"
                  bordered
                  rowKey={(record, index) => index}
                  scroll={{ x: 1300 }}
                />
                <Button
                  type="dashed"
                  style={{ width: '100%', marginTop: 16 }}
                  icon="plus"
                  onClick={() => {
                    const newRule = {
                      metric_name: '',
                      type: 'numeric',
                      condition: '>',
                      threshold: '',
                      status: 'info',
                      impact_analysis: '',
                      suggestion: ''
                    };
                    setNewNodeRules([...newNodeRules, newRule]);
                  }}
                >
                  添加规则
                </Button>
              </Form.Item>
            </>
          )}

          <Form.Item wrapperCol={{ offset: 4, span: 19 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
              <Button onClick={() => {
                setIsAddNodeModalVisible(false);
                addNodeForm.resetFields();
                setNewNodeRules([]);
                setIsLeafNode(false);
              }}>
                取消
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑节点的Modal */}
      <Modal
        title="编辑节点"
        visible={isEditModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={1200}
      >
        <Form
          form={form}
          onFinish={handleSave}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
        >
          <Form.Item
            name="name"
            label="节点名称"
            rules={getNameValidationRules()}
          >
            <Input placeholder="请输入节点名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="点描述"
          >
            <Input.TextArea placeholder="请输入节点描述" />
          </Form.Item>

          <Form.Item
            name="node_status"
            label="节点状态"
            rules={[{ required: true, message: '请选择节点状态' }]}
          >
            <Select placeholder="请选择节点状态">
              <Option value="info">info</Option>
              <Option value="warning">warning</Option>
              <Option value="error">error</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="isLeafNode"
            label="是为指标节点"
            valuePropName="checked"
          >
            <Switch
              onChange={(checked) => {
                setIsEditLeafNode(checked);
                if (!checked) {
                  // 清空指标相关字段
                  form.setFieldsValue({
                    data_source_type: undefined,
                    data_source_source: undefined,
                    metric_name: undefined
                  });
                }
              }}
            />
          </Form.Item>

          {isEditLeafNode && (
            <>
              <Form.Item
                name="data_source_type"
                label="数据源类型"
                rules={[{ required: true, message: '请选择数据源类型' }]}
              >
                <Select onChange={() => form.setFieldsValue({ data_source_source: undefined })}>
                  <Option value="api">API</Option>
                  <Option value="internal_function">内部函数</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="data_source_source"
                label="数据源"
                rules={[{ required: true, message: '请选择数据源' }]}
              >
                {form.getFieldValue('data_source_type') === 'internal_function' ? (
                  <Input placeholder="请输入函数名称" />
                ) : (
                  <Select placeholder="请选择数据源">
                    <Option value="HandleZabbixMetrics">Zabbix</Option>
                    <Option value="HandleElasticSearchMetrics">Elasticsearch</Option>
                    <Option value="HandleCustomFunction">自定义函数</Option>
                  </Select>
                )}
              </Form.Item>

              <Form.Item
                name="metric_name"
                label="指标名称"
                rules={[{ required: true, message: '请输入指标名称' }]}
              >
                <Input placeholder="请输入指标名称" />
              </Form.Item>

              <Form.Item label="规则配置">
                <Table
                  columns={editableRuleColumns}
                  dataSource={selectedNode.rules || []}
                  pagination={false}
                  size="small"
                  bordered
                  rowKey={(record, index) => index}
                  scroll={{ x: 1300 }}
                />
                <Button
                  type="dashed"
                  style={{ width: '100%', marginTop: 16 }}
                  icon="plus"
                  onClick={handleAddRule}
                >
                  添加规则
                </Button>
              </Form.Item>
            </>
          )}

          <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={handleCancel}>
                取消
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 对比确认框 */}
      <Modal
        title="更新确认"
        visible={isDiffModalVisible}
        onCancel={() => setIsDiffModalVisible(false)}
        width={1200}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button key="cancel" onClick={() => setIsDiffModalVisible(false)}>
              取消
            </Button>
            <Button key="submit" type="primary" onClick={handleConfirmUpdate}>
              确认更新
            </Button>
          </div>
        }
      >
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <ReactDiffViewer
            oldValue={diffContent.old}
            newValue={diffContent.new}
            splitView={true}
            leftTitle="当前配置"
            rightTitle="更新后配置"
            hideLineNumbers={false}
            useDarkTheme={false}
            showDiffOnly={false}
            styles={{
              diffContainer: {
                pre: {
                  fontSize: '14px',
                  lineHeight: '1.5',
                  fontFamily: 'monospace'
                }
              }
            }}
          />
        </div>
      </Modal>

      {/* 历史版本抽屉 */}
      <Drawer
        title="历史版本"
        placement="right"
        width={600}
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
      >
        <Table
          columns={historyColumns}
          dataSource={historyList}
          loading={historyLoading}
          rowKey="history_id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Drawer>

      {/* 版本对比抽屉 */}
      <Drawer
        title="版本对比"
        placement="right"
        width={1000}
        visible={diffVisible}
        onClose={() => setDiffVisible(false)}
        extra={
          <Button
            type="primary"
            onClick={() => {
              Modal.confirm({
                title: '确认回滚',
                content: `确定要回滚到版本 ${selectedHistory && selectedHistory.version_num || ''} 吗？`,
                onOk: () => handleRollback(selectedHistory && selectedHistory.history_id)
              });
            }}
          >
            回滚到此版本
          </Button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Row>
            <Col span={12}>历史版本 ({selectedHistory && selectedHistory.version_num || ''}</Col>
            <Col span={12}>当前版本 ({initialValues && initialValues.version_num || ''}</Col>
          </Row>
        </div>
        <ReactDiffViewer
          oldValue={diffData.old}
          newValue={diffData.new}
          splitView={true}
          disableWordDiff={false}
          hideLineNumbers={false}
          showDiffOnly={false}
          styles={{
            contentText: {
              fontSize: '13px',
              lineHeight: '1.5',
              fontFamily: 'Monaco, Consolas, "Courier New", Courier, monospace',
            },
          }}
        />
      </Drawer>
    </div>
  );
});

export default FaultTreeConfigNew;
