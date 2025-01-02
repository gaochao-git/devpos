import React, { useState } from 'react';
import { Input, Button, message, Select, Tooltip } from 'antd';
import { Icon } from 'antd';
import MyAxios from "../common/interface";

const { Option } = Select;

// 定义上下文类型
const CONTEXT_TYPES = [
    { key: 'tree', label: '故障树数据', icon: 'cluster', 
      description: '使用故障树结构和关联信息' },
    { key: 'zabbix', label: 'Zabbix监控', icon: 'line-chart', 
      description: '包含系统性能和状态指标' }
];

const ChatRca = ({ treeData }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedContext, setSelectedContext] = useState(['tree']); // 默认选择故障树数据

    // 获取选中上下文的数据
    const getContextData = async () => {
        const contextData = {};
        
        if (selectedContext.includes('tree') && treeData) {
            contextData.tree_data = treeData;
        }
        
        if (selectedContext.includes('zabbix')) {
            try {
                // 获取Zabbix监控数据
                const response = await MyAxios.get('/zabbix/v1/metrics/');
                if (response.data.status === 'ok') {
                    contextData.zabbix_data = response.data.data;
                }
            } catch (error) {
                console.error('获取Zabbix数据失败:', error);
                message.warning('Zabbix监控数据获取失败');
            }
        }
        
        return contextData;
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isStreaming) return;

        const userMessage = {
            type: 'user',
            content: inputValue,
            timestamp: new Date().toLocaleTimeString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsStreaming(true);

        try {
            // 获取上下文数据
            const contextData = await getContextData();
            
            const response = await MyAxios.post('/ai/v1/chat/', {
                message: inputValue,
                context: contextData
            });

            if (response.data.status === 'ok') {
                const responseMessage = {
                    type: 'system',
                    content: response.data.reply || '分析完成',
                    timestamp: new Date().toLocaleTimeString()
                };
                setMessages(prev => [...prev, responseMessage]);
            } else {
                message.error(response.data.message || '发送失败');
            }
        } catch (error) {
            console.error('发送失败:', error);
            message.error('发送消息失败，请稍后重试');
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div style={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#f5f5f5'
        }}>
            {/* 顶部工具栏 */}
            <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid #e8e8e8',
                background: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Select
                    mode="multiple"
                    style={{ width: '300px' }}
                    placeholder="选择上下文"
                    value={selectedContext}
                    onChange={setSelectedContext}
                    optionLabelProp="label"
                >
                    {CONTEXT_TYPES.map(type => (
                        <Option 
                            key={type.key} 
                            value={type.key}
                            label={
                                <span>
                                    <Icon type={type.icon} /> {type.label}
                                </span>
                            }
                        >
                            <Tooltip title={type.description}>
                                <span>
                                    <Icon type={type.icon} /> {type.label}
                                </span>
                            </Tooltip>
                        </Option>
                    ))}
                </Select>
            </div>

            {/* 消息列表 */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px'
            }}>
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        style={{
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: msg.type === 'user' ? 'row-reverse' : 'row'
                        }}
                    >
                        <div style={{
                            maxWidth: '80%',
                            padding: '12px',
                            borderRadius: '8px',
                            background: msg.type === 'user' ? '#1890ff' : '#fff',
                            color: msg.type === 'user' ? '#fff' : '#333',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <div>{msg.content}</div>
                            <div style={{
                                fontSize: '12px',
                                color: msg.type === 'user' ? '#e6f7ff' : '#999',
                                marginTop: '4px'
                            }}>
                                {msg.timestamp}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 输入区域 */}
            <div style={{
                padding: '16px',
                background: '#fff',
                borderTop: '1px solid #e8e8e8'
            }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Input.TextArea
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onPressEnter={e => {
                            if (!e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={`输入问题... ${selectedContext.length ? `(已选择 ${selectedContext.map(key => 
                            CONTEXT_TYPES.find(t => t.key === key)?.label
                        ).join(', ')})` : '(无上下文)'}`}
                        disabled={isStreaming}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                    />
                    <Button
                        type="primary"
                        onClick={handleSend}
                        loading={isStreaming}
                        icon={<Icon type="message" />}
                    >
                        发送
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ChatRca;
