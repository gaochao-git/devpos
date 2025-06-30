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

### 5.2 组件划分
| 组件 | 职责 | 关键接口 |
|------|------|----------|
| Core | 核心逻辑处理 | init\()/run\()/stop\()|
| API  | 对外接口层   | create\()/update\()/delete\()|
| Store| 数据存储层   | save\()/load\()|

### 5.3 数据模型
- 列出关键数据结构及说明。
- 使用UML类图或Mermaid表示。

### 5.4 交互流程
- 典型业务流程时序图（Mermaid sequenceDiagram）。

"""

    # 第六章 实施计划
    chapter6 = """
## 六、实施计划

| 阶段 | 里程碑 | 起止日期 | 负责人 |
|------|--------|----------|--------|
| 需求澄清 | 完成需求评审 | T0 ~ T0+3d | PO |
| 设计实现 | 完成功能设计评审 | T0+4d ~ T0+7d | 架构师 |
| 开发实现 | 代码完毕 & 自测通过 | T0+8d ~ T0+20d | 开发 |
| 集成测试 | 集成测试通过 | T0+21d ~ T0+27d | QA |
| 上线发布 | 生产发布 & 验收 | T0+28d | 运维 |

"""

    # 第七章 测试用例
    chapter7 = """
## 七、测试用例

| 用例ID | 用例名称 | 关键步骤 | 预期结果 |
|--------|----------|----------|----------|
| TC-01 | 核心功能正常路径 | 正常请求 -> 成功响应 | 返回200及正确数据 |
| TC-02 | 输入参数校验 | 缺失必填字段 | 返回400错误码 |
| TC-03 | 异常处理 | 模拟内部异常 | 返回500并记录错误日志 |
| TC-04 | 并发场景 | 1000并发请求 | 无错误，性能达标 |
| TC-05 | 安全校验 | 未授权访问 | 返回401/403 |

"""

    final_content = prefix + chapter5 + chapter6 + chapter7

    out_path = Path(OUT_DIR_TEMPLATE.format(module=module))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(final_content, encoding="utf-8")
    print(f"已生成 {module} 模块功能设计文档 → {out_path}")


def main():
    for m in MODULES:
        create_function_design_doc(m)

if __name__ == "__main__":
    main() 