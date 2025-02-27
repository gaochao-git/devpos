import GeneralAgent from '../agents/GeneralAgent';
import CodeAgent from '../agents/CodeAgent';
import DataAnalysisAgent from '../agents/DataAnalysisAgent';
import CreativeAgent from '../agents/CreativeAgent';
import ChatRca from '../agents/FaultAnalysisAgent';

// 智能体类型到组件的映射
export const agentComponentMap = {
    'general': {
        component: GeneralAgent,
        name: '通用助手',
        description: '可以回答各种常见问题',
        icon: '🤖',
        color: '#4CAF50',
        systemPrompt: '你是一个通用AI助手，可以回答各种日常问题。',
        temperature: 0.7,
        model: 'gpt-3.5-turbo',
    },
    'rca': {
        component: ChatRca,
        name: '根因分析助手',
        description: '协助进行故障根因分析',
        icon: '🔍',
        color: '#E75B77',
        systemPrompt: '你是一个专业的故障分析专家，擅长进行根因分析。',
        temperature: 0.4,
        model: 'gpt-4',
    },
    'data-analysis': {
        component: DataAnalysisAgent,
        name: '国产数据库选型助手',
        description: '帮助进行国产数据库选型。',
        icon: '🗄️',
        color: '#9C27B0',
        systemPrompt: '你是一个国产数据库选型专家，可以帮助进行国产数据库选型。',
        temperature: 0.4,
        model: 'gpt-4',
    },
  'code': {
    component: CodeAgent,
    name: 'SQL助手',
    description: '专注于SQL相关问题',
    icon: '💻',
    color: '#2196F3',
    systemPrompt: '你是一个专业的SQL助手，专注于提供SQL相关帮助和建议。',
    temperature: 0.3,
    model: 'gpt-4',
  },
  'creative': {
    component: CreativeAgent,
    name: '创意助手',
    description: '帮助激发创意和头脑风暴',
    icon: '💡',
    color: '#FF9800',
    systemPrompt: '你是一个创意助手，善于头脑风暴和提供创新想法。',
    temperature: 0.9,
    model: 'gpt-3.5-turbo',
  },
  
};

// 获取所有智能体配置
export const getAgentConfigs = () => {
  return Object.entries(agentComponentMap).map(([id, config]) => ({
    id,
    ...config
  }));
};

// 获取对应的组件和配置
export const getAgentComponent = (type) => {
  const config = agentComponentMap[type];
  return config ? config.component : agentComponentMap['general'].component;
}; 