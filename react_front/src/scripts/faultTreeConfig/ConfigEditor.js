import React from 'react';
import { Card, Button, Input, Select, message, Upload, Icon, Modal, Table, Drawer, Space, Row, Col } from 'antd';
import ConfigTree from './ConfigTree';
import MyAxios from "../common/interface"
import ReactDiffViewer from 'react-diff-viewer';

const { Option } = Select;

class ConfigEditor extends React.Component {
    constructor(props) {
        super(props);
        this.configTreeRef = React.createRef();
        this.state = {
            ftName: this.props.initialValues?.ft_name || '',
            ftDesc: this.props.initialValues?.ft_desc || '',
            ftStatus: this.props.initialValues?.ft_status || 'draft',
            historyVisible: false,
            historyList: [],
            historyLoading: false,
            diffVisible: false,
            diffData: { old: null, new: null },
            selectedHistory: null,
            isSaveDiffModalVisible: false,
            saveDiffData: { saveOldData: '', saveNewData: '' }
        };
    }

    handleSave = async () => {
        if (!this.state.ftName?.trim()) {
            message.error('请输入场景名称');
            return;
        }

        try {
            const saveTreeData = this.configTreeRef.current?.getTreeData();
            if (!saveTreeData) {
                throw new Error('无法获取树数据');
            }

            const saveNewContent = {
                ft_name: this.state.ftName,
                ft_desc: this.state.ftDesc,
                ft_status: this.state.ftStatus,
                ft_content: saveTreeData
            };

            const saveOldContent = {
                ft_name: this.props.initialValues?.ft_name || '',
                ft_desc: this.props.initialValues?.ft_desc || '',
                ft_status: this.props.initialValues?.ft_status || 'draft',
                ft_content: this.props.initialValues?.ft_content || {}
            };

            // 显示保存对比框
            this.setState({
                isSaveDiffModalVisible: true,
                saveDiffData: {
                    saveOldData: JSON.stringify(saveOldContent, null, 2),
                    saveNewData: JSON.stringify(saveNewContent, null, 2)
                }
            });
        } catch (error) {
            console.error('准备保存数据失败:', error);
            message.error('保存失败，请稍后重试');
        }
    };

    handleConfirmSave = async () => {
        try {
            const saveTreeData = this.configTreeRef.current?.getTreeData();
            if (!saveTreeData) {
                throw new Error('无法获取树数据');
            }

            const saveSubmitData = {
                ft_name: this.state.ftName,
                ft_desc: this.state.ftDesc,
                ft_status: this.state.ftStatus,
                ft_content: JSON.stringify(saveTreeData)
            };

            const isEdit = Boolean(this.props.initialValues?.ft_id);
            const saveUrl = isEdit
                ? '/fault_tree/v1/update_config/'
                : '/fault_tree/v1/add_config/';

            if (isEdit) {
                saveSubmitData.ft_id = this.props.initialValues.ft_id;
            }

            const saveRes = await MyAxios.post(saveUrl, saveSubmitData);
            
            if (saveRes.data.status === 'ok') {
                message.success(isEdit ? '修改成功' : '保存成功');
                this.setState({ 
                    isSaveDiffModalVisible: false,
                    saveDiffData: { saveOldData: '', saveNewData: '' }
                });
                if (this.props.onSave) {
                    this.props.onSave();
                }
            } else {
                message.error(saveRes.data.message || '保存失败');
            }
        } catch (error) {
            console.error('保存故障树配置失败:', error);
            message.error('保存失败，请稍后重试');
        }
    };

    handleExport = () => {
        try {
            const exportData = {
                ft_name: this.state.ftName,
                ft_desc: this.state.ftDesc,
                ft_status: this.state.ftStatus,
                ft_content: this.configTreeRef.current?.getTreeData()
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${this.state.ftName || '故障树配置'}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            message.success('导出成功');
        } catch (error) {
            console.error('导出失败:', error);
            message.error('导出失败，请稍后重试');
        }
    };

    handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // 更新状态
                this.setState({
                    ftName: data.ft_name,
                    ftDesc: data.ft_desc,
                    ftStatus: data.ft_status
                }, () => {
                    // 更新树形数据
                    if (this.configTreeRef.current) {
                        const treeData = {
                            key: 'Root',
                            name: '根节点',
                            title: '根节点',
                            description: '',
                            node_status: 'info',
                            children: [],
                            ...data.ft_content // 合并导入的树形数据
                        };

                        // 使用 setState 更新树形数据
                        this.configTreeRef.current.setState({
                            treeData: treeData,
                            expandedKeys: ['Root']
                        });
                    }
                    // 通知父组件数据已更新
                    if (this.props.onFormChange) {
                        this.props.onFormChange({
                            ft_name: data.ft_name,
                            ft_desc: data.ft_desc,
                            ft_status: data.ft_status,
                            ft_content: data.ft_content
                        });
                    }
                });
                message.success('导入成功');
            } catch (error) {
                console.error('导入失败:', error);
                message.error('导入失败，请确保文件格式正确');
            }
        };
        reader.readAsText(file);
        // 清空 input 值，以便可以重复导入同一个文件
        event.target.value = '';
    };

    handleHistory = async () => {
        try {
            const res = await MyAxios.post('/fault_tree/v1/get_history_list/', {
                ft_id: this.props.initialValues.ft_id
            });

            if (res.data.status === 'ok') {
                Modal.info({
                    title: '历史记录',
                    width: 800,
                    content: (
                        <Table
                            dataSource={res.data.data}
                            columns={[
                                {
                                    title: '版本号',
                                    dataIndex: 'version_num',
                                    key: 'version_num',
                                },
                                {
                                    title: '修改时间',
                                    dataIndex: 'update_time',
                                    key: 'update_time',
                                },
                                {
                                    title: '操作',
                                    key: 'action',
                                    render: (_, record) => (
                                        <Button
                                            type="link"
                                            onClick={() => this.handleRestoreVersion(record)}
                                        >
                                            恢复此版本
                                        </Button>
                                    ),
                                },
                            ]}
                            pagination={false}
                        />
                    ),
                });
            } else {
                message.error(res.data.message || '获取历史记录失败');
            }
        } catch (error) {
            console.error('获取历史记录失败:', error);
            message.error('获取历史记录失败，请���后重试');
        }
    };

    handleRestoreVersion = async (record) => {
        try {
            const res = await MyAxios.post('/fault_tree/v1/restore_config_version/', {
                ft_id: this.props.initialValues.ft_id,
                version_num: record.version_num
            });

            if (res.data.status === 'ok') {
                message.success('恢复成功');
                if (this.props.onSave) {
                    this.props.onSave();
                }
            } else {
                message.error(res.data.message || '恢复失败');
            }
        } catch (error) {
            console.error('恢复版本失败:', error);
            message.error('恢复失败，请稍后重试');
        }
    };

    // 添加对比功能
    handleViewDiff = async (historyId) => {
        try {
            const historyRes = await MyAxios.post('/fault_tree/v1/get_history_detail/', {
                history_id: historyId
            });

            if (historyRes.data.status === "ok") {
                const historyData = historyRes.data.data;
                this.setState({ selectedHistory: historyData });

                const historyContent = typeof historyData.ft_content === 'string'
                    ? historyData.ft_content
                    : JSON.stringify(historyData.ft_content);

                const currentContent = typeof this.props.initialValues.ft_content === 'string'
                    ? this.props.initialValues.ft_content
                    : JSON.stringify(this.props.initialValues.ft_content);

                try {
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

                    this.setState({
                        diffData: {
                            old: formattedHistoryContent,
                            new: formattedCurrentContent
                        },
                        diffVisible: true
                    });
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

    // 获取历史版本列表
    fetchHistoryList = async () => {
        if (!this.props.initialValues?.ft_id) return;
        this.setState({ historyLoading: true });
        try {
            const res = await MyAxios.post('/fault_tree/v1/get_history_list/', {
                ft_id: this.props.initialValues.ft_id
            });
            if (res.data.status === 'ok') {
                this.setState({ historyList: res.data.data });
            } else {
                message.error(res.data.message || '获取历史版本失败');
            }
        } catch (error) {
            console.error('Fetch history error:', error);
            message.error('获取历史版本失败');
        } finally {
            this.setState({ historyLoading: false });
        }
    };

    // 回滚到历史版本
    handleRollback = async (historyId) => {
        try {
            const res = await MyAxios.post('/fault_tree/v1/rollback_config/', {
                history_id: historyId
            });
            if (res.data.status === 'ok') {
                message.success('回滚成功');
                this.setState({ historyVisible: false });
                if (this.props.onSave) {
                    this.props.onSave();
                }
            } else {
                message.error(res.data.message || '回滚失败');
            }
        } catch (error) {
            console.error('Rollback error:', error);
            message.error('回滚失败');
        }
    };

    // 删除历史版本
    handleDeleteHistory = async (historyId) => {
        try {
            const res = await MyAxios.post('/fault_tree/v1/delete_history/', {
                history_id: historyId
            });
            if (res.data.status === 'ok') {
                message.success('删除成功');
                this.fetchHistoryList();
            } else {
                message.error(res.data.message || '删除失败');
            }
        } catch (error) {
            console.error('Delete history error:', error);
            message.error('删除失败');
        }
    };

    render() {
        const historyColumns = [
            {
                title: '版本号',
                dataIndex: 'version_num',
                key: 'version_num',
            },
            {
                title: '创建时间',
                dataIndex: 'create_time',
                key: 'create_time',
            },
            {
                title: '创建人',
                dataIndex: 'create_by',
                key: 'create_by',
            },
            {
                title: '操作',
                key: 'action',
                render: (_, record) => (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                            type="link"
                            icon={<Icon type="diff" />}
                            onClick={() => this.handleViewDiff(record.history_id)}
                        >
                            对比
                        </Button>
                        <Button
                            type="link"
                            danger
                            onClick={() => {
                                Modal.confirm({
                                    title: '确认删除',
                                    content: `确定要删除版本 ${record.version_num} 吗？`,
                                    onOk: () => this.handleDeleteHistory(record.history_id)
                                });
                            }}
                            disabled={this.state.historyList.length <= 1}
                        >
                            删除
                        </Button>
                    </div>
                ),
            },
        ];

        return (
            <div>
                <Card 
                    title="故障树配置"
                    extra={
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Input
                                placeholder="场景名称"
                                value={this.state.ftName}
                                onChange={e => this.setState({ ftName: e.target.value })}
                                style={{ width: 200, marginRight: 8 }}
                            />
                            <Input
                                placeholder="场景描述"
                                value={this.state.ftDesc}
                                onChange={e => this.setState({ ftDesc: e.target.value })}
                                style={{ width: 300, marginRight: 8 }}
                            />
                            <Select
                                value={this.state.ftStatus}
                                onChange={value => this.setState({ ftStatus: value })}
                                style={{ width: 100 }}
                            >
                                <Option value="draft">草稿</Option>
                                <Option value="active">启用</Option>
                            </Select>
                            <Button type="primary" onClick={this.handleSave}>保存</Button>
                            <div style={{ marginLeft: 16 }}>
                                <Button.Group>
                                    <Button
                                        onClick={() => {
                                            this.fetchHistoryList();
                                            this.setState({ historyVisible: true });
                                        }}
                                        title="历史记录"
                                    >
                                        <Icon type="history" />
                                    </Button>
                                    <Button
                                        onClick={() => this.fileInput.click()}
                                        title="导入"
                                    >
                                        <Icon type="upload" />
                                        <input
                                            type="file"
                                            accept=".json"
                                            style={{ display: 'none' }}
                                            onChange={this.handleFileChange}
                                            ref={input => this.fileInput = input}
                                        />
                                    </Button>
                                    <Button
                                        onClick={this.handleExport}
                                        title="导出"
                                    >
                                        <Icon type="download" />
                                    </Button>
                                </Button.Group>
                            </div>
                        </div>
                    }
                >
                    <ConfigTree 
                        ref={this.configTreeRef}
                        initialValues={this.props.initialValues}
                    />
                </Card>
                <Drawer
                    title="历史版本"
                    placement="right"
                    width={600}
                    visible={this.state.historyVisible}
                    onClose={() => this.setState({ historyVisible: false })}
                >
                    <Table
                        columns={historyColumns}
                        dataSource={this.state.historyList}
                        loading={this.state.historyLoading}
                        rowKey="history_id"
                        pagination={{
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => `共 ${total} 条`,
                        }}
                    />
                </Drawer>
                <Drawer
                    title="版本对比"
                    placement="right"
                    width={1000}
                    visible={this.state.diffVisible}
                    onClose={() => this.setState({ diffVisible: false })}
                    extra={
                        <Button
                            type="primary"
                            onClick={() => {
                                Modal.confirm({
                                    title: '确认回滚',
                                    content: `确定要回滚到版本 ${this.state.selectedHistory?.version_num} 吗？`,
                                    onOk: () => this.handleRollback(this.state.selectedHistory?.history_id)
                                });
                            }}
                        >
                            回滚到此版本
                        </Button>
                    }
                >
                    <div style={{ marginBottom: 16 }}>
                        <Row>
                            <Col span={12}>历史版本 ({this.state.selectedHistory?.version_num})</Col>
                            <Col span={12}>当前版本 ({this.props.initialValues?.version_num})</Col>
                        </Row>
                    </div>
                    <ReactDiffViewer
                        oldValue={this.state.diffData.old}
                        newValue={this.state.diffData.new}
                        splitView={true}
                        disableWordDiff={false}
                        hideLineNumbers={false}
                        showDiffOnly={false}
                    />
                </Drawer>
                <Modal
                    title="修改确认"
                    visible={this.state.isSaveDiffModalVisible}
                    onOk={this.handleConfirmSave}
                    onCancel={() => this.setState({ 
                        isSaveDiffModalVisible: false,
                        saveDiffData: { saveOldData: '', saveNewData: '' }
                    })}
                    width={1200}
                    style={{ top: 20 }}
                >
                    <div style={{ marginBottom: 16 }}>
                        <Row>
                            <Col span={12}>修改前</Col>
                            <Col span={12}>修改后</Col>
                        </Row>
                    </div>
                    <ReactDiffViewer
                        oldValue={this.state.saveDiffData.saveOldData}
                        newValue={this.state.saveDiffData.saveNewData}
                        splitView={true}
                        hideLineNumbers={false}
                        showDiffOnly={false}
                    />
                </Modal>
            </div>
        );
    }
}

export default ConfigEditor;
