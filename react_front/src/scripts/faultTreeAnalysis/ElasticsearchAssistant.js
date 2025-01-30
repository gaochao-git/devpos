import React, { useState } from 'react';
import { Input, Button, Select, Modal, Radio, DatePicker, Icon } from 'antd';
import moment from 'moment';
import {
    ES_MOCK_INDICES,
    ES_MOCK_FIELDS,
    ES_OPERATORS,
    ES_QUERY_TEMPLATES,
    extractServersFromTree
} from './util';

const { RangePicker } = DatePicker;

const ElasticsearchAssistant = ({
    assistantName,
    config,
    onClose,
    setMessages,
    getStandardTime,
    handleSendMessage,
    handleServerSelect,
    treeData
}) => {
    const [selectedIndex, setSelectedIndex] = useState('');
    const [searchModal, setSearchModal] = useState(false);
    const [selectedFields, setSelectedFields] = useState([]);
    const [conditions, setConditions] = useState([]);
    const [queryTemplate, setQueryTemplate] = useState(ES_QUERY_TEMPLATES[0]);
    const [timeRange, setTimeRange] = useState({
        type: 'relative',
        value: 'last_15_minutes'
    });
    const [customTimeRange, setCustomTimeRange] = useState([null, null]);
    const [builtQuery, setBuiltQuery] = useState(null);
    const [isClusterLoading, setIsClusterLoading] = useState(false);
    const [isIndicesLoading, setIsIndicesLoading] = useState(false);

    const RELATIVE_TIME_RANGES = [
        { label: '最近15分钟', value: 'last_15_minutes' },
        { label: '最近1小时', value: 'last_1_hour' },
        { label: '最近3小时', value: 'last_3_hours' },
        { label: '最近6小时', value: 'last_6_hours' },
        { label: '最近12小时', value: 'last_12_hours' },
        { label: '最近24小时', value: 'last_24_hours' },
        { label: '最近7天', value: 'last_7_days' },
        { label: '今天', value: 'today' },
        { label: '本周', value: 'this_week' },
        { label: '本月', value: 'this_month' },
        { label: '自定义', value: 'custom' }
    ];

    const getTimeRangeQuery = () => {
        const now = moment();
        let start, end;

        if (timeRange.type === 'relative') {
            end = now;
            switch (timeRange.value) {
                case 'last_15_minutes':
                    start = now.clone().subtract(15, 'minutes');
                    break;
                case 'last_1_hour':
                    start = now.clone().subtract(1, 'hours');
                    break;
                case 'last_3_hours':
                    start = now.clone().subtract(3, 'hours');
                    break;
                case 'last_6_hours':
                    start = now.clone().subtract(6, 'hours');
                    break;
                case 'last_12_hours':
                    start = now.clone().subtract(12, 'hours');
                    break;
                case 'last_24_hours':
                    start = now.clone().subtract(24, 'hours');
                    break;
                case 'last_7_days':
                    start = now.clone().subtract(7, 'days');
                    break;
                case 'today':
                    start = now.clone().startOf('day');
                    break;
                case 'this_week':
                    start = now.clone().startOf('week');
                    break;
                case 'this_month':
                    start = now.clone().startOf('month');
                    break;
                case 'custom':
                    [start, end] = customTimeRange;
                    break;
                default:
                    start = now.clone().subtract(15, 'minutes');
            }
        } else {
            [start, end] = customTimeRange;
        }

        return {
            range: {
                '@timestamp': {
                    gte: start.toISOString(),
                    lte: end.toISOString()
                }
            }
        };
    };

    const buildEsQuery = () => {
        const query = {
            query: {
                bool: {
                    must: [
                        getTimeRangeQuery()
                    ]
                }
            }
        };

        conditions.forEach(condition => {
            const fieldType = ES_MOCK_FIELDS[selectedIndex]?.find(
                f => f.field === condition.field
            )?.type;

            let clauseType = 'must';
            let queryClause = {};

            switch (condition.operator) {
                case 'is':
                    queryClause = {
                        term: { [condition.field]: condition.value }
                    };
                    break;
                case 'is not':
                    clauseType = 'must_not';
                    queryClause = {
                        term: { [condition.field]: condition.value }
                    };
                    break;
                case 'contains':
                    queryClause = {
                        match: { [condition.field]: condition.value }
                    };
                    break;
                case 'not contains':
                    clauseType = 'must_not';
                    queryClause = {
                        match: { [condition.field]: condition.value }
                    };
                    break;
                case 'in':
                    queryClause = {
                        terms: { 
                            [condition.field]: condition.value.split(',').map(v => v.trim()) 
                        }
                    };
                    break;
                case 'not in':
                    clauseType = 'must_not';
                    queryClause = {
                        terms: { 
                            [condition.field]: condition.value.split(',').map(v => v.trim()) 
                        }
                    };
                    break;
                case '>':
                case '>=':
                case '<':
                case '<=':
                    queryClause = {
                        range: {
                            [condition.field]: {
                                [condition.operator]: condition.value
                            }
                        }
                    };
                    break;
                case 'between':
                    const [start, end] = condition.value.split(',').map(v => v.trim());
                    queryClause = {
                        range: {
                            [condition.field]: {
                                gte: start,
                                lte: end
                            }
                        }
                    };
                    break;
                case 'exists':
                    queryClause = {
                        exists: { field: condition.field }
                    };
                    break;
                case 'not exists':
                    clauseType = 'must_not';
                    queryClause = {
                        exists: { field: condition.field }
                    };
                    break;
            }

            if (!query.query.bool[clauseType]) {
                query.query.bool[clauseType] = [];
            }
            query.query.bool[clauseType].push(queryClause);
        });

        if (selectedFields.length > 0) {
            query._source = selectedFields;
        }

        return query;
    };

    const renderTimeRangePicker = () => (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Radio.Group
                value={timeRange.type}
                onChange={(e) => setTimeRange({ ...timeRange, type: e.target.value })}
                style={{ marginRight: 16 }}
            >
                <Radio.Button value="relative">相对时间</Radio.Button>
                <Radio.Button value="absolute">绝对时间</Radio.Button>
            </Radio.Group>

            {timeRange.type === 'relative' ? (
                <Select
                    style={{ width: 200 }}
                    value={timeRange.value}
                    onChange={(value) => setTimeRange({ ...timeRange, value })}
                >
                    {RELATIVE_TIME_RANGES.map(range => (
                        <Select.Option key={range.value} value={range.value}>
                            {range.label}
                        </Select.Option>
                    ))}
                </Select>
            ) : (
                <RangePicker
                    showTime
                    value={customTimeRange}
                    onChange={(dates) => {
                        setCustomTimeRange(dates);
                        setTimeRange({ type: 'absolute', value: 'custom' });
                    }}
                    style={{ width: 400 }}
                />
            )}
        </div>
    );

    const handleConfirmQuery = () => {
        const query = buildEsQuery();
        setBuiltQuery(query);
        setSearchModal(false);
    };

    const handleExecuteQuery = () => {
        if (!builtQuery) return;
        
        const timestamp = getStandardTime();
        const userMessage = `@${assistantName} ${config.ip} ${selectedIndex}`;
        
        handleSendMessage(userMessage);

        // Mock执行结果
        const mockResult = {
            took: 123,
            hits: {
                total: {
                    value: 2,
                    relation: "eq"
                },
                hits: [
                    {
                        "_source": {
                            "@timestamp": "2024-01-20T10:00:00.000Z",
                            "level": "error",
                            "message": "Connection refused",
                            "service": "user-service"
                        }
                    },
                    {
                        "_source": {
                            "@timestamp": "2024-01-20T10:01:00.000Z",
                            "level": "error",
                            "message": "Database lock timeout",
                            "service": "order-service"
                        }
                    }
                ]
            }
        };

        const formattedCommand = `> @${assistantName} ${config.ip} ${selectedIndex}`;
        const formattedResult = `\`\`\`json\n${JSON.stringify(mockResult, null, 2)}\n\`\`\``;
        const formatMessage = `${formattedCommand}\n${formattedResult}`;
        
        setTimeout(() => {
            setMessages(prev => [...prev, {
                type: 'assistant',
                content: formatMessage,
                rawContent: mockResult,
                command: `@${assistantName} ${config.ip} ${selectedIndex}`,
                timestamp: getStandardTime(),
                isError: false
            }]);
        }, 300);
    };

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
                    onClick={handleConfirmQuery}
                >
                    确认
                </Button>
            ]}
        >
            {renderTimeRangePicker()}

            <div style={{ marginBottom: 16 }}>
                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="选择查询字段"
                    value={selectedFields}
                    onChange={setSelectedFields}
                >
                    {ES_MOCK_FIELDS[selectedIndex]?.map(field => (
                        <Select.Option 
                            key={field.field} 
                            value={field.field}
                            title={`${field.field} (${field.type}) - ${field.description}`}
                        >
                            {field.field} - {field.description}
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
                        {ES_MOCK_FIELDS[selectedIndex]?.map(field => (
                            <Select.Option key={field.field} value={field.field}>
                                {field.field}
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
                        {condition.field && ES_OPERATORS[
                            ES_MOCK_FIELDS[selectedIndex]?.find(f => f.field === condition.field)?.type
                        ]?.map(op => (
                            <Select.Option key={op} value={op}>{op}</Select.Option>
                        ))}
                    </Select>
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

    // Get servers from tree data
    const servers = extractServersFromTree(treeData);

    return (
        <div style={{ 
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            padding: '4px 11px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            background: '#fff'
        }}>
            <span style={{ 
                color: '#ff4d4f',
                fontFamily: 'monospace',
                marginRight: '12px',
                whiteSpace: 'nowrap'
            }}>
                es&gt;
            </span>
            
            <Select
                style={{ width: '30%', marginRight: '12px' }}
                placeholder={isClusterLoading ? "连接集群中..." : "选择服务器"}
                value={config?.ip}
                onChange={value => handleServerSelect(assistantName, value)}
                loading={isClusterLoading}
                disabled={isClusterLoading}
            >
                {servers.map(server => (
                    <Select.Option key={server.ip} value={server.ip}>
                        {server.ip}
                    </Select.Option>
                ))}
            </Select>

            <Select
                style={{ width: '30%', marginRight: '12px' }}
                placeholder={isIndicesLoading ? "加载索引中..." : "选择索引"}
                value={selectedIndex}
                onChange={setSelectedIndex}
                loading={isIndicesLoading}
                disabled={isIndicesLoading || !config?.ip}
            >
                {ES_MOCK_INDICES.map(index => (
                    <Select.Option key={index.value} value={index.value}>
                        {index.label}
                    </Select.Option>
                ))}
            </Select>

            <Button 
                type="primary"
                disabled={!selectedIndex || isClusterLoading || isIndicesLoading}
                onClick={() => setSearchModal(true)}
                style={{ marginRight: '12px' }}
            >
                构建查询
            </Button>

            {builtQuery && (
                <Button 
                    type="link"
                    icon="arrow-right"
                    onClick={handleExecuteQuery}
                    style={{ marginRight: '12px' }}
                />
            )}

            <Icon 
                type="close" 
                style={{ cursor: 'pointer' }}
                onClick={() => onClose(assistantName)}
            />

            {renderSearchModal()}
        </div>
    );
};

export default ElasticsearchAssistant; 