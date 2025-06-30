#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
create_function_design_docs.py
为每个核心模块生成《功能设计文档》
1. 复用功能需求文档的前四大章节（需求介绍、功能需求、非功能需求、验收标准）。
2. 追加第五章【功能设计】、第六章【实施计划】、第七章【测试用例】。
"""
import os
from pathlib import Path
import re

REQ_DIR_TEMPLATE = "nuxx_code/{module}/{module}模块功能需求文档.md"
OUT_DIR_TEMPLATE = "nuxx_code/{module}/{module}模块功能设计文档.md"

MODULES = ['log', 'plugins', 'rw_split', 'security', 'shard', 'sql_extend', 'storage', 'transaction']

# 章节分隔正则，用于提取前四部分
CHAPTER_PATTERN = re.compile(r"^## 四、验收标准", re.MULTILINE)


def read_requirement_prefix(module: str) -> str:
    """读取功能需求文档中从开头到第四章结束的文本。若不存在则返回空字符串"""
    req_path = Path(REQ_DIR_TEMPLATE.format(module=module))
    if not req_path.exists():
        return ""
    text = req_path.read_text(encoding="utf-8")
    # 找到第四章标题行之后的所有内容索引
    match = CHAPTER_PATTERN.search(text)
    if not match:
        return text  # 如果匹配不到，则返回全文
    # 保留直到第四章标题及其后全部内容（即前四章完整内容）
    return text[: match.end()] + "\n"


def create_function_design_doc(module: str):
    """生成功能设计文档"""
    prefix = read_requirement_prefix(module)
    if not prefix:
        print(f"[WARN] 未找到 {module} 模块的功能需求文档，跳过")
        return

    # 第五章 功能设计（简要模板，可按需细化）
    chapter5 = f"""
## 五、功能设计

### 5.1 总体架构
- 描述{module}模块的总体架构图（可插入 Mermaid 或图片）。
- 列出主要组件及其交互。
-
- **示例架构图**：

```mermaid
graph TD
    API["{module} API"] --> Core["{module} Core"]
    Core --> Store["{module} Store"]
```

### 5.2 组件划分
| 组件 | 职责 | 关键接口 |
|------|------|----------|
| Core | 核心逻辑处理 | `init()` / `run()` / `stop()` |
| API  | 对外接口层   | `create()` / `update()` / `delete()` |
| Store| 数据存储层   | `save()` / `load()` |

### 5.3 数据模型
- 列出关键数据结构及说明。
- 使用UML类图或Mermaid表示。

### 5.4 交互流程
- 典型业务流程时序图：

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Core
    participant Store
    Client->>API: 请求
    API->>Core: 业务调用
    Core->>Store: 数据读写
    Store-->>Core: 返回结果
    Core-->>API: 响应
    API-->>Client: 相应数据
```

"""

    # 章节6、7不再需要

    # 仅保留到第五章
    final_content = prefix + chapter5

    out_path = Path(OUT_DIR_TEMPLATE.format(module=module))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(final_content, encoding="utf-8")
    print(f"已生成 {module} 模块功能设计文档 → {out_path}")


def main():
    for m in MODULES:
        create_function_design_doc(m)

if __name__ == "__main__":
    main() 