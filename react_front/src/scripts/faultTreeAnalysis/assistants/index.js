import React from 'react';
import SSHAssistant from './SSHAssistant';
import MySQLAssistant from './MySQLAssistant';
import ZabbixAssistant from './ZabbixAssistant';
import ESAssistant from './ESAssistant';

// 助手注册表
class AssistantRegistry {
    constructor() {
        this.assistants = new Map();
    }

    register(name, assistant) {
        this.assistants.set(name, assistant);
    }

    get(name) {
        return this.assistants.get(name);
    }

    getAll() {
        return Array.from(this.assistants.values());
    }
}

// 创建注册表实例
const registry = new AssistantRegistry();

// 注册助手
registry.register('ssh', new SSHAssistant());
registry.register('mysql', new MySQLAssistant());
registry.register('zabbix', new ZabbixAssistant());
registry.register('es', new ESAssistant());

// 助手容器组件
const AssistantContainer = ({
    activeAssistants,
    assistantConfigs,
    assistantInputs,
    setAssistantInputs,
    handleCloseAssistant,
    executingAssistants,
    setExecutingAssistants,
    executeCommand,
    handleServerSelect,
    servers,
    setMessages
}) => {
    return (
        <div style={{ marginBottom: '12px' }}>
            {Array.from(activeAssistants.keys()).map(assistantName => {
                const assistant = registry.get(assistantName);
                if (!assistant) return null;

                return assistant.render({
                    config: assistantConfigs.get(assistantName),
                    assistantInputs,
                    setAssistantInputs,
                    handleCloseAssistant,
                    executingAssistants,
                    setExecutingAssistants,
                    executeCommand,
                    handleServerSelect,
                    servers,
                    setMessages
                });
            })}
        </div>
    );
};

export { AssistantContainer, registry }; 