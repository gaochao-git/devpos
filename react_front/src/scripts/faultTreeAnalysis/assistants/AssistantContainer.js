import React from 'react';
import registry from './AssistantRegistry';

const AssistantContainer = ({
    activeAssistants,
    assistantConfigs,
    assistantInputs,
    setAssistantInputs,
    handleCloseAssistant,
    executingAssistants,
    executeCommand,
    handleServerSelect,
    servers
}) => {
    return (
        <>
            {Array.from(activeAssistants.keys()).map(assistantName => {
                const assistant = registry.getAssistant(assistantName);
                if (!assistant) {
                    console.warn(`Assistant ${assistantName} not found in registry`);
                    return null;
                }

                return assistant.render({
                    key: assistantName,
                    config: assistantConfigs.get(assistantName),
                    assistantInputs,
                    setAssistantInputs,
                    handleCloseAssistant,
                    executingAssistants,
                    executeCommand,
                    handleServerSelect,
                    servers
                });
            })}
        </>
    );
};

export default AssistantContainer; 