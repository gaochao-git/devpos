import React from 'react';
import registry from './AssistantRegistry';
import { ZabbixAssistantUI } from './ZabbixAssistant';
import { ESAssistantUI } from './ESAssistant';

// UI组件映射表
const UI_COMPONENTS = {
    'Zabbix助手': ZabbixAssistantUI,
    'ES助手': ESAssistantUI
};

const AssistantContainer = ({
    activeAssistants,
    assistantConfigs,
    assistantInputs,
    setAssistantInputs,
    handleCloseAssistant,
    executingAssistants,
    executeCommand,
    handleServerSelect,
    servers,
    setMessages
}) => {
    return (
        <div style={{ marginBottom: '12px' }}>
            {Array.from(activeAssistants.keys()).map(assistantName => {
                const assistant = registry.getAssistant(assistantName);
                if (!assistant) {
                    console.warn(`Assistant ${assistantName} not found in registry`);
                    return null;
                }

                const AssistantUI = UI_COMPONENTS[assistantName];
                if (!AssistantUI) {
                    console.warn(`UI component for ${assistantName} not found`);
                    return null;
                }

                return (
                    <AssistantUI
                        key={assistantName}
                        assistant={assistant}
                        config={assistantConfigs.get(assistantName)}
                        assistantInputs={assistantInputs}
                        setAssistantInputs={setAssistantInputs}
                        handleCloseAssistant={handleCloseAssistant}
                        executingAssistants={executingAssistants}
                        executeCommand={executeCommand}
                        handleServerSelect={handleServerSelect}
                        servers={servers}
                        setMessages={setMessages}
                    />
                );
            })}
        </div>
    );
};

export default AssistantContainer; 