import { handleDifyStream } from './components/difyStreamHandler';

// Dify API 配置
const DIFY_API_BASE_URL = 'http://127.0.0.1/v1';
const DIFY_API_KEY = "Bearer app-s1LO3fgBHF0vJc0l9wbmutn8";

/**
 * 上传文件到 Dify
 * @param {File} file - 要上传的文件
 * @returns {Promise<Object>} 上传后的文件信息
 */
export const uploadFile = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user', 'system');

        const response = await fetch(`${DIFY_API_BASE_URL}/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': DIFY_API_KEY,
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
 * @param {Object} handlers - 处理函数集合
 * @param {Function} handlers.setMessages - 设置消息的函数
 * @param {Function} handlers.setIsStreaming - 设置流状态的函数
 * @param {Function} handlers.getStandardTime - 获取标准时间的函数
 * @returns {Promise<void>}
 */
export const sendMessageToAssistant = async (
    { query, files, conversationId, abortController },
    { setMessages, setIsStreaming, getStandardTime }
) => {
    try {
        const requestBody = {
            inputs: {},  // 添加空的 inputs 对象
            query,
            response_mode: 'streaming',
            conversation_id: conversationId,
            user: 'system',
            files: files  // 文件对象数组
        };

        const response = await fetch(`${DIFY_API_BASE_URL}/chat-messages`, {
            method: 'POST',
            headers: {
                'Authorization': DIFY_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: abortController?.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await handleDifyStream(response, { setMessages, setIsStreaming, getStandardTime });
    } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
    }
};

/**
 * 创建新的会话
 * @returns {Promise<string>} 返回会话ID
 */
export const createNewConversation = async () => {
    try {
        const response = await fetch(`${DIFY_API_BASE_URL}/chat-messages`, {
            method: 'POST',
            headers: {
                'Authorization': DIFY_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: {},
                query: "你好",
                response_mode: 'streaming',
                user: 'system'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let conversationId = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.trim() === '' || !line.startsWith('data: ')) continue;
                
                const jsonStr = line.replace('data: ', '');
                const data = JSON.parse(jsonStr);

                if (data.conversation_id) {
                    conversationId = data.conversation_id;
                    return conversationId;
                }
            }
        }

        if (!conversationId) {
            throw new Error('No conversation ID received');
        }

        return conversationId;
    } catch (error) {
        console.error('Failed to create new conversation:', error);
        throw error;
    }
};

/**
 * 重命名会话
 * @param {string} conversationId - 会话ID
 * @param {string} name - 新的会话名称
 * @returns {Promise<void>}
 */
export const renameConversation = async (conversationId, name) => {
    try {
        const response = await fetch(`${DIFY_API_BASE_URL}/conversations/${conversationId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
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