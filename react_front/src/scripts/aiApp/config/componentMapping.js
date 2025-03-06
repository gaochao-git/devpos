import GeneralAgent from '../agents/GeneralAgent';
import CodeAgent from '../agents/CodeAgent';
import DataAnalysisAgent from '../agents/kb_rag';
import ChatRca from '../agents/FaultAnalysisAgent';
import React from 'react';

// 导入图片
import generalIcon from '../../../images/AI.gif';  // 通用助手用 AI.gif
import rcaIcon from '../../../images/monitor.gif';  // 根因分析用 monitor.gif
import dbIcon from '../../../images/server.gif';  // 数据库选型用 server.gif
import sqlIcon from '../../../images/workflow.gif';  // SQL助手用 workflow.gif

// 智能体类型到组件的映射
export const agentComponentMap = {
    'general': {
        component: GeneralAgent,
        name: '通用助手',
        description: '可以回答各种常见问题',
        icon: <img src={generalIcon} alt="通用助手" style={{ width: '32px', height: '32px' }} />,
        color: '#bae7ff',
        systemPrompt: '你是一个通用AI助手，可以回答各种日常问题。',
        baseUrl: 'http://127.0.0.1',
        apiKey: 'Bearer app-s1LO3fgBHF0vJc0l9wbmutn8',
    },
    'data-analysis': {
        component: DataAnalysisAgent,
        name: '国产数据库选型助手',
        description: '帮助进行国产数据库选型。',
        icon: <img src={dbIcon} alt="数据库选型助手" style={{ width: '32px', height: '32px' }} />,
        color: '#efdbff',
        systemPrompt: '你是一个国产数据库选型专家，可以帮助进行国产数据库选型。',
        baseUrl: 'http://127.0.0.1',
        apiKey: 'Bearer app-WSI84Y94oECN4HgyzQ9X6Jzd',
    },
    'code': {
        component: CodeAgent,
        name: 'SQL助手',
        description: '专注于SQL相关问题',
        icon: <img src={sqlIcon} alt="SQL助手" style={{ width: '32px', height: '32px' }} />,
        color: '#bae7ff',
        systemPrompt: '你是一个专业的SQL助手，专注于提供SQL相关帮助和建议。',
        baseUrl: 'http://127.0.0.1',
        apiKey: 'Bearer app-BjIxnRtuOcpYYUQPBUlls7wT',
    },
    'rca': {
        component: ChatRca,
        name: '根因分析助手',
        description: '协助进行故障根因分析',
        icon: <img src={rcaIcon} alt="根因分析助手" style={{ width: '32px', height: '32px' }} />,
        color: '#ffd6e7',
        systemPrompt: '你是一个专业的故障分析专家，擅长进行根因分析。',
        baseUrl: 'http://127.0.0.1:5001',
        apiKey: 'Bearer app-rca-xxx',
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