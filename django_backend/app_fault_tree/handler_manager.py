from .zabbix_api_util import get_zabbix_metrics
from .es_api_util import get_es_metrics

import logging
import subprocess
import os
logger = logging.getLogger('log')


class MetricData:
    """指标数据结构"""

    REQUIRED_KEYS = ['metric_units', 'metric_type', 'metric_value', 'metric_time', 'metric_name']
    ALLOWED_TYPES = ['float', 'int', 'str']

    @staticmethod
    def create(metric_name='',
               metric_units='',
               metric_type='float',
               metric_value='0',
               metric_time=''):
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
        instance_info,
        metric_name,
        time_from=None,
        time_till=None
    ):
        zabbix_metric_type_map = {
            '0': 'float',  # Numeric float
            '1': 'str',  # Character
            '2': 'str',  # Log
            '3': 'int',  # Numeric unsigned
            '4': 'str',  # Text
        }
        result = get_zabbix_metrics(
            host_ip=instance_info['ip'],
            metric_name=metric_name,
            match_type='filter',  # 使用精确匹配
            time_from=time_from,
            time_till=time_till,
            limit=100000
        )
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
        instance_info,
        metric_name,
        time_from=None,
        time_till=None
    ):
        """通过SSH密钥认证获取远程系统iostat日志"""
        return f"mock log data"


class HandleElasticSearchMetrics:
    """ElasticSearch指标处理器"""
    
    def get_metric_data(
        self,
        instance_info,
        metric_name,
        time_from=None,
        time_till=None
    ):
        """获取ElasticSearch指标数据"""
        # 模拟ES指标数据
        mock_data = [
            MetricData.create(metric_name=metric_name,metric_units='bytes',metric_type='float',metric_value='1024.5',metric_time='2024-03-20 10:00:00'),
            MetricData.create(metric_name=metric_name,metric_units='bytes',metric_type='float',metric_value='2048.7',metric_time='2024-03-20 10:01:00')
        ]
        return mock_data
    
    def get_metric_logs(
        self,
        instance_info,
        metric_name,
        time_from=None,
        time_till=None
    ):
        """获取ElasticSearch指标相关日志"""
        return f"mock log data"


class HandlerManager:
    """处理器管理类"""
    
    # 初始化处理器映射字典
    HANDLER_MAP = {}
    
    @classmethod
    def register_handler(cls, handler_name, handler_class):
        """
        注册处理器类
        Args:
            handler_name: 处理器名称
            handler_class: 处理器类
        """
        cls.HANDLER_MAP[handler_name] = handler_class
        logger.info(f"Registered handler: {handler_name}")
    
    @staticmethod
    def get_source_handlers():
        """
        获取所有数据源处理器配置
        Returns:
            List[Dict]: 数据源处理器配置列表
        """
        # 实际项中从数据库获取配置
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
        metric_name,
        handler_name,
        handler_type='data'
    ):
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

            # 从映��中获取处理器类
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

