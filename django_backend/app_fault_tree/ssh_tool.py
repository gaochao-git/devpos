# -*- coding: UTF-8 -*-
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import paramiko
import logging
import pymysql
import socket
import select
import threading
from threading import Event
import time
import signal
from typing import Dict, Optional

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

class CommandExecutor:
    def __init__(self):
        self.running_processes: Dict[str, dict] = {}
        self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.cleanup_thread.start()

    def _cleanup_loop(self):
        """后台清理循环，检查并终止超时的命令"""
        while True:
            try:
                current_time = time.time()
                to_remove = []
                
                # 检查所有运行中的进程
                for process_id, process_info in self.running_processes.items():
                    # 如果进程运行时间超过超时时间
                    if current_time - process_info['start_time'] > COMMAND_TIMEOUT:
                        logger.warning(f"Command timeout, auto terminating: {process_info['command']} on {process_info['host']}")
                        # 尝试终止进程
                        self.terminate_process(process_id)
                        to_remove.append(process_id)
                
                # 清理已终止的进程
                for process_id in to_remove:
                    self.running_processes.pop(process_id, None)
                
                # 休眠5秒后继续下一轮检查
                time.sleep(5)
            except Exception as e:
                logger.error(f"Cleanup loop error: {str(e)}")
                time.sleep(5)  # 发生错误时也要休眠，避免CPU过载

    def execute_command(self, host: str, command: str) -> str:
        """执行命令并返回结果"""
        ssh = None
        channel = None
        stop_event = Event()
        output = []
        
        try:
            # 建立 SSH 连接
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(hostname=host, username='root', timeout=CONNECT_TIMEOUT)
            
            # 获取 channel 并请求 PTY
            channel = ssh.get_transport().open_session()
            channel.get_pty()
            channel.exec_command(command)
            
            # 生成进程 ID 并记录
            process_id = f"{host}_{command}_{id(channel)}"
            self.running_processes[process_id] = {
                'channel': channel,
                'ssh': ssh,
                'host': host,
                'command': command,
                'start_time': time.time(),
                'stop_event': stop_event
            }
            
            # 使用 select 来读取输出
            while not stop_event.is_set():
                if channel.exit_status_ready():
                    break
                    
                r, w, e = select.select([channel], [], [], 0.1)
                if channel in r:
                    try:
                        data = channel.recv(4096)
                        if not data:
                            break
                        output.append(data.decode())
                    except socket.timeout:
                        continue
                
                # 检查错误输出
                if channel.recv_stderr_ready():
                    error_data = channel.recv_stderr(4096).decode()
                    if error_data:
                        raise Exception(f"Command error: {error_data}")
                
                # 检查是否超时
                if time.time() - self.running_processes[process_id]['start_time'] > COMMAND_TIMEOUT:
                    raise TimeoutError(f"命令执行超时（{COMMAND_TIMEOUT}秒）")
            
            return ''.join(output)
            
        except Exception as e:
            logger.error(f"Command execution error: {str(e)}")
            raise
        finally:
            # 清理资源
            if process_id in self.running_processes:
                self.terminate_process(process_id)
            if channel:
                channel.close()
            if ssh:
                ssh.close()

    def terminate_process(self, process_id: str) -> bool:
        """终止指定的进程"""
        try:
            if process_id in self.running_processes:
                process_info = self.running_processes[process_id]
                channel = process_info['channel']
                ssh = process_info['ssh']
                host = process_info['host']
                command = process_info['command']
                stop_event = process_info['stop_event']
                
                # 设置停止标志
                stop_event.set()
                
                # 1. 尝试通过 channel 关闭
                try:
                    channel.send('\x03')  # 发送 Ctrl+C
                    time.sleep(0.1)
                    channel.send('\x04')  # 发送 Ctrl+D
                    time.sleep(0.1)
                except:
                    pass

                # 2. 强制关闭 channel
                try:
                    channel.close()
                except:
                    pass

                # 3. 使用新的 SSH 连接清理残留进程
                cleanup_ssh = None
                try:
                    cleanup_ssh = paramiko.SSHClient()
                    cleanup_ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                    cleanup_ssh.connect(hostname=host, username='root', timeout=CONNECT_TIMEOUT)
                    
                    # 查找并终止进程
                    cleanup_channel = cleanup_ssh.get_transport().open_session()
                    cleanup_channel.exec_command(f"pkill -f '{command}' && pkill -9 -f '{command}'")
                    cleanup_channel.close()
                    
                except Exception as e:
                    logger.error(f"Cleanup connection error: {str(e)}")
                finally:
                    if cleanup_ssh:
                        cleanup_ssh.close()

                # 从跟踪列表中移除
                self.running_processes.pop(process_id, None)
                return True
                
        except Exception as e:
            logger.error(f"Error terminating process {process_id}: {str(e)}")
        return False

# 创建全局执行器实例
command_executor = CommandExecutor()

def execute_ssh_command(host: str, command: str) -> str:
    """执行SSH命令的入口函数"""
    return command_executor.execute_command(host, command)

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
    uvicorn.run(app, host="0.0.0.0", port=8002)