import unittest
from unittest.mock import patch, MagicMock
from django_backend.app_fault_tree.fault_tree_utils import FaultTreeProcessor

class TestFaultTreeProcessor(unittest.TestCase):
    def setUp(self):
        self.processor = FaultTreeProcessor()
        # 模拟集群信息
        self.mock_cluster_info = {
            'db': {
                '主': {'ip': '192.168.1.1', 'port': '3306'},
                '备': {'ip': '192.168.1.2', 'port': '3306'}
            },
            'proxy': {
                '主': {'ip': '192.168.1.3', 'port': '8080'}
            },
            'manager': {}
        }
        # 模拟基础树数据
        self.mock_tree = {
            'name': 'Root',
            'children': [
                {
                    'name': '主',
                    'metric_name': 'mysql_status',
                    'data_source': {'source': 'zabbix', 'type': 'api'},
                    'rules': [
                        {
                            'type': 'numeric',
                            'condition': '>',
                            'threshold': '80',
                            'status': 'warning'
                        }
                    ]
                }
            ]
        }

    @patch('django_backend.app_fault_tree.fault_tree_utils.db_helper')
    def test_get_cluster_info(self, mock_db):
        """测试获取集群信息"""
        mock_db.find_all.return_value = {
            'data': [
                {'instance_name': '192.168.1.1_3306', 'instance_role': 'M'},
                {'instance_name': '192.168.1.2_3306', 'instance_role': 'S'}
            ]
        }
        
        result = self.processor._get_cluster_info('test_cluster')
        self.assertIn('db', result)
        self.assertIn('主', result['db'])
        self.assertEqual(result['db']['主']['ip'], '192.168.1.1')
        self.assertEqual(result['db']['主']['port'], '3306')

    def test_format_metric_value(self):
        """测试指标值格式化"""
        # 测试百分比格式化
        self.assertEqual(self.processor._format_metric_value('85.5', '%'), '85.50 %')
        
        # 测试字节格式化
        self.assertEqual(self.processor._format_metric_value('1024', 'B'), '1.00 KB')
        self.assertEqual(self.processor._format_metric_value('1048576', 'B'), '1.00 MB')
        
        # 测试普通值
        self.assertEqual(self.processor._format_metric_value('100', 'ms'), '100 ms')
        
        # 测���异常值
        self.assertEqual(self.processor._format_metric_value('invalid', '%'), 'invalid')

    @patch('django_backend.app_fault_tree.fault_tree_utils.HandlerManager')
    def test_process_metrics(self, mock_handler):
        """测试指标处理"""
        # 模拟指标处理器返回值
        mock_handler.init_metric_handlers.return_value = lambda *args: [
            {'metric_value': '85', 'metric_time': '2024-01-01 00:00:00', 'metric_units': '%'}
        ]
        
        node = {
            'name': 'test_metric',
            'metric_name': 'cpu_usage',
            'data_source': {'source': 'zabbix', 'type': 'api'},
            'rules': [
                {
                    'type': 'numeric',
                    'condition': '>',
                    'threshold': '80',
                    'status': 'warning'
                }
            ],
            'ip_port': {'ip': '192.168.1.1', 'port': '3306'}
        }
        
        metric = {
            'source': 'zabbix',
            'type': 'api',
            'metric_name': 'cpu_usage',
            'rules': node['rules']
        }
        
        self.processor._process_metrics(metric, node)
        self.assertEqual(node['node_status'], 'warning')

    @patch('django_backend.app_fault_tree.fault_tree_utils.HandlerManager')
    def test_process_tree(self, mock_handler):
        """测试完整树处理"""
        # 模拟数据库调用
        with patch('django_backend.app_fault_tree.fault_tree_utils.db_helper') as mock_db:
            mock_db.find_all.return_value = {
                'data': [
                    {'instance_name': '192.168.1.1_3306', 'instance_role': 'M'},
                    {'instance_name': '192.168.1.2_3306', 'instance_role': 'S'}
                ]
            }
            
            # 模拟指标处理器
            mock_handler.init_metric_handlers.return_value = lambda *args: [
                {'metric_value': '85', 'metric_time': '2024-01-01 00:00:00', 'metric_units': '%'}
            ]
            
            result = self.processor.process_tree(self.mock_tree, 'test_cluster')
            
            # 验证结果
            self.assertEqual(result['name'], 'test_cluster')
            self.assertTrue('children' in result)
            self.assertEqual(result['children'][0]['node_status'], 'warning')

    def test_evaluate_condition(self):
        """测试条件评估"""
        # 测试数值比较
        rules = [{
            'type': 'numeric',
            'condition': '>',
            'threshold': '80',
            'status': 'warning'
        }]
        severity, rule = self.processor._evaluate_condition('85', rules)
        self.assertEqual(severity, 'warning')
        
        # 测试字符串比较
        rules = [{
            'type': 'str',
            'condition': '==',
            'threshold': 'error',
            'status': 'error'
        }]
        severity, rule = self.processor._evaluate_condition('error', rules)
        self.assertEqual(severity, 'error')

    def test_process_node_type(self):
        """测试节点类型处理"""
        # 测试数据库节点
        node = {'name': 'db'}
        result = self.processor._process_node_type(node, None)
        self.assertEqual(result['node_type'], 'db')

        # 测试代理节点
        node = {'name': 'proxy'}
        result = self.processor._process_node_type(node, None)
        self.assertEqual(result['node_type'], 'proxy')

        # 测试继承父节点类型
        node = {'name': 'unknown'}
        result = self.processor._process_node_type(node, 'db')
        self.assertEqual(result['node_type'], 'db')

    def test_process_instance_info(self):
        """测试实例信息处理"""
        self.processor.cluster_info = self.mock_cluster_info
        
        # 测试数据库主节点
        node = {
            'name': '主',
            'node_type': 'db',
            'description': 'Database Master'
        }
        result = self.processor._process_instance_info(node)
        self.assertIn('instance_info', result)
        self.assertIn('ip_port', result)
        self.assertEqual(result['ip_port']['ip'], '192.168.1.1')
        self.assertEqual(result['ip_port']['port'], '3306')
        self.assertIn('[192.168.1.1:3306]', result['description'])

        # 测试无效节点类型
        node = {
            'name': 'invalid',
            'node_type': 'invalid'
        }
        result = self.processor._process_instance_info(node)
        self.assertEqual(result, {})

    def test_process_metrics_info(self):
        """测试指标信息处理"""
        # 测试有指标的节点
        node = {
            'metric_name': 'cpu_usage',
            'data_source': {'source': 'zabbix', 'type': 'api'},
            'rules': [{'condition': '>', 'threshold': '80'}]
        }
        with patch.object(self.processor, '_process_metrics') as mock_process:
            result = self.processor._process_metrics_info(node)
            mock_process.assert_called_once()
            self.assertEqual(result, {})

        # 测试无指标的节点
        node = {'name': 'no_metrics'}
        result = self.processor._process_metrics_info(node)
        self.assertEqual(result, {})

    def test_process_children(self):
        """测试子节点处理"""
        node = {
            'name': 'parent',
            'children': [
                {'name': 'child1'},
                {'name': 'child2'}
            ]
        }
        
        with patch.object(self.processor, '_process_node') as mock_process:
            mock_process.side_effect = lambda x, y: x
            result = self.processor._process_children(node, 'db')
            
            # 验证处理了所有子节点
            self.assertEqual(len(mock_process.call_args_list), 2)
            self.assertIn('children', result)
            self.assertEqual(len(result['children']), 2)

    def test_process_node_integration(self):
        """测试节点处理的集成测试"""
        self.processor.cluster_info = self.mock_cluster_info
        node = {
            'name': '主',
            'node_type': 'db',
            'description': 'Database Master',
            'metric_name': 'cpu_usage',
            'data_source': {'source': 'zabbix', 'type': 'api'},
            'rules': [{'condition': '>', 'threshold': '80'}],
            'children': [
                {'name': 'child1'}
            ]
        }

        with patch.object(self.processor, '_process_metrics'):
            result = self.processor._process_node(node, 'db')
            
            # 验证所有字段都被正确处理
            self.assertEqual(result['node_type'], 'db')
            self.assertIn('instance_info', result)
            self.assertIn('ip_port', result)
            self.assertIn('[192.168.1.1:3306]', result['description'])
            self.assertIn('children', result)

if __name__ == '__main__':
    unittest.main()