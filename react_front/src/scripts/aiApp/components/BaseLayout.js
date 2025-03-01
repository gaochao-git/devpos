import React from 'react';
import { Icon, Tooltip, Input, Button, Upload, message } from 'antd';
import { SendIcon, UploadIcon, WebSearchIcon } from './BaseIcon';
import { uploadFile } from '../aIAssistantApi';
import styled from 'styled-components';
import MarkdownRenderer from './MarkdownRenderer';
const { TextArea } = Input;

// 添加消息容器样式
const MessageContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: ${props => props.isUser ? 'flex-end' : 'flex-start'};
    margin: 4px 0;
`;

const MessageBubble = styled.div`
    max-width: 70%;
    padding: 12px 16px;
    border-radius: 12px;
    background-color: ${props => props.isUser ? '#95EC69' : '#fff'};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const Timestamp = styled.div`
    font-size: 12px;
    color: #666;
    margin: ${props => props.isUser ? '4px 8px 0 0' : '4px 0 0 8px'};
`;

// 添加消息组件
export const ChatMessage = React.memo(({ message, isStreaming }) => {
    const isUser = message.role === 'user';
    
    return (
        <MessageContainer isUser={isUser}>
            <MessageBubble isUser={isUser}>
                {isUser ? (
                    <div>{message.content}</div>
                ) : (
                    <MarkdownRenderer 
                        content={message.content}
                        isStreaming={isStreaming}
                    />
                )}
            </MessageBubble>
            <Timestamp isUser={isUser}>
                {message.time}
            </Timestamp>
        </MessageContainer>
    );
});

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
    constructor(props) {
        super(props);
        this.state = {
            files: [],
            fileStatuses: {},
            uploadedFileIds: []
        };
        this.fileInputRef = React.createRef();
    }

    handleFileUpload = async (info) => {
        const { file } = info;
        const newFiles = [file];
        
        // 更新文件列表和状态
        this.setState(prevState => ({
            files: [...prevState.files, ...newFiles]
        }));
        
        newFiles.forEach(file => {
            this.setState(prevState => ({
                fileStatuses: {
                    ...prevState.fileStatuses,
                    [file.name]: { status: 'uploading', id: null }
                }
            }));
        });

        // 立即上传文件
        for (const file of newFiles) {
            try {
                const uploadResult = await uploadFile(file);
                this.setState(prevState => ({
                    fileStatuses: {
                        ...prevState.fileStatuses,
                        [file.name]: { status: 'ready', id: uploadResult.id }
                    },
                    uploadedFileIds: [...prevState.uploadedFileIds, uploadResult.id]
                }));
            } catch (error) {
                console.error('文件上传失败:', error);
                this.setState(prevState => ({
                    fileStatuses: {
                        ...prevState.fileStatuses,
                        [file.name]: { status: 'error', error: '上传失败' }
                    }
                }));
            }
        }

        // 通知父组件文件状态变化
        if (this.props.onFilesChange) {
            this.props.onFilesChange(this.state.files, this.state.uploadedFileIds);
        }
    };

    removeFile = (fileToRemove) => {
        this.setState(prevState => {
            const newFiles = prevState.files.filter(file => file !== fileToRemove);
            const newFileStatuses = { ...prevState.fileStatuses };
            delete newFileStatuses[fileToRemove.name];
            
            const fileStatus = prevState.fileStatuses[fileToRemove.name];
            const newUploadedFileIds = fileStatus?.id 
                ? prevState.uploadedFileIds.filter(id => id !== fileStatus.id)
                : prevState.uploadedFileIds;

            // 通知父组件文件状态变化
            if (this.props.onFilesChange) {
                this.props.onFilesChange(newFiles, newUploadedFileIds);
            }

            return {
                files: newFiles,
                fileStatuses: newFileStatuses,
                uploadedFileIds: newUploadedFileIds
            };
        });
    };

    getFileIcon = (file) => {
        const extension = file.name.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf': return '📄';
            case 'doc':
            case 'docx': return '📝';
            case 'txt': return '📃';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif': return '🖼️';
            default: return '📎';
        }
    };

    render() {
        const { 
            value, 
            onChange, 
            onSend,
            onInterrupt,
            isStreaming,
            placeholder,
            acceptedFileTypes = ".txt,.md,.pdf,.doc,.docx,.xlsx,.xls",
            onWebSearch,
            isWebSearchActive
        } = this.props;

        const { files, fileStatuses } = this.state;
        const hasContent = value?.trim().length > 0 || files.length > 0;

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
                    {/* 文件预览区域 */}
                    {files.length > 0 && (
                        <div style={{
                            padding: '8px',
                            marginBottom: '8px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}>
                            {files.map((file, index) => (
                                <Tooltip 
                                    key={index}
                                    title={`${file.name} (${(file.size / 1024).toFixed(1)}KB)`}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 8px',
                                        background: '#fff',
                                        borderRadius: '4px',
                                        border: '1px solid #d9d9d9',
                                        maxWidth: '150px'
                                    }}>
                                        {this.getFileIcon(file)}
                                        <span style={{ 
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {file.name}
                                        </span>
                                        {fileStatuses[file.name]?.status === 'uploading' && (
                                            <span style={{ color: '#1890ff' }}>上传中...</span>
                                        )}
                                        <Icon 
                                            type="close" 
                                            onClick={() => this.removeFile(file)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </div>
                                </Tooltip>
                            ))}
                        </div>
                    )}

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
                                onSend();
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
                                onFileSelect={this.handleFileUpload}
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