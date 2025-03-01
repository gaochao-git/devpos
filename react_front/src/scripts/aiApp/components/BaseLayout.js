import React from 'react';
import { Icon, Tooltip, Input, Button, Upload, message } from 'antd';
import { SendIcon, UploadIcon, WebSearchIcon } from './BaseIcon';
const { TextArea } = Input;

// 基础Header组件
export class BaseChatHeader extends React.Component {
    static defaultProps = {
        iconBgColor: '#e6f4ff',
        iconColor: '#1890ff',
        description: ''
    };

    renderIcon() {
        const { icon, iconBgColor, iconColor } = this.props;
        
        return (
            <div style={{
                width: '36px',
                height: '36px',
                backgroundColor: iconBgColor,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {typeof icon === 'string' ? (
                    icon.startsWith('http') || icon.startsWith('/') ? (
                        <img 
                            src={icon} 
                            alt="Agent Icon" 
                            style={{
                                width: '24px',
                                height: '24px'
                            }}
                        />
                    ) : (
                        <Icon 
                            type={icon}
                            style={{
                                fontSize: '24px',
                                color: iconColor
                            }}
                        />
                    )
                ) : (
                    icon
                )}
            </div>
        );
    }

    renderTitleAndIcon() {
        const { title, description } = this.props;
        
        return (
            <Tooltip 
                title={description} 
                placement="right"
                mouseEnterDelay={0.5}
            >
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    cursor: description ? 'help' : 'default'
                }}>
                    {this.renderIcon()}
                    <span style={{
                        fontSize: '16px',
                        fontWeight: '500',
                        color: '#333'
                    }}>
                        {title}
                    </span>
                </div>
            </Tooltip>
        );
    }

    renderActions() {
        const { 
            onNewChat, 
            onViewHistory,
            isHistoryLoading,
            extraActions 
        } = this.props;
        
        return (
            <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '16px' 
            }}>
                {extraActions}
                <Tooltip title="新开会话">
                    <Icon 
                        type="plus-circle" 
                        style={{ 
                            fontSize: '18px',
                            cursor: 'pointer',
                            color: '#1890ff'
                        }}
                        onClick={onNewChat}
                    />
                </Tooltip>
                <Tooltip title="历史会话">
                    <Icon 
                        type={isHistoryLoading ? "loading" : "history"}
                        style={{ 
                            fontSize: '18px',
                            cursor: isHistoryLoading ? 'not-allowed' : 'pointer',
                            color: '#1890ff'
                        }}
                        onClick={!isHistoryLoading ? onViewHistory : undefined}
                    />
                </Tooltip>
            </div>
        );
    }

    render() {
        return (
            <div style={{
                padding: '12px 24px',
                borderBottom: '1px solid #e8e8e8',
                background: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '8px 8px 0 0',
                zIndex: 1000
            }}>
                {this.renderTitleAndIcon()}
                {this.renderActions()}
            </div>
        );
    }
}

// 基础Body组件
export class BaseChatBody extends React.Component {
    static defaultProps = {
        backgroundColor: '#f8fbff'
    };

    renderLeftPanel() {
        const { leftPanel } = this.props;
        
        if (!leftPanel) {
            return null;
        }

        return (
            <div style={{ 
                width: '30%', 
                marginRight: '5px',
                display: 'flex', 
                flexDirection: 'column',
                height: '100%',
                padding: '20px',
                borderRight: '1px solid #e8e8e8'
            }}>
                {leftPanel}
            </div>
        );
    }

    renderContent() {
        const { 
            children, 
            onScroll, 
            onMouseEnter, 
            onMouseLeave,
            backgroundColor 
        } = this.props;

        return (
            <div 
                style={{ 
                    flex: '1 1 auto',
                    marginBottom: '20px', 
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    backgroundColor,
                    overflow: 'auto',
                    padding: '20px'
                }}
                onScroll={onScroll}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {children}
            </div>
        );
    }

    render() {
        const { leftPanel } = this.props;
        
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                overflow: 'hidden'
            }}>
                {this.renderLeftPanel()}
                <div style={{ 
                    width: leftPanel ? '70%' : '100%', 
                    marginLeft: leftPanel ? '5px' : '0',
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100%',
                    padding: '20px'
                }}>
                    {this.renderContent()}
                </div>
            </div>
        );
    }
}

// 基础Footer组件
export class BaseChatFooter extends React.Component {
    render() {
        const { 
            value, 
            onChange, 
            onSend,
            onInterrupt,
            onFileSelect,
            isStreaming,
            placeholder,
            acceptedFileTypes = ".txt,.md,.pdf,.doc,.docx,.xlsx,.xls",
            onWebSearch,
            isWebSearchActive
        } = this.props;

        const hasContent = value && value.trim().length > 0;

        return (
            <div style={{ 
                padding: '20px',
                background: '#fff'
            }}>
                <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #d9d9d9',
                    borderRadius: '8px',
                    padding: '8px 11px'
                }}>
                    <TextArea
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        style={{ 
                            border: 'none',
                            boxShadow: 'none',
                            padding: '0',
                            resize: 'none',
                            marginBottom: '4px'
                        }}
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        onPressEnter={(e) => {
                            if (!e.shiftKey && hasContent) {
                                e.preventDefault();
                                if (isStreaming && onInterrupt) {
                                    onInterrupt();
                                } else if (!isStreaming && onSend) {
                                    onSend();
                                }
                            }
                        }}
                    />
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '8px'
                    }}>
                        <WebSearchIcon 
                            isActive={isWebSearchActive}
                            onClick={onWebSearch}
                        />
                        <div style={{
                            display: 'flex',
                            gap: '8px'
                        }}>
                            <UploadIcon 
                                onFileSelect={onFileSelect}
                                acceptedFileTypes={acceptedFileTypes}
                            />
                            <SendIcon 
                                isStreaming={isStreaming}
                                hasContent={hasContent}
                                onSend={onSend}
                                onInterrupt={onInterrupt}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

// 基础Layout组件
export class BaseLayout extends React.Component {
    render() {
        const { 
            headerProps,
            bodyProps,
            footerProps,
            containerStyle,
            contentStyle,
            HeaderComponent = BaseChatHeader,
            BodyComponent = BaseChatBody,
            FooterComponent = BaseChatFooter
        } = this.props;

        return (
            <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 128px)', 
                padding: '20px',
                background: '#f5f5f5',
                ...containerStyle
            }}>
                <div style={{
                    flex: 1,
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #e8e8e8',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    ...contentStyle
                }}>
                    <HeaderComponent {...headerProps} />
                    <BodyComponent {...bodyProps} />
                    <FooterComponent {...footerProps} />
                </div>
            </div>
        );
    }
}

export default BaseLayout; 