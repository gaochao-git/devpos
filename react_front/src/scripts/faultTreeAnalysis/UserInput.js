import React from 'react';
import { Input, Icon, Popover } from 'antd';
import { CONTEXT_TYPES } from './util';

const UserInput = ({ 
    inputValue,
    isStreaming,
    atPosition,
    filteredAssistants,
    selectedContext,
    handleInputChange,
    handleKeyDown,
    handleSearchBlur,
    handleAssistantSelect,
    handleSend,
    handleInterrupt,
    setSelectedContext,
    setAtPosition
}) => {
    return (
        <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleSearchBlur}
            className="chat-input"
            placeholder="输入问题... 按 @ 键选择专业助手，按 Tab 键快速选择服务器"
            disabled={isStreaming}
            addonBefore={
                <Popover
                    placement="topLeft"
                    content={
                        <div>
                            {CONTEXT_TYPES.map(type => (
                                <div
                                    key={type.key}
                                    onClick={() => {
                                        if (!selectedContext.includes(type.key)) {
                                            setSelectedContext(prev => [...prev, type.key]);
                                        }
                                    }}
                                    style={{
                                        padding: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Icon type={type.icon} /> {type.label}
                                </div>
                            ))}
                        </div>
                    }
                    trigger="click"
                >
                    <Icon 
                        type="plus" 
                        style={{ 
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    />
                </Popover>
            }
            addonAfter={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isStreaming && (
                        <Icon 
                            type="arrow-right"
                            style={{ 
                                cursor: 'pointer',
                                fontSize: '16px',
                                color: '#1890ff'
                            }}
                            onClick={handleSend}
                        />
                    )}
                    {isStreaming && (
                        <Icon 
                            type="pause-circle" 
                            style={{ 
                                cursor: 'pointer',
                                fontSize: '16px',
                                color: '#ff4d4f'
                            }}
                            onClick={handleInterrupt}
                        />
                    )}
                </div>
            }
            style={{
                width: '100%'
            }}
        />
    );
};

export default UserInput; 