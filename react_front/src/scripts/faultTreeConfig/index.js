import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout, Card, Button, Table, Modal, message, Icon } from 'antd';
import MyAxios from "../common/interface"
import ConfigEditor from './ConfigEditor';
import './index.css';

const { Content } = Layout;

const FaultTreeConfig = () => {
    const [visible, setVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const formRef = useRef(null);

    // 获取配置列表
    const fetchConfigList = async () => {
        setLoading(true);
        try {
            const res = await MyAxios.post('/fault_tree/v1/get_config_list/');
            if (res.data.status === 'ok') {
                setData(res.data.data || []);
            } else {
                message.error(res.data.message || '获取配置列表失败');
            }
        } catch (err) {
            console.error('Fetch config list error:', err);
            message.error('获取配置列表失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigList();
    }, []);

    // 删除配置
    const handleDelete = async (record) => {
        try {
            const res = await MyAxios.post('/fault_tree/v1/delete_config/', {
                ft_id: record.ft_id  // 修改为ft_id
            });

            if (res.data.status === 'ok') {
                message.success('删除成功');
                fetchConfigList();
            } else {
                message.error(res.data.message || '删除失败');
            }
        } catch (err) {
            console.error('Delete config error:', err);
            message.error('删除失败，请稍后重试');
        }
    };

    // 获取单个配置详情
    const handleEdit = async (record) => {
        try {
            const res = await MyAxios.post('/fault_tree/v1/get_config_detail/', {
                ft_id: record.ft_id  // 修改为ft_id
            });

            if (res.data.status === 'ok') {
                // 解析JSON字符串为对象
                const configData = {
                    ...res.data.data,
                    ft_content: typeof res.data.data.ft_content === 'string'
                        ? JSON.parse(res.data.data.ft_content)
                        : res.data.data.ft_content
                };
                setCurrentRecord(configData);
                setVisible(true);
            } else {
                message.error(res.data.message || '获取配置详情失败');
            }
        } catch (err) {
            console.error('Get config detail error:', err);
            message.error('获取配置详情失败，请稍后重试');
        }
    };

    const handleSave = () => {
        setVisible(false);
        fetchConfigList();
    };

    // src/pages/FaultTreeConfig/index.js

// ... 其他代码保持不变 ...

    // 复制处理函数
    const handleCopy = async (record) => {
        try {
            // 先获取完整的配置详情
            const res = await MyAxios.post('/fault_tree/v1/get_config_detail/', {
                ft_id: record.ft_id
            });

            if (res.data.status === 'ok') {
                // 创建一个新的记录，包含完整的配置数据
                const copiedRecord = {
                    ...res.data.data,
                    ft_name: `${res.data.data.ft_name}_副本`,
                    ft_content: typeof res.data.data.ft_content === 'string'
                        ? JSON.parse(res.data.data.ft_content)
                        : res.data.data.ft_content
                };

                // 删除不需要的字段
                delete copiedRecord.ft_id;
                delete copiedRecord.version_num;
                delete copiedRecord.update_time;

                setCurrentRecord(copiedRecord);
                setVisible(true);
            } else {
                message.error(res.data.message || '获取配置详情失败');
            }
        } catch (error) {
            console.error('Copy config error:', error);
            message.error('复制失败，请稍后重试');
        }
    };

    // 检查是否有实际变化的函数
    const checkHasActualChanges = (current, initial) => {
        if (!initial) return false;
        
        const formatData = (data) => ({
            ft_name: data.ft_name || '',
            ft_desc: data.ft_desc || '',
            ft_status: data.ft_status || 'draft',
            ft_content: JSON.stringify(data.ft_content || {})
        });

        const currentData = formatData(current);
        const initialData = formatData(initial);

        return JSON.stringify(currentData) !== JSON.stringify(initialData);
    };

    const columns = [
        {
            title: '场景名称',
            dataIndex: 'ft_name',
            key: 'ft_name',
        },
        {
            title: '描述',
            dataIndex: 'ft_desc',
            key: 'ft_desc',
            ellipsis: true,  // 添加省略号
        },
        {
            title: '状态',
            dataIndex: 'ft_status',
            key: 'ft_status',
            render: (ft_status) => (
                <span>{ft_status === 'active' ? '已启用' : '草稿'}</span>
            ),
        },
        {
            title: '版本号',
            dataIndex: 'version_num',
            key: 'version_num',
        },
        {
            title: '创建时间',
            dataIndex: 'create_time',
            key: 'update_time',
        },
        {
            title: '更新时间',
            dataIndex: 'update_time',
            key: 'update_time',
        },
        {
        title: '操作',
        key: 'action',
        render: (_, record) => (
            <div>
                <Button type="link" onClick={() => handleEdit(record)}>
                    编辑
                </Button>
                <Button type="link" onClick={() => handleCopy(record)}>
                    复制
                </Button>
                <Button
                    type="link"
                    danger
                    onClick={() => {
                        Modal.confirm({
                            title: '确认删除',
                            content: `确定要删除场景 "${record.ft_name}" 吗？`,
                            onOk: () => handleDelete(record),
                        });
                    }}
                >
                    删除
                </Button>
            </div>
        ),
    },
    ];

    return (
        <Layout>
            <Content style={{ padding: '24px' }}>
                <Card>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                        <Button
                            type="primary"
                            icon="plus"
                            onClick={() => {
                                setCurrentRecord(null);
                                setVisible(true);
                            }}
                        >
                            新建场景
                        </Button>

                        <Table
                            columns={columns}
                            dataSource={data}
                            loading={loading}
                            rowKey="ft_id"
                            pagination={{
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total) => `共 ${total} 条`,
                            }}
                        />
                    </div>
                </Card>

                <Modal
                    title={currentRecord ? '编辑场景' : '新建场景'}
                    visible={visible}
                    onCancel={() => {
                        // 获取当前表单数据
                        const currentFormData = {
                            ft_name: formRef.current?.getFtName(),
                            ft_desc: formRef.current?.getFtDesc(),
                            ft_status: formRef.current?.getFtStatus(),
                            ft_content: formRef.current?.getTreeData()
                        };

                        // 检查是否有实际变化
                        if (checkHasActualChanges(currentFormData, currentRecord)) {
                            Modal.confirm({
                                title: '确认退出',
                                content: '您有未保存的更新，确定要退出吗？',
                                okText: '确认',
                                cancelText: '取消',
                                onOk: () => {
                                    setVisible(false);
                                }
                            });
                        } else {
                            setVisible(false);
                        }
                    }}
                    width="90%"
                    footer={null}
                    destroyOnClose
                >
                    <ConfigEditor
                        ref={formRef}
                        initialValues={currentRecord}
                        onSave={() => {
                            fetchConfigList();
                            setVisible(false);
                        }}
                    />
                </Modal>
            </Content>
        </Layout>
    );
};

export default FaultTreeConfig;