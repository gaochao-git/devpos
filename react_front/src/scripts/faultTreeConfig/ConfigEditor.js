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
} from 'antd';
import './index.css';

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
        <h3 style={{ marginBottom: '16px' }}>编辑节点</h3>
        <Form layout="vertical">
          <Form.Item label="节点名称">
            {this.props.form.getFieldDecorator('name', {
              initialValue: selectedNode.name,
              rules: [{ required: true, message: '请输入节点名称' }]
            })(
              <Input placeholder="请输入节点名称" />
            )}
          </Form.Item>

          <Form.Item label="节点描述">
            {this.props.form.getFieldDecorator('description', {
              initialValue: selectedNode.description
            })(
              <Input.TextArea placeholder="请输入节点描述" />
            )}
          </Form.Item>

          <Form.Item label="节点状态">
            {this.props.form.getFieldDecorator('node_status', {
              initialValue: selectedNode.node_status || 'info'
            })(
              <Select>
                <Option value="info">info</Option>
                <Option value="warning">warning</Option>
                <Option value="error">error</Option>
              </Select>
            )}
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={this.handleSave}>
              保存
            </Button>
          </Form.Item>
        </Form>
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
          onClick={async (e) => {
            e.stopPropagation();
            await new Promise(resolve => {
              this.setState({
                selectedNode: rightClickNodeTreeItem.node
              }, resolve);
            });
            
            this.setState({
              isAddNodeModalVisible: true,
              rightClickNodeTreeItem: null
            });
            this.props.form.resetFields();
          }}
        >
          <Icon type="plus-circle" style={{ marginRight: '8px' }} />
          新增子节点
        </div>
      </div>
    );
  }

  handleSave = () => {
    this.props.form.validateFields((err, values) => {
      if (err) return;

      const updateNodeInTree = (treeData) => {
        if (treeData.key === this.state.selectedNode.key) {
          return {
            ...treeData,
            ...values
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
        treeData: updateNodeInTree(prevState.treeData)
      }), () => {
        message.success('保存成功');
      });
    });
  };

  render() {
    return (
      <div className="fault-tree-config-new">
        <Card title="故障树配置">
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
          title="添加子节点"
          visible={this.state.isAddNodeModalVisible}
          onCancel={() => {
            this.setState({ 
              isAddNodeModalVisible: false,
              rightClickNodeTreeItem: null 
            });
            this.props.form.resetFields();
          }}
          footer={null}
        >
          <Form
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
          >
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

            <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
              <Button 
                type="primary" 
                onClick={() => {
                  this.props.form.validateFields((err, values) => {
                    if (!err) {
                      this.handleAddNode(values);
                    }
                  });
                }}
              >
                确定
              </Button>
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
