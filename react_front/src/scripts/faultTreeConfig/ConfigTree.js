import React, { forwardRef } from 'react';
import { Tree, Form, Modal, message, Card, Input, Select, Switch, Button, Table, Empty, Icon } from 'antd';
import './index.css';

const { Option } = Select;
const { TreeNode } = Tree;

// 将 conditionOptions 移到类外部作为常量
const conditionOptions = {
    numeric: [
        { value: ">", label: "大于" },
        { value: "<", label: "小于" },
        { value: "=", label: "等于" },
        { value: ">=", label: "大于等于" },
        { value: "<=", label: "小于等于" }
    ],
    float: [
        { value: ">", label: "大于" },
        { value: "<", label: "小于" },
        { value: "=", label: "等于" },
        { value: ">=", label: "大于等于" },
        { value: "<=", label: "小于等于" }
    ],
    string: [
        { value: "==", label: "等于" },
        { value: "!=", label: "不等于" },
        { value: "in", label: "包含" },
        { value: "not in", label: "不包含" },
        { value: "match", label: "匹配" }
    ]
};

class ConfigTreeComponent extends React.Component {
    state = {
        isAddNodeModalVisible: false,
        isEditModalVisible: false,
        selectedNode: null,
        expandedKeys: ['Root'],
        treeData: {
            ...this.props.initialValues?.ft_content || {
                name: 'Root',
                description: '',
                node_status: 'info',
                children: []
            },
            key: 'Root',
            title: this.props.initialValues?.ft_content?.name || 'Root'
        },
        rightClickNodeTreeItem: null,
        isMetricNode: false,
        rules: [],
        copiedNode: null,
    };

    ruleColumns = [
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: '15%',
            render: (text, record, index) => (
                <Select
                    value={text}
                    onChange={(value) => this.handleRuleChange(index, 'type', value)}
                    style={{ width: '100%' }}
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
            width: '10%',
            render: (text, record, index) => (
                <Select
                    value={text}
                    onChange={(value) => this.handleRuleChange(index, 'condition', value)}
                    style={{ width: '100%' }}
                >
                    {conditionOptions[record.type]?.map(option => (
                        <Option key={option.value} value={option.value}>
                            {option.label}
                        </Option>
                    ))}
                </Select>
            )
        },
        {
            title: '阈值',
            dataIndex: 'threshold',
            key: 'threshold',
            width: '10%',
            render: (text, record, index) => (
                <Input
                    value={text}
                    onChange={(e) => this.handleRuleChange(index, 'threshold', e.target.value)}
                />
            )
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: '10%',
            render: (text, record, index) => (
                <Select
                    value={text}
                    onChange={(value) => this.handleRuleChange(index, 'status', value)}
                    style={{ width: '100%' }}
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
                    onChange={(e) => this.handleRuleChange(index, 'impact_analysis', e.target.value)}
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
                    onChange={(e) => this.handleRuleChange(index, 'suggestion', e.target.value)}
                />
            )
        },
        {
            title: '操作',
            key: 'action',
            width: '15%',
            render: (_, record, index) => (
                <Button
                    type="link"
                    danger
                    onClick={() => this.handleDeleteRule(index)}
                >
                    删除
                </Button>
            )
        }
    ];

    getTreeData = () => {
        return this.state.treeData;
    };

    findNodeByKey = (key, node = this.state.treeData) => {
        if (node.key === key) {
            return node;
        }
        
        if (node.children) {
            for (const child of node.children) {
                const found = this.findNodeByKey(key, child);
                if (found) {
                    return found;
                }
            }
        }
        
        return null;
    };

    handleAddNode = (values) => {
        if (!this.state.selectedNode) {
            message.error('请先选择一个节点');
            return;
        }

        const parentKey = this.state.selectedNode.key;
        const newNodeKey = `${parentKey}->${values.name}`;

        const existingNode = this.findNodeByKey(newNodeKey);
        if (existingNode) {
            message.error(`节点名称已存在，与节点 "${existingNode.key}" 冲突，请使用其他名称`);
            return;
        }

        const newNode = {
            key: newNodeKey,
            name: values.name,
            title: values.name,
            description: values.description || '',
            node_status: values.node_status || 'info',
            children: []
        };

        if (values.isMetricNode) {
            newNode.data_source = { source: values.data_source };
            newNode.metric_name = values.metric_name;
            newNode.rules = this.state.rules;
        }

        const updateNodeInTree = (treeData) => {
            if (treeData.key === parentKey) {
                return {
                    ...treeData,
                    children: [...(treeData.children || []), newNode]
                };
            }

            if (treeData.children && treeData.children.length > 0) {
                return {
                    ...treeData,
                    children: treeData.children.map(child => updateNodeInTree(child))
                };
            }

            return treeData;
        };

        this.setState(prevState => ({
            treeData: updateNodeInTree(prevState.treeData),
            expandedKeys: [...new Set([...prevState.expandedKeys, parentKey, newNodeKey])],
            isAddNodeModalVisible: false,
            rightClickNodeTreeItem: null,
            rules: [],
            selectedNode: newNode
        }), () => {
            this.props.form.resetFields();
            message.success('节点添加成功');
        });
    };

    handleEditNode = (values) => {
        if (!this.state.selectedNode) return;

        const newNodeKey = `${this.state.selectedNode.key.split('->').slice(0, -1).join('->')}->${values.name}`;

        const existingNode = this.findNodeByKey(newNodeKey);
        if (existingNode && existingNode.key !== this.state.selectedNode.key) {
            message.error(`节点名称已存在，与节点 "${existingNode.key}" 冲突，请使用其他名称`);
            return;
        }

        const updateNodeInTree = (node) => {
            if (node.key === this.state.selectedNode.key) {
                const updatedNode = {
                    ...node,
                    name: values.name,
                    title: values.name,
                    description: values.description || '',
                    node_status: values.node_status || 'info',
                };

                if (values.isMetricNode) {
                    updatedNode.data_source = { source: values.data_source };
                    updatedNode.metric_name = values.metric_name;
                    updatedNode.rules = this.state.rules;
                } else {
                    delete updatedNode.data_source;
                    delete updatedNode.metric_name;
                    delete updatedNode.rules;
                }

                return updatedNode;
            }
            if (node.children) {
                return {
                    ...node,
                    children: node.children.map(child => updateNodeInTree(child))
                };
            }
            return node;
        };

        this.setState(prevState => {
            const updatedTreeData = updateNodeInTree(prevState.treeData);
            const updatedNode = this.findNodeByKey(this.state.selectedNode.key, updatedTreeData);
            return {
                treeData: updatedTreeData,
                isEditModalVisible: false,
                rules: [],
                selectedNode: updatedNode
            };
        }, () => {
            message.success('节点更新成功');
        });
    };

    handleDeleteNode = () => {
        if (!this.state.selectedNode || this.state.selectedNode.key === 'Root') {
            message.warning('无法删除根节点');
            return;
        }

        const deleteNodeInTree = (node) => {
            if (node.children) {
                return {
                    ...node,
                    children: node.children.filter(child => 
                        child.key !== this.state.selectedNode.key
                    ).map(child => deleteNodeInTree(child))
                };
            }
            return node;
        };

        this.setState(prevState => ({
            treeData: deleteNodeInTree(prevState.treeData),
            selectedNode: null,
            rightClickNodeTreeItem: null
        }), () => {
            message.success('节点删除成功');
        });
    };

    handleRuleChange = (index, field, value) => {
        const updatedRules = [...this.state.rules];
        if (field === 'type') {
            // 当类型改变时，重置条件为对应类型的默认值
            const defaultConditions = {
                numeric: '>',
                float: '>',
                string: '=='
            };
            updatedRules[index] = {
                ...updatedRules[index],
                [field]: value,
                condition: defaultConditions[value]
            };
        } else {
            updatedRules[index] = {
                ...updatedRules[index],
                [field]: value
            };
        }
        this.setState({ rules: updatedRules });
    };

    handleDeleteRule = (index) => {
        const updatedRules = this.state.rules.filter((_, i) => i !== index);
        this.setState({ rules: updatedRules });
    };

    handleAddRule = () => {
        const newRule = {
            type: 'numeric',
            condition: '>',  // 数值型默认使用大于
            threshold: 0,
            status: 'warning',
            impact_analysis: '',
            suggestion: ''
        };
        this.setState(prevState => ({
            rules: [...prevState.rules, newRule]
        }));
    };

    onSelect = (selectedKeys, { node }) => {
        const fullNode = this.findNodeInTree(node.props.eventKey, this.state.treeData);
        if (fullNode) {
            this.setState({ 
                selectedNode: fullNode,
                rules: fullNode.rules || [],
                isMetricNode: !!fullNode.data_source
            });
        }
    };

    onRightClick = ({ event, node }) => {
        event.preventDefault();
        event.stopPropagation();
        
        const fullNode = this.findNodeInTree(node.props.eventKey, this.state.treeData);
        const offset = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - offset.left;
        const y = event.clientY - offset.top;
        
        this.setState({
            selectedNode: fullNode,
            rightClickNodeTreeItem: {
                x,
                y,
                node: fullNode
            }
        });
    };

    findNodeInTree = (targetKey, treeData) => {
        if (targetKey === treeData.key) {
            return treeData;
        }
        
        if (treeData.children) {
            for (const child of treeData.children) {
                if (child.key === targetKey) {
                    return child;
                }
                const found = this.findNodeInTree(targetKey, child);
                if (found) {
                    return found;
                }
            }
        }
        
        return null;
    };

    renderNodeEditor = () => {
        const { selectedNode } = this.state;
        if (!selectedNode) {
            return <Empty description="请选择一个节点" />;
        }

        return (
            <div>
                <h3 style={{ marginBottom: '16px' }}>节点详情</h3>
                <div>
                    <p><strong>节点名称：</strong> {selectedNode.name}</p>
                    <p><strong>节点描述：</strong> {selectedNode.description || '无'}</p>
                    <p><strong>节点状态：</strong> {selectedNode.node_status || 'info'}</p>
                    {selectedNode.data_source && (
                        <>
                            <p><strong>数据源：</strong> {selectedNode.data_source.source}</p>
                            <p><strong>指标名称：</strong> {selectedNode.metric_name}</p>
                            <Card size="small" title="规则配置" style={{ marginTop: 16 }}>
                                <Table
                                    columns={this.ruleColumns}
                                    dataSource={selectedNode.rules || []}
                                    pagination={false}
                                    size="small"
                                />
                            </Card>
                        </>
                    )}
                </div>
            </div>
        );
    };

    renderTreeNodeTitle = (nodeData) => {
        return (
            <span className="tree-node-content">
                <span className="node-title">{nodeData.name}</span>
                {nodeData.node_status && (
                    <Icon 
                        type="circle" 
                        theme="filled" 
                        style={{ 
                            marginLeft: 8,
                            color: nodeData.node_status === 'error' ? '#f5222d' : 
                                   nodeData.node_status === 'warning' ? '#faad14' : '#52c41a'
                        }} 
                    />
                )}
            </span>
        );
    };

    renderRightClickMenu() {
        const { rightClickNodeTreeItem } = this.state;
        if (!rightClickNodeTreeItem) {
            return null;
        }

        const menuStyle = {
            position: 'absolute',
            left: (rightClickNodeTreeItem.x + 10) + 'px',
            top: (rightClickNodeTreeItem.y - 10) + 'px',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            border: '1px solid #d9d9d9',
            borderRadius: '2px',
            padding: '4px 0',
            zIndex: 1000,
            minWidth: '120px'
        };

        return (
            <div
                className="right-click-menu"
                style={menuStyle}
                onClick={(e) => e.stopPropagation()}
                onMouseLeave={() => this.setState({ rightClickNodeTreeItem: null })}
            >
                {rightClickNodeTreeItem.node.key === 'Root' && (
                    <>
                        <div 
                            className="right-click-menu-item"
                            onClick={() => {
                                this.setState({
                                    expandedKeys: this.getAllKeys(rightClickNodeTreeItem.node),
                                    rightClickNodeTreeItem: null
                                });
                            }}
                        >
                            <Icon type="folder-open" style={{ marginRight: '8px' }} />
                            展开所有节点
                        </div>
                        <div 
                            className="right-click-menu-item"
                            onClick={() => {
                                this.setState({
                                    expandedKeys: [],
                                    rightClickNodeTreeItem: null
                                });
                            }}
                        >
                            <Icon type="folder" style={{ marginRight: '8px' }} />
                            收缩所有节点
                        </div>
                    </>
                )}
                <div 
                    className="right-click-menu-item"
                    onClick={() => {
                        this.setState({
                            isAddNodeModalVisible: true,
                            rightClickNodeTreeItem: null
                        });
                        this.props.form.resetFields();
                    }}
                >
                    <Icon type="plus" style={{ marginRight: '8px' }} />
                    新增子节点
                </div>
                <div 
                    className="right-click-menu-item"
                    onClick={() => {
                        this.setState({
                            isEditModalVisible: true,
                            rightClickNodeTreeItem: null
                        });
                        const node = rightClickNodeTreeItem.node;
                        this.props.form.setFieldsValue({
                            name: node.name,
                            description: node.description,
                            node_status: node.node_status || 'info',
                            isMetricNode: !!node.data_source,
                            data_source: node.data_source ? node.data_source.source : undefined,
                            metric_name: node.metric_name
                        });
                        this.setState({
                            isMetricNode: !!node.data_source,
                            rules: node.rules || []
                        });
                    }}
                >
                    <Icon type="edit" style={{ marginRight: '8px' }} />
                    编辑节点
                </div>
                {rightClickNodeTreeItem.node.key !== 'Root' && (
                    <div 
                        className="right-click-menu-item"
                        onClick={() => {
                            Modal.confirm({
                                title: '确认删除',
                                content: '确定要删除此节点吗？删除后无法恢复。',
                                onOk: () => {
                                    this.handleDeleteNode();
                                }
                            });
                        }}
                    >
                        <Icon type="delete" style={{ marginRight: '8px' }} />
                        删除节点
                    </div>
                )}
            </div>
        );
    }

    getAllKeys = (node) => {
        const keys = [node.key];
        if (node.children) {
            node.children.forEach(child => {
                keys.push(...this.getAllKeys(child));
            });
        }
        return keys;
    };

    processTreeData = (node) => {
        const currentNode = {
            ...node,
            key: node.key || 'Root'
        };

        const processedNode = {
            ...currentNode,
            title: this.renderTreeNodeTitle(currentNode)
        };

        if (currentNode.children && currentNode.children.length > 0) {
            processedNode.children = currentNode.children.map(child => this.processTreeData(child));
        } else {
            processedNode.children = [];
        }

        return processedNode;
    };

    checkInitData = (node = this.state.treeData) => {
        const nodeKeys = new Set();
        
        const traverse = (currentNode) => {
            if (nodeKeys.has(currentNode.key)) {
                message.error(`检测到重复的节点key: ${currentNode.key}`);
                return false;
            }
            nodeKeys.add(currentNode.key);
            
            if (currentNode.children) {
                for (const child of currentNode.children) {
                    if (!traverse(child)) {
                        return false;
                    }
                }
            }
            return true;
        };

        return traverse(node);
    };

    handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (this.state.selectedNode) {
                this.setState({
                    isAddNodeModalVisible: true,
                    rightClickNodeTreeItem: null
                });
                this.props.form.resetFields();
            } else {
                message.warning('请先选择一个节点');
            }
        } else if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            this.handleCopy();
        } else if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            this.handlePaste();
        }
    };

    componentDidMount() {
        const isValid = this.checkInitData();
        if (!isValid) {
            message.error('初始化故障树结构存在重复节点key，请检查并修正');
        }
        document.addEventListener('keydown', this.handleKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    handleDrop = (info) => {
        const dropKey = info.node.props.eventKey;
        const dragKey = info.dragNode.props.eventKey;

        // 深拷贝当前树数据
        const data = JSON.parse(JSON.stringify(this.state.treeData));

        // 找到并移除被拖拽的节点，同时返回该节点
        const findAndRemoveDragNode = (nodeData) => {
            if (!nodeData.children) return null;
            for (let i = 0; i < nodeData.children.length; i++) {
                if (nodeData.children[i].key === dragKey) {
                    const [dragNode] = nodeData.children.splice(i, 1);
                    return dragNode;
                }
                const found = findAndRemoveDragNode(nodeData.children[i]);
                if (found) return found;
            }
            return null;
        };

        // 获取被拖拽的节点
        const dragNode = findAndRemoveDragNode(data);
        if (!dragNode) return;

        // 添加节点到目标位置
        const addNode = (nodeData, targetKey, node) => {
            if (nodeData.key === targetKey) {
                nodeData.children = nodeData.children || [];
                nodeData.children.push(node);
                return true;
            }
            if (nodeData.children) {
                for (const child of nodeData.children) {
                    if (addNode(child, targetKey, node)) {
                        return true;
                    }
                }
            }
            return false;
        };

        // 特殊处理拖拽到根节点的情况
        if (dropKey === 'Root') {
            data.children = data.children || [];
            data.children.push(dragNode);
        } else {
            addNode(data, dropKey, dragNode);
        }

        // 更新所有节点的 key
        const updateKeys = (node, parentKey = '') => {
            const newKey = parentKey ? `${parentKey}->${node.name}` : node.name;
            node.key = newKey;
            if (node.children) {
                node.children.forEach(child => updateKeys(child, newKey));
            }
        };

        // 从根节点开始更新所有 key
        updateKeys(data);

        // 更新状态
        this.setState({
            treeData: data,
            selectedNode: null
        }, () => {
            // 验证树结构
            if (!this.checkInitData()) {
                message.error('拖拽后的树结构存在问题，请检查节点关系');
            }
        });
    };

    allowDrop = ({ dropNode, dragNode }) => {
        // 允许拖拽到根节点下
        if (dropNode.props.eventKey === 'Root') return true;
        
        // 不允许将节点拖到自己的子节点下
        const isChild = (parent, child) => {
            if (!parent.children) return false;
            return parent.children.some(node => 
                node.key === child.key || isChild(node, child)
            );
        };
        
        return !isChild(dragNode, dropNode);
    };

    handleCopy = () => {
        const { selectedNode } = this.state;
        if (!selectedNode || selectedNode.key === 'Root') {
            message.warning('无法复制根节点');
            return;
        }

        // 深拷贝选中的节点
        const copiedNode = JSON.parse(JSON.stringify(selectedNode));
        this.setState({ copiedNode });
        message.success('节点已复制');
    };

    handlePaste = () => {
        const { selectedNode, copiedNode } = this.state;
        if (!selectedNode) {
            message.warning('请先选择目标节点');
            return;
        }
        if (!copiedNode) {
            message.warning('没有可粘贴的节点');
            return;
        }

        // 递归更新节点及其子节点的key
        const updateNodeKeys = (node, parentKey) => {
            const newNode = { ...node };
            newNode.key = `${parentKey}->${node.name}`;
            
            if (node.children && node.children.length > 0) {
                newNode.children = node.children.map(child => 
                    updateNodeKeys(child, newNode.key)
                );
            }
            return newNode;
        };

        const newNode = updateNodeKeys(copiedNode, selectedNode.key);

        const existingNode = this.findNodeByKey(newNode.key);
        if (existingNode) {
            message.error(`节点名称已存在，与节点 "${existingNode.key}" 冲突`);
            return;
        }

        const updateNodeInTree = (treeData) => {
            if (treeData.key === selectedNode.key) {
                return {
                    ...treeData,
                    children: [...(treeData.children || []), newNode]
                };
            }

            if (treeData.children) {
                return {
                    ...treeData,
                    children: treeData.children.map(child => updateNodeInTree(child))
                };
            }

            return treeData;
        };

        this.setState(prevState => ({
            treeData: updateNodeInTree(prevState.treeData),
            expandedKeys: [...new Set([...prevState.expandedKeys, selectedNode.key, newNode.key])]
        }), () => {
            message.success('节点已粘贴');
        });
    };

    render() {
        return (
            <div style={{ display: 'flex', height: 'calc(100vh - 180px)' }}>
                <div className="tree-container" style={{ 
                    flex: '0 0 300px', 
                    borderRight: '1px solid #e8e8e8', 
                    padding: '10px', 
                    position: 'relative' 
                }}>
                    <Tree
                        treeData={[this.processTreeData(this.state.treeData)]}
                        onSelect={this.onSelect}
                        onRightClick={this.onRightClick}
                        showLine
                        showIcon
                        expandedKeys={this.state.expandedKeys}
                        onExpand={(keys) => this.setState({ expandedKeys: keys })}
                        selectedKeys={this.state.selectedNode ? [this.state.selectedNode.key] : []}
                        draggable
                        onDrop={this.handleDrop}
                        allowDrop={this.allowDrop}
                    />
                    {this.renderRightClickMenu()}
                </div>
                <div className="editor-container" style={{ flex: 1, padding: '20px' }}>
                    {this.renderNodeEditor()}
                </div>

                <Modal
                    title="新增子节点"
                    visible={this.state.isAddNodeModalVisible}
                    onOk={() => {
                        this.props.form.validateFields((err, values) => {
                            if (!err) {
                                this.handleAddNode(values);
                            }
                        });
                    }}
                    onCancel={() => {
                        this.setState({ isAddNodeModalVisible: false });
                        this.props.form.resetFields();
                    }}
                    width={1200}
                    style={{ top: 20 }}
                >
                    <Form layout="vertical">
                        <Form.Item label="节点名称">
                            {this.props.form.getFieldDecorator('name', {
                                rules: [
                                    { required: true, message: '请输入节点名称' },
                                    { 
                                        validator: (_, value, callback) => {
                                            if (value && this.findNodeByKey(value)) {
                                                callback('节点名称已存在');
                                            } else {
                                                callback();
                                            }
                                        }
                                    }
                                ]
                            })(
                                <Input placeholder="请输入节点名称" />
                            )}
                        </Form.Item>
                        <Form.Item label="节点描述">
                            {this.props.form.getFieldDecorator('description')(
                                <Input.TextArea placeholder="请输入节点描述" />
                            )}
                        </Form.Item>
                        <Form.Item label="节点状态">
                            {this.props.form.getFieldDecorator('node_status', {
                                initialValue: 'info'
                            })(
                                <Select>
                                    <Option value="info">info</Option>
                                    <Option value="warning">warning</Option>
                                    <Option value="error">error</Option>
                                </Select>
                            )}
                        </Form.Item>
                        <Form.Item label="是否为指标节点">
                            {this.props.form.getFieldDecorator('isMetricNode', {
                                valuePropName: 'checked',
                                initialValue: false
                            })(
                                <Switch 
                                    onChange={(checked) => {
                                        this.setState({ isMetricNode: checked });
                                        if (!checked) {
                                            this.setState({ rules: [] });
                                            this.props.form.setFieldsValue({
                                                data_source: undefined,
                                                metric_name: undefined
                                            });
                                        }
                                    }}
                                />
                            )}
                        </Form.Item>

                        {this.state.isMetricNode && (
                            <>
                                <Form.Item label="数据源">
                                    {this.props.form.getFieldDecorator('data_source', {
                                        rules: [{ required: true, message: '请选择数据源' }]
                                    })(
                                        <Select placeholder="请选择数据源">
                                            <Option value="HandleZabbixMetrics">HandleZabbixMetrics</Option>
                                            <Option value="HandleElasticSearchMetrics">HandleElasticSearchMetrics</Option>
                                            <Option value="HandleCustomFunction">HandleCustomFunction</Option>
                                        </Select>
                                    )}
                                </Form.Item>

                                <Form.Item label="指标名称">
                                    {this.props.form.getFieldDecorator('metric_name', {
                                        rules: [{ required: true, message: '请输入指标名称' }]
                                    })(
                                        <Input placeholder="请输入指标名称" />
                                    )}
                                </Form.Item>

                                <Form.Item label="规则配置">
                                    <Table
                                        columns={this.ruleColumns}
                                        dataSource={this.state.rules}
                                        pagination={false}
                                        size="small"
                                        bordered
                                        rowKey={(record, index) => index}
                                        scroll={{ x: 1300 }}
                                    />
                                    <Button
                                        type="dashed"
                                        style={{ width: '100%', marginTop: 16 }}
                                        icon={<Icon type="plus" />}
                                        onClick={this.handleAddRule}
                                    >
                                        添加规则
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form>
                </Modal>

                <Modal
                    title="编辑节点"
                    visible={this.state.isEditModalVisible}
                    onOk={() => {
                        this.props.form.validateFields((err, values) => {
                            if (!err) {
                                this.handleEditNode(values);
                            }
                        });
                    }}
                    onCancel={() => {
                        this.setState({ isEditModalVisible: false });
                        this.props.form.resetFields();
                    }}
                    width={1200}
                    style={{ top: 20 }}
                >
                    <Form layout="vertical">
                        <Form.Item label="节点名称">
                            {this.props.form.getFieldDecorator('name', {
                                rules: [{ required: true, message: '请输入节点名称' }]
                            })(
                                <Input placeholder="请输入节点名称" />
                            )}
                        </Form.Item>
                        <Form.Item label="节点描述">
                            {this.props.form.getFieldDecorator('description')(
                                <Input.TextArea placeholder="请输入节点描述" />
                            )}
                        </Form.Item>
                        <Form.Item label="节点状态">
                            {this.props.form.getFieldDecorator('node_status', {
                                initialValue: 'info'
                            })(
                                <Select>
                                    <Option value="info">info</Option>
                                    <Option value="warning">warning</Option>
                                    <Option value="error">error</Option>
                                </Select>
                            )}
                        </Form.Item>
                        <Form.Item label="是否为指标节点">
                            {this.props.form.getFieldDecorator('isMetricNode', {
                                valuePropName: 'checked',
                                initialValue: false
                            })(
                                <Switch 
                                    onChange={(checked) => {
                                        this.setState({ isMetricNode: checked });
                                        if (!checked) {
                                            this.setState({ rules: [] });
                                            this.props.form.setFieldsValue({
                                                data_source: undefined,
                                                metric_name: undefined
                                            });
                                        }
                                    }}
                                />
                            )}
                        </Form.Item>

                        {this.state.isMetricNode && (
                            <>
                                <Form.Item label="数据源">
                                    {this.props.form.getFieldDecorator('data_source', {
                                        rules: [{ required: true, message: '请选择数据源' }]
                                    })(
                                        <Select placeholder="请选择数据源">
                                            <Option value="HandleZabbixMetrics">HandleZabbixMetrics</Option>
                                            <Option value="HandleElasticSearchMetrics">HandleElasticSearchMetrics</Option>
                                            <Option value="HandleCustomFunction">HandleCustomFunction</Option>
                                        </Select>
                                    )}
                                </Form.Item>

                                <Form.Item label="指标名称">
                                    {this.props.form.getFieldDecorator('metric_name', {
                                        rules: [{ required: true, message: '请输入指标名称' }]
                                    })(
                                        <Input placeholder="请输入指标名称" />
                                    )}
                                </Form.Item>

                                <Form.Item label="规则配置">
                                    <Table
                                        columns={this.ruleColumns}
                                        dataSource={this.state.rules}
                                        pagination={false}
                                        size="small"
                                        bordered
                                        rowKey={(record, index) => index}
                                        scroll={{ x: 1300 }}
                                    />
                                    <Button
                                        type="dashed"
                                        style={{ width: '100%', marginTop: 16 }}
                                        icon={<Icon type="plus" />}
                                        onClick={this.handleAddRule}
                                    >
                                        添加规则
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form>
                </Modal>
            </div>
        );
    }
}

const styles = `
    .tree-node-content {
        display: flex;
        align-items: center;
        padding: 0 4px;
    }
    
    .node-title {
        flex: 1;
    }
    
    .right-click-menu-item {
        padding: 5px 12px;
        cursor: pointer;
        transition: all 0.3s;
        white-space: nowrap;
        display: flex;
        align-items: center;
    }
    
    .right-click-menu-item:hover {
        background: #e6f7ff;
        color: #1890ff;
    }

    .right-click-menu-item .anticon {
        color: #1890ff;
    }
    
    .right-click-menu-item:hover .anticon {
        color: #40a9ff;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const ConfigTree = forwardRef((props, ref) => {
    const FormWrappedComponent = Form.create()(ConfigTreeComponent);
    return <FormWrappedComponent {...props} wrappedComponentRef={ref} />;
});

export default ConfigTree;
