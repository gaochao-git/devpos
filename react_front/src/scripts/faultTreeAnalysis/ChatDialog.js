import React from 'react';
import { Input, Button, Icon, Modal } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 定义 Markdown 渲染器配置
const markdownRenderers = {
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={nightOwl}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }
};

// 定义助手配置
const DEFAULT_ASSISTANTS = [
  {
    id: 'ssh',
    name: 'SSH助手',
    description: '执行SSH连接、权限配置、日志查看等操作',
    mode: 'ssh_assistant',
    examples: [
      '@SSH助手 连接到 192.168.1.100',
      '@SSH助手 查看 /var/log/mysql/error.log',
      '@SSH助手 检查 mysql 进程状态'
    ],
    commands: {
      connect: 'ssh {username}@{host}',
      checkLogs: 'tail -f {logPath}',
      checkProcess: 'ps -ef | grep {processName}',
      checkPermission: 'ls -l {path}'
    }
  },
  {
    id: 'mysql',
    name: 'MySQL助手',
    description: '执行MySQL连接、状态查看、性能分析等操作',
    mode: 'mysql_assistant',
    examples: [
      '@MySQL助手 查看当前连接数',
      '@MySQL助手 检查慢查询日志',
      '@MySQL助手 显示主从状态'
    ],
    commands: {
      showProcesslist: 'show processlist',
      showSlaveStatus: 'show slave status\\G',
      showVariables: 'show variables like "{pattern}"',
      showStatus: 'show status like "{pattern}"'
    }
  },
  {
    id: 'zabbix',
    name: 'Zabbix助手',
    description: '查看监控数据、告警信息、性能图表等',
    mode: 'zabbix_assistant',
    examples: [
      '@Zabbix助手 显示最近告警',
      '@Zabbix助手 查看主机 CPU 使用率',
      '@Zabbix助手 检查磁盘空间'
    ],
    features: {
      alerts: '查看最近告警信息',
      metrics: '查看性能指标数据',
      graphs: '显示性能趋势图表',
      hosts: '管理监控主机配置'
    }
  },
  {
    id: 'diagnostic',
    name: '诊断助手',
    description: '系统诊断、性能分析、故障排查等',
    mode: 'diagnostic_assistant',
    examples: [
      '@诊断助手 分析系统负载高的原因',
      '@诊断助手 检查网络连接状态',
      '@诊断助手 诊断数据库性能问题'
    ],
    tools: {
      top: '系统资源使用情况',
      netstat: '网络连接状态',
      iostat: '磁盘IO性能',
      vmstat: '虚拟内存统计'
    }
  }
];

// 单条消息组件
const ChatMessage = ({ message }) => {
  if (!message) return null;  // 添加空值检查

  return (
    <div style={{
      background: message.type === 'user' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.1)',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '8px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px' 
      }}>
        <div style={{ fontWeight: 'bold' }}>
          {message.type === 'user' ? '用户提问' : '系统回答'}
          {message.assistant && ` (@${message.assistant})`}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.7 }}>
          {message.timestamp}
        </div>
      </div>
      {message.type === 'user' ? (
        <Input.TextArea
          value={message.content}
          autoSize={{ minRows: 2 }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '14px',
            lineHeight: '1.6',
            padding: '0',
            resize: 'none'
          }}
          readOnly
        />
      ) : (
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <ReactMarkdown components={markdownRenderers}>
            {message.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

// 完整的对话组件
const ChatDialog = ({ 
  messages = [], 
  streamContent = '', 
  isStreaming = false,
  inputValue = '',
  onInputChange,
  onSendMessage,
  style,
  className
}) => {
  // 内部状态管理
  const [selectedAssistant, setSelectedAssistant] = React.useState(null);
  const [atPosition, setAtPosition] = React.useState(null);
  const [filteredAssistants, setFilteredAssistants] = React.useState(DEFAULT_ASSISTANTS);
  const [assistantResult, setAssistantResult] = React.useState(null);
  const [isResultModalVisible, setIsResultModalVisible] = React.useState(false);

  // 处理输入变化
  const handleInputChange = (e) => {
    const value = e.target.value;
    
    const lastAtPos = value.lastIndexOf('@');
    if (lastAtPos !== -1) {
      const searchText = value.slice(lastAtPos + 1).toLowerCase();
      setAtPosition(lastAtPos);
      
      // 过滤助手列表
      const filtered = DEFAULT_ASSISTANTS.filter(assistant => 
        assistant.name.toLowerCase().includes(searchText) ||
        assistant.description.toLowerCase().includes(searchText)
      );
      setFilteredAssistants(filtered);
    } else {
      setAtPosition(null);
      setFilteredAssistants(DEFAULT_ASSISTANTS);
    }

    // 调用父组件的 onChange
    onInputChange(e);
  };

  // 处理助手选择
  const handleAssistantSelect = (assistant, command) => {
    if (!assistant) {
      setAtPosition(null);
      return;
    }
    
    setSelectedAssistant(assistant);
    setAtPosition(null);
    
    // 使用 onInputChange 更新输入值
    if (command) {
      onInputChange({ 
        target: { 
          value: `@${assistant.name} ${command.command} `
        } 
      });
    } else {
      onInputChange({ 
        target: { 
          value: `@${assistant.name} `
        } 
      });
    }
  };

  // 模拟API调用
  const mockExecuteCommand = async (assistant, command) => {
    // 模拟API响应
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          result: "Filesystem      Size  Used Avail Use% Mounted on\n" +
                 "/dev/vda1        40G   23G   15G  61% /\n" +
                 "tmpfs           7.8G     0  7.8G   0% /dev/shm",
          command: command,
          host: "47.95.3.120"
        });
      }, 1000);
    });
  };

  // 处理助手命令执行
  const handleAssistantCommand = async (assistant, command) => {
    try {
      const result = await mockExecuteCommand(assistant, command);
      
      if (result.success) {
        setAssistantResult({
          content: result.result,
          command: command,
          assistant: assistant
        });
        setIsResultModalVisible(true);  // 显示弹窗
      }
    } catch (error) {
      console.error('执行助手命令失败:', error);
    }
  };

  // 处理结果确认
  const handleConfirmResult = () => {
    if (assistantResult) {
      onInputChange({
        target: {
          value: assistantResult.content
        }
      });
      setIsResultModalVisible(false);
      setAssistantResult(null);
    }
  };

  // 修改发送消息处理
  const handleSendMessage = () => {
    if (!inputValue.trim() || isStreaming) return;
    
    // 检查是否是助手命令
    const assistantMatch = inputValue.match(/@(\w+)助手\s+(.*)/);
    if (assistantMatch) {
      const [_, assistantName, command] = assistantMatch;
      handleAssistantCommand(assistantName.toLowerCase(), command);
      return;
    }
    
    onSendMessage();
    setSelectedAssistant(null);
  };

  return (
    <>
      <div 
        className={className} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '20px',
          height: '100%',
          width: '100%',
          ...style
        }}
      >
        {/* 对话历史区域 */}
        <div style={{
          flex: 1,
          minHeight: 0,
          background: 'rgba(255,255,255,0.1)',
          padding: '20px',
          borderRadius: '8px',
          overflowY: 'auto',
          border: '3px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} />
            ))}
            
            {isStreaming && streamContent && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '12px',
                borderRadius: '8px'
              }}>
                <ReactMarkdown components={markdownRenderers}>
                  {streamContent}
                </ReactMarkdown>
                <span className="loading-dots">...</span>
              </div>
            )}
          </div>
        </div>

        {/* 输入区域 */}
        <div style={{ 
          display: 'flex',
          width: '100%',
          position: 'relative',
          flexShrink: 0
        }}>
          {/* 助手选择器 */}
          {atPosition !== null && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              width: '320px',
              background: '#1e40af',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              padding: '8px',
              marginBottom: '8px',
              zIndex: 1000,
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {filteredAssistants.map(assistant => (
                <div
                  key={assistant.id}
                  onClick={() => handleAssistantSelect(assistant)}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                    {assistant.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                    {assistant.description}
                  </div>
                  {assistant.quickCommands && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                        快捷命令:
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {assistant.quickCommands.map((cmd, index) => (
                          <div
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssistantSelect(assistant, cmd);
                            }}
                            style={{
                              fontSize: '12px',
                              padding: '4px 8px',
                              background: 'rgba(255, 255, 255, 0.15)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: 'white'
                            }}
                            title={cmd.description}
                          >
                            {cmd.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    示例: {assistant.examples[0]}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Input.TextArea
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && atPosition !== null) {
                setAtPosition(null);
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="输入你的问题... 按 @ 键选择专业助手"
            disabled={isStreaming}
            autoSize={{ minRows: 2, maxRows: 6 }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px 0 0 8px',
              color: 'white',
              fontSize: '14px',
              padding: '8px 12px',
              flex: 1,
            }}
          />

          <Button
            type="primary"
            onClick={handleSendMessage}
            disabled={isStreaming || !inputValue.trim()}
            style={{
              height: 'auto',
              borderRadius: '0 8px 8px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 24px',
              background: isStreaming ? '#1d4ed8' : '#2563eb',
              borderColor: isStreaming ? '#1d4ed8' : '#2563eb',
            }}
          >
            {isStreaming ? (
              <>
                发送中
                <span className="loading-dots">...</span>
              </>
            ) : (
              <Icon type="enter" />
            )}
          </Button>
        </div>
      </div>

      {/* 添加助手结果弹窗 */}
      <Modal
        title={`${assistantResult?.assistant}助手执行结果`}
        visible={isResultModalVisible}
        onCancel={() => setIsResultModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsResultModalVisible(false)}>
            取消
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmResult}>
            确认使用
          </Button>
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <strong>执行命令：</strong>
          <span style={{ marginLeft: '8px', opacity: 0.7 }}>
            {assistantResult?.command}
          </span>
        </div>
        <pre style={{ 
          background: 'rgba(0,0,0,0.05)',
          padding: '12px',
          borderRadius: '4px',
          maxHeight: '400px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {assistantResult?.content}
        </pre>
      </Modal>
    </>
  );
};

export default ChatDialog;
