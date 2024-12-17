import re
from .handler_manager import HandlerManager
from apps.utils import db_helper
import logging
logger = logging.getLogger('log')


class FaultTreeProcessor:
    """故障树处理器"""

    def __init__(self):
        self.cluster_info = None
        self.time_from = None
        self.time_till = None

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
            return processed_data
        except Exception as e:
            logger.error(f"处理故障树数据失败: {str(e)}")
            return tree_data

    def _get_cluster_info(self, cluster_name):
        """从资源池获取集群信息"""
        init_cluster_info = {
            'db': {},
            'proxy': {},
            'manager': {}
        }
        mock_cluster_info = {
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
        sql = f"""
            select 
                ip,
                port,
                case instance_role when 'M' then '主' when 'S' then '备' else '未知' end instance_role
            from mysql_cluster_instance where cluster_name='{cluster_name}'
        """
        db_info = db_helper.find_all(sql)['data']
        for item in db_info:
            init_cluster_info['dbb'][item['instance_role']] = {'ip': item['ip'], 'port': item['port']}
        return mock_cluster_info

    def _get_severity_level(self, severity):
        """获取严重级别的数值"""
        severity_levels = {
            'info': 0,
            'warning': 1,
            'error': 2
        }
        return severity_levels.get(severity.lower(), 0)

    def _process_node(self, node, parent_type=None):
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

    def _add_instance_info_to_children(self, node, instance_info):
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

    def _get_instance_info(self, node_name, node_type):
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

    def _process_metrics(self, metric, node):
        """处理节点的监控指标"""
        handler_name = metric.get('source', '')
        metric_name = metric.get('metric_name').strip()
        instance_info = node.get('ip_port')
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
            # 更新节点描述，含触发的规则信息
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

    def _evaluate_condition(self, metric_value, rules):
        """评估条件并返回状态"""
        if not rules or not metric_value:
            return 'info', None

        numeric_operators = {
            '>': lambda x, y: x > y,
            '<': lambda x, y: x < y,
            '>=': lambda x, y: x >= y,
            '<=': lambda x, y: x <= y,
            '==': lambda x, y: x == y
        }

        comparison_operators = {
            'numeric': numeric_operators,
            'float': numeric_operators,
            'str': {
                '==': lambda x, y: x == y,
                '!=': lambda x, y: x != y,
                'in': lambda x, y: y in x,
                'not in': lambda x, y: y not in x,
                'match': lambda x, y: bool(re.compile(y).search(x)) if self._is_valid_regex(y) else False
            }
        }

        highest_severity = 'info'
        triggered_rule = None

        for rule in rules:
            metric_type = rule.get('type', 'numeric')
            condition = rule.get('condition', '')
            operators = comparison_operators.get(metric_type, {})
            compare_func = operators.get(condition)
            
            if not compare_func:
                continue

            value_pair = self._safe_convert_values(
                metric_value, 
                rule.get('threshold', '0'), 
                metric_type
            )
            if not value_pair:
                continue

            value_converted, threshold_converted = value_pair
            if compare_func(value_converted, threshold_converted):
                severity = rule.get('status', 'info')
                if self._get_severity_level(severity) > self._get_severity_level(highest_severity):
                    highest_severity = severity
                    triggered_rule = rule

        return highest_severity, triggered_rule

    def _get_history_abnormal_value(self, values, rules):
        """根据规则获取异常值"""
        if not rules or not values:
            return values[0]

        rule = rules[0]
        metric_type = rule.get('metric_type', 'numeric')
        condition = rule.get('condition', '')
        threshold = rule.get('threshold', '0')

        comparison_strategy = {
            ('numeric', '>'): lambda vs: max(vs, key=lambda x: float(x.get('metric_value', 0))),
            ('numeric', '<'): lambda vs: min(vs, key=lambda x: float(x.get('metric_value', 0))),
            ('numeric', '>='): lambda vs: max(vs, key=lambda x: float(x.get('metric_value', 0))),
            ('numeric', '<='): lambda vs: min(vs, key=lambda x: float(x.get('metric_value', 0))),
            ('numeric', '=='): lambda vs: min(vs, key=lambda x: abs(float(x.get('metric_value', 0)) - float(threshold))),
            ('float', '>'): lambda vs: max(vs, key=lambda x: float(x.get('metric_value', 0))),
            ('float', '<'): lambda vs: min(vs, key=lambda x: float(x.get('metric_value', 0))),
            ('float', '>='): lambda vs: max(vs, key=lambda x: float(x.get('metric_value', 0))),
            ('float', '<='): lambda vs: min(vs, key=lambda x: float(x.get('metric_value', 0))),
            ('float', '=='): lambda vs: min(vs, key=lambda x: abs(float(x.get('metric_value', 0)) - float(threshold))),
            ('str', '=='): lambda vs: next((v for v in vs if v.get('metric_value') == threshold), values[0]),
            ('str', '!='): lambda vs: next((v for v in vs if v.get('metric_value') != threshold), values[0]),
            ('str', 'in'): lambda vs: next((v for v in vs if threshold in str(v.get('metric_value', ''))), values[0]),
            ('str', 'not in'): lambda vs: next((v for v in vs if threshold not in str(v.get('metric_value', ''))), values[0]),
            ('str', 'match'): lambda vs: next((v for v in vs if self._evaluate_regex_match(str(v.get('metric_value', '')), threshold)), values[0])
        }

        strategy = comparison_strategy.get((metric_type, condition))
        return strategy(values) if strategy else values[0]

    def _format_metric_value(self, value, units):
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

    def _update_parent_status(self, node):
        """更新父节点状态"""
        if not node.get('children'):
            return

        highest_severity = 'info'
        for child in node['children']:
            child_status = child.get('node_status', 'info')
            if self._get_severity_level(child_status) > self._get_severity_level(highest_severity):
                highest_severity = child_status
        node['node_status'] = highest_severity

    def _safe_convert_values(self, value, threshold, value_type):
        """安全地转换值类型"""
        try:
            if value_type in ('numeric', 'float'):
                return float(value), float(threshold)
            return str(value), str(threshold)
        except (ValueError, TypeError):
            logger.error(f"值转换失败: value={value}, threshold={threshold}, type={value_type}")
            return None
