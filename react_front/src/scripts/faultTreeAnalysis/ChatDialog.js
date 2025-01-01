import React from 'react';
import { Input, Button, Icon, Modal } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 添加 mock 模式常量
const USE_MOCK = false;  // 设置为 true 使用模拟数据，false 使用真实 API

// 在文件开头添加快速选择配置
const QUICK_SELECT_CONFIG = {
  servers: [
    { ip: '192.168.1.100', name: 'DB-Master' },
    { ip: '192.168.1.101', name: 'DB-Slave1' },
    { ip: '192.168.1.102', name: 'DB-Slave2' },
    { ip: '192.168.1.103', name: 'Proxy1' },
    { ip: '192.168.1.104', name: 'Proxy2' },
  ],
  commands: {
    ssh: [
      { cmd: 'ls -l', desc: '列出文件' },
      { cmd: 'df -h', desc: '查看磁盘空间' },
      { cmd: 'free -m', desc: '查看内存使用' },
      { cmd: 'top', desc: '查看系统负载' },
    ],
    mysql: [
      { cmd: 'show processlist', desc: '查看连接状态' },
      { cmd: 'show slave status\\G', desc: '查看从库状态' },
      { cmd: 'show master status\\G', desc: '查看主库状态' },
    ],
  }
};

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
  const [quickSelectMode, setQuickSelectMode] = React.useState(null);
  const [quickSelectItems, setQuickSelectItems] = React.useState([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [searchText, setSearchText] = React.useState('');

  // 添加过滤函数
  const getFilteredItems = React.useCallback(() => {
    if (!searchText) return quickSelectItems;
    
    const search = searchText.toLowerCase();
    return quickSelectItems.filter(item => {
      if (quickSelectMode === 'server') {
        return item.name.toLowerCase().includes(search) || 
               item.ip.toLowerCase().includes(search);
      } else {
        return item.cmd.toLowerCase().includes(search) || 
               item.desc.toLowerCase().includes(search);
      }
    });
  }, [quickSelectItems, quickSelectMode, searchText]);

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

  // 修改发送消息处理
  const handleSendMessage = () => {
    if (!inputValue.trim() || isStreaming) return;
    
    // 检查是否是助手命令
    if (inputValue.includes('@') && inputValue.includes('助手')) {
      executeCommand(inputValue);
      return;
    }
    
    onSendMessage();
    setSelectedAssistant(null);
  };

  // 实际的API调用
  const executeCommand = async (command) => {
    if (USE_MOCK) {
      // 使用模拟数据
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = {
            success: true,
            result: "模拟执行结果:\n" +
                   "Command: " + command + "\n" +
                   "Time: " + new Date().toISOString()
          };
          
          setAssistantResult({
            content: result.result,
            command: command,
            assistant: '助手'
          });
          setIsResultModalVisible(true);
          
          resolve(result);
        }, 1000);
      });
    }

    try {
      const requestBody = {
        command: command
      };

      const response = await fetch('http://localhost:8001/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      if (!response.ok) {
        Modal.error({
          title: '执行失败',
          content: responseData.detail || '未知错误'
        });
        return;
      }

      if (responseData.success) {
        // 将结果格式化为 Markdown 代码块
        const formattedResult = `\`\`\`bash\n${responseData.result}\n\`\`\``;
        setAssistantResult({
          content: formattedResult,
          command: command,
          assistant: '助手'
        });
        setIsResultModalVisible(true);
      } else {
        Modal.error({
          title: '执行失败',
          content: responseData.result || '未知错误'
        });
      }
      
      return responseData;

    } catch (error) {
      console.error('执行命令失败:', error);
      Modal.error({
        title: '执行失败',
        content: '连接服务器失败，请检查网络连接'
      });
      return {
        success: false,
        result: error.message
      };
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

  // 修改 handleKeyDown 函数
  const handleKeyDown = React.useCallback((e) => {
    console.log('Key pressed:', e.key); // 调试日志
    
    if (e.key === 'Tab') {
      e.preventDefault(); // 阻止默认的 Tab 行为
      
      // 检查是否已经选择了助手
      const hasSelectedAssistant = inputValue.includes('@') && 
        (inputValue.toLowerCase().includes('@ssh') || 
         inputValue.toLowerCase().includes('@mysql'));

      if (!hasSelectedAssistant) {
        return; // 如果没有选择助手，不显示服务器列表
      }
      
      if (!quickSelectMode) {
        console.log('Activating server mode'); // 调试日志
        setQuickSelectMode('server');
        setQuickSelectItems(QUICK_SELECT_CONFIG.servers);
        setSelectedIndex(0);
      } else if (quickSelectMode === 'server') {
        // 根据输入内容判断当前助手类型
        let assistantType = 'ssh'; // 默认为 ssh
        if (inputValue.toLowerCase().includes('@mysql')) {
          assistantType = 'mysql';
        }
        
        const commands = QUICK_SELECT_CONFIG.commands[assistantType];
        if (commands) {
          console.log('Activating command mode'); // 调试日志
          setQuickSelectMode('command');
          setQuickSelectItems(commands);
          setSelectedIndex(0);
        }
      } else if (quickSelectMode === 'command') {
        // 从命令模式返回到服务器模式
        console.log('Back to server mode'); // 调试日志
        setQuickSelectMode('server');
        setQuickSelectItems(QUICK_SELECT_CONFIG.servers);
        setSelectedIndex(0);
      }
    } else if (e.key === '@') {
      // 显示助手选择
      const atPosition = e.target.selectionStart;
      setAtPosition(atPosition);
      setFilteredAssistants(DEFAULT_ASSISTANTS);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      if (quickSelectMode) {
        e.preventDefault();
        const selected = quickSelectItems[selectedIndex];
        if (quickSelectMode === 'server') {
          // 在当前光标位置插入服务器 IP
          const cursorPosition = e.target.selectionStart;
          const textBeforeCursor = inputValue.slice(0, cursorPosition);
          const textAfterCursor = inputValue.slice(cursorPosition);
          const newValue = textBeforeCursor + selected.ip + textAfterCursor;
          onInputChange({ target: { value: newValue } });
        } else {
          const newValue = `${inputValue} ${selected.cmd}`;
          onInputChange({ target: { value: newValue } });
        }
        setQuickSelectMode(null);
        setQuickSelectItems([]);
      } else if (!isStreaming) {
        e.preventDefault();
        handleSendMessage();
      }
    } else if (e.key === 'ArrowUp' && quickSelectMode) {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : quickSelectItems.length - 1));
    } else if (e.key === 'ArrowDown' && quickSelectMode) {
      e.preventDefault();
      setSelectedIndex(prev => (prev < quickSelectItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'Escape' && quickSelectMode) {
      e.preventDefault();
      setQuickSelectMode(null);
      setQuickSelectItems([]);
    }
  }, [quickSelectMode, quickSelectItems, selectedIndex, inputValue, isStreaming]);

  // 添加点击外部关闭弹窗的处理函数
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      // 检查点击是否在弹窗外部
      const dropdown = document.querySelector('.quick-select-dropdown');
      if (dropdown && !dropdown.contains(event.target) && 
          !event.target.closest('textarea')) {
        setQuickSelectMode(null);
        setQuickSelectItems([]);
      }
    };

    // 添加全局点击事件监听
    document.addEventListener('mousedown', handleClickOutside);

    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
          {/* 助手选择弹窗 */}
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
              {filteredAssistants.map((assistant, index) => (
                <div
                  key={assistant.id}
                  onClick={() => handleAssistantSelect(assistant)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    background: 'transparent',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: 'white' }}>{assistant.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {assistant.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 快速选择下拉框 */}
          {quickSelectMode && (
            <div 
              className="quick-select-dropdown"
              style={{
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
              }}
            >
              {/* 添加搜索输入框 */}
              <div style={{ marginBottom: '8px', padding: '0 4px' }}>
                <Input
                  placeholder={quickSelectMode === 'server' ? "搜索服务器..." : "搜索命令..."}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white',
                  }}
                  onKeyDown={(e) => {
                    // 防止 Tab 键关闭弹窗
                    if (e.key === 'Tab') {
                      e.stopPropagation();
                    }
                  }}
                  autoFocus  // 自动聚焦搜索框
                />
              </div>

              {/* 显示过滤后的列表 */}
              {getFilteredItems().map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (quickSelectMode === 'server') {
                      const cursorPosition = document.querySelector('textarea').selectionStart;
                      const textBeforeCursor = inputValue.slice(0, cursorPosition);
                      const textAfterCursor = inputValue.slice(cursorPosition);
                      const newValue = textBeforeCursor + item.ip + textAfterCursor;
                      onInputChange({ target: { value: newValue } });
                    } else {
                      const newValue = `${inputValue} ${item.cmd}`;
                      onInputChange({ target: { value: newValue } });
                    }
                    setQuickSelectMode(null);
                    setQuickSelectItems([]);
                    setSearchText('');  // 清空搜索文本
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    background: index === selectedIndex ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    const element = e.currentTarget;
                    element.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    const element = e.currentTarget;
                    element.style.background = index === selectedIndex ? 
                      'rgba(255, 255, 255, 0.2)' : 
                      'transparent';
                  }}
                >
                  {quickSelectMode === 'server' ? (
                    <>
                      <div style={{ fontWeight: 'bold', color: 'white' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>{item.ip}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 'bold', color: 'white' }}>{item.cmd}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>{item.desc}</div>
                    </>
                  )}
                </div>
              ))}
              
              {/* 显示无结果提示 */}
              {getFilteredItems().length === 0 && (
                <div style={{ 
                  padding: '8px 12px', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center' 
                }}>
                  未找到匹配结果
                </div>
              )}
            </div>
          )}

          <Input.TextArea
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题... 按 @ 键选择专业助手，按 Tab 键快速选择服务器"
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
        <div style={{ 
          background: 'rgba(0,0,0,0.05)',
          borderRadius: '4px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <ReactMarkdown components={markdownRenderers}>
            {assistantResult?.content || ''}
          </ReactMarkdown>
        </div>
      </Modal>
    </>
  );
};

export default ChatDialog;
