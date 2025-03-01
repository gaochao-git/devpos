/**
 * 处理 Dify 返回的流数据
 * @param {Response} response - fetch 返回的 Response 对象
 * @param {Object} options - 配置选项
 * @param {Function} options.setMessages - 设置消息的函数
 * @param {Function} options.setIsStreaming - 设置流状态的函数
 * @param {Function} options.getStandardTime - 获取标准时间的函数
 * @param {Function} options.setTaskId - 设置任务 ID 的函数
 * @param {Function} options.setConversationId - 设置会话 ID 的函数
 * @returns {Promise<void>}
 */
export const handleDifyStream = async (response, { setMessages, setIsStreaming, getStandardTime, setTaskId, setConversationId }) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let lastUpdateTime = Date.now();
    let taskId = null;
    let conversationId = null;
    const UPDATE_INTERVAL = 150;
    
    // 添加新消息，标记为当前消息
    setMessages(prev => {
        const updatedMessages = prev.map(msg => ({
            ...msg,
            isCurrentMessage: false
        }));
        
        return [...updatedMessages, {
            type: 'llm',
            content: '',
            timestamp: getStandardTime(),
            isCurrentMessage: true
        }];
    });

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '' || !line.startsWith('data: ')) continue;

                try {
                    const jsonStr = line.slice(6);
                    const data = JSON.parse(jsonStr);
                    
                    // 处理会话ID
                    if (!conversationId && data.conversation_id) {
                        setConversationId(data.conversation_id);
                    }

                    // 从消息体中获取 task_id
                    if (!taskId && data.task_id) {
                        console.log('Task ID from message:', data.task_id);
                        setTaskId(data.task_id);
                    }

                    // 同时判断状态和错误信息
                    if (data.data?.status === 'stopped' && data.data?.error) {
                        fullContent += `\n\n_${data.data.error}_`;
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMessage = newMessages[newMessages.length - 1];
                            newMessages[newMessages.length - 1] = {
                                ...lastMessage,
                                content: fullContent,
                                isCurrentMessage: true,
                                timestamp: getStandardTime()
                            };
                            return newMessages;
                        });
                        setIsStreaming(false);
                        return;
                    }

                    // 处理错误事件
                    if (data.event === 'error') {
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMessage = newMessages[newMessages.length - 1];
                            newMessages[newMessages.length - 1] = {
                                ...lastMessage,
                                content: data.message,
                                isError: true,
                                isCurrentMessage: false
                            };
                            return newMessages;
                        });
                        setIsStreaming(false);
                        return;
                    }

                    // 处理结束事件
                    if (data.event === 'message_end') {
                        // 确保我们有完整的元数据
                        const metadata = data.metadata || {};
                        
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMessage = newMessages[newMessages.length - 1];
                            newMessages[newMessages.length - 1] = {
                                ...lastMessage,
                                content: fullContent,
                                metadata: metadata,
                                isCurrentMessage: false
                            };
                            return newMessages;
                        });
                        
                        // 延迟一点再结束流处理，确保所有数据都被处理
                        setTimeout(() => {
                            setIsStreaming(false);
                        }, 100);
                        
                        continue;
                    }

                    // 处理 agent_thought 事件
                    if (data.event === 'agent_thought') {
                        if (data.tool && data.tool_input && data.observation) {
                            const toolInput = data.tool_input;
                            const toolContent = `<tool>${data.tool}\n${toolInput}\n${data.observation}\n${data.position}</tool>\n\n`;
                            fullContent += toolContent;
                        }
                    } else {
                        // 处理普通回答
                        if (data.answer) {
                            fullContent += data.answer;
                        }
                    }

                    const currentTime = Date.now();
                    if (currentTime - lastUpdateTime > UPDATE_INTERVAL) {
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMessage = newMessages[newMessages.length - 1];
                            newMessages[newMessages.length - 1] = {
                                ...lastMessage,
                                content: fullContent,
                                isCurrentMessage: true
                            };
                            return newMessages;
                        });
                        lastUpdateTime = currentTime;
                    }
                } catch (e) {
                    console.warn('JSON parse error:', e);
                }
            }
        }

        // 在正常结束时也更新时间戳
        setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            newMessages[newMessages.length - 1] = {
                ...lastMessage,
                content: fullContent,
                isCurrentMessage: true,
                timestamp: getStandardTime()
            };
            return newMessages;
        });
        setIsStreaming(false);

    } catch (error) {
        console.error('Stream processing error:', error);
        throw error;
    }
};