/**
 * 将 Dify 格式的思考内容转换为标准格式
 * @param {string} content - 原始消息内容
 * @returns {string} - 转换后的内容
 */
export const handler_dify_think = (content) => {
    if (!content) return content;
    
    // 检查是否已经是新格式
    if (content.includes('<details style="color:gray;background-color: #f8f8f8;padding: 8px;border-radius: 4px;" open>')) {
        return content;
    }
    
    // 处理老格式转换为新格式
    return content.replace(
        /<think>/g,
        '<details style="color:gray;background-color: #f8f8f8;padding: 8px;border-radius: 4px;" open><summary>Thinking...</summary>'
    ).replace(
        /<\/think>/g,
        '</details>'
    ).trim();
};