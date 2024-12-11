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
    isLeafNode: false,
    selectedNode: null,
    expandedKeys: ['Root'],
    treeData: {
      ...this.props.initialValues?.ft_content || {
        name: 'Root',
        description: '',
        node_status: 'info',
        children: []
      },
      key: 'Root'
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

  onSelect = (selectedKeys, info) => {
    this.setState({ selectedNode: info.node });
  };

  onRightClick = ({ event, node }) => {
    event.preventDefault();
    this.setState({ selectedNode: node });
  };

  getFtName = () => this.state.ftName;
  getFtDesc = () => this.state.ftDesc;
  getFtStatus = () => this.state.ftStatus;
  getTreeData = () => this.state.treeData;

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
            <div className="tree-container">
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
          </div>
        </Card>

        <Modal
          title="添加节点"
          visible={this.state.isAddNodeModalVisible}
          onCancel={() => {
            this.setState({ isAddNodeModalVisible: false, isLeafNode: false });
            this.props.form.resetFields();
          }}
          footer={null}
        >
          <Form
            onFinish={this.handleAddNode}
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
