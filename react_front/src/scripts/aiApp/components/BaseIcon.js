import React from 'react';
import { Icon, Tooltip, Upload } from 'antd';

// 发送/暂停按钮
export const SendIcon = ({ isStreaming, hasContent, onSend, onInterrupt }) => (
    <Icon 
        type={isStreaming ? "pause" : "arrow-up"}
        onClick={() => {
            if (isStreaming && onInterrupt) {
                onInterrupt();
            } else if (hasContent && !isStreaming && onSend) {
                onSend();
            }
        }}
        style={{ 
            fontSize: '18px',
            cursor: isStreaming ? 'pointer' : (hasContent ? 'pointer' : 'not-allowed'),
            color: hasContent || isStreaming ? '#1890ff' : '#00000040',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: hasContent || isStreaming ? '#bae0ff' : '#f5f5f5',
            borderRadius: '50%',
            transition: 'all 0.3s'
        }}
    />
);

// 上传文件按钮
export const UploadIcon = ({ onFileSelect, acceptedFileTypes }) => (
    <Upload
        beforeUpload={() => false}
        onChange={onFileSelect}
        accept={acceptedFileTypes}
        multiple
        showUploadList={false}
    >
        <Icon 
            type="upload"
            style={{ 
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                background: '#f5f5f5',
                borderRadius: '50%',
                transition: 'all 0.3s'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e8e8e8')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
        />
    </Upload>
);

// 联网搜索按钮
export const WebSearchIcon = ({ isActive, onClick }) => (
    <div 
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: isActive ? '#1890ff' : '#f5f5f5',
            padding: '4px 12px',
            borderRadius: '16px',
            color: isActive ? '#fff' : '#666',
            cursor: 'pointer',
            transition: 'all 0.2s'
        }}
        onMouseEnter={e => !isActive && (e.currentTarget.style.backgroundColor = '#e8e8e8')}
        onMouseLeave={e => !isActive && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
        onClick={onClick}
    >
        <Icon 
            type="global"
            style={{ 
                fontSize: '14px',
                color: isActive ? '#fff' : '#666'
            }}
        />
        联网搜索
    </div>
);

// 历史记录按钮
export const HistoryIcon = ({ isLoading, onClick }) => (
    <Tooltip title="历史会话">
        <Icon 
            type={isLoading ? "loading" : "history"}
            style={{ 
                fontSize: '18px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                color: '#1890ff'
            }}
            onClick={!isLoading ? onClick : undefined}
        />
    </Tooltip>
);

// 新建会话按钮
export const NewChatIcon = ({ onClick }) => (
    <Tooltip title="新开会话">
        <Icon 
            type="plus-circle" 
            style={{ 
                fontSize: '18px',
                cursor: 'pointer',
                color: '#1890ff'
            }}
            onClick={onClick}
        />
    </Tooltip>
);

// 添加文件图标函数
export const getFileIcon = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  switch (extension) {
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'txt':
      return '📃';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return '🖼️';
    default:
      return '📎';
  }
};
