import React, { useState, useEffect } from 'react';
import { Select, Button, Modal, Input, Icon, message, Checkbox } from 'antd';
import moment from 'moment';
import BaseAssistant from './BaseAssistant';
import { ES_MOCK_INDICES, ES_OPERATORS, getStandardTime, markdownRenderers } from '../util';
import TimeRangePicker from '../components/TimeRangePicker';
import MyAxios from "../../common/interface";
import ReactMarkdown from 'react-markdown';


export default class ESAssistant extends BaseAssistant {
    constructor() {
        super();
        this.name = 'es';
        this.prefix = 'es>';
        this.commands = [];
        this.updateCommands();
    }

    updateCommands() {
        this.commands = ES_MOCK_INDICES.map(index => ({
            label: `查询索引: ${index.label}`,
            value: index.value
        }));
    }

    // 重写构建执行参数方法
    buildExecuteParams(value, config, { timeRange, selectedFields, conditions } = {}) {
        return {
            tool: 'es',
            address: config.ip,
            index: value,
            time_from: timeRange ? timeRange[0].format('YYYY-MM-DD HH:mm:ss') : moment().subtract(15, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
            time_to: timeRange ? timeRange[1].format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss'),
            fields: selectedFields || [],
            conditions: (conditions || []).filter(c => c.field && c.operator && c.value)
        };
    }

    // 重写执行命令方法
    async handleExecute({ assistantInputs, config, executingAssistants, executeCommand, timeRange, selectedFields, conditions }) {
        const isExecuting = executingAssistants.has(this.name);
        const value = assistantInputs.get(this.name);
        
        if (isExecuting) {
            return;
        }

        if (!value) {
            message.warning('请选择要执行的命令');
            return;
        }
        if (!config?.ip) {
            message.warning('请先选择服务器');
            return;
        }

        try {
            const params = {
                index: value,
                server: config.ip,
                time_from: timeRange ? timeRange[0].format('YYYY-MM-DD HH:mm:ss') : moment().subtract(15, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
                time_to: timeRange ? timeRange[1].format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss'),
                fields: selectedFields || [],
                conditions: (conditions || []).filter(c => c.field && c.operator && c.value)
            };
            
            // 调用实际的ES API
            const response = await MyAxios.post('/fault_tree/v1/get_es_metrics/', params);
            
            if (response.data.status === "ok") {
                const formattedCommand = `> @${this.name} ${config.ip} ${value}`;
                const timestamp = getStandardTime();
                
                executeCommand({
                    type: 'assistant',
                    content: formattedCommand + '\n```json\n' + JSON.stringify(response.data.data, null, 2) + '\n```',
                    rawContent: response.data.data,
                    command: `@${this.name} ${config.ip} ${value}`,
                    timestamp: timestamp,
                    status: 'ok'
                });
            } else {
                executeCommand({
                    type: 'assistant',
                    content: `执行失败: ${response.data.message || '未知错误'}`,
                    rawContent: response.data.message || '未知错误',
                    command: `@${this.name} ${config.ip} ${value}`,
                    timestamp: getStandardTime(),
                    isError: true,
                    status: 'error'
                });
            }
        } catch (error) {
            console.error('执行命令失败:', error);
            message.error(error.message || '执行命令失败');
            executeCommand({
                type: 'assistant',
                content: `执行失败: ${error.message || '未知错误'}`,
                rawContent: error.message || '未知错误',
                command: `@${this.name} ${config.ip} ${value}`,
                timestamp: getStandardTime(),
                isError: true,
                status: 'error'
            });
        }
    }

    // 重写服务器选择处理方法
    async handleServerSelect(ip, port) {
        try {
            // 这里可以添加连接ES集群的逻辑
            this.updateCommands();
        } catch (error) {
            console.error('连接ES集群失败:', error);
            message.error('连接ES集群失败');
        }
    }

    // 重写获取默认视图模式方法
    getDefaultViewMode() {
        return 'json';
    }

    // 重写消息渲染方法
    renderMessage(msg, messageViewModes) {
        // 初始化视图模式
        if (!messageViewModes.has(msg.timestamp)) {
            messageViewModes.set(msg.timestamp, this.getDefaultViewMode());
        }

        // 根据视图模式选择渲染方式
        const viewMode = messageViewModes.get(msg.timestamp);
        
        if (viewMode === 'json') {
            return (
                <ReactMarkdown components={markdownRenderers}>
                    {msg.content}
                </ReactMarkdown>
            );
        } else if (viewMode === 'table') {
            return this.renderTableView(msg.rawContent);
        }
    }

    // 表格视图渲染方法
    renderTableView(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return <div>无数据</div>;
        }

        return <ESTableView data={data} />;
    }

    // 格式化单元格值
    formatCellValue(value) {
        if (value === undefined || value === null) {
            return '-';
        } else if (typeof value === 'object') {
            return JSON.stringify(value);
        } else {
            return String(value);
        }
    }

    // 重写渲染消息操作按钮方法
    renderMessageActions(msg, messageViewModes, setMessageViewModes, handleResultSelect, selectedResults, copyToClipboard) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                {/* 引用勾选框 */}
                <Checkbox
                    checked={selectedResults.has(msg.timestamp)}
                    onChange={(e) => handleResultSelect(msg.timestamp)}
                    style={{ marginRight: '8px' }}
                />
                
                {/* ES视图切换按钮 */}
                <Button
                    type="link"
                    size="small"
                    icon="code"
                    style={{
                        color: messageViewModes.get(msg.timestamp) === 'json' ? '#1890ff' : '#999',
                        padding: '4px 8px'
                    }}
                    onClick={() => setMessageViewModes(prev => new Map(prev).set(msg.timestamp, 'json'))}
                >
                    JSON
                </Button>
                <Button
                    type="link"
                    size="small"
                    icon="table"
                    style={{
                        color: messageViewModes.get(msg.timestamp) === 'table' ? '#1890ff' : '#999',
                        padding: '4px 8px'
                    }}
                    onClick={() => setMessageViewModes(prev => new Map(prev).set(msg.timestamp, 'table'))}
                >
                    表格
                </Button>
                
                {/* 复制按钮 */}
                {msg.type === 'assistant' && (
                    <Button
                        type="link"
                        size="small"
                        icon="copy"
                        style={{ padding: '4px 8px' }}
                        onClick={() => copyToClipboard(msg)}
                    >
                        复制
                    </Button>
                )}
            </div>
        );
    }

    // 重写渲染内容方法
    render(props) {
        return <ESAssistantUI assistant={this} {...props} />;
    }
}

// 新增UI组件
export const ESAssistantUI = ({
    assistant,
    config,
    assistantInputs,
    setAssistantInputs,
    handleCloseAssistant,
    executingAssistants,
    executeCommand,
    handleServerSelect,
    servers,
    setExecutingAssistants,
    setMessages,
    messageViewModes,
    setMessageViewModes,
    handleResultSelect,
    selectedResults,
    copyToClipboard
}) => {
    const [searchModal, setSearchModal] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState('');
    const [selectedFields, setSelectedFields] = useState([]);
    const [conditions, setConditions] = useState([]);
    const [timeRange, setTimeRange] = useState([moment().subtract(15, 'minutes'), moment()]);
    const [isClusterLoading, setIsClusterLoading] = useState(false);
    const [isIndicesLoading, setIsIndicesLoading] = useState(false);
    const [indexFields, setIndexFields] = useState([]);

    const handleTimeRangeOk = (range) => {
        if (!range || !range[0] || !range[1]) {
            message.warning('请选择有效的时间范围');
            return;
        }
        setTimeRange([moment(range[0]), moment(range[1])]);
    };

    const handleSearch = () => {
        if (!selectedIndex) {
            message.warning('请选择索引');
            return;
        }

        // 构建查询参数对象
        const queryParams = {
            index: selectedIndex,
            timeRange: timeRange.map(t => t.valueOf()),  // 存储时间戳
            selectedFields,
            conditions
        };

        // 将查询参数序列化后存储
        setAssistantInputs(prev => new Map(prev).set(assistant.name, JSON.stringify(queryParams)));
        setSearchModal(false);
    };

    // 获取索引字段
    const fetchIndexFields = async (index) => {
        if (!config?.ip || !index) return;
        
        try {
            const response = await MyAxios.post('/fault_tree/v1/get_es_index_fields/', {
                index: index
            });
            
            if (response.data.status === 'ok') {
                setIndexFields(response.data.data);
            } else {
                message.error(response.data.message || '获取字段失败');
            }
        } catch (error) {
            console.error('获取索引字段失败:', error);
            message.error('获取字段失败');
        }
    };

    // 监听索引选择变化
    useEffect(() => {
        if (selectedIndex) {
            fetchIndexFields(selectedIndex);
        } else {
            setIndexFields([]);
        }
    }, [selectedIndex, config?.ip]);

    const renderSearchModal = () => (
        <Modal
            title="Elasticsearch查询构建器"
            visible={searchModal}
            onCancel={() => setSearchModal(false)}
            width={800}
            footer={[
                <Button key="cancel" onClick={() => setSearchModal(false)}>
                    取消
                </Button>,
                <Button 
                    key="confirm" 
                    type="primary"
                    onClick={handleSearch}
                >
                    确认
                </Button>
            ]}
        >
            <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>索引选择</div>
                <Select
                    style={{ width: '100%' }}
                    placeholder="选择索引"
                    value={selectedIndex}
                    onChange={setSelectedIndex}
                >
                    {ES_MOCK_INDICES.map(index => (
                        <Select.Option key={index.value} value={index.value}>
                            {index.label}
                        </Select.Option>
                    ))}
                </Select>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>时间范围</div>
                <TimeRangePicker
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    onOk={handleTimeRangeOk}
                />
            </div>

            <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>查询字段</div>
                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="选择查询字段"
                    value={selectedFields}
                    onChange={setSelectedFields}
                    allowClear
                >
                    {indexFields.map(field => (
                        <Select.Option 
                            key={field.field} 
                            value={field.field}
                            title={`${field.field} (${field.type}) - ${field.description}`}
                        >
                            {field.field}
                        </Select.Option>
                    ))}
                </Select>
            </div>

            {conditions.map((condition, index) => (
                <div key={index} style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                    <Select
                        style={{ width: 200 }}
                        value={condition.field}
                        onChange={(value) => {
                            const newConditions = [...conditions];
                            newConditions[index] = { ...newConditions[index], field: value };
                            setConditions(newConditions);
                        }}
                    >
                        {indexFields.map(field => (
                            <Select.Option key={field.field} value={field.field}>
                                {field.field} ({field.type})
                            </Select.Option>
                        ))}
                    </Select>
                    <Select
                        style={{ width: 150 }}
                        value={condition.operator}
                        onChange={(value) => {
                            const newConditions = [...conditions];
                            newConditions[index] = { ...newConditions[index], operator: value };
                            setConditions(newConditions);
                        }}
                    >
                        {condition.field && indexFields.find(f => f.field === condition.field)?.type &&
                            ES_OPERATORS[indexFields.find(f => f.field === condition.field).type]?.map(op => (
                                <Select.Option key={op} value={op}>{op}</Select.Option>
                            ))
                        }
                    </Select>
                    
                    {/* 根据操作符类型渲染不同的输入组件 */}
                    {condition.operator === 'between' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                                style={{ width: 100 }}
                                value={condition.value?.min}
                                onChange={(e) => {
                                    const newConditions = [...conditions];
                                    newConditions[index] = {
                                        ...newConditions[index],
                                        value: { ...condition.value, min: e.target.value }
                                    };
                                    setConditions(newConditions);
                                }}
                                placeholder="最小值"
                            />
                            <Input
                                style={{ width: 100 }}
                                value={condition.value?.max}
                                onChange={(e) => {
                                    const newConditions = [...conditions];
                                    newConditions[index] = {
                                        ...newConditions[index],
                                        value: { ...condition.value, max: e.target.value }
                                    };
                                    setConditions(newConditions);
                                }}
                                placeholder="最大值"
                            />
                        </div>
                    ) : condition.operator === 'in' ? (
                        <Select
                            mode="tags"
                            style={{ width: 200 }}
                            value={Array.isArray(condition.value) ? condition.value : []}
                            onChange={(values) => {
                                const newConditions = [...conditions];
                                newConditions[index] = { ...newConditions[index], value: values };
                                setConditions(newConditions);
                            }}
                            placeholder="输入值后按回车"
                        />
                    ) : (
                        <Input
                            style={{ width: 200 }}
                            value={condition.value}
                            onChange={(e) => {
                                const newConditions = [...conditions];
                                newConditions[index] = { ...newConditions[index], value: e.target.value };
                                setConditions(newConditions);
                            }}
                            placeholder="输入值"
                        />
                    )}

                    <Button 
                        type="link" 
                        danger
                        onClick={() => {
                            const newConditions = conditions.filter((_, i) => i !== index);
                            setConditions(newConditions);
                        }}
                    >
                        删除
                    </Button>
                </div>
            ))}

            <Button 
                type="dashed" 
                block 
                onClick={() => {
                    setConditions([...conditions, { field: '', operator: '', value: '' }]);
                }}
                style={{ marginTop: 16 }}
            >
                添加条件
            </Button>
        </Modal>
    );

    return (
        <div style={{ 
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            padding: '4px 11px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            background: '#fff',
            width: '100%'
        }}>
            <span style={{ 
                color: '#ff4d4f',
                fontFamily: 'monospace',
                marginRight: '12px',
                whiteSpace: 'nowrap'
            }}>
                {assistant.prefix}
            </span>

            <Select
                style={{ width: '30%', marginRight: '12px' }}
                placeholder={isClusterLoading ? "连接集群中..." : "选择服务器"}
                value={config?.ip}
                onChange={value => handleServerSelect(assistant.name, value)}
                loading={isClusterLoading}
                disabled={isClusterLoading}
            >
                {servers.map(server => (
                    <Select.Option key={server.ip} value={server.ip}>
                        {server.ip}
                    </Select.Option>
                ))}
            </Select>

            <Button 
                type="primary"
                disabled={isClusterLoading || isIndicesLoading}
                onClick={() => {
                    if (!config?.ip) {
                        message.warning('请先选择服务器');
                        return;
                    }
                    setSearchModal(true);
                    // 从存储的值中恢复查询参数
                    const savedValue = assistantInputs.get(assistant.name);
                    if (savedValue) {
                        try {
                            const queryParams = JSON.parse(savedValue);
                            setSelectedIndex(queryParams.index);
                            // 从时间戳恢复moment对象
                            setTimeRange(queryParams.timeRange 
                                ? queryParams.timeRange.map(t => moment(t))
                                : [moment().subtract(15, 'minutes'), moment()]
                            );
                            setSelectedFields(queryParams.selectedFields || []);
                            setConditions(queryParams.conditions || []);
                        } catch (e) {
                            // 如果解析失败，重置所有状态
                            setSelectedIndex('');
                            setTimeRange([moment().subtract(15, 'minutes'), moment()]);
                            setSelectedFields([]);
                            setConditions([]);
                        }
                    }
                }}
                style={{ marginRight: 'auto' }}
            >
                构建查询
            </Button>

            <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
            }}>
                <div 
                    style={{ 
                        cursor: 'pointer', 
                        color: '#1890ff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                    onClick={() => {
                        const savedValue = assistantInputs.get(assistant.name);
                        if (!savedValue) {
                            message.warning('请先构建查询');
                            return;
                        }

                        let queryParams;
                        try {
                            queryParams = JSON.parse(savedValue);
                            // 从时间戳恢复moment对象
                            queryParams.timeRange = queryParams.timeRange 
                                ? queryParams.timeRange.map(t => moment(t))
                                : [moment().subtract(15, 'minutes'), moment()];
                        } catch (e) {
                            message.error('查询参数格式错误');
                            return;
                        }

                        // 构建用户命令
                        const userCommand = `@${assistant.name} ${config?.ip} ${queryParams.index}`;
                        const userTimestamp = getStandardTime();

                        // 执行命令
                        assistant.handleExecute({
                            assistantInputs: new Map([[assistant.name, queryParams.index]]),
                            config,
                            executingAssistants,
                            executeCommand: (msg) => {
                                if (msg.type === 'assistant') {
                                    setMessages(prev => [...prev, {
                                        type: 'user',
                                        content: userCommand,
                                        timestamp: userTimestamp
                                    }, msg]);
                                }
                            },
                            setExecutingAssistants,
                            timeRange: queryParams.timeRange,
                            selectedFields: queryParams.selectedFields || [],
                            conditions: queryParams.conditions || []
                        });
                    }}
                >
                    {executingAssistants.has(assistant.name) ? (
                        <>
                            <Icon type="pause-circle" />
                            暂停
                        </>
                    ) : (
                        <>
                            <Icon type="arrow-right" />
                            执行
                        </>
                    )}
                </div>
                <Icon 
                    type="close" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleCloseAssistant(assistant.name)}
                />
            </div>

            {renderSearchModal()}
        </div>
    );
};

// ES表格视图组件
const ESTableView = ({ data }) => {
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // 获取所有字段
    const allFields = new Set();
    data.forEach(item => {
        Object.keys(item).forEach(key => allFields.add(key));
    });
    const fields = Array.from(allFields);

    // 排序数据
    const sortedData = [...data].sort((a, b) => {
        if (!sortField) return 0;
        
        const valueA = a[sortField];
        const valueB = b[sortField];
        
        // 处理空值
        if (valueA === undefined || valueA === null) return sortDirection === 'asc' ? -1 : 1;
        if (valueB === undefined || valueB === null) return sortDirection === 'asc' ? 1 : -1;
        
        // 数字比较
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        
        // 字符串比较
        const strA = String(valueA).toLowerCase();
        const strB = String(valueB).toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    // 处理排序点击
    const handleSort = (field) => {
        if (sortField === field) {
            // 切换排序方向
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // 设置新的排序字段，默认升序
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // 格式化单元格值
    const formatCellValue = (value) => {
        if (value === undefined || value === null) {
            return '-';
        } else if (typeof value === 'object') {
            return JSON.stringify(value);
        } else {
            return String(value);
        }
    };

    // 获取排序图标
    const getSortIcon = (field) => {
        if (sortField !== field) return <Icon type="swap" style={{ opacity: 0.3 }} />;
        return sortDirection === 'asc' ? <Icon type="caret-up" /> : <Icon type="caret-down" />;
    };

    return (
        <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
            <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                fontSize: '14px',
                tableLayout: 'auto'
            }}>
                <thead>
                    <tr>
                        {fields.map(field => (
                            <th 
                                key={field} 
                                style={{ 
                                    padding: '8px', 
                                    borderBottom: '1px solid #e8e8e8',
                                    backgroundColor: '#fafafa',
                                    textAlign: 'left',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '250px',
                                    cursor: 'pointer'
                                }}
                                onClick={() => handleSort(field)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>{field}</span>
                                    <span style={{ marginLeft: '4px' }}>{getSortIcon(field)}</span>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((item, index) => (
                        <tr key={index}>
                            {fields.map(field => (
                                <td key={field} style={{ 
                                    padding: '8px', 
                                    borderBottom: '1px solid #e8e8e8',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '250px'
                                }}>
                                    {formatCellValue(item[field])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}; 