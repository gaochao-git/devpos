import os
import pandas as pd
from openai import OpenAI
import json
from typing import List, Dict, Tuple
import time
import PyPDF2
from pathlib import Path
from tqdm import tqdm

class DBDocToQA:
    def __init__(self, api_key: str):
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"  # 添加 DeepSeek API 基础URL
        )
        
    def read_pdf(self, file_path: str) -> List[Dict[str, str]]:
        """读取PDF文档内容，返回包含页码的文本块列表"""
        try:
            pages_content = []
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    text = page.extract_text()
                    if text.strip():
                        pages_content.append({
                            'text': text,
                            'page': page_num
                        })
            return pages_content
        except Exception as e:
            print(f"读取PDF文件出错 {file_path}: {e}")
            return []
    
    def split_text(self, pages_content: List[Dict[str, str]], max_chunk_size: int = 1500) -> List[Dict[str, str]]:
        """将文本分割成小块，保留页码信息"""
        chunks = []
        current_chunk = ""
        current_pages = set()
        
        for page_content in pages_content:
            text = page_content['text']
            page_num = page_content['page']
            
            paragraphs = text.split('\n\n')
            for para in paragraphs:
                if len(current_chunk) + len(para) < max_chunk_size:
                    current_chunk += para + "\n\n"
                    current_pages.add(page_num)
                else:
                    if current_chunk:
                        chunks.append({
                            'text': current_chunk.strip(),
                            'pages': sorted(list(current_pages))
                        })
                    current_chunk = para + "\n\n"
                    current_pages = {page_num}
        
        if current_chunk:
            chunks.append({
                'text': current_chunk.strip(),
                'pages': sorted(list(current_pages))
            })
            
        return chunks

    def generate_qa_pairs(self, chunk: Dict[str, str], doc_name: str) -> List[Dict]:
        """使用DeepSeek API生成问答对"""
        system_prompt = "你是一个专业的数据库文档分析助手，擅长将文档内容转换为清晰的问答对。"
        
        pages_str = f"第{'-'.join(map(str, chunk['pages']))}页"
        source = f"{doc_name} ({pages_str})"
        
        prompt = f"""
        分析以下OceanBase数据库文档内容，生成3-5个问答对。
        严格按照以下JSON格式返回，不要包含任何其他内容：
        [
            {{"question": "具体技术问题", "answer": "详细技术答案", "source": "{source}"}}
        ]

        文档内容:
        {chunk['text']}
        """
        
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000,
                stream=False
            )
            
            result = response.choices[0].message.content.strip()
            
            try:
                qa_pairs = json.loads(result)
                print("\n" + "="*50)
                print(f"从 {source} 生成的问答对:")
                for i, qa in enumerate(qa_pairs, 1):
                    print(f"\n问答对 {i}:")
                    print(f"问题: {qa['question']}")
                    print(f"答案: {qa['answer']}")
                    print(f"来源: {qa['source']}")
                    print("-"*30)
                return qa_pairs
                
            except json.JSONDecodeError as e:
                print(f"\nJSON解析错误: {e}")
                print(f"API返回内容:\n{result}")
                
                cleaned_result = result.strip()
                if cleaned_result.startswith("```json"):
                    cleaned_result = cleaned_result.replace("```json", "").replace("```", "").strip()
                
                try:
                    qa_pairs = json.loads(cleaned_result)
                    print("\n清理后成功解析JSON")
                    return qa_pairs
                except:
                    print("清理后仍然无法解析JSON")
                    return []
                
        except Exception as e:
            print(f"\nAPI调用错误: {e}")
            return []

    def save_to_excel(self, qa_pairs: List[Dict], output_file: str, append: bool = False):
        """将问答对保存到Excel文件"""
        try:
            # 确保数据格式正确
            formatted_data = []
            start_id = 1
            
            # 如果是追加模式且文件存在，读取现有数据获取最后的ID
            if append and os.path.exists(output_file):
                try:
                    existing_df = pd.read_excel(output_file)
                    if not existing_df.empty:
                        start_id = existing_df['ID'].max() + 1
                        formatted_data = existing_df.to_dict('records')
                except Exception as e:
                    print(f"读取现有Excel文件失败: {e}")
            
            # 添加新数据
            for qa in qa_pairs:
                formatted_data.append({
                    'ID': start_id,
                    'Question': qa['question'],
                    'Answer': qa['answer'],
                    'Source': qa['source']
                })
                start_id += 1
            
            # 创建DataFrame并设置列顺序
            df = pd.DataFrame(formatted_data)
            df = df[['ID', 'Question', 'Answer', 'Source']]
            
            # 设置Excel写入选项
            writer = pd.ExcelWriter(output_file, engine='openpyxl')
            
            # 写入数据
            df.to_excel(
                writer, 
                index=False,
                sheet_name='QA Pairs',
                float_format="%.0f"
            )
            
            # 调整列宽
            worksheet = writer.sheets['QA Pairs']
            worksheet.column_dimensions['A'].width = 6
            worksheet.column_dimensions['B'].width = 50
            worksheet.column_dimensions['C'].width = 70
            worksheet.column_dimensions['D'].width = 30
            
            # 保存文件
            writer.close()
            
            print(f"\n成功保存 {len(qa_pairs)} 个新问答对到: {output_file}")
            print(f"当前总问答对数量: {len(formatted_data)}")
            
        except Exception as e:
            print(f"保存Excel文件时出错: {e}")
            try:
                pd.DataFrame(formatted_data).to_excel(output_file, index=False)
                print(f"使用基本方式保存成功: {output_file}")
            except Exception as e2:
                print(f"基本保存方式也失败: {e2}")

def main():
    # 配置
    api_key ="sk-490738f8ce8f4a36bcc0bfb165270008"
    
    # PDF文件列表
    pdf_files = [
        "OceanBase-数据库-V4.3.5-快速上手.pdf",
        "OceanBase-数据库-V4.3.5-部署数据库.pdf",
        "OceanBase-数据库-V4.3.5--OceanBase-术语.pdf"
    ]
    
    # 初始化转换器
    converter = DBDocToQA(api_key)
    
    for pdf_file in pdf_files:
        if not os.path.exists(pdf_file):
            print(f"文件不存在: {pdf_file}")
            continue
        
        # 为每个PDF文件创建对应的Excel文件
        output_file = pdf_file.replace('.pdf', '.xlsx')
        print(f"\n{'='*20} 处理文件: {pdf_file} {'='*20}")
        
        pages_content = converter.read_pdf(pdf_file)
        if not pages_content:
            continue
            
        chunks = converter.split_text(pages_content)
        print(f"文件已分割为 {len(chunks)} 个块")
        
        current_batch = []
        file_qa_pairs = 0
        
        for chunk in tqdm(chunks, desc="生成问答对"):
            qa_pairs = converter.generate_qa_pairs(chunk, Path(pdf_file).stem)
            if qa_pairs:
                current_batch.extend(qa_pairs)
                file_qa_pairs += len(qa_pairs)
                
                # 每累积5个问答对保存一次
                if len(current_batch) >= 5:
                    converter.save_to_excel(current_batch, output_file, append=(file_qa_pairs > len(current_batch)))
                    current_batch = []  # 清空当前批次
                    
            time.sleep(1)
        
        # 保存该文件处理完后剩余的问答对
        if current_batch:
            converter.save_to_excel(current_batch, output_file, append=(file_qa_pairs > len(current_batch)))
            current_batch = []
            
        print(f"\n{pdf_file} 生成了 {file_qa_pairs} 个问答对")

if __name__ == "__main__":
    main() 