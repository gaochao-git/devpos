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
    console.log('handleAddNode - Starting with values:', values);
    console.log('handleAddNode - Current selected node:', this.state.selectedNode);

    if (!this.state.selectedNode) {
      message.error('请先选择一个节点');
      return;
    }

    const parentKey = this.state.selectedNode.key;
    console.log('handleAddNode - Parent key:', parentKey);

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
        console.log('Found parent node:', treeData);
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

    this.setState(prevState => {
      const newTreeData = JSON.parse(JSON.stringify(prevState.treeData));
      const updatedTreeData = updateNodeInTree(newTreeData);
      
      console.log('Tree before update:', newTreeData);
      console.log('Tree after update:', updatedTreeData);
      
      return {
        treeData: updatedTreeData,
        expandedKeys: [...new Set([...prevState.expandedKeys, parentKey, newNodeKey])],
        isAddNodeModalVisible: false,
        rightClickNodeTreeItem: null
      };
    }, () => {
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
    const selectedNode = {
      ...node,
      key: node.key || 'Root',
      children: node.children || []
    };
    
    console.log('Selected node:', selectedNode);
    this.setState({ selectedNode });
  };

  onRightClick = ({ event, node }) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Right click - Original node:', node);
    
    const fullNode = this.findNodeInTree(node.props.eventKey, this.state.treeData);
    console.log('Right click - Full node data:', fullNode);
    
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
    }, () => {
      console.log('Right click - State after update:', this.state.selectedNode);
    });
  };

  findNodeInTree = (targetKey, treeData) => {
    console.log('Finding node with key:', targetKey, 'in tree:', treeData);
    
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

  renderNodeEditor() {
    const { form } = this.props;
    const { getFieldDecorator } = form;
    const { selectedNode } = this.state;

    if (!selectedNode) {
      return (
        <div className="node-editor-empty">
          <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
            请选择一个节点进行编辑
          </div>
        </div>
      );
    }

    return (
      <div className="node-editor">
        <Form
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          onSubmit={(e) => {
            e.preventDefault();
            this.props.form.validateFields((err, values) => {
              if (!err) {
                this.handleEditNode(values);
              }
            });
          }}
        >
          <Form.Item label="节点名称">
            {getFieldDecorator('name', {
              initialValue: selectedNode.name,
              rules: [{ required: true, message: '请输入节点名称' }]
            })(
              <Input placeholder="请输入节点名称" />
            )}
          </Form.Item>

          <Form.Item label="节点描述">
            {getFieldDecorator('description', {
              initialValue: selectedNode.description
            })(
              <Input.TextArea placeholder="请输入节点描述" />
            )}
          </Form.Item>

          <Form.Item label="节点状态">
            {getFieldDecorator('node_status', {
              initialValue: selectedNode.node_status || 'info'
            })(
              <Select>
                <Option value="info">info</Option>
                <Option value="warning">warning</Option>
                <Option value="error">error</Option>
              </Select>
            )}
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
            <Button type="primary" htmlType="submit">
              保存修改
            </Button>
            {selectedNode.key !== 'Root' && (
              <Button 
                type="danger" 
                style={{ marginLeft: 8 }}
                onClick={() => {
                  Modal.confirm({
                    title: '确认删除',
                    content: '确定要删除该节点及其所有子节点吗？',
                    okText: '确认',
                    cancelText: '取消',
                    onOk: this.handleDeleteNode
                  });
                }}
              >
                删除节点
              </Button>
            )}
          </Form.Item>
        </Form>
      </div>
    );
  }

  renderActionButtons = (nodeData) => {
    return (
      <span className="node-actions">
        <Icon
          type="plus-circle"
          style={{ marginRight: '8px' }}
          onClick={(e) => {
            e && e.stopPropagation();
            this.handleAddClick(nodeData);
          }}
        />
        <Icon
          type="edit"
          onClick={(e) => {
            e && e.stopPropagation();
            this.handleEditClick(nodeData);
          }}
        />
      </span>
    );
  };

  renderTreeNodeTitle = (nodeData) => {
    const node = {
      ...nodeData,
      children: nodeData.children || []
    };

    return (
      <span className="tree-node-content">
        <span className="node-title">{node.name}</span>
        <span className="node-actions">
          <Icon
            type="plus-circle"
            style={{ marginRight: '8px' }}
            onClick={(e) => {
              e.stopPropagation();
              this.handleAddClick(node);
            }}
          />
          <Icon
            type="edit"
            onClick={(e) => {
              e.stopPropagation();
              this.handleEditClick(node);
            }}
          />
        </span>
      </span>
    );
  };

  handleAddClick = (nodeData) => {
    console.log('handleAddClick - Selected node:', nodeData);
    this.setState({
      selectedNode: nodeData,
      isAddNodeModalVisible: true,
      rightClickNodeTreeItem: null
    }, () => {
      console.log('State after handleAddClick:', this.state.selectedNode);
      this.props.form.resetFields();
    });
  };

  handleEditClick = (nodeData) => {
    this.setState({ 
      selectedNode: nodeData,
      rightClickNodeTreeItem: null
    });
    this.props.form.setFieldsValue({
      name: nodeData.name,
      description: nodeData.description,
      node_status: nodeData.node_status || 'info'
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

    console.log('Rendering right click menu for node:', rightClickNodeTreeItem.node);

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
            const currentNode = rightClickNodeTreeItem.node;
            console.log('Right click menu - Current node:', currentNode);
            
            await new Promise(resolve => {
              this.setState({
                selectedNode: currentNode
              }, resolve);
            });
            
            console.log('Right click menu - Selected node after state update:', this.state.selectedNode);
            
            this.setState({
              isAddNodeModalVisible: true,
              rightClickNodeTreeItem: null
            });
            this.props.form.resetFields();
          }}
        >
          <Icon type="plus-circle" style={{ marginRight: '8px' }} />
          新增节点
        </div>
        <div 
          className="right-click-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            this.handleEditClick(rightClickNodeTreeItem.node);
          }}
        >
          <Icon type="edit" style={{ marginRight: '8px' }} />
          编辑节点
        </div>
      </div>
    );
  }

  render() {
    const { form } = this.props;
    const { getFieldDecorator } = form;

    const treeDataCopy = JSON.parse(JSON.stringify(this.state.treeData));
    const processedTreeData = this.processTreeData(treeDataCopy);
    
    console.log('Current tree data:', this.state.treeData);
    console.log('Processed tree data:', processedTreeData);

    return (
      <div 
        className="fault-tree-config-new" 
        onClick={(e) => {
          if (!e.target.closest('.right-click-menu')) {
            this.setState({ rightClickNodeTreeItem: null });
          }
        }}
      >
        <Card
          title="故障树配置"
          extra={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                placeholder="场景名称"
                value={this.state.ftName}
                onChange={e => this.setState({ ftName: e.target.value })}
                style={{ width: 200 }}
              />
              <Input
                placeholder="场景描述"
                value={this.state.ftDesc}
                onChange={e => this.setState({ ftDesc: e.target.value })}
                style={{ width: 300 }}
              />
              <Select
                value={this.state.ftStatus}
                onChange={value => this.setState({ ftStatus: value })}
                style={{ width: 100 }}
              >
                <Option value="draft">草稿</Option>
                <Option value="active">启用</Option>
              </Select>
            </div>
          }
        >
          <div style={{ display: 'flex', height: 'calc(100vh - 180px)' }}>
            <div 
              className="tree-container" 
              style={{ 
                flex: '0 0 300px', 
                borderRight: '1px solid #e8e8e8', 
                padding: '10px', 
                position: 'relative' 
              }}
            >
              <Tree
                treeData={[processedTreeData]}
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
          title="添加节点"
          visible={this.state.isAddNodeModalVisible}
          onCancel={() => {
            this.setState({ 
              isAddNodeModalVisible: false,
              rightClickNodeTreeItem: null 
            });
            this.props.form.resetFields();
          }}
          footer={null}
          maskClosable={false}
        >
          <Form
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
          >
            <Form.Item label="节点名称">
              {getFieldDecorator('name', {
                rules: [{ required: true, message: '请输入节点名称' }]
              })(
                <Input placeholder="请输入节点名称" />
              )}
            </Form.Item>

            <Form.Item label="节点描述">
              {getFieldDecorator('description')(
                <Input.TextArea placeholder="请输入节点描述" />
              )}
            </Form.Item>

            <Form.Item label="节点状态">
              {getFieldDecorator('node_status', {
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
                      console.log('Form values:', values);
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
    justify-content: space-between;
    padding-right: 8px;
  }
  
  .node-title {
    flex: 1;
  }
  
  .node-actions {
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  .tree-node-content:hover .node-actions {
    opacity: 1;
  }
  
  .node-actions .anticon {
    cursor: pointer;
    color: #1890ff;
  }
  
  .node-actions .anticon:hover {
    color: #40a9ff;
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
