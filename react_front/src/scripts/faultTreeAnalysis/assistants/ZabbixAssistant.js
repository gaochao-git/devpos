import React, { useState } from 'react';
import { Select, Icon, message, Checkbox, Button, Modal } from 'antd';
import BaseAssistant from './BaseAssistant';
import { getStandardTime, markdownRenderers } from '../util';
import MyAxios from "../../common/interface";
import ReactMarkdown from 'react-markdown';
import ZabbixChart from '../components/ZabbixChart';
import TimeRangePicker from '../components/TimeRangePicker';
import moment from 'moment';

class ZabbixAssistant extends BaseAssistant {
    constructor() {
        super({
            name: 'Zabbix助手',
            prefix: 'zabbix> ',
            commands: [],  // 命令列表会动态更新
            serverFormat: (ip) => ip
        });
    }

    // 添加获取监控项的方法
    async fetchMetrics(ip) {
        try {
            const response = await MyAxios.post('/fault_tree/v1/get_all_metric_names_by_ip/', { "ip": ip });
            
            if (response.data.status === "ok") {
                const metrics = response.data.data.map(metric => ({
                    value: metric.key_,
                    label: metric.name
                }));
                this.commands = metrics;
                return metrics;
            } else {
                console.error('获取监控项失败:', response.data.message);
                return [];
            }
        } catch (error) {
            console.error('获取 Zabbix 监控项失败:', error);
            return [];
        }
    }

    // 重写服务器选择处理方法
    async handleServerSelect(ip, port) {
        await this.fetchMetrics(ip);
    }

    // 重写执行命令方法
    async handleExecute({ assistantInputs, config, executingAssistants, executeCommand, timeRange }) {
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
                address: config.ip,
                cmd: value,
                time_from: timeRange ? timeRange[0] : moment().subtract(1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
                time_till: timeRange ? timeRange[1] : moment().format('YYYY-MM-DD HH:mm:ss')
            };

            const response = await MyAxios.post('/fault_tree/v1/get_metric_history_by_ip/', params);
            
            if (response.data.status === "ok") {
                const formattedCommand = `> @${this.name} ${config.ip} ${value}`;
                const metricsData = response.data.data;
                const firstItem = metricsData[0];
                
                const headerRow = `指标名称: (${firstItem.key_})\n`;
                const dataRows = metricsData.map(point => 
                    `${point.metric_time} | ${point.value}${firstItem.units}`
                ).join('\n');

                const formatMessage = `${formattedCommand}\n\`\`\`\n${headerRow}${dataRows}\n\`\`\``;
                
                const timestamp = getStandardTime();
                
                executeCommand({
                    type: 'assistant',
                    content: formatMessage,
                    rawContent: response.data.data,
                    command: `@${this.name} ${config.ip} ${value}`,
                    timestamp: timestamp,
                    isZabbix: true,
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
        const [timeRange, setTimeRange] = useState([moment().subtract(1, 'hours').format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')]);
        const [selectedMetrics, setSelectedMetrics] = useState([]);

        const handleTimeRangeOk = (range) => {
            if (!range || !range[0] || !range[1]) {
                message.warning('请选择有效的时间范围');
                return;
            }
            setTimeRange(range);
        };

        const handleSearch = () => {
            if (!selectedMetrics.length) {
                message.warning('请至少选择一个监控指标');
                return;
            }

            // 设置选中的指标，使用 JSON 字符串存储多个指标
            setAssistantInputs(prev => new Map(prev).set(this.name, JSON.stringify(selectedMetrics)));
            setSearchModal(false);
        };

        const renderSearchModal = () => (
            <Modal
                title="Zabbix查询构建器"
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
                    <div style={{ 
                        marginBottom: '8px', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontWeight: 'bold' }}>监控指标（可多选）</span>
                        {selectedMetrics.length > 0 && (
                            <Button 
                                type="link" 
                                size="small"
                                onClick={() => setSelectedMetrics([])}
                                style={{ padding: '4px 0' }}
                            >
                                清空选择
                            </Button>
                        )}
                    </div>
                    <Select
                        mode="multiple"
                        style={{ width: '100%' }}
                        placeholder="选择监控指标"
                        showSearch
                        allowClear
                        value={selectedMetrics}
                        onChange={setSelectedMetrics}
                        optionLabelProp="label"
                        filterOption={(input, option) => {
                            const value = option.props.value || '';
                            const label = option.props.label || '';
                            return (
                                value.toLowerCase().includes(input.toLowerCase()) ||
                                label.toLowerCase().includes(input.toLowerCase())
                            );
                        }}
                    >
                        {this.commands.map(cmd => (
                            <Select.Option 
                                key={cmd.value}
                                value={cmd.value}
                                label={cmd.label}
                                title={`${cmd.label}\n${cmd.value}`}
                            >
                                <div style={{ padding: '4px 0' }}>
                                    <div style={{ fontWeight: 'bold' }}>{cmd.label}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{cmd.value}</div>
                                </div>
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
            </Modal>
        );

        return (
            <>
                {/* 服务器选择 */}
                <Select
                    style={{ width: '30%', marginRight: '12px' }}
                    placeholder="选择服务器"
                    value={config?.ip ? this.serverFormat(config.ip, config.port) : undefined}
                    onChange={async value => {
                        const [ip, port] = value.split(':');
                        // 先获取指标
                        await this.handleServerSelect(ip, port);
                        // 再更新服务器选择
                        handleServerSelect(this.name, value);
                        // 清空已选指标
                        setSelectedMetrics([]);
                    }}
                >
                    {servers.map(server => (
                        <Select.Option 
                            key={server.ip} 
                            value={this.serverFormat(server.ip, server.port)}
                        >
                            {this.serverFormat(server.ip, server.port)}
                        </Select.Option>
                    ))}
                </Select>

                {/* 构建查询按钮 */}
                <Button
                    type="primary"
                    style={{ marginRight: 'auto' }}
                    onClick={() => {
                        if (!config?.ip) {
                            message.warning('请先选择服务器');
                            return;
                        }
                        setSearchModal(true);
                        // 从存储的值中恢复已选指标
                        const savedValue = assistantInputs.get(this.name);
                        if (savedValue) {
                            try {
                                setSelectedMetrics(JSON.parse(savedValue));
                            } catch (e) {
                                setSelectedMetrics([]);
                            }
                        }
                    }}
                >
                    构建查询
                </Button>

                {/* 执行和关闭按钮 */}
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
                        onClick={async () => {
                            const savedValue = assistantInputs.get(this.name);
                            if (!savedValue) {
                                message.warning('请先构建查询');
                                return;
                            }

                            let metrics;
                            try {
                                metrics = JSON.parse(savedValue);
                            } catch (e) {
                                message.error('查询数据格式错误');
                                return;
                            }

                            if (!metrics.length) {
                                message.warning('请至少选择一个监控指标');
                                return;
                            }

                            // 对每个选中的指标执行查询
                            for (const metric of metrics) {
                                const userCommand = `@${this.name} ${this.serverFormat(config?.ip, config?.port)} ${metric}`;
                                setMessages(prev => [...prev, {
                                    type: 'user',
                                    content: userCommand,
                                    timestamp: getStandardTime()
                                }]);

                                await this.handleExecute({
                                    assistantInputs: new Map([[this.name, metric]]),
                                    config,
                                    executingAssistants,
                                    executeCommand,
                                    setExecutingAssistants,
                                    // 直接使用字符串格式的时间
                                    timeRange
                                });
                            }
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

                {/* 查询构建器弹窗 */}
                {renderSearchModal()}
            </>
        );
    }

    // 重写消息渲染方法
    renderMessage(msg, messageViewModes) {
        // 初始化视图模式
        if (!messageViewModes.has(msg.timestamp)) {
            messageViewModes.set(msg.timestamp, this.getDefaultViewMode());
        }

        // 根据视图模式选择渲染方式
        return messageViewModes.get(msg.timestamp) === 'text' ? (
            <ReactMarkdown components={markdownRenderers}>
                {msg.content}
            </ReactMarkdown>
        ) : (
            <div style={{ 
                marginTop: '10px',
                width: '100%',
                overflow: 'hidden'
            }}>
                <ZabbixChart 
                    data={msg.rawContent} 
                    style={{ height: '220px' }}
                    showHeader={false}
                />
            </div>
        );
    }

    // 重写获取默认视图模式方法
    getDefaultViewMode() {
        return 'chart';
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
                
                {/* Zabbix视图切换按钮 */}
                <Button
                    type="link"
                    size="small"
                    icon="file-text"
                    style={{
                        color: messageViewModes.get(msg.timestamp) === 'text' ? '#1890ff' : '#999',
                        padding: '4px 8px'
                    }}
                    onClick={() => setMessageViewModes(prev => new Map(prev).set(msg.timestamp, 'text'))}
                >
                    文本
                </Button>
                <Button
                    type="link"
                    size="small"
                    icon="line-chart"
                    style={{
                        color: messageViewModes.get(msg.timestamp) === 'chart' ? '#1890ff' : '#999',
                        padding: '4px 8px'
                    }}
                    onClick={() => setMessageViewModes(prev => new Map(prev).set(msg.timestamp, 'chart'))}
                >
                    图表
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

    // 重写构建执行参数方法
    buildExecuteParams(value, config, { timeRange, selectedFields, conditions } = {}) {
        const defaultTimeRange = [
            moment().subtract(1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
            moment().format('YYYY-MM-DD HH:mm:ss')
        ];

        return {
            tool: 'zabbix',
            address: config.ip,
            cmd: value,
            // 直接使用字符串格式的时间，如果没有则使用默认值
            time_from: timeRange ? timeRange[0] : defaultTimeRange[0],
            time_till: timeRange ? timeRange[1] : defaultTimeRange[1]
        };
    }
}

export default ZabbixAssistant; 