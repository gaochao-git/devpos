import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Button, message, Select, Tooltip, Tag, Popover, Checkbox, Modal, Divider, Radio, DatePicker } from 'antd';
import { Icon } from 'antd';
import ReactMarkdown from 'react-markdown';
import MyAxios from "../common/interface"
import ZabbixChart from './ZabbixChart';
import HistoryConversationModal from './historyConversation';
import ElasticsearchAssistant from './ElasticsearchAssistant';
import {
    DIFY_BASE_URL,
    DIFY_API_KEY,
    DIFY_CHAT_URL,
    DIFY_CONVERSATIONS_URL,
    COMMAND_EXECUTE_URL,
    markdownRenderers,
    CONTEXT_TYPES,
    DEFAULT_ASSISTANTS,
    extractServersFromTree,
    getStandardTime,
    SSH_COMMANDS,
    MYSQL_COMMANDS,
    ES_MOCK_INDICES,
    ES_MOCK_FIELDS,
    ES_OPERATORS,
    ES_QUERY_TEMPLATES
} from './util';
import moment from 'moment';

// 解构 DatePicker 中的 RangePicker
const { RangePicker } = DatePicker;

// 添加常量配置
const MESSAGE_DISPLAY_THRESHOLD = 500;

// ... rest of the existing code, but without the ElasticsearchAssistant component definition ... 