# -*- coding: UTF-8 -*-
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import paramiko
import os
from typing import Dict, Optional

app = FastAPI()

class CommandRequest(BaseModel):
    assistant: str
    command: str
    username: str = "root"
    port: int = 22
    key_path: str = "~/.ssh/id_rsa"  # 默认密钥路径

def execute_ssh_command(host: str, command: str, username: str, key_path: str, port: int = 22) -> Dict:
    """执行SSH命令的核心函数"""
    client = None
    try:
        # 展开用户目录路径（比如 ~/）
        key_path = os.path.expanduser(key_path)
        
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
async def execute_command(request: CommandRequest) -> Dict:
    """执行远程命令的API接口"""
    try:
        if request.assistant.lower() != "ssh":
            raise HTTPException(status_code=400, detail="目前只支持SSH助手")
            
        parts = request.command.split(None, 1)
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="命令格式错误: 需要'IP地址 命令'格式")
            
        ip, command = parts
        
        result = execute_ssh_command(
            host=ip,
            command=command,
            username=request.username,
            key_path=request.key_path,
            port=request.port
        )
        
        return result
        
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