import React, { useState } from 'react';
import {
  Tree,
  Card,
  Form,
  Input,
  Select,
  Button,
  Modal,
  message,
  Dropdown,
  Menu,
  Icon,
  Empty,
  Upload,
} from 'antd';
import './index.css';
import MyAxios from "../common/interface"
const { Option } = Select;

class FaultTreeConfigNew extends React.Component {
  state = {
    isAddNodeModalVisible: false,
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
    ftName: this.props.initialValues?.ft_name || '',
    ftDesc: this.props.initialValues?.ft_desc || '',
    ftStatus: this.props.initialValues?.ft_status || 'draft',
    rightClickNodeTreeItem: null,
  };

  handleAddNode = (values) => {
    if (!this.state.selectedNode) {
      message.error('请先选择一个节点');
      return;
    }

    const parentKey = this.state.selectedNode.key;
    const timestamp = new Date().getTime();
    const newNodeKey = `${parentKey}->${values.name}_${timestamp}`;

    const newNode = {
      key: newNodeKey,
      name: values.name,
      title: values.name,
      description: values.description || '',
      node_status: values.node_status || 'info',
      children: []
    };

    const updateNodeInTree = (treeData) => {
      if (treeData.key === parentKey) {
        return {
          ...treeData,
          children: [...(treeData.children || []), newNode]
        };
      }

      if (treeData.children && treeData.children.length > 0) {
        const updatedChildren = treeData.children.map(child => updateNodeInTree(child));
        const hasChanges = updatedChildren.some((child, index) => child !== treeData.children[index]);
        if (hasChanges) {
          return {
            ...treeData,
            children: updatedChildren
          };
        }
      }

      return treeData;
    };

    this.setState(prevState => ({
      treeData: updateNodeInTree(prevState.treeData),
      expandedKeys: [...new Set([...prevState.expandedKeys, parentKey, newNodeKey])],
      isAddNodeModalVisible: false,
      rightClickNodeTreeItem: null
    }), () => {
      this.props.form.resetFields();
      message.success('节点添加成功');
    });
  };

  handleEditNode = (values) => {
    if (!this.state.selectedNode) return;

    const updateNodeInTree = (node) => {
      if (node.key === this.state.selectedNode.key) {
        return {
          ...node,
          name: values.name,
          title: values.name,
          description: values.description || '',
          node_status: values.node_status || 'info',
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

    this.setState(prevState => ({
      treeData: updateNodeInTree(prevState.treeData)
    }));
    
    message.success('节点更新成功');
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
      selectedNode: null
    }));
    
    message.success('节点删除成功');
  };

  onSelect = (selectedKeys, { node }) => {
    const fullNode = this.findNodeInTree(node.props.eventKey, this.state.treeData);
    if (fullNode) {
      this.setState({ selectedNode: fullNode }, () => {
        this.props.form.setFieldsValue({
          name: fullNode.name,
          description: fullNode.description,
          node_status: fullNode.node_status || 'info'
        });
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

  getFtName = () => this.state.ftName;
  getFtDesc = () => this.state.ftDesc;
  getFtStatus = () => this.state.ftStatus;
  getTreeData = () => this.state.treeData;

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
        </div>
      </div>
    );
  }

  renderTreeNodeTitle = (nodeData) => {
    return (
      <span className="tree-node-content">
        <span className="node-title">{nodeData.name}</span>
      </span>
    );
  };

  handleAddClick = (nodeData) => {
    this.setState({
      selectedNode: nodeData,
      isAddNodeModalVisible: true,
      rightClickNodeTreeItem: null
    }, () => {
      this.props.form.resetFields();
    });
  };

  handleEditClick = (nodeData) => {
    this.setState({
      selectedNode: nodeData,
      rightClickNodeTreeItem: null
    }, () => {
      this.props.form.setFieldsValue({
        name: nodeData.name,
        description: nodeData.description,
        node_status: nodeData.node_status || 'info'
      });
    });
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
        <div 
          className="right-click-menu-item"
          onClick={() => {
            this.setState({
              isAddNodeModalVisible: true,
              selectedNode: rightClickNodeTreeItem.node,
              rightClickNodeTreeItem: null
            });
            this.props.form.resetFields();
          }}
        >
          <Icon type="plus-circle" style={{ marginRight: '8px' }} />
          新增子节点
        </div>
        <div 
          className="right-click-menu-item"
          onClick={() => {
            this.setState({
              isEditModalVisible: true,
              selectedNode: rightClickNodeTreeItem.node,
              rightClickNodeTreeItem: null
            });
            this.props.form.setFieldsValue({
              name: rightClickNodeTreeItem.node.name,
              description: rightClickNodeTreeItem.node.description,
              node_status: rightClickNodeTreeItem.node.node_status || 'info'
            });
          }}
        >
          <Icon type="edit" style={{ marginRight: '8px' }} />
          编辑节点
        </div>
      </div>
    );
  }

  handleSave = async () => {
    if (!this.state.ftName?.trim()) {
        message.error('请输入场景名称');
        return;
    }

    try {
        const submitData = {
            ft_name: this.state.ftName,
            ft_desc: this.state.ftDesc,
            ft_status: this.state.ftStatus,
            ft_content: JSON.stringify(this.state.treeData)
        };

        const res = await MyAxios.post('/fault_tree/v1/create_config/', submitData);
        
        if (res.data.status === 'ok') {
            message.success('保存成功');
            this.props.onSave && this.props.onSave(res.data.data);
        } else {
            message.error(res.data.message || '保存失败');
        }
        console.log(submitData);
    } catch (error) {
        console.error('保存故障树配置失败:', error);
        message.error('保存失败，请稍后重试');
    }
};

handleUpdateClick = async () => {
    if (!this.state.ftName?.trim()) {
        message.error('请输入场景名称');
        return;
    }

    try {
        const submitData = {
            ft_id: this.props.initialValues.ft_id,
            ft_name: this.state.ftName,
            ft_desc: this.state.ftDesc,
            ft_status: this.state.ftStatus,
            ft_content: JSON.stringify(this.state.treeData)
        };

        console.log('Updating with data:', submitData);

        const res = await MyAxios.post('/fault_tree/v1/update_config/', submitData);
        
        if (res.data.status === 'ok') {
            message.success('更新成功');
            this.props.onSave && this.props.onSave(res.data.data);
            this.setState({
                initialFtName: this.state.ftName,
                initialFtDesc: this.state.ftDesc,
                initialFtStatus: this.state.ftStatus,
                initialTreeData: this.state.treeData
            });
        } else {
            message.error(res.data.message || '更新失败');
        }
    } catch (error) {
        console.error('更新故障树配置失败:', error);
        message.error('更新失败，请稍后重试');
    }
};

  render() {
    return (
      <div className="fault-tree-config-new">
        <Card 
          title="故障树配置"
          extra={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                type="primary"
                onClick={this.handleUpdateClick}
                icon={<Icon type="save" />}
              >
                {this.props.initialValues?.ft_id ? '更新' : '保存'}
              </Button>
              <Input
                placeholder="场景名称"
                value={this.state.ftName}
                onChange={e => {
                  this.setState({ ftName: e.target.value });
                }}
                style={{ width: 200 }}
              />
              <Input
                placeholder="场景描述"
                value={this.state.ftDesc}
                onChange={e => {
                  this.setState({ ftDesc: e.target.value });
                }}
                style={{ width: 300 }}
              />
              <Select
                value={this.state.ftStatus}
                onChange={value => {
                  this.setState({ ftStatus: value });
                }}
                style={{ width: 100 }}
              >
                <Option value="draft">草稿</Option>
                <Option value="active">启用</Option>
              </Select>
              <Button
                icon={<Icon type="history" />}
                onClick={() => {
                  message.info('历史版本功能开发中');
                }}
              >
                历史
              </Button>
              <Upload
                beforeUpload={this.handleImport}
                showUploadList={false}
                accept=".json"
              >
                <Button icon={<Icon type="upload" />}>
                  导入配置
                </Button>
              </Upload>
              <Button
                icon={<Icon type="download" />}
                onClick={this.handleExport}
              >
                导出配置
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', height: 'calc(100vh - 180px)' }}>
            <div className="tree-container" style={{ flex: '0 0 300px', borderRight: '1px solid #e8e8e8', padding: '10px', position: 'relative' }}>
              <Tree
                treeData={[this.processTreeData(this.state.treeData)]}
                onSelect={this.onSelect}
                onRightClick={this.onRightClick}
                showLine
                showIcon
                expandedKeys={this.state.expandedKeys}
                onExpand={(keys) => this.setState({ expandedKeys: keys })}
                selectedKeys={this.state.selectedNode ? [this.state.selectedNode.key] : []}
              />
              {this.renderRightClickMenu()}
            </div>
            <div className="editor-container" style={{ flex: 1, padding: '20px' }}>
              {this.renderNodeEditor()}
            </div>
          </div>
        </Card>

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
          </Form>
        </Modal>

        <Modal
          title="编辑节点"
          visible={this.state.isEditModalVisible}
          onOk={() => {
            this.props.form.validateFields((err, values) => {
              if (!err) {
                this.handleEditNode(values);
                this.setState({ isEditModalVisible: false });
              }
            });
          }}
          onCancel={() => {
            this.setState({ isEditModalVisible: false });
            this.props.form.resetFields();
          }}
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
                <Input.TextArea placeholder="请输入��点描述" />
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

export default Form.create()(FaultTreeConfigNew);
