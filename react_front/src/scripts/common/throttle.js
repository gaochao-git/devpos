/**
 * 节流函数 - 控制函数执行频率
 * @param {Function} func - 要节流的函数
 * @param {number} wait - 节流间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export const throttle = (func, wait) => {
  let timeout = null;
  let previous = 0;
  
  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - previous);
    
    const later = () => {
      previous = now;
      timeout = null;
      func.apply(this, args);
    };
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(later, remaining);
    }
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
        previous = 0;
      }
    };
  };
}; 