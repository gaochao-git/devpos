import React from 'react';
import { Card, Button, Input, Select, message, Upload, Icon } from 'antd';
import ConfigTree from './ConfigTree';
import MyAxios from "../common/interface"

const { Option } = Select;

class ConfigEditor extends React.Component {
    state = {
        ftName: this.props.initialValues && this.props.initialValues.ft_name || '',
        ftDesc: this.props.initialValues && this.props.initialValues.ft_desc || '',
        ftStatus: this.props.initialValues && this.props.initialValues.ft_status || 'draft',
    };

    handleSave = async () => {
        if (!this.state.ftName || !this.state.ftName.trim()) {
            message.error('请输入场景名称');
            return;
        }

        try {
            const treeData = this.configTreeRef.getTreeData();
            const submitData = {
                ft_name: this.state.ftName,
                ft_desc: this.state.ftDesc,
                ft_status: this.state.ftStatus,
                ft_content: JSON.stringify(treeData)
            };

            const res = await MyAxios.post('/fault_tree/v1/create_config/', submitData);
            
            if (res.data.status === 'ok') {
                message.success('保存成功');
                this.props.onSave && this.props.onSave(res.data.data);
            } else {
                message.error(res.data.message || '保存失败');
            }
        } catch (error) {
            console.error('保存故障树配置失败:', error);
            message.error('保存失败，请稍后重试');
        }
    };

    handleUpdateClick = async () => {
        if (!this.state.ftName || !this.state.ftName.trim()) {
            message.error('请输入场景名称');
            return;
        }

        try {
            const treeData = this.configTreeRef.getTreeData();
            const submitData = {
                ft_id: this.props.initialValues.ft_id,
                ft_name: this.state.ftName,
                ft_desc: this.state.ftDesc,
                ft_status: this.state.ftStatus,
                ft_content: JSON.stringify(treeData)
            };

            const res = await MyAxios.post('/fault_tree/v1/update_config/', submitData);
            
            if (res.data.status === 'ok') {
                message.success('更新成功');
                this.props.onSave && this.props.onSave(res.data.data);
            } else {
                message.error(res.data.message || '更新失败');
            }
        } catch (error) {
            console.error('更新故障树配置失败:', error);
            message.error('更新失败，请稍后重试');
        }
    };

    handleImport = (file) => {
        // 导入逻辑
    };

    handleExport = () => {
        // 导出逻辑
    };

    render() {
        return (
            <Card 
                title="故障树配置"
                extra={
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Button
                            type="primary"
                            onClick={this.props.initialValues && this.props.initialValues.ft_id ? 
                                this.handleUpdateClick : this.handleSave}
                            icon={<Icon type="save" />}
                        >
                            {this.props.initialValues && this.props.initialValues.ft_id ? '更新' : '保存'}
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
                <ConfigTree 
                    ref={ref => this.configTreeRef = ref}
                    initialValues={this.props.initialValues}
                />
            </Card>
        );
    }
}

export default ConfigEditor;
