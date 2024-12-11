import React from 'react';
import { Card, Button, Input, Select, message, Upload, Icon, Modal, Table } from 'antd';
import ConfigTree from './ConfigTree';
import MyAxios from "../common/interface"

const { Option } = Select;

class ConfigEditor extends React.Component {
    constructor(props) {
        super(props);
        this.configTreeRef = React.createRef();
        this.state = {
            ftName: this.props.initialValues?.ft_name || '',
            ftDesc: this.props.initialValues?.ft_desc || '',
            ftStatus: this.props.initialValues?.ft_status || 'draft',
        };
    }

    handleSave = async () => {
        if (!this.state.ftName?.trim()) {
            message.error('请输入场景名称');
            return;
        }

        try {
            const treeData = this.configTreeRef.current?.getTreeData();
            if (!treeData) {
                throw new Error('无法获取树数据');
            }

            const submitData = {
                ft_name: this.state.ftName,
                ft_desc: this.state.ftDesc,
                ft_status: this.state.ftStatus,
                ft_content: JSON.stringify(treeData)
            };

            // 判断是否为编辑模式
            const isEdit = Boolean(this.props.initialValues?.ft_id);
            const url = isEdit
                ? '/fault_tree/v1/update_config/'
                : '/fault_tree/v1/add_config/';

            if (isEdit) {
                submitData.ft_id = this.props.initialValues.ft_id;
            }

            const res = await MyAxios.post(url, submitData);
            
            if (res.data.status === 'ok') {
                message.success(isEdit ? '修改成功' : '保存成功');
                this.props.onSave && this.props.onSave(res.data.data);
            } else {
                message.error(res.data.message || '保存失败');
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
            message.error('获取历史记录失败，请稍后重试');
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
                    this.props.onSave(res.data.data);
                }
            } else {
                message.error(res.data.message || '恢复失败');
            }
        } catch (error) {
            console.error('恢复版本失败:', error);
            message.error('恢复失败，请稍后重试');
        }
    };

    render() {
        return (
            <Card 
                title="故障树配置"
                extra={
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Button
                            type="primary"
                            onClick={this.handleSave}
                            icon={<Icon type="save" />}
                        >
                            保存
                        </Button>
                        <Button
                            onClick={this.handleHistory}
                            icon={<Icon type="history" />}
                        >
                            历史记录
                        </Button>
                        <label style={{ margin: 0 }}>
                            <Button 
                                icon={<Icon type="import" />}
                                onClick={() => this.fileInput.click()}
                            >
                                导入
                            </Button>
                            <input
                                type="file"
                                accept=".json"
                                style={{ display: 'none' }}
                                onChange={this.handleFileChange}
                                ref={input => this.fileInput = input}
                            />
                        </label>
                        <Button
                            onClick={this.handleExport}
                            icon={<Icon type="export" />}
                        >
                            导出
                        </Button>
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
                <ConfigTree 
                    ref={this.configTreeRef}
                    initialValues={this.props.initialValues}
                />
            </Card>
        );
    }
}

export default ConfigEditor;
