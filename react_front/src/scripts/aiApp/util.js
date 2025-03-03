

/**
 * 格式化时间为标准格式
 * @param {number|string|Date} timestamp - 时间戳（秒或毫秒）、日期字符串或Date对象
 * @returns {string} - 格式化后的时间字符串 (YYYY-MM-DD HH:mm:ss.SSS)
 */
export const formatStandardTime = (timestamp) => {
    let date;
    
    if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'number') {
        // 检查是否为秒级时间戳（小于2000000000表示是秒级时间戳）
        date = timestamp < 2000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
    } else {
        // 尝试解析字符串或使用当前时间
        date = timestamp ? new Date(timestamp) : new Date();
    }
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
        date = new Date(); // 如果无效，使用当前时间
    }
    
    // 格式化为 YYYY-MM-DD HH:mm:ss.SSS
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};