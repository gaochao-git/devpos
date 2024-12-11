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
    ftStatus: this.props.initialValues?.ft_status || 'draft'
  };

  handleAddNode = (values) => {
    if (!this.state.selectedNode) return;

    const parentPath = this.state.selectedNode.key;
    const timestamp = new Date().getTime();
    const newNodeKey = `${parentPath}->${values.name}_${timestamp}`;

    const newNode = {
      key: newNodeKey,
      name: values.name,
      title: values.name,
      description: values.description || '',
      node_status: values.node_status || 'info',
      children: [],
      isLeaf: true
    };

    const updateNodeInTree = (node) => {
      if (node.key === this.state.selectedNode.key) {
        return {
          ...node,
          isLeaf: false,
          children: [...(node.children || []), newNode]
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
      treeData: updateNodeInTree(prevState.treeData),
      expandedKeys: [...new Set([...prevState.expandedKeys, newNodeKey])],
      isAddNodeModalVisible: false,
      isLeafNode: false
    }));
    
    this.props.form.resetFields();
    message.success('节点添加成功');
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

  onSelect = (selectedKeys, info) => {
    this.setState({ selectedNode: info.node });
    this.props.form.setFieldsValue({
      name: info.node.name,
      description: info.node.description,
      node_status: info.node.node_status || 'info'
    });
  };

  onRightClick = ({ event, node }) => {
    event.preventDefault();
    this.setState({ selectedNode: node });
    this.props.form.setFieldsValue({
      name: node.name,
      description: node.description,
      node_status: node.node_status || 'info'
    });
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

  render() {
    const { form } = this.props;
    const { getFieldDecorator } = form;

    const menuItems = [
      {
        key: 'add',
        label: '添加子节点',
        onClick: () => {
          if (!this.state.selectedNode) {
            message.warning('请先选择一个节点');
            return;
          }
          this.setState({ isAddNodeModalVisible: true });
        }
      },
      {
        key: 'edit',
        label: '编辑节点',
        onClick: () => {
          if (!this.state.selectedNode) {
            message.warning('请先选择一个节点');
            return;
          }
          this.onSelect([], { node: this.state.selectedNode });
        }
      }
    ];

    return (
      <div className="fault-tree-config-new">
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
            <div className="tree-container" style={{ flex: '0 0 300px', borderRight: '1px solid #e8e8e8', padding: '10px' }}>
              <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
                <Tree
                  treeData={[this.state.treeData]}
                  onSelect={this.onSelect}
                  onRightClick={this.onRightClick}
                  showLine
                  showIcon
                  expandedKeys={this.state.expandedKeys}
                  onExpand={(keys) => this.setState({ expandedKeys: keys })}
                  selectedKeys={this.state.selectedNode ? [this.state.selectedNode.key] : []}
                />
              </Dropdown>
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
            this.setState({ isAddNodeModalVisible: false });
            this.props.form.resetFields();
          }}
          footer={null}
        >
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              this.props.form.validateFields((err, values) => {
                if (!err) {
                  this.handleAddNode(values);
                }
              });
            }}
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
              <Button type="primary" htmlType="submit">
                确定
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }
}

export default Form.create()(FaultTreeConfigNew);
