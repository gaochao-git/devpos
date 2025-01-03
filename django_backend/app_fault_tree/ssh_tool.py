# -*- coding: UTF-8 -*-
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import paramiko
import logging
import pymysql
import socket

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

# 设置超时时间（秒）
COMMAND_TIMEOUT = 30
CONNECT_TIMEOUT = 2  # 连接超时设置为2秒

def execute_ssh_command(host: str, command: str) -> str:
    """执行SSH命令"""
    try:
        # 创建SSH客户端
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # 连接服务器，设置连接超时为2秒
        ssh.connect(
            hostname=host,
            username='root',
            timeout=CONNECT_TIMEOUT  # 连接超时2秒
            # password='your_password',
            # key_filename='/path/to/your/private/key'
        )
        
        # 执行命令，设置命令超时30秒
        stdin, stdout, stderr = ssh.exec_command(command, timeout=COMMAND_TIMEOUT)
        
        # 获取输出
        result = stdout.read().decode()
        error = stderr.read().decode()
        
        if error:
            raise Exception(f"Command error: {error}")
            
        return result
    
    except socket.timeout:
        raise Exception(f"SSH命令执行超时（{COMMAND_TIMEOUT}秒）")
    except Exception as e:
        logger.error(f"SSH execution error: {str(e)}")
        raise
    finally:
        ssh.close()

def parse_mysql_command(command: str) -> tuple:
    """解析MySQL命令参数"""
    try:
        # 分割主要部分：主机和命令部分
        parts = command.split(None, 2)
        if len(parts) < 3:
            raise ValueError("命令格式错误")
        
        host = parts[1]
        params = parts[2]
        
        # 解析参数
        import shlex
        args = shlex.split(params)
        
        # 默认值
        port = 3306
        sql = ""
        
        # 解析参数
        i = 0
        while i < len(args):
            if args[i] == '-P':
                if i + 1 < len(args):
                    port = int(args[i + 1])
                    i += 2
                else:
                    raise ValueError("端口参数错误")
            elif args[i] == '-e':
                if i + 1 < len(args):
                    sql = args[i + 1].strip('"\'')
                    i += 2
                else:
                    raise ValueError("SQL命令参数错误")
            else:
                i += 1
        
        if not sql:
            raise ValueError("未找到SQL命令")
            
        return host, port, sql
        
    except Exception as e:
        raise ValueError(f"命令解析错误: {str(e)}")

def execute_mysql_command(host: str, port: int, sql: str) -> str:
    """执行MySQL命令"""
    try:
        # MySQL连接配置
        connection = pymysql.connect(
            host=host,
            port=port,
            user='gaochao',
            password='fffjjj',
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=CONNECT_TIMEOUT,  # 连接超时2秒
            read_timeout=COMMAND_TIMEOUT,     # 读取超时30秒
            write_timeout=COMMAND_TIMEOUT     # 写入超时30秒
        )
        
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql)
                result = cursor.fetchall()
                
                # 格式化输出结果
                if not result:
                    return "Query executed successfully. No results to display."
                
                # 获取列名
                columns = list(result[0].keys())
                
                # 构建表格输出
                output = []
                output.append(" | ".join(columns))
                output.append("-" * (len(" | ".join(columns))))
                
                for row in result:
                    output.append(" | ".join(str(row[col]) for col in columns))
                
                return "\n".join(output)
                
        finally:
            connection.close()
            
    except pymysql.err.OperationalError as e:
        if e.args[0] in (2013, 2003):  # MySQL 超时错误码
            raise Exception(f"MySQL命令执行超时（{COMMAND_TIMEOUT}秒）")
        raise
    except Exception as e:
        logger.error(f"MySQL execution error: {str(e)}")
        raise

@app.post("/execute")
async def execute_command(command_request: CommandRequest):
    """执行远程命令的API接口"""
    try:
        command = command_request.command
        logger.info(f"Received command: {command}")

        # 解析命令
        parts = command.split(None, 1)
        if len(parts) < 2 or not parts[0].startswith('@') or not parts[0].endswith('助手'):
            raise HTTPException(
                status_code=400,
                detail="命令格式错误: 需要'@XXX助手 命令'格式"
            )

        assistant_type = parts[0][1:-2].lower()
        command_body = parts[1]

        # 根据助手类型选择执行方式
        if assistant_type == 'ssh':
            # SSH命令保持原有逻辑
            ssh_parts = command_body.split(None, 1)
            if len(ssh_parts) < 2:
                raise HTTPException(status_code=400, detail="SSH命令格式错误")
            result = execute_ssh_command(ssh_parts[0], ssh_parts[1])
        elif assistant_type == 'mysql':
            # 解析并执行MySQL命令
            host, port, sql = parse_mysql_command(command)
            result = execute_mysql_command(host, port, sql)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的助手类型: {assistant_type}"
            )

        return {
            "success": True,
            "result": result
        }

    except TimeoutError as te:
        raise HTTPException(status_code=408, detail=str(te))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
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