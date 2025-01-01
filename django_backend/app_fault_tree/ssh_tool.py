# -*- coding: UTF-8 -*-
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import paramiko
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommandRequest(BaseModel):
    command: str = Field(..., description="The command to execute")

def execute_ssh_command(host: str, command: str) -> str:
    """执行SSH命令"""
    try:
        # 创建SSH客户端
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # 连接服务器（这里使用密钥认证）
        ssh.connect(
            hostname=host,
            username='root',  # 使用实际的用户名
            # password='your_password',  # 如果使用密码认证
            # key_filename='/path/to/your/private/key'  # 如果使用密钥文件
        )
        
        # 执行命令
        stdin, stdout, stderr = ssh.exec_command(command)
        
        # 获取输出
        result = stdout.read().decode()
        error = stderr.read().decode()
        
        if error:
            raise Exception(f"Command error: {error}")
            
        return result
    
    except Exception as e:
        logger.error(f"SSH execution error: {str(e)}")
        raise
    finally:
        ssh.close()

@app.post("/execute")
async def execute_command(command_request: CommandRequest):
    """执行远程命令的API接口"""
    try:
        command = command_request.command
        logger.info(f"Received command: {command}")

        # 解析命令
        parts = command.split(None, 2)
        if len(parts) < 3 or not parts[0].startswith('@') or not parts[0].endswith('助手'):
            raise HTTPException(
                status_code=400,
                detail="命令格式错误: 需要'@SSH助手 主机 命令'格式"
            )

        assistant_type = parts[0][1:-2].lower()
        if assistant_type != "ssh":
            raise HTTPException(
                status_code=400,
                detail=f"目前只支持SSH助手，收到的是: {assistant_type}助手"
            )

        host = parts[1]
        actual_command = parts[2]

        # 执行SSH命令
        result = execute_ssh_command(host, actual_command)

        return {
            "success": True,
            "result": result
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Execution error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"执行出错: {str(e)}"
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)