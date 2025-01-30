import React from 'react';
import { Tag, Icon } from 'antd';
import { CONTEXT_TYPES } from '../util';

const ContextTags = ({
    selectedContext,
    setSelectedContext
}) => {
    return (
        <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
        }}>
            {selectedContext.map(key => {
                const contextType = CONTEXT_TYPES.find(t => t.key === key);
                return (
                    <Tag 
                        key={key}
                        closable
                        onClose={() => {
                            setSelectedContext(prev => 
                                prev.filter(k => k !== key)
                            );
                        }}
                        style={{
                            margin: 0,
                            background: '#e6f4ff',
                            borderColor: '#91caff'
                        }}
                    >
                        <Icon type={contextType.icon} /> {contextType.label}
                    </Tag>
                );
            })}
        </div>
    );
};

export default ContextTags; 