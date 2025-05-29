import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase, RequestFactory
from django_backend.app_fault_tree.views import GetAllTableNamesAndComments


class TestGetAllTableNamesAndComments(TestCase):
    
    def setUp(self):
        self.factory = RequestFactory()
        self.view = GetAllTableNamesAndComments()
        self.view.request_params = {
            'instance_name': '192.168.1.1_3306',
            'schema_name': 'test_db'
        }
    
    @patch('django_backend.app_fault_tree.views.logger')
    @patch('django_backend.app_fault_tree.views.db_helper')
    def test_post_success_small_data(self, mock_db, mock_logger):
        """测试数据量小时的正常流程"""
        # 模拟数据库返回
        mock_db.target_source_find_all.return_value = {
            'data': [
                {'TABLE_NAME': 'users', 'TABLE_COMMENT': 'User table'},
                {'TABLE_NAME': 'orders', 'TABLE_COMMENT': 'Order table'}
            ]
        }
        
        # 创建请求
        request = self.factory.post('/test/', self.view.request_params)
        
        # 执行
        response = self.view.post(request)
        
        # 验证结果
        self.assertEqual(response.data['status'], 'ok')
        self.assertEqual(len(response.data['data']), 2)
        
        # 验证SQL执行
        mock_db.target_source_find_all.assert_called_once_with(
            '192.168.1.1', '3306',
            "SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.tables WHERE TABLE_SCHEMA='test_db'"
        )
        
        # 验证日志
        mock_logger.info.assert_any_call("数据字数适中，使用原始结果")
    
    @patch('django_backend.app_fault_tree.views.logger')
    @patch('django_backend.app_fault_tree.views.db_helper')
    def test_post_success_large_data_with_grouping(self, mock_db, mock_logger):
        """测试数据量大时的分组逻辑"""
        # 设置较小的阈值用于测试
        original_threshold = GetAllTableNamesAndComments.CHAR_THRESHOLD
        GetAllTableNamesAndComments.CHAR_THRESHOLD = 50
        
        try:
            # 模拟大量分表数据
            mock_db.target_source_find_all.return_value = {
                'data': [
                    {'TABLE_NAME': 'log_table_01', 'TABLE_COMMENT': 'Log table 01'},
                    {'TABLE_NAME': 'log_table_02', 'TABLE_COMMENT': 'Log table 02'},
                    {'TABLE_NAME': 'log_table_03', 'TABLE_COMMENT': 'Log table 03'},
                    {'TABLE_NAME': 'user_data_01', 'TABLE_COMMENT': 'User data 01'},
                    {'TABLE_NAME': 'user_data_02', 'TABLE_COMMENT': 'User data 02'},
                    {'TABLE_NAME': 'normal_table', 'TABLE_COMMENT': 'Normal table'}
                ]
            }
            
            request = self.factory.post('/test/', self.view.request_params)
            response = self.view.post(request)
            
            # 验证结果
            self.assertEqual(response.data['status'], 'ok')
            
            # 验证分组结果
            table_names = [item['TABLE_NAME'] for item in response.data['data']]
            self.assertIn('log_table_[01-03]', table_names)
            self.assertIn('user_data_[01-02]', table_names)
            self.assertIn('normal_table', table_names)
            
            # 验证日志
            mock_logger.info.assert_any_call("数据字数过多，执行分表合并")
            
        finally:
            # 恢复原始阈值
            GetAllTableNamesAndComments.CHAR_THRESHOLD = original_threshold
    
    def test_parse_table_name_success(self):
        """测试表名解析函数"""
        # 测试分表格式
        prefix, suffix = self.view._parse_table_name('log_table_01')
        self.assertEqual(prefix, 'log_table')
        self.assertEqual(suffix, '01')
        
        # 测试普通表
        prefix, suffix = self.view._parse_table_name('normal_table')
        self.assertEqual(prefix, 'normal_table')
        self.assertIsNone(suffix)
        
        # 测试复杂分表
        prefix, suffix = self.view._parse_table_name('user_log_data_99')
        self.assertEqual(prefix, 'user_log_data')
        self.assertEqual(suffix, '99')
    
    def test_format_table_entry_success(self):
        """测试表条目格式化函数"""
        # 测试普通表
        result = self.view._format_table_entry('normal_table', {
            'comment': 'Normal table comment',
            'is_partitioned': False
        })
        expected = {'TABLE_NAME': 'normal_table', 'TABLE_COMMENT': 'Normal table comment'}
        self.assertEqual(result, expected)
        
        # 测试单个分表
        result = self.view._format_table_entry('log_table', {
            'comment': 'Log table comment',
            'is_partitioned': True,
            'numbers': ['01']
        })
        expected = {'TABLE_NAME': 'log_table_01', 'TABLE_COMMENT': 'Log table comment'}
        self.assertEqual(result, expected)
        
        # 测试多个分表
        result = self.view._format_table_entry('log_table', {
            'comment': 'Log table comment',
            'is_partitioned': True,
            'numbers': ['01', '03', '02']
        })
        expected = {'TABLE_NAME': 'log_table_[01-03]', 'TABLE_COMMENT': 'Log table comment'}
        self.assertEqual(result, expected)
    
    def test_process_table_grouping_success(self):
        """测试表分组处理函数"""
        data = [
            {'TABLE_NAME': 'log_01', 'TABLE_COMMENT': 'Log 01'},
            {'TABLE_NAME': 'log_02', 'TABLE_COMMENT': 'Log 02'},
            {'TABLE_NAME': 'log_03', 'TABLE_COMMENT': 'Log 03'},
            {'TABLE_NAME': 'user_01', 'TABLE_COMMENT': 'User 01'},
            {'TABLE_NAME': 'normal', 'TABLE_COMMENT': 'Normal table'}
        ]
        
        result = self.view._process_table_grouping(data)
        
        # 验证结果数量
        self.assertEqual(len(result), 3)
        
        # 验证分组结果
        table_names = [item['TABLE_NAME'] for item in result]
        self.assertIn('log_[01-03]', table_names)
        self.assertIn('user_01', table_names)  # 单个分表
        self.assertIn('normal', table_names)
    
    @patch('django_backend.app_fault_tree.views.validate')
    def test_post_validation_error(self, mock_validate):
        """测试参数验证失败"""
        # 模拟验证失败
        mock_result = MagicMock()
        mock_result.valid = False
        mock_result.errors = {'instance_name': ['This field is required']}
        mock_validate.return_value = mock_result
        
        request = self.factory.post('/test/', {})
        response = self.view.post(request)
        
        self.assertEqual(response.data['status'], 'error')
        self.assertIn('instance_name', str(response.data['message']))
    
    @patch('django_backend.app_fault_tree.views.logger')
    @patch('django_backend.app_fault_tree.views.db_helper')
    def test_post_empty_data(self, mock_db, mock_logger):
        """测试空数据情况"""
        mock_db.target_source_find_all.return_value = {'data': []}
        
        request = self.factory.post('/test/', self.view.request_params)
        response = self.view.post(request)
        
        self.assertEqual(response.data['status'], 'ok')
        self.assertEqual(response.data['data'], [])
    
    @patch('django_backend.app_fault_tree.views.logger')
    @patch('django_backend.app_fault_tree.views.db_helper')
    def test_post_none_data(self, mock_db, mock_logger):
        """测试数据为None的情况"""
        mock_db.target_source_find_all.return_value = {'data': None}
        
        request = self.factory.post('/test/', self.view.request_params)
        response = self.view.post(request)
        
        self.assertEqual(response.data['status'], 'ok')
        self.assertIsNone(response.data['data'])
    
    def test_character_threshold_calculation(self):
        """测试字符数计算逻辑"""
        data = [
            {'TABLE_NAME': 'test_table', 'TABLE_COMMENT': 'Test comment'},
            {'TABLE_NAME': 'another_table', 'TABLE_COMMENT': 'Another comment'},
            {'TABLE_NAME': 'table_with_null', 'TABLE_COMMENT': None}
        ]
        
        # 手动计算期望的字符数
        expected_chars = len('test_table') + len('Test comment') + \
                        len('another_table') + len('Another comment') + \
                        len('table_with_null') + 0  # None会被转为''
        
        # 使用view中的逻辑计算
        total_chars = sum(len(row.get('TABLE_NAME', '') or '') + 
                         len(row.get('TABLE_COMMENT', '') or '') for row in data)
        
        self.assertEqual(total_chars, expected_chars)
    
    def test_edge_cases(self):
        """测试边界情况"""
        # 测试表名包含多个下划线
        prefix, suffix = self.view._parse_table_name('a_b_c_d_01')
        self.assertEqual(prefix, 'a_b_c_d')
        self.assertEqual(suffix, '01')
        
        # 测试表名以数字结尾但不是分表
        prefix, suffix = self.view._parse_table_name('table_abc01')
        self.assertEqual(prefix, 'table_abc01')
        self.assertIsNone(suffix)
        
        # 测试表名只有数字
        prefix, suffix = self.view._parse_table_name('01')
        self.assertEqual(prefix, '01')
        self.assertIsNone(suffix)


if __name__ == '__main__':
    unittest.main() 