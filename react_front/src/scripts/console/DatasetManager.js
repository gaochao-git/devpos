import React, { Component } from 'react';
import { Modal, Button, Table, Input, message, Popconfirm, Form, Icon, Tooltip, Tabs, List, Checkbox, Tag, Row, Col, Card } from 'antd';
import MyAxios from '../common/interface';
const { TextArea } = Input;
const { TabPane } = Tabs;

class DatasetManager extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // 数据集列表相关
      datasets: [],
      loading: false,
      
      // 创建/编辑数据集相关
      createDatasetModalVisible: false,
      editDatasetModalVisible: false,
      editingDataset: null,
      
      // 表单数据
      datasetName: '',
      datasetDescription: '',
      datasetContent: '',
      
      // 搜索
      searchKeyword: '',
      
      // 创建数据集时的表选择
      selectedTables: [],
      searchTableKeyword: '',
      loadingTableStructures: false,
      
      instance: props.instance,
      database: props.database,
      allTables: props.allTables || [],
    };
  }

  componentDidMount() {
    if (this.props.visible) {
      this.fetchDatasets();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.visible && !prevProps.visible) {
      this.fetchDatasets();
    }
  }

  // 获取数据集列表
  fetchDatasets = async () => {
    const { instance, database } = this.props;
    if (!instance || !database) return;

    this.setState({ loading: true });
    try {
      const response = await MyAxios.post('/web_console/v1/get_datasets/', {
        cluster_group_name: instance,
        schema_name: database
      });
      
      if (response.data.status === 'ok') {
        this.setState({ datasets: response.data.data });
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('获取数据集列表失败');
      console.error(error);
    } finally {
      this.setState({ loading: false });
    }
  };

  // 获取选中表的结构
  handleGetTableStructures = async () => {
    const { selectedTables } = this.state;
    const { instance, database } = this.props;
    
    if (!selectedTables || selectedTables.length === 0) {
      message.warning('请先选择表');
      return;
    }

    if (!instance || !database) {
      message.warning('请先选择实例和数据库');
      return;
    }

    this.setState({ loadingTableStructures: true });
    try {
      const response = await MyAxios.post('/web_console/v1/get_table_structures/', {
        instance_name: instance,
        schema_name: database,
        table_names: selectedTables.join(',')
      });

      if (response.data.status === 'ok') {
        const structures = response.data.data;
        const formattedContent = structures.join('\n\n-- =============================\n\n');
        
        this.setState({
          datasetContent: formattedContent
        });
        message.success('表结构获取成功');
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('获取表结构失败');
      console.error(error);
    } finally {
      this.setState({ loadingTableStructures: false });
    }
  };

  // 表选择切换
  handleTableToggle = (tableName) => {
    this.setState(prevState => ({
      selectedTables: prevState.selectedTables.includes(tableName) 
        ? prevState.selectedTables.filter(t => t !== tableName)
        : [...prevState.selectedTables, tableName]
    }));
  };

  // 全选/取消全选表
  handleSelectAllTables = () => {
    const filteredTables = this.getFilteredTables();
    const { selectedTables } = this.state;
    
    const isAllSelected = filteredTables.every(table => 
      selectedTables.includes(table)
    );

    if (isAllSelected) {
      this.setState(prevState => ({
        selectedTables: prevState.selectedTables.filter(table => 
          !filteredTables.includes(table)
        )
      }));
    } else {
      this.setState(prevState => ({
        selectedTables: [...new Set([
          ...prevState.selectedTables,
          ...filteredTables
        ])]
      }));
    }
  };

  // 获取过滤后的表
  getFilteredTables = () => {
    const { allTables, searchTableKeyword } = this.state;
    return allTables.filter(table => 
      table.toLowerCase().includes(searchTableKeyword.toLowerCase())
    );
  };

  // 清空表选择
  handleClearAllTables = () => {
    this.setState({ selectedTables: [] });
  };

  // 创建数据集
  handleCreateDataset = () => {
    const { database } = this.props;
    this.setState({
      createDatasetModalVisible: true,
      datasetContent: '-- 请在此处输入表结构和业务注释\n-- 或者选择表并点击"获取表结构"按钮自动生成\n',
      datasetName: `${database}_new_dataset`,
      datasetDescription: '',
      selectedTables: [],
      searchTableKeyword: ''
    });
  };

  // 保存数据集
  handleSaveDataset = async () => {
    const { datasetName, datasetDescription, datasetContent } = this.state;
    const { instance, database } = this.props;

    if (!datasetName.trim()) {
      message.warning('请输入数据集名称');
      return;
    }

    if (!datasetContent.trim()) {
      message.warning('请输入数据集内容');
      return;
    }

    try {
      const response = await MyAxios.post('/web_console/v1/create_dataset/', {
        dataset_name: datasetName,
        dataset_description: datasetDescription,
        dataset_content: datasetContent,
        cluster_group_name: instance,
        schema_name: database
      });

      if (response.data.status === 'ok') {
        message.success('数据集创建成功');
        this.setState({
          createDatasetModalVisible: false,
          datasetName: '',
          datasetDescription: '',
          datasetContent: '',
          selectedTables: []
        });
        this.fetchDatasets();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('创建数据集失败');
      console.error(error);
    }
  };

  // 更新数据集
  handleUpdateDataset = async () => {
    const { editingDataset, datasetName, datasetDescription, datasetContent } = this.state;
    
    if (!datasetName.trim()) {
      message.warning('请输入数据集名称');
      return;
    }

    if (!datasetContent.trim()) {
      message.warning('请输入数据集内容');
      return;
    }

    try {
      const response = await MyAxios.post('/web_console/v1/update_dataset/', {
        dataset_id: editingDataset.id,
        dataset_name: datasetName,
        dataset_description: datasetDescription,
        dataset_content: datasetContent
      });

      if (response.data.status === 'ok') {
        message.success('数据集更新成功');
        this.setState({
          editDatasetModalVisible: false,
          editingDataset: null,
          datasetName: '',
          datasetDescription: '',
          datasetContent: ''
        });
        this.fetchDatasets();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('更新数据集失败');
      console.error(error);
    }
  };

  // 删除数据集
  handleDeleteDataset = async (datasetId) => {
    try {
      const response = await MyAxios.post('/web_console/v1/delete_dataset/', {
        dataset_id: datasetId
      });

      if (response.data.status === 'ok') {
        message.success('数据集删除成功');
        this.fetchDatasets();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('删除数据集失败');
      console.error(error);
    }
  };

  // 编辑数据集
  handleEditDataset = (dataset) => {
    this.setState({
      editDatasetModalVisible: true,
      editingDataset: dataset,
      datasetName: dataset.dataset_name,
      datasetDescription: dataset.dataset_description,
      datasetContent: dataset.dataset_content
    });
  };

  // 关闭创建模态框
  handleCancelCreate = () => {
    this.setState({
      createDatasetModalVisible: false,
      datasetName: '',
      datasetDescription: '',
      datasetContent: '',
      selectedTables: []
    });
  };

  // 关闭编辑模态框
  handleCancelEdit = () => {
    this.setState({
      editDatasetModalVisible: false,
      editingDataset: null,
      datasetName: '',
      datasetDescription: '',
      datasetContent: ''
    });
  };

  render() {
    const { visible, onCancel } = this.props;
    const { 
      datasets, 
      loading, 
      createDatasetModalVisible,
      editDatasetModalVisible,
      datasetName,
      datasetDescription,
      datasetContent,
      searchKeyword,
      selectedTables,
      allTables,
      searchTableKeyword,
      loadingTableStructures
    } = this.state;

    // 过滤数据集
    const filteredDatasets = datasets.filter(dataset => 
      dataset.dataset_name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (dataset.dataset_description && dataset.dataset_description.toLowerCase().includes(searchKeyword.toLowerCase()))
    );

    // 过滤表
    const filteredTables = this.getFilteredTables();
    const isAllSelected = filteredTables.length > 0 && 
      filteredTables.every(table => selectedTables.includes(table));

    const columns = [
      {
        title: '数据集名称',
        dataIndex: 'dataset_name',
        key: 'dataset_name',
        width: '25%',
        render: (text) => (
          <Tooltip title={text}>
            <span style={{ cursor: 'pointer' }}>{text}</span>
          </Tooltip>
        )
      },
      {
        title: '描述',
        dataIndex: 'dataset_description',
        key: 'dataset_description',
        width: '30%',
        render: (text) => (
          <Tooltip title={text}>
            <span>{text || '无描述'}</span>
          </Tooltip>
        )
      },
      {
        title: '创建人',
        dataIndex: 'create_by',
        key: 'create_by',
        width: '15%'
      },
      {
        title: '创建时间',
        dataIndex: 'create_time',
        key: 'create_time',
        width: '20%',
        render: (text) => new Date(text).toLocaleString()
      },
      {
        title: '操作',
        key: 'action',
        width: '10%',
        render: (_, record) => (
          <div>
            <Button 
              size="small" 
              onClick={() => this.handleEditDataset(record)}
              style={{ marginRight: 8 }}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这个数据集吗？"
              onConfirm={() => this.handleDeleteDataset(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" type="danger">删除</Button>
            </Popconfirm>
          </div>
        )
      }
    ];

    return (
      <>
        {/* 主模态框 */}
        <Modal
          title="数据集管理"
          visible={visible}
          onCancel={onCancel}
          width={1000}
          footer={null}
        >
          <div style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="搜索数据集名称或描述"
              value={searchKeyword}
              onChange={e => this.setState({ searchKeyword: e.target.value })}
              style={{ width: 300, marginRight: 16 }}
            />
            <Button 
              type="primary" 
              icon="plus"
              onClick={this.handleCreateDataset}
            >
              创建数据集
            </Button>
          </div>
          
          <Table
            columns={columns}
            dataSource={filteredDatasets}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} 共 ${total} 条`
            }}
          />
        </Modal>

        {/* 创建数据集模态框 */}
        <Modal
          title="创建数据集"
          visible={createDatasetModalVisible}
          onOk={this.handleSaveDataset}
          onCancel={this.handleCancelCreate}
          width={1200}
          okText="保存"
          cancelText="取消"
        >
          <Row gutter={16}>
            {/* 左侧：基本信息和表选择 */}
            <Col span={10}>
              <Form layout="vertical">
                <Form.Item label="数据集名称" required>
                  <Input
                    value={datasetName}
                    onChange={e => this.setState({ datasetName: e.target.value })}
                    placeholder="请输入数据集名称"
                  />
                </Form.Item>
                
                <Form.Item label="数据集描述">
                  <Input
                    value={datasetDescription}
                    onChange={e => this.setState({ datasetDescription: e.target.value })}
                    placeholder="请输入数据集描述（可选）"
                  />
                </Form.Item>
              </Form>

              <Card title="选择表" size="small" style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <Input.Search
                    placeholder="搜索表名"
                    value={searchTableKeyword}
                    onChange={e => this.setState({ searchTableKeyword: e.target.value })}
                    style={{ width: '100%', marginBottom: 8 }}
                    size="small"
                  />
                  <div>
                    <Button 
                      size="small" 
                      onClick={this.handleSelectAllTables}
                      disabled={filteredTables.length === 0}
                      type={isAllSelected ? 'primary' : 'default'}
                      style={{ marginRight: 8 }}
                    >
                      {isAllSelected ? '取消全选' : '全选当前'}
                    </Button>
                    <Button 
                      size="small" 
                      onClick={this.handleClearAllTables}
                      disabled={selectedTables.length === 0}
                      style={{ marginRight: 8 }}
                    >
                      清空选择
                    </Button>
                    <Button 
                      size="small"
                      type="primary"
                      loading={loadingTableStructures}
                      disabled={selectedTables.length === 0}
                      onClick={this.handleGetTableStructures}
                    >
                      获取表结构 ({selectedTables.length})
                    </Button>
                  </div>
                </div>

                {/* 已选择的表 */}
                {selectedTables.length > 0 && (
                  <div style={{ marginBottom: 12, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                    <div style={{ fontSize: '12px', marginBottom: 4, color: '#666' }}>
                      已选择 {selectedTables.length} 个表:
                    </div>
                    <div>
                      {selectedTables.map(table => (
                        <Tag
                          key={table}
                          closable
                          onClose={() => this.handleTableToggle(table)}
                          style={{ margin: '2px', fontSize: '11px' }}
                          size="small"
                        >
                          {table}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}

                {/* 表列表 */}
                <div>
                  <List
                    dataSource={filteredTables}
                    renderItem={(table) => (
                      <List.Item style={{ padding: '4px 0', border: 'none' }}>
                        <Checkbox
                          checked={selectedTables.includes(table)}
                          onChange={() => this.handleTableToggle(table)}
                          style={{ fontSize: '12px' }}
                        >
                          {table}
                        </Checkbox>
                      </List.Item>
                    )}
                    pagination={{
                      pageSize: 100,
                      showSizeChanger: false,
                      showQuickJumper: false,
                      simple: true,
                      size: 'small',
                      showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`
                    }}
                  />
                </div>
              </Card>
            </Col>

            {/* 右侧：内容编辑 */}
            <Col span={14}>
              <Form layout="vertical">
                <Form.Item label="数据集内容" required>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontSize: '12px' }}>
                      请在下方编辑表结构，可以添加表和列的注释说明，以便AI助手更好地理解表结构
                    </span>
                  </div>
                  <TextArea
                    value={datasetContent}
                    onChange={e => this.setState({ datasetContent: e.target.value })}
                    placeholder="请输入数据集内容（表结构和业务注释）"
                    rows={20}
                    style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace', fontSize: '12px' }}
                  />
                </Form.Item>
              </Form>
            </Col>
          </Row>
        </Modal>

        {/* 编辑数据集模态框 */}
        <Modal
          title="编辑数据集"
          visible={editDatasetModalVisible}
          onOk={this.handleUpdateDataset}
          onCancel={this.handleCancelEdit}
          width={800}
          okText="更新"
          cancelText="取消"
        >
          <Form layout="vertical">
            <Form.Item label="数据集名称" required>
              <Input
                value={datasetName}
                onChange={e => this.setState({ datasetName: e.target.value })}
                placeholder="请输入数据集名称"
              />
            </Form.Item>
            
            <Form.Item label="数据集描述">
              <Input
                value={datasetDescription}
                onChange={e => this.setState({ datasetDescription: e.target.value })}
                placeholder="请输入数据集描述（可选）"
              />
            </Form.Item>
            
            <Form.Item label="数据集内容" required>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#666', fontSize: '12px' }}>
                  请在下方编辑表结构，可以添加表和列的注释说明，以便AI助手更好地理解表结构
                </span>
              </div>
              <TextArea
                value={datasetContent}
                onChange={e => this.setState({ datasetContent: e.target.value })}
                placeholder="请输入数据集内容（表结构和业务注释）"
                rows={15}
                style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </>
    );
  }
}

export default DatasetManager; 