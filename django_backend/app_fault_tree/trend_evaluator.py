import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class TrendAlgorithm:
    """趋势评估算法基类"""
    
    @staticmethod
    def calculate(values, rule):
        """
        计算趋势变化
        Args:
            values (list): 指标值列表，按时间逆序排列
            rule (dict): 规则配置
        Returns:
            tuple: (是否触发规则, 变化详情)
        """
        raise NotImplementedError("Subclasses must implement calculate()")

class SimpleRateAlgorithm(TrendAlgorithm):
    """简单变化率算法：相邻两点的变化率"""
    
    @staticmethod
    def calculate(values, rule):
        if len(values) < 2:
            return False, {'rate': 0}
            
        time_window = rule.get('timeWindow', 300)
        threshold = float(rule.get('threshold', 0))
        is_increase_rule = threshold > 0
        
        max_change = {'rate': 0}
        
        for i in range(len(values) - 1):
            prev_point = values[i]
            next_point = values[i + 1]
            
            # 检查时间窗口
            time_diff = (prev_point['metric_time'] - next_point['metric_time']).total_seconds()
            if time_diff > time_window:
                continue
                
            try:
                prev_value = float(prev_point['metric_value'])
                next_value = float(next_point['metric_value'])
                
                # 计算变化率
                rate = ((next_value - prev_value) / prev_value * 100) if prev_value != 0 else 0
                
                # 更新最大变化
                if abs(rate) > abs(max_change['rate']):
                    max_change = {
                        'rate': rate,
                        'prev_time': prev_point['metric_time'],
                        'next_time': next_point['metric_time'],
                        'prev_value': prev_value,
                        'next_value': next_value,
                        'time_window': f"{time_diff}s"
                    }
                    
            except (ValueError, TypeError):
                continue
                
        # 检查是否触发规则
        if abs(max_change['rate']) > abs(threshold):
            return True, max_change
            
        return False, max_change

class MovingAverageAlgorithm(TrendAlgorithm):
    """移动平均算法：使用移动平均来平滑数据并检测��势"""
    
    @staticmethod
    def calculate(values, rule):
        if len(values) < 3:  # 至少需要3个点来计算移动平均
            return False, {'rate': 0}
            
        window_size = rule.get('windowSize', 3)
        threshold = float(rule.get('threshold', 0))
        is_increase_rule = threshold > 0
        
        # 计算移动平均
        moving_averages = []
        for i in range(len(values) - window_size + 1):
            window = values[i:i + window_size]
            try:
                avg = sum(float(v['metric_value']) for v in window) / window_size
                moving_averages.append({
                    'value': avg,
                    'time': window[0]['metric_time']
                })
            except (ValueError, TypeError):
                continue
                
        if len(moving_averages) < 2:
            return False, {'rate': 0}
            
        # 计算移动平均的变化率
        max_change = {'rate': 0}
        for i in range(len(moving_averages) - 1):
            prev_ma = moving_averages[i]
            next_ma = moving_averages[i + 1]
            
            try:
                rate = ((next_ma['value'] - prev_ma['value']) / prev_ma['value'] * 100) if prev_ma['value'] != 0 else 0
                
                if abs(rate) > abs(max_change['rate']):
                    max_change = {
                        'rate': rate,
                        'prev_time': prev_ma['time'],
                        'next_time': next_ma['time'],
                        'prev_value': prev_ma['value'],
                        'next_value': next_ma['value'],
                        'window_size': window_size
                    }
            except (ValueError, TypeError):
                continue
                
        # 检查是否触发规则
        if abs(max_change['rate']) > abs(threshold):
            return True, max_change
            
        return False, max_change

class RateChangeEvaluator:
    """变化率评估器，支持多种趋势评估算法"""
    
    ALGORITHMS = {
        'simple': SimpleRateAlgorithm,
        'moving_average': MovingAverageAlgorithm
    }
    
    @classmethod
    def evaluate(cls, values, rule):
        """
        评估指标变化率
        Args:
            values (list): 指标值列表，按时间逆序排列
            rule (dict): 规则配置，包含算法类型和参数
        Returns:
            tuple: (是否触发规则, 变化详情)
        """
        algorithm_type = rule.get('algorithmType', 'simple')
        algorithm_class = cls.ALGORITHMS.get(algorithm_type)
        
        if not algorithm_class:
            logger.warning(f"Unsupported algorithm type: {algorithm_type}, falling back to simple")
            algorithm_class = SimpleRateAlgorithm
            
        return algorithm_class.calculate(values, rule) 