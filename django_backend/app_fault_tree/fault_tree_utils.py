import re
from .handler_manager import HandlerManager
from apps.utils import db_helper
import logging
import json
import time
from datetime import datetime, timedelta
from .trend_evaluator import RateChangeEvaluator
logger = logging.getLogger('log')


VALUE_COMPARISON_OPERATORS = {
    '>': lambda x, y: float(x) > float(y),
    '<': lambda x, y: float(x) < float(y),
    '>=': lambda x, y: float(x) >= float(y),
    '<=': lambda x, y: float(x) <= float(y),
    '==': lambda x, y: (float(x) == float(y)) if all(isinstance(v, (int, float)) or str(v).replace('.', '').isdigit() for v in [x, y]) else str(x) == str(y),
    '!=': lambda x, y: str(x) != str(y),
    'in': lambda x, y: str(y) in str(x),
    'not in': lambda x, y: str(y) not in str(x),
    'match': lambda x, y: bool(re.compile(y).search(str(x)))
}

# 历史数据比较策略
HISTORY_COMPARISON_STRATEGY = {
    ('numeric', '>'): lambda vs: max(vs, key=lambda x: float(x.get('metric_value', 0))),
    ('numeric', '<'): lambda vs: min(vs, key=lambda x: float(x.get('metric_value', 0))),
    ('numeric', '>='): lambda vs: max(vs, key=lambda x: float(x.get('metric_value', 0))),
    ('numeric', '<='): lambda vs: min(vs, key=lambda x: float(x.get('metric_value', 0))),
    ('numeric', '=='): lambda vs, t: min(vs, key=lambda x: abs(float(x.get('metric_value', 0)) - float(t))),
    ('float', '>'): lambda vs: max(vs, key=lambda x: float(x.get('metric_value', 0))),
    ('float', '<'): lambda vs: min(vs, key=lambda x: float(x.get('metric_value', 0))),
    ('float', '>='): lambda vs: max(vs, key=lambda x: float(x.get('metric_value', 0))),
    ('float', '<='): lambda vs: min(vs, key=lambda x: float(x.get('metric_value', 0))),
    ('float', '=='): lambda vs, t: min(vs, key=lambda x: abs(float(x.get('metric_value', 0)) - float(t))),
    ('str', '=='): lambda vs, t: next((v for v in vs if v.get('metric_value') == t), vs[0]),
    ('str', '!='): lambda vs, t: next((v for v in vs if v.get('metric_value') != t), vs[0]),
    ('str', 'in'): lambda vs, t: next((v for v in vs if t in str(v.get('metric_value', ''))), vs[0]),
    ('str', 'not in'): lambda vs, t: next((v for v in vs if t not in str(v.get('metric_value', ''))), vs[0]),
    ('str', 'match'): lambda vs, t: next((v for v in vs if bool(re.compile(t).search(str(v.get('metric_value', ''))))), vs[0])
}

# 严重程度级别映射
SEVERITY_LEVELS = {
    'info': 0,
    'warning': 1,
    'error': 2
} 

class MetricValueFormatter:
    """指标值格式化器，用于将指标值转换为人类可读的格式"""
    
    @staticmethod
    def format(value, units):
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

class ClusterInfoProvider:
    """集群信息提供者，负责从不同类型的资源池获取集群信息"""

    def get_cluster_info(self, cluster_name):
        """
        获取集群信息的主入口方法
        Args:
            cluster_name: 集群名称
        Returns:
            dict: 包含集群信息的字���
        """
        init_cluster_info = {
            'db': {},
            'proxy': {},
            'manager': {}
        }
        
        try:
            sql = f"""
                select 
                    instance_name,
                    case instance_role when 'M' then '主' when 'S' then '备' else '未知' end instance_role
                from mysql_cluster_instance where cluster_name='{cluster_name}'
            """
            ret = db_helper.find_all(sql)
            db_info = ret['data']
            
            for item in db_info:
                ip = item['instance_name'].split('_')[0].strip()
                port = item['instance_name'].split('_')[1].strip()
                instance_role = item['instance_role']
                init_cluster_info['db'][instance_role] = {'ip': ip, 'port': port}
                
            return init_cluster_info
            
        except Exception as e:
            logger.exception(f"获取集群信息失败: {str(e)}")
            return init_cluster_info


class MetricsProcessor:
    """监控指标处理器，负责处理节点的监控指标"""

    def __init__(self, time_from=None, time_till=None):
        self.time_from = time_from
        self.time_till = time_till

    def process_metrics(self, metric, node):
        """
        处理节点的监控指标，会直接修改传入的node对象
        Args:
            metric (dict): 指标配置信息
            node (dict): 节点信息
        """
        handler_name = metric.get('source', '')
        metric_name = metric.get('metric_name').strip()
        instance_info = node.get('ip_port')
        try:
            # 获取对应的处理函数
            handler = HandlerManager.init_metric_handlers(
                handler_name=handler_name,
                handler_type='data'
            )
            
            if not handler:
                raise ValueError(f"Unsupported data source: {handler_name}")
            
            # 执行处理函数获取对应的监控值
            values = handler(instance_info, metric_name, self.time_from, self.time_till)

            # 对返回的数据进行规则比对
            if node.get('rules') and values: 
                self._evaluate_child_rules(node, values)
            
        except Exception as e:
            logger.exception(f"处理指标{metric_name}失败: {str(e)}")
            node['node_status'] = 'error'
            node['description'] = f"处理失败: {str(e)}"

    def _evaluate_child_rules(self, node, child_values):
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
            formant_metric_value_units_human = MetricValueFormatter.format(metric_value, metric_units)  # 格式化显示值
            rule_severity, triggered_rule = self._evaluate_condition(metric_value, rules)
            # 添加额外的信息，提供前端展示或者调用
            metric_extra_info = {
                'metric_name': node.get('name', ''),
                'metric_time': metric_time,
                'metric_value': f"{metric_value}",
                'metric_units,': metric_units,
                'metric_value_units_human': formant_metric_value_units_human,
                'severity': rule_severity,   # 哪个规则对应的严重程度
                'is_rate_change': data.get('is_rate_change', False),
                'rate_change_details': data.get('rate_change_details', {})
            }            
            # 更新节点描述，含触发的规则信息
            if triggered_rule:
                condition = triggered_rule.get('condition', '')
                threshold = triggered_rule.get('threshold', '')
                formant_threshold_value_units_human = MetricValueFormatter.format(threshold, metric_units)  # 格式化显示值
                metric_extra_info.update({
                    'rule_condition': triggered_rule.get('condition', ''),
                    'rule_threshold': triggered_rule.get('threshold', ''),
                    'impact_analysis': triggered_rule.get('impact_analysis', ''),
                    'suggestion': triggered_rule.get('suggestion', ''),
                    'rule_condition_format': f"{metric_value}{metric_units} {condition} {threshold}{metric_units}",
                    'rule_condition_format_human': f"{formant_metric_value_units_human} {condition} {formant_threshold_value_units_human}"
                })
            node['metric_extra_info'] = metric_extra_info
            node['description'] = f"{metric_value}{metric_units}({formant_metric_value_units_human})"
            # 更新节点状态
            if self._get_severity_level(rule_severity) > self._get_severity_level(node.get('node_status', 'info')):
                node['node_status'] = rule_severity
                node['metric_value'] = metric_value
        except Exception as e:
            logger.exception(f"评估子节点规则失败: {str(e)}")
            node['node_status'] = 'error'
            node['description'] = f"规则评估失败: {str(e)}"
            node['metric_extra_info'] = {
                'metric_name': node.get('metric_name', ''),
                'error_message': str(e),
                'severity': 'error',
                'status': '规则评估失败'
            }

    def _get_history_abnormal_value(self, values, rules):
        """根据规则获取异常值"""
        # 只做一次 copy
        result = values[0].copy()
        result.update({
            'is_rate_change': False,
            'severity': 'info',
            'triggered_rule': None
        })
        
        if not rules or not values:
            return result

        highest_severity = 'info'

        for rule in rules:
            rule_type = rule.get('ruleType', 'threshold')
            rule_severity = rule.get('status', 'info')
            try:
                if rule_type == 'rate':
                    result['is_rate_change'] = True
                    result['rate_change_details'] = {
                        'prev_time': result['metric_time'],
                        'next_time': result['metric_time'],
                        'prev_value': f"{float(result['metric_value']):.2f}",
                        'next_value': f"{float(result['metric_value']):.2f}",
                        'time_window': rule.get('timeWindow', '5min')
                    }
                    is_triggered, rate_info = RateChangeEvaluator.evaluate(values, rule)
                    if is_triggered and self._get_severity_level(rule_severity) > self._get_severity_level(highest_severity):
                        highest_severity = rule_severity
                        result.update({
                            'metric_value': f"{rate_info['rate']:.2f}",
                            'severity': rule_severity,
                            'triggered_rule': {
                                'type': rule.get('type', 'numeric'),
                                'condition': rule.get('condition', ''),
                                'threshold': rule.get('threshold', ''),
                                'status': rule_severity,
                                'impact_analysis': rule.get('impact_analysis', ''),
                                'suggestion': rule.get('suggestion', '')
                            },
                            'rate_change_details': {
                                'prev_time': rate_info['prev_time'],
                                'next_time': rate_info['next_time'],
                                'prev_value': f"{rate_info['prev_value']:.2f}",
                                'next_value': f"{rate_info['next_value']:.2f}",
                                'time_window': rule.get('timeWindow', '5min')
                            }
                        })
                    continue

                metric_type = rule.get('metric_type', 'numeric')
                condition = rule.get('condition', '')
                threshold = rule.get('threshold', '0')
                
                strategy = HISTORY_COMPARISON_STRATEGY.get((metric_type, condition))
                if not strategy:
                    continue

                if condition in ['==', '!=', 'in', 'not in', 'match']:
                    current_value = strategy(values, threshold)
                else:
                    current_value = strategy(values)

                if self._compare_values(current_value.get('metric_value', '0'), threshold, condition):
                    if self._get_severity_level(rule_severity) > self._get_severity_level(highest_severity):
                        highest_severity = rule_severity
                        result.update(current_value)
                        result.update({
                            'severity': rule_severity,
                            'triggered_rule': {
                                'type': metric_type,
                                'condition': condition,
                                'threshold': threshold,
                                'status': rule_severity,
                                'impact_analysis': rule.get('impact_analysis', ''),
                                'suggestion': rule.get('suggestion', '')
                            }
                        })

            except Exception as e:
                logger.exception(f"处理历史数据失败: {str(e)}")
                continue
        return result

    def _evaluate_condition(self, metric_value, rules):
        """评估条件并返回状态"""
        if not rules or not metric_value:
            return 'info', None

        highest_severity = 'info'
        triggered_rule = None

        for rule in rules:
            condition = rule.get('condition', '')
            threshold = rule.get('threshold', '0')
            
            if self._compare_values(metric_value, threshold, condition):
                severity = rule.get('status', 'info')
                if self._get_severity_level(severity) > self._get_severity_level(highest_severity):
                    highest_severity = severity
                    triggered_rule = rule

        return highest_severity, triggered_rule

    def _compare_values(self, value, threshold, condition):
        """比较值和阈值"""
        compare_func = VALUE_COMPARISON_OPERATORS.get(condition)
        if not compare_func:
            return False
        
        try:
            return compare_func(value, threshold)
        except (ValueError, TypeError) as e:
            logger.exception(f"值比较失败: value={value}, threshold={threshold}, condition={condition}")
            return False

    def _get_severity_level(self, severity):
        """获取严重级别的数值"""
        return SEVERITY_LEVELS.get(severity.lower(), 0)

class FaultTreeProcessor:
    """故障树处理器"""

    def __init__(self, stream_mode=False):
        """
        初始化处理器
        Args:
            stream_mode: 是否为流式模式，True时只生成树结构，不调用监控接口
        """
        self.cluster_info = None
        self.time_from = None
        self.time_till = None
        self.stream_mode = stream_mode
        self.cluster_info_provider = ClusterInfoProvider()
        self.metrics_processor = MetricsProcessor()

    def process_tree(self, tree_data, cluster_name, time_from=None, time_till=None):
        """处理故障树数据的主入口方法"""
        try:
            # 获取集群资源信息
            self.cluster_info = self._get_cluster_info(cluster_name)
            self.time_from = time_from
            self.time_till = time_till
            # 创建新的根节点使用集群名替换 'Root'
            processed_data = tree_data.copy()
            processed_data['name'] = cluster_name

            # 处理整个树
            processed_data = self._process_node(processed_data, parent_type=None)
            
            # 确保状态正确传播
            self._update_parent_status(processed_data)
            
            return processed_data
        except Exception as e:
            logger.exception(f"处理故障树数据失败: {str(e)}")
            return tree_data

    def _get_cluster_info(self, cluster_name):
        """从资源池获取集群信息"""
        return self.cluster_info_provider.get_cluster_info(cluster_name)

    def _get_severity_level(self, severity):
        """获取严重级别的数值"""
        return SEVERITY_LEVELS.get(severity.lower(), 0)

    def _process_node(self, node, parent_type=None):
        """处理单个节点"""
        if not node:
            return node

        processed_node = node.copy()
        processed_node.update(self._process_node_type(node, parent_type))
        processed_node.update(self._process_instance_info(processed_node))
        processed_node.update(self._process_metrics_info(processed_node))
        processed_node.update(self._process_children(processed_node, processed_node.get('node_type')))
        
        return processed_node

    def _process_node_type(self, node, parent_type):
        """处理节点类型"""
        node_name = node['name'].lower()
        return {
            'node_type': node_name if node_name in ['db', 'proxy', 'manager'] else parent_type
        }

    def _process_instance_info(self, node):
        """处理实例信息"""
        updates = {}
        node_type = node.get('node_type')
        
        if not (self.cluster_info and node_type and node_type in self.cluster_info):
            return updates
        
        instance_info = self.cluster_info[node_type].get(node['name'])
        if not instance_info:
            return updates
        
        instance_info_copy = instance_info.copy()
        ip_info = f"[{instance_info['ip']}:{instance_info['port']}]"
        updates.update({
            'instance_info': instance_info_copy,
            'ip_port': instance_info_copy,
            'description': f"{node.get('description', '')} {ip_info}".strip()
        })
        
        self._add_instance_info_to_children(node, instance_info_copy)
        return updates

    def _process_metrics_info(self, node):
        """处理监控指标信息"""
        if 'metric_name' not in node:
            return {}
        
        # 流式模式下，只添加基础信息，不调用监控接口
        if self.stream_mode:
            return {
                'node_status': 'info',
                'description': f"待获取指标: {node['metric_name']}"
            }
        
        metric = {
            'source': node['data_source'].get('source', ''),
            'type': node['data_source'].get('type', ''),
            'metric_name': node['metric_name'],
            'rules': node.get('rules', [])
        }
        self._process_metrics(metric, node)
        return {}

    def _process_children(self, node, node_type):
        """处理子节点"""
        if not node.get('children'):
            return {}
        
        children = [
            self._process_node(child, node_type)
            for child in node['children']
        ]
        
        # 更新当前节点的状态
        highest_severity = 'info'
        for child in children:
            child_status = child.get('node_status', 'info')
            if self._get_severity_level(child_status) > self._get_severity_level(highest_severity):
                highest_severity = child_status
        
        # 如果子节点有更高级别的状态，更新当前节点
        if self._get_severity_level(highest_severity) > self._get_severity_level(node.get('node_status', 'info')):
            node['node_status'] = highest_severity
            
        return {'children': children}

    def _add_instance_info_to_children(self, node, instance_info):
        """
        递归地将实例信息添加到所有子节点
        Args:
            node: 当前节点
            instance_info: 要添���的实例信息
        """
        if not node.get('children'):
            return

        for child in node['children']:
            # 添加实例信息到子节点，使用copy()创建副本
            child['ip_port'] = instance_info.copy()
            # 递归处理子节点的子节点
            self._add_instance_info_to_children(child, instance_info)

    def _process_metrics(self, metric, node):
        """处理节点的监控指标"""
        self.metrics_processor.time_from = self.time_from
        self.metrics_processor.time_till = self.time_till
        self.metrics_processor.process_metrics(metric, node)

    def _update_parent_status(self, node):
        """更新父节点状态"""
        if not node.get('children'):
            return

        highest_severity = 'info'
        for child in node['children']:
            # 递归更新子节点的状态
            self._update_parent_status(child)
            
            # 获取子节点状态
            child_status = child.get('node_status', 'info')
            if self._get_severity_level(child_status) > self._get_severity_level(highest_severity):
                highest_severity = child_status
        
        # 更新当前节点状态
        if self._get_severity_level(highest_severity) > self._get_severity_level(node.get('node_status', 'info')):
            node['node_status'] = highest_severity

    def _safe_convert_values(self, value, threshold, value_type):
        """安全地转换值类型"""
        try:
            if value_type in ('numeric', 'float'):
                return float(value), float(threshold)
            return str(value), str(threshold)
        except (ValueError, TypeError):
            logger.exception(f"值转换失败: value={value}, threshold={threshold}, type={value_type}")
            return None

    def process_node_metrics(self, node):
        """
        处理单个节点的监控数据
        仅在非流式模式下调用监控接口
        """
        if not node.get('metric_name') or not node.get('ip_port'):
            return node

        try:
            metric = {
                'source': node['data_source'].get('source', ''),
                'type': node['data_source'].get('type', ''),
                'metric_name': node['metric_name'],
                'rules': node.get('rules', [])
            }
            
            handler = HandlerManager.init_metric_handlers(
                handler_name=metric['source'],
                handler_type='data'
            )
            
            if not handler:
                raise ValueError(f"Unsupported data source: {metric['source']}")
            
            values = handler(node['ip_port'], metric['metric_name'], self.time_from, self.time_till)
            
            if node.get('rules') and values:
                self._evaluate_child_rules(node, values)
                
        except Exception as e:
            logger.exception(f"处理指标{node['metric_name']}失败: {str(e)}")
            node['node_status'] = 'error'
            node['description'] = f"处理失败: {str(e)}"
        
        return node

    def _evaluate_rate_change(self, values, rule):
        """评估指标变化率，适用于逆序（新到旧）的数据"""
        return RateChangeEvaluator.evaluate(values, rule)

def generate_tree_data(fault_tree_config, cluster_name, fault_case):
    """
    生成故障树数据的生成器函数
    
    Args:
        fault_tree_config (dict): 故障树配置
        cluster_name (str): 集群名称
        fault_case (str): 故障场景名称
        
    Yields:
        str: 格式化的SSE数据
    """
    try:
        # 初始化为流式模式，只生成树结构
        processor = FaultTreeProcessor(stream_mode=True)
        processor.cluster_info = processor._get_cluster_info(cluster_name)
        base_tree = processor.process_tree(fault_tree_config, cluster_name)
        
        # 1. 发送开始消息
        yield 'data: ' + json.dumps({
            'type': 'start',
            'data': {
                'message': f'开始分析 {cluster_name} 集群的 {fault_case} 场景',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        }) + '\n\n'

        time.sleep(0.1)

        def traverse_tree(node):
            """遍历树并处理节点"""
            node_key = node.get('key')
            current_node = node.copy()

            # 构建基础点数据
            node_data = {
                'key': node_key,
                'name': current_node.get('name'),
                'title': current_node.get('title'),
                'parent_id': node_key.rsplit('->', 1)[0] if '->' in node_key else None,
                'type': 'custom-node',
                'metric_name': current_node.get('metric_name'),
                'description': current_node.get('description', ''),
                'node_type': current_node.get('node_type'),
                'node_status': current_node.get('node_status', 'info'),
                'instance_info': current_node.get('instance_info'),
                'ip_port': current_node.get('ip_port'),
                'data_source': current_node.get('data_source'),
                'children': []
            }

            # 如果是指标节点，则获取监控数据
            if ('data_source' in current_node and 
                'metric_name' in current_node and 
                current_node.get('ip_port')):
                try:
                    logger.info(f"处理指标节点: {current_node.get('name')}, metric: {current_node.get('metric_name')}")
                    handler = HandlerManager.init_metric_handlers(
                        handler_name=current_node['data_source'].get('source', ''),
                        handler_type='data'
                    )
                    
                    if handler:
                        values = handler(
                            current_node['ip_port'], 
                            current_node['metric_name'], 
                            processor.time_from, 
                            processor.time_till
                        )
                        
                        if values and current_node.get('rules'):
                            # 更新节点状态和描述
                            processor._evaluate_child_rules(current_node, values)
                            node_data.update({
                                'node_status': current_node.get('node_status'),
                                'description': current_node.get('description'),
                                'value': current_node.get('metric_value'),
                                'metric_extra_info': current_node.get('metric_extra_info')
                            })
                except Exception as e:
                    logger.exception(f"获取监控指标失败: {str(e)}")
                    node_data.update({
                        'node_status': 'error',
                        'description': f"获取监控数据失败: {str(e)}"
                    })

            # 送前节点数据
            yield 'data: ' + json.dumps({
                'type': 'node',
                'data': node_data
            }) + '\n\n'

            time.sleep(0.1)

            # 继续处理子节点
            for child in node.get('children', []):
                yield from traverse_tree(child)

        # 2. 遍历树，遇到指标节点时获取监控数据
        yield from traverse_tree(base_tree)

        # 3. 发送完成消息
        yield 'data: ' + json.dumps({
            'type': 'complete',
            'data': {
                'message': '分析完成',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        }) + '\n\n'

    except Exception as e:
        logger.exception(f"生成故障树数据失败: {str(e)}")
        yield 'data: ' + json.dumps({
            'type': 'error',
            'data': {
                'message': f'处理出错: {str(e)}',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        }) + '\n\n'
