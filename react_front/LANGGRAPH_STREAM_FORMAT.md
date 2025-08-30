# LangGraph Stream API 输出格式详解

## 概述

LangGraph 使用 Server-Sent Events (SSE) 格式进行流式输出，每个事件包含以下字段：
- `id`: 事件序号
- `event`: 事件类型
- `data`: JSON 格式的事件数据

## Stream Modes

通过 `stream_mode` 参数控制流式输出的内容：

```json
{
  "stream_mode": ["messages-tuple", "values", "updates"]
}
```

## 事件类型详解

### 1. checkpoints 事件
包含会话的检查点信息：

```
id: 1
event: checkpoints
data: {
  "config": {
    "configurable": {
      "checkpoint_ns": "",
      "thread_id": "b4b22ff1-9bc6-4aa5-9ff1-802944a3a609",
      "selected_model": "deepseek-chat",
      "agent_id": "diagnostic_agent",
      "checkpoint_id": "1f085668-46bf-637a-bfff-e93739abf81e"
    }
  },
  "parent_config": null,
  "values": {"messages": []},
  "metadata": {"source": "input", "step": -1, "parents": {}},
  "next": ["__start__"],
  "tasks": [{
    "id": "edc07638-db1b-e10d-0eb6-25818f5d62d2",
    "name": "__start__",
    "interrupts": [],
    "state": null
  }]
}
```

### 2. values 事件
**重要**: 包含完整的消息历史，不仅仅是当前消息！

```
id: 2
event: values
data: {
  "messages": [
    {
      "content": "用户消息内容",
      "type": "human",
      "id": "925583b5-b791-4fe4-8914-ce515a4d4dc4"
    },
    {
      "content": "AI回复内容",
      "type": "ai",
      "tool_calls": [{
        "name": "tool_name",
        "args": {"param": "value"},
        "id": "call_id"
      }]
    },
    // 包含所有历史消息...
  ]
}
```

### 3. messages 事件 (messages-tuple 模式)
流式输出增量消息内容：

```
id: 13
event: messages
data: [
  {
    "content": "我来",  // 增量文本
    "type": "AIMessageChunk",
    "id": "run--130cf839-2ad8-44fb-a46d-aac86abc07f2",
    "tool_calls": [],
    "tool_call_chunks": []
  },
  {
    // 元数据
    "thread_id": "...",
    "selected_model": "deepseek-chat",
    "langgraph_step": 2,
    "langgraph_node": "agent"
  }
]
```

工具调用的流式输出：
```
event: messages
data: [{
  "content": "",
  "additional_kwargs": {
    "tool_calls": [{
      "index": 0,
      "id": "call_0_a1df75c6-ad70-4092-8ec2-89324b2f8903",
      "function": {
        "arguments": "{\"instance_name\": \"...\"}",
        "name": "get_all_table_names_and_comments"
      }
    }]
  },
  "tool_calls": [{
    "name": "get_all_table_names_and_comments",
    "args": {"instance_name": "..."},
    "id": "call_0_a1df75c6-ad70-4092-8ec2-89324b2f8903"
  }]
}]
```

### 4. updates 事件
节点状态更新：

```
id: 50
event: updates
data: {
  "agent": {
    "messages": [{
      "content": "我来帮您查询数据库中的表信息。",
      "tool_calls": [{
        "name": "get_all_table_names_and_comments",
        "args": {"instance_name": "..."},
        "id": "call_0_..."
      }]
    }]
  }
}
```

### 5. tasks 事件
任务执行信息：

```
id: 51
event: tasks
data: {
  "id": "fc6bb76d-96e9-66ad-9dd1-a9f34ba5fa5a",
  "name": "agent",
  "error": null,
  "result": [["messages", [...]]],
  "interrupts": []
}
```

## 关键问题

### 1. values 事件包含完整历史
`values` 事件会返回整个会话的消息历史，不仅仅是当前轮次的消息。这是导致"之前的工具调用出现在新消息中"的主要原因。

### 2. messages 事件是增量的
`messages` 事件通过 `AIMessageChunk` 类型增量输出内容，适合实时显示。

### 3. 工具调用的流式构建
工具调用信息可能分散在多个事件中：
- `messages` 事件中的 `tool_calls`
- `updates` 事件中的工具调用信息
- `values` 事件中的完整信息

## 建议

1. **主要依赖 messages 事件**：用于流式显示内容
2. **谨慎处理 values 事件**：需要过滤历史消息
3. **updates 事件用于状态更新**：可以获取工具执行结果
4. **避免重复处理**：同一信息可能在多个事件中出现

## 示例：正确处理流式输出

```javascript
// 只处理当前消息的内容
if (currentEvent === 'messages') {
  const [messageChunk, metadata] = currentData;
  if (messageChunk.type === 'AIMessageChunk') {
    // 处理增量内容
    assistantMessage += messageChunk.content;
    
    // 处理工具调用
    if (messageChunk.tool_calls) {
      // 更新工具调用信息
    }
  }
}

// 谨慎处理 values 事件
if (currentEvent === 'values') {
  // 可能包含历史消息，需要过滤
  // 或者完全跳过此事件
}
```