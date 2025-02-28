import React from 'react';
import { Icon, Tooltip, Input, Button, Upload } from 'antd';
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
    static defaultProps = {
        placeholder: "请输入您的问题...",
        maxLength: 2000,
        rows: 3
    };

    constructor(props) {
        super(props);
        this.fileInputRef = React.createRef();
    }

    handleFileClick = () => {
        if (this.fileInputRef.current) {
            this.fileInputRef.current.click();
        }
    };

    renderTextArea() {
        const { 
            value, 
            onChange, 
            placeholder,
            maxLength,
            rows,
            disabled
        } = this.props;

        return (
            <TextArea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                maxLength={maxLength}
                rows={rows}
                disabled={disabled}
                style={{ resize: 'none' }}
            />
        );
    }

    renderFileUpload() {
        const { 
            onFileSelect,
            acceptedFileTypes = ".txt,.md,.pdf,.doc,.docx,.xlsx,.xls",
            disabled
        } = this.props;

        return (
            <React.Fragment>
                <input
                    type="file"
                    ref={this.fileInputRef}
                    style={{ display: 'none' }}
                    onChange={onFileSelect}
                    accept={acceptedFileTypes}
                    multiple
                />
                <Tooltip title="上传文件">
                    <Button
                        icon="upload"
                        onClick={this.handleFileClick}
                        disabled={disabled}
                    />
                </Tooltip>
            </React.Fragment>
        );
    }

    renderActions() {
        const { 
            onSend,
            onInterrupt,
            isStreaming,
            disabled
        } = this.props;

        return (
            <>
                {isStreaming ? (
                    <Tooltip title="中断生成">
                        <Button
                            type="primary"
                            danger
                            icon="stop"
                            onClick={onInterrupt}
                        />
                    </Tooltip>
                ) : (
                    <Tooltip title="发送消息">
                        <Button
                            type="primary"
                            icon="arrow-right"
                            onClick={onSend}
                            disabled={disabled}
                        />
                    </Tooltip>
                )}
            </>
        );
    }

    render() {
        return (
            <div style={{ 
                padding: '20px',
                borderTop: '1px solid #e8e8e8',
                background: '#fff'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {this.renderTextArea()}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        {this.renderFileUpload()}
                        {this.renderActions()}
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