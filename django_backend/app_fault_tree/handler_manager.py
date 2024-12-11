from typing import Dict, Any, List, Callable, Optional
from .zabbix_api_util import get_zabbix_metrics
from .es_api_util import get_es_metrics

import logging
import subprocess
import paramiko
import os
logger = logging.getLogger('log')


class MetricData:
    """指标数据结构"""

    REQUIRED_KEYS = ['metric_units', 'metric_type', 'metric_value', 'metric_time', 'metric_name']
    ALLOWED_TYPES = ['float', 'int', 'str']

    @staticmethod
    def create(metric_name: str = '',
               metric_units: str = '',
               metric_type: str = 'float',
               metric_value: str = '0',
               metric_time: str = '') -> Dict[str, str]:
        """
        创建指标数据结构
        Args:
            metric_name: 指标名称
            metric_units: 单位
            metric_type: 值类型 (float/int/str)
            metric_value: 值
            metric_time: 格式化时间(YYYY-MM-DD HH:MM:SS)
        Returns:
            Dict[str, str]: 指标数据
        Raises:
            ValueError: 当参数验证失败时
        """
        if not metric_time:
            from datetime import datetime
            metric_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        return {
            'metric_name': metric_name,
            'metric_units': metric_units,
            'metric_type': metric_type,
            'metric_value': str(metric_value),
            'metric_time': metric_time
        }


class HandleZabbixMetrics:
    """Zabbix指标处理器"""
    def get_metric_data(
        self,
        instance_info: Dict[str, Any],
        metric_name: str,
        time_from: Optional[int] = None,
        time_till: Optional[int] = None
    ) -> Dict[str, Any]:
        zabbix_metric_type_map = {
            '0': 'float',  # Numeric float
            '1': 'str',  # Character
            '2': 'str',  # Log
            '3': 'int',  # Numeric unsigned
            '4': 'str',  # Text
        }
        result = get_zabbix_metrics(
            host_ip='127.0.0.1',
            metric_name=metric_name,
            match_type='filter',  # 使用精确匹配
            time_from=time_from,
            time_till=time_till,
            limit=100000
        )
        print(11111, result)
        if result['status'] == 'error':
            return None

        # 处理返回的数据,可能是当前数据,可能是历史数据
        if result['data']:
            formatted_data = []
            for item in result['data']:
                data = MetricData.create(
                    metric_name=item.get('key_', 'not found'),
                    metric_units=item.get('units', ''),
                    metric_type=zabbix_metric_type_map.get(item.get('value_type', '0')),
                    metric_value=item.get('value', '0'),
                    metric_time=item.get('metric_time', '')
                )
                formatted_data.append(data)
            return formatted_data
        return None
    
    def get_metric_logs(
        self,
        instance_info: Dict[str, Any],
        metric_name: str,
        time_from: Optional[int] = None,
        time_till: Optional[int] = None
    ) -> Dict[str, Any]:
        """通过SSH密钥认证获取远程系统iostat日志"""
        try:
            # 创建SSH客户端
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # 使用默认的SSH密钥路径
            private_key_path = os.path.expanduser('~/.ssh/id_rsa')
            key = paramiko.RSAKey.from_private_key_file(private_key_path)
            
            # 连接远程服务器
            ssh.connect(
                hostname='47.95.3.120',
                username='root',
                pkey=key
            )
            
            # 执行iostat命令
            cmd = "/usr/bin/iostat -x 1 3"
            stdin, stdout, stderr = ssh.exec_command(cmd)
            print(stdin,stdout,stderr)
            # 获取输出
            result = stdout.read().decode()
            error = stderr.read().decode()
            
            # 关闭连接
            ssh.close()
            
            if error:
                logger.error(f"Failed to execute remote iostat: {error}")
                return f"Remote iostat command failed: {error}"
                
            return result
            
        except Exception as e:
            logger.error(f"Failed to get remote iostat data: {str(e)}")
            return {
                'status': 'error',
                'msg': str(e),
                'data': None
            }



class HandleElasticSearchMetrics:
    """ElasticSearch指标处理器"""
    
    def get_metric_data(
        self,
        instance_info: Dict[str, Any],
        metric_name: str,
        time_from: Optional[int] = None,
        time_till: Optional[int] = None
    ) -> Dict[str, Any]:
        """获取ElasticSearch指标数据"""
        try:
            # 实现ElasticSearch指标数据获取逻辑
            pass
        except Exception as e:
            logger.error(f"Failed to get ElasticSearch metric data: {str(e)}")
            return {
                'status': 'error',
                'msg': str(e),
                'data': None
            }
    
    def get_metric_logs(
        self,
        instance_info: Dict[str, Any],
        metric_name: str,
        time_from: Optional[int] = None,
        time_till: Optional[int] = None
    ) -> Dict[str, Any]:
        """获取ElasticSearch指标相关日志"""
        try:
            result = get_es_logs(
                index="filebeat-*",
                host_ip=instance_info['ip'],
                metric_name=metric_name,
                time_from=time_from,
                time_till=time_till
            )
            return result
        except Exception as e:
            logger.error(f"Failed to get ElasticSearch logs: {str(e)}")
            return {
                'status': 'error',
                'msg': str(e),
                'data': None
            }


class HandlerManager:
    """处理器管理类"""
    
    # 初始化处理器映射字典
    HANDLER_MAP = {}
    
    @classmethod
    def register_handler(cls, handler_name: str, handler_class: type) -> None:
        """
        注册处理器类
        Args:
            handler_name: 处理器名称
            handler_class: 处理器类
        """
        cls.HANDLER_MAP[handler_name] = handler_class
        logger.info(f"Registered handler: {handler_name}")
    
    @staticmethod
    def get_source_handlers() -> List[Dict[str, Any]]:
        """
        获取所有数据源处理器配置
        Returns:
            List[Dict]: 数据源处理器配置列表
        """
        # TODO: 实际项中从数据库获取配置
        return [
            {
                'source_name': 'zabbix',
                'handler_name': 'HandleZabbixMetrics',
                'description': 'Zabbix数据源处理函数'
            },
            {
                'source_name': 'elasticsearch',
                'handler_name': 'HandleElasticSearchMetrics',
                'description': 'ElasticSearch数据源处理函数'
            }
        ]

    @staticmethod
    def init_metric_handlers(
        metric_name: str,
        handler_name: str,
        handler_type: str = 'data'
    ) -> Optional[Callable]:
        """
        初始化指定的处理函数
        Args:
            metric_name: 指标名称
            handler_name: 处理器名称
            handler_type: 处理器类型 ('data'/'log')
        Returns:
            Optional[Callable]: 处理函数
        """
        try:
            # 获取配置
            source_configs = HandlerManager.get_source_handlers()
            
            # 查找对应的处理器配置
            handler_config = None
            for config in source_configs:
                if config['handler_name'] == handler_name:
                    handler_config = config
                    break
            
            if not handler_config:
                logger.error(f"Handler config not found for: {handler_name}")
                return None

            # 从映射中获取处理器类
            handler_class = HandlerManager.HANDLER_MAP.get(handler_name)
            if not handler_class:
                logger.error(f"Handler class not found in HANDLER_MAP: {handler_name}")
                return None

            # 创建处理器实例
            handler_instance = handler_class()

            # 根据类型返回对应的方法
            if handler_type == 'data':
                return handler_instance.get_metric_data
            else:
                return handler_instance.get_metric_logs
            
        except Exception as e:
            logger.error(f"Failed to initialize handler {handler_name}: {str(e)}")
            return None


# 注册处理器类
HandlerManager.register_handler('HandleZabbixMetrics', HandleZabbixMetrics)
HandlerManager.register_handler('HandleElasticSearchMetrics', HandleElasticSearchMetrics)

