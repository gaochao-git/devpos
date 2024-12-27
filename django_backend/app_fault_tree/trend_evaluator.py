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
        
        # 确保时间是 datetime 对象
        def parse_time(time_str):
            return datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
        
        # 检查数据排序方向（通过比较前两个时间点）
        time1 = parse_time(values[0]['metric_time'])
        time2 = parse_time(values[1]['metric_time'])
        is_reverse = time1 > time2
        
        # 如果是逆序，转换为正序以便处理
        sorted_values = values[::-1] if is_reverse else values[:]
        
        # 按时间窗口拆分数据块
        blocks = []
        start_idx = 0
        start_time = parse_time(sorted_values[0]['metric_time'])
        
        # 遍历数据点，按时间窗口分块
        for i, point in enumerate(sorted_values[1:], 1):
            current_time = parse_time(point['metric_time'])
            time_diff = (current_time - start_time).total_seconds()
            if time_diff > time_window:
                # 当前窗口结束，保存块
                if i - start_idx > 1:  # 确保块内至少有2个点
                    blocks.append(sorted_values[start_idx:i])
                # 开始新的窗口
                start_idx = i
                start_time = current_time
        
        # 添加最后一个块
        if len(sorted_values) - start_idx > 1:
            blocks.append(sorted_values[start_idx:])
            
        # 计算每个块内的最大变化率
        max_change = {'rate': 0}
        
        for block in blocks:
            try:
                # 获取块内的最大最小值
                values_in_block = [(float(point['metric_value']), point) for point in block]
                min_value, min_point = min(values_in_block, key=lambda x: x[0])
                max_value, max_point = max(values_in_block, key=lambda x: x[0])
                
                # 计算变化率
                base_value = min_value if threshold > 0 else max_value
                rate = ((max_value - min_value) / base_value * 100) if base_value != 0 else 0
                
                # 更新最大变化
                if (threshold > 0 and rate > max_change['rate']) or \
                   (threshold < 0 and rate < max_change['rate']):
                    max_change = {
                        'rate': rate,
                        'prev_time': min_point['metric_time'],
                        'next_time': max_point['metric_time'],
                        'prev_value': min_value,
                        'next_value': max_value,
                        'time_window': f"{(parse_time(max_point['metric_time']) - parse_time(min_point['metric_time'])).total_seconds()}s"
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
    """移动平均算法：使用移动平均来平滑数据并检测趋势"""
    
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
    """变化��评估器，支持多种趋势评估算法"""
    
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