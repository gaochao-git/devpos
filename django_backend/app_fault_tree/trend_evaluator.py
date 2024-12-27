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
    """简单变化率算法：按时间窗口拆分数据块，计算块内最大变化率"""
    
    @staticmethod
    def calculate(values, rule):
        if len(values) < 2:
            return False, {'rate': 0}
            
        time_window = rule.get('timeWindow', 300)  # 默认5分钟
        threshold = float(rule.get('threshold', 0))
        unit = values[0].get('metric_units', '')        
        def parse_time(time_str):
            return datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
        
        # 计算相邻时间点的间隔
        time1 = parse_time(values[0]['metric_time'])
        time2 = parse_time(values[1]['metric_time'])
        interval = abs((time2 - time1).total_seconds())
        
        # 计算一个时间窗口内应该包含的点数
        points_per_window = int(time_window / interval) + 1
        
        # 如果总点数小于等于时间窗口的点数，直接作为一个块
        if len(values) <= points_per_window:
            if len(values) >= 2:
                # 计算实际的时间窗口
                first_time = parse_time(values[0]['metric_time'])
                last_time = parse_time(values[-1]['metric_time'])
                actual_window = abs((last_time - first_time).total_seconds())
                blocks = [(values, actual_window)]
            else:
                blocks = []
        else:
            # 按步长切分数据，确保每个块至少有2个点
            blocks = []
            for i in range(0, len(values), points_per_window):
                block = values[i:i + points_per_window]
                if len(block) >= 2:
                    # 计算每个块的实际时间窗口
                    first_time = parse_time(block[0]['metric_time'])
                    last_time = parse_time(block[-1]['metric_time'])
                    actual_window = abs((last_time - first_time).total_seconds())
                    blocks.append((block, actual_window))
        # 如果没有有效的块，返回无变化
        if not blocks: return False, {'rate': 0}
            
        # 计算每个块内的最大变化率
        max_change = {'rate': 0}
        
        for block, actual_window in blocks:
            try:
                # 获取块内的最大最小值
                values_in_block = [(float(point['metric_value']), point) for point in block]
                min_value, min_point = min(values_in_block, key=lambda x: x[0])
                max_value, max_point = max(values_in_block, key=lambda x: x[0])
                
                # 计算变化率
                base_value = min_value if threshold > 0 else max_value
                if base_value != 0:
                    rate = (max_value - min_value) / base_value
                    if unit != '%': rate *= 100
                else:
                    rate = 0
                # 更新最大变化
                if (threshold > 0 and rate > max_change['rate']) or (threshold < 0 and rate < max_change['rate']):
                    max_change = {
                        'rate': rate,
                        'prev_time': min_point['metric_time'],
                        'next_time': max_point['metric_time'],
                        'prev_value': min_value,
                        'next_value': max_value,
                        'time_window': f"{actual_window}s",
                        'actual_window': actual_window,  # 添加实际窗口大小
                        'expected_window': time_window   # 添加预期窗口大小
                    }
                    
            except (ValueError, TypeError) as e:
                logger.warning(f"Error processing block: {e}")
                continue
                
        # 检查是否触发规则
        if threshold > 0:  # 增长规则
            return max_change['rate'] > threshold, max_change
        else:  # 下降规则
            return max_change['rate'] < threshold, max_change

class MovingAverageAlgorithm(TrendAlgorithm):
    """移动平均算法：使用移动平均计算趋势变化"""
    
    @staticmethod
    def calculate(values, rule):
        if len(values) < 2:
            return False, {'rate': 0}
            
        window_size = rule.get('windowSize', 3)
        threshold = float(rule.get('threshold', 0))
        unit = values[0].get('metric_unit', '')  # 获取单位
        
        # 计算移动平均
        ma_values = []
        for i in range(len(values) - window_size + 1):
            window = values[i:i + window_size]
            try:
                ma_value = sum(float(point['metric_value']) for point in window) / window_size
                ma_values.append({
                    'value': ma_value,
                    'time': window[-1]['metric_time']
                })
            except (ValueError, TypeError):
                continue
                
        if len(ma_values) < 2:
            return False, {'rate': 0}
            
        # 计算最大变化率
        max_change = {'rate': 0}
        
        for i in range(len(ma_values) - 1):
            prev_ma = ma_values[i]
            next_ma = ma_values[i + 1]
            
            try:
                if prev_ma['value'] != 0:
                    rate = (next_ma['value'] - prev_ma['value']) / prev_ma['value']
                    # 只有在单位不是百分比时才乘以100
                    if unit != '%':
                        rate *= 100
                else:
                    rate = 0
                    
                if (threshold > 0 and rate > max_change['rate']) or \
                   (threshold < 0 and rate < max_change['rate']):
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
        if threshold > 0:  # 增长规则
            return max_change['rate'] > threshold, max_change
        else:  # 下降规则
            return max_change['rate'] < threshold, max_change

class RateChangeEvaluator:
    """变化评估器，支持多种趋势评估算法"""
    
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