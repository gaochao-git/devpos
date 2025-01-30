import BaseAssistant from './BaseAssistant';
import { getStandardTime } from '../util';
import { message } from 'antd';
import { SSH_COMMANDS } from '../util';

class SSHAssistant extends BaseAssistant {
    constructor() {
        super({
            name: 'SSH助手',
            prefix: 'ssh> ',
            commands: SSH_COMMANDS,
            serverFormat: (ip) => ip
        });
    }

    // 重写执行命令方法
    async handleExecute({ assistantInputs, config, executingAssistants, executeCommand, setExecutingAssistants }) {
        const isExecuting = executingAssistants.has(this.name);
        const value = assistantInputs.get(this.name);
        
        if (isExecuting) {
            // 如果正在执行，则取消执行
            setExecutingAssistants(new Set());
            return;
        }

        if (!value) {
            message.warning('请选择要执行的命令');
            return;
        }
        if (!config?.ip) {
            message.warning('请先选择服务器');
            return;
        }

        try {
            // 设置执行状态
            setExecutingAssistants(new Set([this.name]));

            const params = {
                tool: 'ssh',
                address: config.ip,
                cmd: value
            };

            const response = await fetch('http://127.0.0.1:8002/execute/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });
            
            const data = await response.json();
            
            if (data.status === "ok") {
                const formattedCommand = `> @${this.name} ${config.ip} ${value}`;
                const formattedResult = `\`\`\`bash\n${data.data}\n\`\`\``;
                const formatMessage = `${formattedCommand}\n${formattedResult}`;
                
                executeCommand({
                    type: 'assistant',
                    content: formatMessage,
                    rawContent: data.data,
                    command: `@${this.name} ${config.ip} ${value}`,
                    timestamp: getStandardTime(),
                    status: 'ok'
                });
            } else {
                executeCommand({
                    type: 'assistant',
                    content: `执行失败: ${data.message || '未知错误'}`,
                    rawContent: data.message || '未知错误',
                    command: `@${this.name} ${config.ip} ${value}`,
                    timestamp: getStandardTime(),
                    isError: true,
                    status: 'error'
                });
            }
        } catch (error) {
            console.error('执行命令失败:', error);
            message.error(error.message || '执行命令失败');
            executeCommand({
                type: 'assistant',
                content: `执行失败: ${error.message || '未知错误'}`,
                rawContent: error.message || '未知错误',
                command: `@${this.name} ${config.ip} ${value}`,
                timestamp: getStandardTime(),
                isError: true,
                status: 'error'
            });
        } finally {
            // 清除执行状态
            setExecutingAssistants(new Set());
        }
    }
}

export default SSHAssistant; 