import React, { useState } from 'react';
import { Select, Button, Modal, Radio, DatePicker, Input, Icon, message } from 'antd';
import moment from 'moment';
import BaseAssistant from './BaseAssistant';
import { ES_MOCK_INDICES, ES_MOCK_FIELDS, ES_OPERATORS, getStandardTime, markdownRenderers } from '../util';
import ReactMarkdown from 'react-markdown';

const { RangePicker } = DatePicker;

export default class ESAssistant extends BaseAssistant {
    constructor() {
        super();
        this.name = 'ES助手';
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
    buildExecuteParams(value, config) {
        return {
            tool: 'es',
            address: config.ip,
            cmd: value
        };
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

    // 重写渲染内容方法
    renderContent({ 
        config,
        assistantInputs,
        setAssistantInputs,
        handleCloseAssistant,
        executingAssistants,
        executeCommand,
        handleServerSelect,
        servers,
        setExecutingAssistants,
        setMessages
    }) {
        const [searchModal, setSearchModal] = useState(false);
        const [selectedIndex, setSelectedIndex] = useState('');
        const [selectedFields, setSelectedFields] = useState([]);
        const [conditions, setConditions] = useState([]);
        const [timeRange, setTimeRange] = useState({
            type: 'relative',
            value: 'last_15_minutes'
        });
        const [customTimeRange, setCustomTimeRange] = useState([null, null]);
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
                        onClick={() => {
                            // 构建查询并设置到输入中
                            setAssistantInputs(prev => new Map(prev).set(this.name, selectedIndex));
                            setSearchModal(false);
                        }}
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

        return (
            <>
                <Select
                    style={{ width: '30%', marginRight: '12px' }}
                    placeholder={isClusterLoading ? "连接集群中..." : "选择服务器"}
                    value={config?.ip}
                    onChange={value => handleServerSelect(this.name, value)}
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
                            const value = assistantInputs.get(this.name);
                            if (!value) {
                                message.warning('请先构建查询');
                                return;
                            }
                            // 先添加用户消息
                            const userCommand = `@${this.name} ${config?.ip} ${value}`;
                            setMessages(prev => [...prev, {
                                type: 'user',
                                content: userCommand,
                                timestamp: getStandardTime()
                            }]);

                            // 然后执行命令
                            this.handleExecute({
                                assistantInputs,
                                config,
                                executingAssistants,
                                executeCommand,
                                setExecutingAssistants
                            });
                        }}
                    >
                        {executingAssistants.has(this.name) ? (
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
                        onClick={() => handleCloseAssistant(this.name)}
                    />
                </div>

                {renderSearchModal()}
            </>
        );
    }

    // 重写消息渲染方法
    renderMessage(msg, messageViewModes) {
        // 如果消息包含 JSON 数据，以 JSON 格式显示
        try {
            const data = JSON.parse(msg.rawContent);
            return (
                <div>
                    {/* 命令部分 */}
                    <ReactMarkdown components={markdownRenderers}>
                        {msg.command ? `> ${msg.command}\n` : ''}
                    </ReactMarkdown>
                    
                    {/* 结果部分 */}
                    <div style={{ 
                        background: '#f5f5f5', 
                        padding: '12px',
                        borderRadius: '4px',
                        marginTop: '8px'
                    }}>
                        <pre style={{ 
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                        }}>
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                </div>
            );
        } catch (e) {
            // 如果不是 JSON，使用默认渲染
            return super.renderMessage(msg, messageViewModes);
        }
    }
} 