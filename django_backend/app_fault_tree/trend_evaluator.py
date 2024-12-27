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
        
        # 计算相邻时间点的间隔
        time1 = datetime.strptime(values[0]['metric_time'], '%Y-%m-%d %H:%M:%S')
        time2 = datetime.strptime(values[1]['metric_time'], '%Y-%m-%d %H:%M:%S')
        interval = abs((time2 - time1).total_seconds())
        
        # 计算一个时间窗口内应该包含的点数
        points_per_window = int(time_window / interval) + 1
        
        # 如果总点数小于等于时间窗口的点数，直接作为一个块
        if len(values) <= points_per_window:
            if len(values) >= 2:
                blocks = [(values, abs((datetime.strptime(values[-1]['metric_time'], '%Y-%m-%d %H:%M:%S') - 
                                     datetime.strptime(values[0]['metric_time'], '%Y-%m-%d %H:%M:%S')).total_seconds()))]
            else:
                blocks = []
        else:
            blocks = SimpleRateAlgorithm._split_into_blocks(values, points_per_window)
            
        if not blocks:
            return False, {'rate': 0}
            
        # 计算每个块内的最大变化率
        max_change = {'rate': 0}
        
        for block, actual_window in blocks:
            try:
                min_point, max_point = SimpleRateAlgorithm._find_min_max(block)
                rate = SimpleRateAlgorithm._calculate_rate(
                    min_point if threshold > 0 else max_point,
                    max_point if threshold > 0 else min_point,
                    unit
                )
                
                # 更新最大变化
                if (threshold > 0 and rate > max_change['rate']) or (threshold < 0 and rate < max_change['rate']):
                    max_change = {
                        'rate': rate,
                        'prev_time': min_point['metric_time'],
                        'next_time': max_point['metric_time'],
                        'prev_value': float(min_point['metric_value']),
                        'next_value': float(max_point['metric_value']),
                        'time_window': f"{actual_window}s",
                        'actual_window': actual_window,
                        'expected_window': time_window
                    }
                    
            except (ValueError, TypeError) as e:
                logger.warning(f"Error processing block: {e}")
                continue
                
        # 检查是否触发规则
        if threshold > 0:  # 增长规则
            return max_change['rate'] > threshold, max_change
        else:  # 下降规则
            return max_change['rate'] < threshold, max_change

    @staticmethod
    def _split_into_blocks(values, points_per_window):
        """将数据分割成块，并计算每个块的实际时间窗口"""
        blocks = []
        for i in range(0, len(values), points_per_window-1):  # 减1以确保至有2个点
            block = values[i:i + points_per_window]
            if len(block) >= 2:
                first_time = datetime.strptime(block[0]['metric_time'], '%Y-%m-%d %H:%M:%S')
                last_time = datetime.strptime(block[-1]['metric_time'], '%Y-%m-%d %H:%M:%S')
                actual_window = abs((last_time - first_time).total_seconds())
                blocks.append((block, actual_window))
        return blocks
    
    @staticmethod
    def _find_min_max(block):
        """找到块中的最小值和最大值"""
        values_in_block = [(float(point['metric_value']), point) for point in block]
        min_value, min_point = min(values_in_block, key=lambda x: x[0])
        max_value, max_point = max(values_in_block, key=lambda x: x[0])
        return min_point, max_point
    
    @staticmethod
    def _calculate_rate(base_point, target_point, unit):
        """计算变化率"""
        base_value = float(base_point['metric_value'])
        if base_value != 0:
            rate = (float(target_point['metric_value']) - base_value) / base_value
            if unit != '%':
                rate *= 100
        else:
            rate = 0
        return rate

class MovingAverageAlgorithm(TrendAlgorithm):
    """移动平均算法：使用移动平均计算趋势变化"""
    
    @staticmethod
    def calculate(values, rule):
        if len(values) < 2:
            return False, {'rate': 0}
            
        time_window = rule.get('timeWindow', 300)  # 默认5分钟
        threshold = float(rule.get('threshold', 0))
        unit = values[0].get('metric_units', '')
        
        # 计算相邻时间点的间隔
        time1 = datetime.strptime(values[0]['metric_time'], '%Y-%m-%d %H:%M:%S')
        time2 = datetime.strptime(values[1]['metric_time'], '%Y-%m-%d %H:%M:%S')
        interval = abs((time2 - time1).total_seconds())
        
        # 计算一个时间窗口内应该包含的点数
        window_size = min(int(time_window / interval) + 1, len(values))
        
        # 计算移动平均
        ma_values = []
        for i in range(len(values) - window_size + 1):
            window = values[i:i + window_size]
            try:
                ma_value = sum(float(point['metric_value']) for point in window) / len(window)
                window_start_time = datetime.strptime(window[-1]['metric_time'], '%Y-%m-%d %H:%M:%S')
                window_end_time = datetime.strptime(window[0]['metric_time'], '%Y-%m-%d %H:%M:%S')
                actual_window = abs((window_end_time - window_start_time).total_seconds())
                
                ma_values.append({
                    'value': ma_value,
                    'time': window[0]['metric_time'],
                    'actual_window': actual_window
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
                        'time_window': f"{prev_ma['actual_window']}s",
                        'actual_window': prev_ma['actual_window'],
                        'expected_window': time_window
                    }
            except (ValueError, TypeError):
                continue
                
        # 检查是否触发规则
        if threshold > 0:  # 增长规则
            return max_change['rate'] > threshold, max_change
        else:  # 下降规则
            return max_change['rate'] < threshold, max_change

class InstantRateAlgorithm(TrendAlgorithm):
    """瞬时变化率算法：计算相邻数据点之间的变化率"""
    
    @staticmethod
    def calculate(values, rule):
        if len(values) < 2:
            return False, {'rate': 0}
            
        threshold = float(rule.get('threshold', 0))
        unit = values[0].get('metric_units', '')
        
        # 计算所有相邻点的变化率
        max_change = {'rate': 0}
        
        for i in range(len(values) - 1):
            curr_point = values[i]
            next_point = values[i + 1]
            
            try:
                curr_value = float(curr_point['metric_value'])
                next_value = float(next_point['metric_value'])
                
                if next_value != 0:
                    rate = (curr_value - next_value) / next_value
                    if unit != '%':
                        rate *= 100
                else:
                    rate = 0
                
                # 计算时间间隔
                curr_time = datetime.strptime(curr_point['metric_time'], '%Y-%m-%d %H:%M:%S')
                next_time = datetime.strptime(next_point['metric_time'], '%Y-%m-%d %H:%M:%S')
                time_diff = abs((curr_time - next_time).total_seconds())
                
                # 更新最大变化
                if (threshold > 0 and rate > max_change['rate']) or \
                   (threshold < 0 and rate < max_change['rate']):
                    max_change = {
                        'rate': rate,
                        'prev_time': next_point['metric_time'],
                        'next_time': curr_point['metric_time'],
                        'prev_value': next_value,
                        'next_value': curr_value,
                        'time_window': f"{time_diff}s",
                        'actual_window': time_diff,
                        'expected_window': time_diff
                    }
                    
            except (ValueError, TypeError) as e:
                continue
                
        # 检查是否触发规则
        if threshold > 0:  # 增长规则
            return max_change['rate'] > threshold, max_change
        else:  # 下降规则
            return max_change['rate'] < threshold, max_change



class VarianceAlgorithm(TrendAlgorithm):
    """方差算法：检测数据的波动程度"""
    
    @staticmethod
    def calculate(values, rule):
        if len(values) < 2:
            return False, {'variance': 0}
            
        time_window = rule.get('timeWindow', 60)  # 默认1分钟
        threshold = float(rule.get('threshold', 0))  # 方差阈值
        
        # 计算相邻时间点的间隔
        time1 = datetime.strptime(values[0]['metric_time'], '%Y-%m-%d %H:%M:%S')
        time2 = datetime.strptime(values[1]['metric_time'], '%Y-%m-%d %H:%M:%S')
        interval = abs((time2 - time1).total_seconds())
        
        # 计算窗口大小
        window_size = min(int(time_window / interval) + 1, len(values))
        
        max_variance = {'variance': 0}
        
        # 使用滑动窗口计算方差
        for i in range(len(values) - window_size + 1):
            window = values[i:i + window_size]
            try:
                # 计算窗口内的均值
                values_in_window = [float(point['metric_value']) for point in window]
                mean = sum(values_in_window) / len(values_in_window)
                
                # 计算方差
                variance = sum((x - mean) ** 2 for x in values_in_window) / len(values_in_window)
                
                # 计算实际时间窗口
                window_start_time = datetime.strptime(window[-1]['metric_time'], '%Y-%m-%d %H:%M:%S')
                window_end_time = datetime.strptime(window[0]['metric_time'], '%Y-%m-%d %H:%M:%S')
                actual_window = abs((window_end_time - window_start_time).total_seconds())
                
                if variance > max_variance['variance']:
                    max_variance = {
                        'variance': variance,
                        'start_time': window[-1]['metric_time'],
                        'end_time': window[0]['metric_time'],
                        'mean': mean,
                        'time_window': f"{actual_window}s",
                        'actual_window': actual_window,
                        'expected_window': time_window
                    }
                    
            except (ValueError, TypeError) as e:
                continue
                
        # 检查是否触发规则
        return max_variance['variance'] > threshold, max_variance 


class RateChangeEvaluator:
    """
    变化评估器，支持多种趋势评估算法
    InstantRateAlgorithm: 最敏感，适合检测突发变化
    VarianceAlgorithm: 适合检测数据的不稳定性
    SimpleRateAlgorithm: 平衡了敏感度和稳定性
    MovingAverageAlgorithm: 最平滑，适合中长期趋势
    """
    
    ALGORITHMS = {
        'simple': SimpleRateAlgorithm,
        'moving_average': MovingAverageAlgorithm,
        'instant': InstantRateAlgorithm,
        'variance': VarianceAlgorithm
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
