# -*- coding: UTF-8 -*-
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import paramiko
import os
from typing import Dict, Optional
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommandRequest(BaseModel):
    command: str = Field(..., description="The command to execute")  # 添加字段验证

def execute_ssh_command(host: str, command: str, username: str, key_path: str, port: int = 22) -> Dict:
    """执行SSH命令的核心函数"""
    client = None
    try:
        # 展开用户目录路径（比如 ~/）
        key_path = os.path.expanduser(key_path)
        print(command)
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # 加载私钥
        key = paramiko.RSAKey.from_private_key_file(key_path)
        
        # 使用密钥连接
        client.connect(
            hostname=host,
            port=port,
            username=username,
            pkey=key
        )
        
        # 执行命令
        stdin, stdout, stderr = client.exec_command(command)
        
        # 获取输出
        output = stdout.read().decode()
        error = stderr.read().decode()
        
        return {
            "result": output if not error else f"Error: {error}",
            "success": not error,
            "command": command,
            "host": host
        }
        
    except Exception as e:
        raise Exception(f"SSH执行错误: {str(e)}")
        
    finally:
        if client:
            client.close()

@app.post("/execute")
async def execute_command(command_request: CommandRequest):
    """执行远程命令的API接口"""
    try:
        command = command_request.command
        # 从命令中解析助手类型和实际命令
        parts = command.split(None, 2)  # 最多分割2次
        if len(parts) < 2 or not parts[0].startswith('@') or not parts[0].endswith('助手'):
            raise HTTPException(status_code=400, detail="命令格式错误: 需要'@XXX助手 命令'格式")
            
        assistant_type = parts[0][1:-2].lower()  # 移除@和助手，转小写
        command = parts[1] if len(parts) == 2 else parts[1] + ' ' + parts[2]
        
        if assistant_type != "ssh":
            raise HTTPException(status_code=400, detail="目前只支持SSH助手")
            
        # 这里处理实际的SSH命令执行
        # ... 其他SSH执行代码 ...
        
        return {
            "success": True,
            "result": f"执行成功: {command}"  # 临时返回，实际应该返回SSH执行结果
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)