import random
import math
import logging
from datetime import datetime
from typing import Dict, Any, List, Union, Tuple, Optional, Callable
import sys
from .zabbix_api_util import get_zabbix_metrics
import json
import re
from .handler_manager import HandlerManager

import logging
logger = logging.getLogger('log')


mock_cluster_info ={
    'db': {
        'master': {'ip': '127.0.0.1', 'port': 3306},
        'slave1': {'ip': '192.168.1.2', 'port': 3306},
        'slave2': {'ip': '192.168.1.3', 'port': 3306}
    },
    'proxy': {
        'proxy1': {'ip': '192.168.1.4', 'port': 6032},
        'proxy2': {'ip': '192.168.1.5', 'port': 6032}
    },
    'manager': {
        'manager1': {'ip': '192.168.1.6', 'port': 8080},
        'manager2': {'ip': '192.168.1.7', 'port': 8080}
    }
}

class FaultTreeProcessor:
    """故障树处理器"""

    def __init__(self):
        self.cluster_info = None
        self.time_from = None
        self.time_till = None

    def process_tree(self, tree_data: Dict[str, Any], cluster_name: str, time_from: int = None, time_till: int = None) -> Dict[str, Any]:
        """处理故障树数据的主入口方法"""
        try:
            # 获取集群资源信息
            self.cluster_info = self._get_cluster_info(cluster_name)
            self.time_from = time_from
            self.time_till = time_till
            # 创建新的根节点，使用集群名替换 'Root'
            processed_data = tree_data.copy()
            processed_data['name'] = cluster_name

            # 处理整个树
            processed_data = self._process_node(processed_data, parent_type=None)
            return processed_data
        except Exception as e:
            logger.error(f"处理故障树数据失败: {str(e)}")
            return tree_data

    def _get_cluster_info(self, cluster_name: str) -> Dict[str, Any]:
        """从资源池获取集群信息"""
        # TODO: 实现从资源池获取集群信息的逻辑
        # 示例返回格式：
        return mock_cluster_info

    def _get_severity_level(self, severity: str) -> int:
        """获取严重级别的数值"""
        severity_levels = {
            'info': 0,
            'warning': 1,
            'error': 2
        }
        return severity_levels.get(severity.lower(), 0)

    def _process_node(self, node: Dict[str, Any], parent_type: str = None) -> Dict[str, Any]:
        """处理单个节点"""
        if not node:
            return node
        # 直接内联 node_type 判断逻辑
        node_type = node['name'].lower() if node['name'].lower() in ['db', 'proxy', 'manager'] else parent_type
        instance_info = self._get_instance_info(node['name'], node_type)

        # 如果找到实例信息，更新节点的 ip_port 和描述
        if instance_info:
            # 添加新的 instance_info 字段
            node['instance_info'] = instance_info.copy()  # 使用copy()来避免引用相同的字典
            node['ip_port'] = instance_info.copy()  # 也为ip_port创建一个副本
            original_desc = node.get('description', '')
            ip_info = f"[{instance_info['ip']}:{instance_info['port']}]"
            node['description'] = f"{original_desc} {ip_info}".strip()
            # 递归地将instance_info添加到所有子节点
            self._add_instance_info_to_children(node, instance_info)

        # 处理叶子节点的监控指标
        if 'metric_name' in node:
            source = node['data_source'].get('source', '')
            source_type = node['data_source'].get('type', '')
            metric = {
                'source': source,      # 数据源或者函数名称
                'type': source_type,   # api、internal_function
                'metric_name': node['metric_name'],  # 指标名称
                'rules': node.get('rules', [])       # 指标规则
            }
            print("-----匹配到指标点，开始获取对应数据", node.get('key'), metric)
            self._process_metrics(metric, node)

        # 处理子节点并更新父节点状态
        if node.get('children'):
            node['children'] = [
                self._process_node(child, node_type)
                for child in node['children']
            ]
            self._update_parent_status(node)

        return node

    def _add_instance_info_to_children(self, node: Dict[str, Any], instance_info: Dict[str, Any]) -> None:
        """
        递归地将实例信息添加到所有子节点
        Args:
            node: 当前节点
            instance_info: 要添加的实例信息
        """
        if not node.get('children'):
            return

        for child in node['children']:
            # 添加实例信息到子节点，使用copy()创建副本
            child['ip_port'] = instance_info.copy()
            # 递归处理子节点的子节点
            self._add_instance_info_to_children(child, instance_info)

    def _get_instance_info(self, node_name: str, node_type: str) -> Dict[str, Any]:
        """
        获取实例信息
        node_type: db,proxy,manager
        """
        if not self.cluster_info or not node_type:
            return None

        if node_type in self.cluster_info:
            result = self.cluster_info[node_type].get(node_name)
            return result

        return None

    def _process_metrics(self, metric: Dict[str, Any], node: Dict[str, Any]) -> None:
        """处理节点的监控指标"""
        handler_name = metric.get('source', '')
        metric_name = metric.get('metric_name').strip()
        instance_info = node.get('ip_port')
        metric_id = node.get('key')
        try:
            # 获取对应的处理函数
            handler = HandlerManager.init_metric_handlers(
                metric_name=metric_name,
                handler_name=handler_name,
                handler_type='data'
            )
            
            if not handler:
                raise ValueError(f"Unsupported data source: {handler_name}")
            
            # 执行处理函数获取对应的监控值
            print(f"开始调用处理器获取{metric_id}的数据")
            values = handler(instance_info, metric_name, self.time_from, self.time_till)
            print(f"获取{metric_id}返回值", values)

            # 对返回的数据进行规则比对
            if node.get('rules') and values: 
                self._evaluate_child_rules(node, values)
            
        except Exception as e:
            logger.exception(f"处理指标{metric_name}失败: {str(e)}")
            node['node_status'] = 'error'
            node['description'] = f"处理失败: {str(e)}"

    def _evaluate_child_rules(self, node: Dict[str, Any], child_values: List[Dict[str, Any]]) -> None:
        """
        评估子节点的规则
        Args:
            node: 当前节点
            child_values: Zabbix返回的数据列表（当前数据或历史数据）
        """
        node['node_status'] = 'info'
        try:
            # 获取节点的规则
            rules = node.get('rules')
            # 获取最近1个监控的值或历史监控值
            if len(child_values) == 1:   # 获取最近1个数据
                data = child_values[0]
            else:
                data = self._get_history_abnormal_value(child_values, rules)   # 历史数据获取异常点

            metric_value = data.get('metric_value', '0')
            metric_time = data.get('metric_time', '-')
            metric_units = data.get('metric_units', '')
            formant_metric_value_units_human = self._format_metric_value(metric_value, metric_units)  # 格式化显示值
            rule_severity, triggered_rule = self._evaluate_condition(metric_value, rules)
            # 添加额外的信息，提供前端展示或者调用
            metric_extra_info = {
                'metric_name': node.get('name', ''),
                'metric_time': metric_time,
                'metric_value': f"{metric_value}",
                'metric_units,': metric_units,
                'metric_value_units_human': formant_metric_value_units_human,
                'severity': rule_severity,   # 哪个规则对应的严重程度
            }
            # 更新节点描述，包含触发的规则信息
            if triggered_rule:
                condition = triggered_rule.get('condition', '')
                threshold = triggered_rule.get('threshold', '')
                formant_threshold_value_units_human = self._format_metric_value(threshold, metric_units)  # 格式化显示值
                metric_extra_info['rule_condition'] = triggered_rule.get('condition', '')
                metric_extra_info['rule_threshold'] = triggered_rule.get('threshold', '')
                metric_extra_info['impact_analysis'] = triggered_rule.get('impact_analysis', '')
                metric_extra_info['suggestion'] = triggered_rule.get('suggestion', '')
                metric_extra_info['rule_condition_format'] = f"{metric_value}{metric_units} {condition} {threshold}{metric_units}"
                metric_extra_info['rule_condition_format_human'] = f"{formant_metric_value_units_human} {condition} {formant_threshold_value_units_human}"
            node['metric_extra_info'] = metric_extra_info
            node['description'] = f"{metric_value}{metric_units}({formant_metric_value_units_human})"
            # 更新节点状态
            if self._get_severity_level(rule_severity) > self._get_severity_level(node.get('node_status', 'info')):
                node['node_status'] = rule_severity
                node['metric_value'] = metric_value
        except Exception as e:
            print(f"评估子节点规则失败: {str(e)}")
            node['node_status'] = 'error'
            node['description'] = f"规则评估失败: {str(e)}"
            node['metric_extra_info'] = {
                'metric_name': node.get('metric_name', ''),
                'error_message': str(e),
                'severity': 'error',
                'status': '规则评估失败'
            }

    def _evaluate_condition(self, metric_value: str, rules: List[Dict[str, Any]]) -> str:
        """
        评估条件并返回状态
        Args:
            metric_value: 要评估的值（字符串格式）
            rules: 规则列表
        Returns:
            str: 状态级别
        """
        highest_severity = 'info'
        triggered_rule = None
        for rule in rules:
            try:
                condition = rule.get('condition', '')
                threshold = rule.get('threshold', '0')
                severity = rule.get('status', 'info')
                metric_type = rule.get('type', 'numeric')   # numeric,float,str

                # 根据类型转换值和阈值
                if metric_type == 'numeric':
                    value_converted = float(metric_value)  # 改为float，避免精度损失
                    threshold_converted = float(threshold)
                elif metric_type == 'float':
                    value_converted = float(metric_value)
                    threshold_converted = float(threshold)
                elif metric_type == 'str':
                    value_converted = str(metric_value)
                    threshold_converted = str(threshold)
                else:
                    continue

                # 根据条件比较
                is_triggered = False
                if metric_type in ('numeric', 'float'):
                    if condition == '>':  # 修改条件判断方式
                        is_triggered = value_converted > threshold_converted
                    elif condition == '<':
                        is_triggered = value_converted < threshold_converted
                    elif condition == '>=':
                        is_triggered = value_converted >= threshold_converted
                    elif condition == '<=':
                        is_triggered = value_converted <= threshold_converted
                    elif condition == '==':
                        is_triggered = value_converted == threshold_converted
                elif metric_type == 'str':
                    if condition == '==':
                        is_triggered = value_converted == threshold_converted
                    elif condition == '!=':
                        is_triggered = value_converted != threshold_converted
                    elif condition == 'in':
                        is_triggered = threshold_converted in value_converted
                    elif condition == 'not in':
                        is_triggered = threshold_converted not in value_converted
                    elif condition == 'match':
                        import re
                        try:
                            pattern = re.compile(threshold_converted)
                            is_triggered = bool(pattern.search(value_converted))
                        except re.error:
                            logger.error(f"Invalid regex pattern: {threshold_converted}")
                            continue

                print(f"Debug: value={value_converted}, threshold={threshold_converted}, condition={condition}, is_triggered={is_triggered}")

                # 如果规则触发且严重级别更高，则更新
                if is_triggered and self._get_severity_level(severity) > self._get_severity_level(highest_severity):
                    highest_severity = severity
                    triggered_rule = rule

            except (ValueError, TypeError) as e:
                logger.error(f"规则评估失败: {str(e)}")
                continue

        return highest_severity, triggered_rule

    def _update_parent_status(self, node: Dict[str, Any]) -> None:
        """更新父节点状态基于子节点状态"""
        if not node.get('children'):
            return

        # 找出子节点中最高级别的状态
        highest_severity = 'info'
        for child in node['children']:
            child_status = child.get('node_status', 'info')
            if self._get_severity_level(child_status) > self._get_severity_level(highest_severity):
                highest_severity = child_status

        # 更新父节点状态
        node['type'] = highest_severity
        node['node_status'] = highest_severity

    def _get_history_abnormal_value(self, values: List[Dict[str, Any]], rules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        根据规则获取异常值
        Args:
            values: 历史数据列表
            rules: 规则配置
        Returns:
            Dict[str, Any]: 异常数据点
        """
        if not rules:
            return values[0]  # 如果没有规则返回最新数据
        rule = rules[0]       # Todo,后续需要用for循环多条件判断
        condition = rule.get('condition', '')
        metric_type = rule.get('metric_type', 'numeric')
        target_data = values[0]  # 默认使用最新数据

        try:
            if metric_type in ('numeric', 'float'):
                target_value = float(target_data.get('metric_value', '0'))
                threshold = float(rule.get('threshold', '0'))

                for point in values:
                    point_value = float(point.get('metric_value', '0'))
                    if condition == '>' or condition == '>=':
                        # 找最大值
                        if point_value > target_value:
                            target_value = point_value
                            target_data = point
                    elif condition == '<' or condition == '<=':
                        # 找最小值
                        if point_value < target_value:
                            target_value = point_value
                            target_data = point
                    elif condition == '==':
                        # 找最接近阈值的点
                        if point_value == target_value:
                            target_value = point_value
                            target_data = point
            elif metric_type == 'str':
                threshold = str(rule.get('threshold', ''))
                for point in values:
                    point_value = str(point.get('metric_value', ''))
                    if condition == '==':
                        if point_value == threshold:
                            target_data = point
                            break
                    elif condition == '!=':
                        if point_value != threshold:
                            target_data = point
                            break
                    elif condition == 'in':
                        if threshold in point_value:
                            target_data = point
                            break
                    elif condition == 'not in':
                        if threshold not in point_value:
                            target_data = point
                            break
                    elif condition == 'match':
                        try:
                            pattern = re.compile(threshold)
                            if bool(pattern.search(point_value)):
                                target_data = point
                                break
                        except re.error:
                            logger.error(f"Invalid regex pattern: {threshold}")
        except Exception as e:
            print(f"出错了!!{str(e)}")
        return target_data

    def _format_metric_value(self, value: str, units: str) -> str:
        """
        格式化指标值的显示
        Args:
            value: 指标值
            units: 单位
        Returns:
            str: 格式化后的显示值
        """
        try:
            # 如果是百分比，保留2位小数
            if units == '%':
                return f"{float(value):.2f} {units}"
            
            # 如果是字节相关单位，转换为人类可读格式
            if units.upper() in ['B', 'BYTES']:
                value_float = float(value)
                for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
                    if value_float < 1024.0:
                        return f"{value_float:.2f} {unit}"
                    value_float /= 1024.0
                return f"{value_float:.2f} PB"
            
            # 其他情况直接返回原值
            return f"{value} {units}".strip()
            
        except (ValueError, TypeError):
            return value
