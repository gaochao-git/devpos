class AssistantRegistry {
    constructor() {
        this.assistants = new Map();
    }

    // 注册助手
    register(name, assistant) {
        if (this.assistants.has(name)) {
            console.warn(`Assistant ${name} already exists. It will be overwritten.`);
        }
        this.assistants.set(name, assistant);
    }

    // 获取助手实例
    getAssistant(name) {
        return this.assistants.get(name);
    }

    // 获取所有已注册的助手
    getAllAssistants() {
        return Array.from(this.assistants.entries()).map(([name, assistant]) => ({
            name,
            assistant
        }));
    }

    // 检查助手是否已注册
    hasAssistant(name) {
        return this.assistants.has(name);
    }
}

// 创建单例实例
const registry = new AssistantRegistry();
export default registry; 