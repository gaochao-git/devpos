import { handleDifyStream } from './components/difyStreamHandler';
import { agentComponentMap } from './config/componentMapping';

// Dify API 配置
const DIFY_API_BASE_URL = 'http://127.0.0.1/v1';
const DIFY_API_KEY = "Bearer app-s1LO3fgBHF0vJc0l9wbmutn8";

// 获取助手配置
const getAgentConfig = (agentType = 'general') => {
    const config = agentComponentMap[agentType] || agentComponentMap['general'];
    return {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey
    };
};

/**
 * 上传文件到 Dify
 * @param {File} file - 要上传的文件
 * @param {string} agentType - 助手类型
 * @returns {Promise<Object>} 上传后的文件信息
 */
const uploadFile = async (file, agentType) => {
    const { baseUrl, apiKey } = getAgentConfig(agentType);
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user', 'system');

        const response = await fetch(`${baseUrl}/v1/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to upload file:', error);
        throw error;
    }
};

/**
 * 发送消息到通用助手
 * @param {Object} params - 请求参数
 * @param {string} params.query - 用户输入的消息
 * @param {Object} params.files - 文件列表
 * @param {string} params.conversationId - 会话ID
 * @param {AbortController} params.abortController - 用于取消请求的控制器
 * @param {string} params.agentType - 助手类型
 * @param {Object} handlers - 处理函数集合
 * @param {Function} handlers.setMessages - 设置消息的函数
 * @param {Function} handlers.setIsStreaming - 设置流状态的函数
 * @param {Function} handlers.getStandardTime - 获取标准时间的函数
 * @param {Function} handlers.setTaskId - 设置任务ID的函数
 * @returns {Promise<void>}
 */
const sendMessageToAssistant = async (
    { query, files, conversationId, abortController, agentType },
    { setMessages, setIsStreaming, getStandardTime, setTaskId }
) => {
    const { baseUrl, apiKey } = getAgentConfig(agentType);
    try {
        const requestBody = {
            inputs: {},  // 添加空的 inputs 对象
            query,
            response_mode: 'streaming',
            conversation_id: conversationId,
            user: 'system',
            files: files  // 文件对象数组
        };

        const response = await fetch(`${baseUrl}/v1/chat-messages`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: abortController?.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await handleDifyStream(response, { 
            setMessages, 
            setIsStreaming, 
            getStandardTime,
            setTaskId  // 传递 setTaskId 函数
        });
    } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
    }
};

/**
 * 重命名会话
 * @param {string} conversationId - 会话ID
 * @param {string} name - 新的会话名称
 * @param {string} agentType - 助手类型
 * @returns {Promise<void>}
 */
const renameConversation = async (conversationId, name, agentType) => {
    const { baseUrl, apiKey } = getAgentConfig(agentType);
    try {
        const response = await fetch(`${baseUrl}/v1/conversations/${conversationId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to rename conversation:', error);
        throw error;
    }
};

/**
 * 获取会话消息列表
 * @param {string} conversationId - 会话ID
 * @param {string} agentType - 助手类型
 * @returns {Promise<Array>} 会话消息列表
 */
const getConversationMessages = async (conversationId, agentType) => {
    const { baseUrl, apiKey } = getAgentConfig(agentType);
    try {
        const response = await fetch(
            `${baseUrl}/v1/messages?user=system&conversation_id=${conversationId}`,
            {
                headers: {
                    'Authorization': apiKey
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('获取会话消息失败:', error);
        throw error;
    }
};

// 获取历史会话列表
const getHistoryConversations = async (agentType) => {
    const { baseUrl, apiKey } = getAgentConfig(agentType);
    try {
        const response = await fetch(`${baseUrl}/v1/conversations?user=system`, {
            headers: {
                'Authorization': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('获取历史会话列表失败:', error);
        throw error;
    }
};

// 获取历史消息详情
const getHistoryMessageDetail = async (conversationId, agentType) => {
    const { baseUrl, apiKey } = getAgentConfig(agentType);
    try {
        const response = await fetch(
            `${baseUrl}/v1/messages?user=system&conversation_id=${conversationId}`,
            {
                headers: {
                    'Authorization': apiKey
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('获取历史消息详情失败:', error);
        throw error;
    }
};

/**
 * 停止消息生成
 * @param {string} taskId - 任务ID
 * @param {string} agentType - 助手类型
 * @returns {Promise<Object>} 停止结果
 */
const stopMessageGeneration = async (taskId, agentType) => {
    const { baseUrl, apiKey } = getAgentConfig(agentType);
    try {
        const response = await fetch(`${baseUrl}/v1/chat-messages/${taskId}/stop`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user: 'system'  // 使用与其他请求一致的 user
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to stop message generation:', error);
        throw error;
    }
};

// 统一导出所有函数
export {
    uploadFile,
    sendMessageToAssistant,
    getHistoryConversations,
    getConversationMessages,
    getHistoryMessageDetail,
    renameConversation,
    getAgentConfig,
    stopMessageGeneration
}; 