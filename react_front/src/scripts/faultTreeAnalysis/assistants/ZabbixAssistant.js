import React from 'react';
import BaseAssistant from './BaseAssistant';
import { getStandardTime, markdownRenderers } from '../util';
import MyAxios from "../../common/interface";
import { message } from 'antd';
import ReactMarkdown from 'react-markdown';
import ZabbixChart from '../components/ZabbixChart';
import { Checkbox, Button } from 'antd';

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
    async handleExecute({ assistantInputs, config, executingAssistants, executeCommand }) {
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
                time_from: Math.floor(Date.now() / 1000) - 3600,  // 默认查询最近1小时
                time_till: Math.floor(Date.now() / 1000)
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

    // 重写格式化消息方法
    formatMessage(response) {
        return {
            type: 'assistant',
            content: response.data,
            rawContent: response.data,
            timestamp: getStandardTime(),
            isZabbix: true
        };
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

    // 重写消息渲染方法
    renderMessage(msg, messageViewModes) {
        // 初始化视图模式
        this.initMessageViewMode(msg, messageViewModes);

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
}

export default ZabbixAssistant; 