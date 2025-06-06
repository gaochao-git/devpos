from validator import Required, In, validate, Length, InstanceOf,Range
from rest_framework import status
from apps.utils.common import CheckValidators,BaseView,my_response
from apps.utils import db_helper
from django.db import transaction
from datetime import datetime, timedelta
from .models import FaultTreeConfig, FaultTreeConfigHistory
from .fault_tree_utils import FaultTreeProcessor, generate_tree_data
from .serializers import (
    FaultTreeConfigSerializer,
    FaultTreeConfigCreateSerializer,
    FaultTreeConfigUpdateSerializer,
    FaultTreeConfigListSerializer,
    FaultTreeHistoryListSerializer,
    FaultTreeHistorySerializer
)
from .handler_manager import HandlerManager
import logging
logger = logging.getLogger('log')
from django.http import StreamingHttpResponse
import json
import time
import random
from .zabbix_api_util import get_all_host_metrics, get_zabbix_metrics
import pytz
from .es_api_util import get_es_metrics, get_es_index_fields


class CreateFaultTreeConfig(BaseView):
    """创建故障树配置"""
    def post(self, request):
        try:
            # 获取最大的 ft_id 并加1
            last_config = FaultTreeConfig.objects.order_by('-ft_id').first()
            new_ft_id = (last_config.ft_id + 1) if last_config else 1
            
            # 将 ft_id 添加到请求数据中
            request_data = self.request_params.copy()
            request_data['ft_id'] = new_ft_id
            
            serializer = FaultTreeConfigCreateSerializer(data=request_data)
            if serializer.is_valid():
                # 添加当前时间和用户信息
                serializer.save(
                    ft_id=new_ft_id,  # 使用自增的 ft_id
                    create_by='xx',
                    update_by='xx',
                    create_time=datetime.now(),
                    update_time=datetime.now()
                )
                return self.my_response({
                    "status": "ok",
                    "message": "创建成功",
                    "data": serializer.data
                })
            return self.my_response({
                "status": "error",
                "message": "参数错误",
                "data": serializer.errors
            })
        except Exception as e:
            logger.exception(f"创建故障树配置失败: {str(e)}")
            return self.my_response({
                "status": "error",
                "message": f"创建失败：{str(e)}"
            })


class UpdateFaultTreeConfig(BaseView):
    """更新故障树配置"""

    def post(self, request):
        try:
            ft_id = self.request_params.get('ft_id')
            with transaction.atomic():
                instance = FaultTreeConfig.objects.get(ft_id=ft_id)

                # 生成新的history_id
                last_history = FaultTreeConfigHistory.objects.order_by('-history_id').first()
                new_history_id = (last_history.history_id + 1) if last_history else 1

                # 创建历史记录
                FaultTreeConfigHistory.objects.create(
                    history_id=new_history_id,  # 添加history_id
                    ft_id=instance.ft_id,
                    ft_content=instance.ft_content,
                    version_num=instance.version_num,
                    create_time=datetime.now(),
                    update_time=datetime.now(),
                    create_by='xxxx',
                    update_by='xxx'
                )

                serializer = FaultTreeConfigUpdateSerializer(instance, data=self.request_params, partial=True)
                if serializer.is_valid():
                    serializer.save(
                        update_by='xxxx',
                        update_time=datetime.now()
                    )
                    return self.my_response({
                        "status": "ok",
                        "message": "更新成功",
                        "data": serializer.data
                    })
                return self.my_response({
                    "status": "error",
                    "message": "参数错误",
                    "data": serializer.errors
                })
        except Exception as e:
            logger.exception(f"更新故障树配置失败: {str(e)}")
            return self.my_response({
                "status": "error",
                "message": f"更新失败：{str(e)}"
            })


class DeleteFaultTreeConfig(BaseView):
    """删除故障树配置"""

    def post(self, request):
        try:
            ft_id = self.request_params.get('ft_id')
            instance = FaultTreeConfig.objects.get(ft_id=ft_id)
            instance.delete()
            return self.my_response({
                "status": "ok",
                "message": "删除成功"
            })
        except FaultTreeConfig.DoesNotExist:
            return self.my_response({
                "status": "error",
                "message": "配置不存在"
            })


class GetFaultTreeConfigList(BaseView):
    """获取故障树配置列表"""

    def post(self, request):
        try:
            queryset = FaultTreeConfig.objects.all().order_by('-create_time')

            # 处理筛选条
            ft_status = self.request_params.get('ft_status')
            if ft_status:
                queryset = queryset.filter(ft_status=ft_status)

            # 处理搜索
            keyword = self.request_params.get('keyword')
            if keyword:
                queryset = queryset.filter(ft_name__icontains=keyword)
            serializer = FaultTreeConfigListSerializer(queryset, many=True)
            return self.my_response({
                "status": "ok",
                "message": "获取成功",
                "data": serializer.data
            })
        except Exception as e:
            logger.exception(f"获取故障树配置列表失败: {str(e)}")
            return self.my_response({
                "status": "error",
                "message": f"获取列表失败：{str(e)}"
            })


class GetFaultTreeConfigDetail(BaseView):
    """获取故障树配置详情"""

    def post(self, request):
        try:
            ft_id = self.request_params.get('ft_id')
            instance = FaultTreeConfig.objects.get(ft_id=ft_id)
            serializer = FaultTreeConfigSerializer(instance)
            return self.my_response({
                "status": "ok",
                "message": "获取成功",
                "data": serializer.data
            })
        except FaultTreeConfig.DoesNotExist:
            return self.my_response({
                "status": "error",
                "message": "配置不存在"
            })


class ActivateFaultTreeConfig(BaseView):
    """激活故障树配置"""

    def post(self, request):
        try:
            ft_id = self.request_params.get('ft_id')
            instance = FaultTreeConfig.objects.get(ft_id=ft_id)
            instance.ft_status = 'active'
            instance.update_by = 'xxx'
            instance.save()
            serializer = FaultTreeConfigSerializer(instance)
            return self.my_response({
                "status": "ok",
                "message": "激活成功",
                "data": serializer.data
            })
        except FaultTreeConfig.DoesNotExist:
            return self.my_response({
                "status": "error",
                "message": "配置不存在"
            })

class GetFaultTreeHistoryList(BaseView):
    """获取故障树历史版本列表"""
    def post(self, request):
        try:
            ft_id = self.request_params.get('ft_id')
            if not ft_id:
                return self.my_response({
                    "status": "error",
                    "message": "参数错误"
                })

            queryset = FaultTreeConfigHistory.objects.filter(ft_id=ft_id).order_by('-create_time')
            serializer = FaultTreeHistoryListSerializer(queryset, many=True)
            return self.my_response({
                "status": "ok",
                "message": "获取成功",
                "data": serializer.data
            })
        except Exception as e:
            logger.exception(f"获取历史版本列表失败: {str(e)}")
            return self.my_response({
                "status": "error",
                "message": f"获取列表失败：{str(e)}"
            })

class GetFaultTreeHistoryDetail(BaseView):
    """获取故障树历史版本详情"""
    def post(self, request):
        try:
            history_id = self.request_params.get('history_id')
            instance = FaultTreeConfigHistory.objects.get(history_id=history_id)
            serializer = FaultTreeHistorySerializer(instance)
            return self.my_response({
                "status": "ok",
                "message": "获取成功",
                "data": serializer.data
            })
        except FaultTreeConfigHistory.DoesNotExist:
            return self.my_response({
                "status": "error",
                "message": "历史版本不存在"
            })

class RollbackFaultTreeConfig(BaseView):
    """回滚故障树配置到指定版本"""
    def post(self, request):
        try:
            history_id = self.request_params.get('history_id')
            with transaction.atomic():
                # 获取历史版
                history = FaultTreeConfigHistory.objects.get(history_id=history_id)

                # 获取当前配置
                config = FaultTreeConfig.objects.get(ft_id=history.ft_id)

                # 更新主表
                config.ft_content = history.ft_content
                config.version_num = history.version_num
                config.update_by = 'xxx'
                config.save(update_fields=['ft_content', 'version_num', 'update_by', 'update_time'])

                return self.my_response({
                    "status": "ok",
                    "message": "回滚成功"
                })
        except FaultTreeConfigHistory.DoesNotExist:
            return self.my_response({
                "status": "error",
                "message": "历史版本不存在"
            })
        except FaultTreeConfig.DoesNotExist:
            return self.my_response({
                "status": "error",
                "message": "配置不存在"
            })
        except Exception as e:
            logger.exception(f"回滚配置失败: {str(e)}")
            return self.my_response({
                "status": "error",
                "message": f"回滚失败：{str(e)}"
            })


class DeleteFaultTreeHistory(BaseView):
    """删除故障树历史版本"""

    def post(self, request):
        try:
            history_id = self.request_params.get('history_id')
            if not history_id:
                return self.my_response({
                    "status": "error",
                    "message": "history_id不能为空"
                })

            history = FaultTreeConfigHistory.objects.get(history_id=history_id)

            # 获取该故障树的所有历史版本数量
            history_count = FaultTreeConfigHistory.objects.filter(
                ft_id=history.ft_id
            ).count()

            # 如果只有一个版本，不允许删除
            if history_count <= 1:
                return self.my_response({
                    "status": "error",
                    "message": "至少需要保留一个历史版本，无法删除"
                })

            # 执行删除
            history.delete()

            return self.my_response({
                "status": "ok",
                "message": "删除成功"
            })

        except FaultTreeConfigHistory.DoesNotExist:
            return self.my_response({
                "status": "error",
                "message": "历史版本不存在"
            })
        except Exception as e:
            logger.exception(f"删除历史版本失败: {str(e)}")
            return self.my_response({
                "status": "error",
                "message": f"删除失败：{str(e)}"
            })


class GetFaultTreeData(BaseView):
    """获取故障树分析数据（支持阻塞模式和流式模式）"""
    def post(self, request):
        # 验证请求参数
        request_body = self.request_params
        rules = {
            "cluster_name": [Length(2, 64)],  # 集群名
            "fault_case": [Length(2, 120)],  # 场景名
            "time_from": [],  # 开始时间,格式如 2023-12-01 00:00:00,非必填
            "time_till": [],  # 结束时间,格式如 2023-12-01 00:00:05,非必填
            "response_mode": [In(['stream', 'block'])]  # 响应模式：block为阻塞模式，stream为流式模式
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({
                "status": "error",
                "message": str(valid_ret.errors),
                "code": status.HTTP_400_BAD_REQUEST
            })

        try:
            # 获取请求参数
            cluster_name = request_body.get('cluster_name')
            fault_case = request_body.get('fault_case')
            fault_case = request_body.get('fault_case')
            response_mode = request_body.get('response_mode')
            
            # 获取故障树配置
            fault_tree = FaultTreeConfig.objects.filter(
                ft_name=fault_case,
                ft_status='active'
            ).order_by('-version_num').first()

            if not fault_tree:
                return self.my_response({
                    "status": "error",
                    "message": f"未找到场景 '{fault_case}' 的故障树配置",
                    "code": status.HTTP_404_NOT_FOUND
                })

            if response_mode == 'stream':
                # 流式模式
                ft_content = json.loads(fault_tree.ft_content)
                response = StreamingHttpResponse(
                    generate_tree_data(ft_content, cluster_name, fault_case),
                    content_type='text/event-stream'
                )
                response['Cache-Control'] = 'no-cache'
                response['X-Accel-Buffering'] = 'no'
                return response
            else:
                # 普通模式
                time_from = int(datetime.strptime(request_body.get('time_from'), '%Y-%m-%d %H:%M:%S').timestamp()) if request_body.get('time_from') else None
                time_till = int(datetime.strptime(request_body.get('time_till'), '%Y-%m-%d %H:%M:%S').timestamp()) if request_body.get('time_till') else None
                
                tree_data = FaultTreeConfigSerializer().get_content_json(fault_tree)
                processor = FaultTreeProcessor()
                processed_data = processor.process_tree(tree_data, cluster_name, time_from, time_till)

                return self.my_response({
                    "status": "ok",
                    "message": "success",
                    "data": processed_data
                })
        except Exception as e:
            logger.exception(error_msg)
            return self.my_response({
                "status": "error",
                "message": error_msg,
                "code": status.HTTP_500_INTERNAL_SERVER_ERROR
            })


class GetMetricHistory(BaseView):
    """获取指标历史数据数据或日志"""

    def post(self, request):
        # 验证请求参数
        request_body = self.request_params
        rules = {
            "node_info": [],  # 节点信息
            "time_from": [],  # 开始时间,格式如 2023-12-01 00:00:00,非必填
            "time_till": [],  # 结束时间,格式如 2023-12-01 00:00:05,非必填
            "get_type": [],  # 类型，日志或者数据
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error","message": str(valid_ret.errors),"code": status.HTTP_400_BAD_REQUEST})
        # 转换为时间戳
        time_from = int(datetime.strptime(request_body.get('time_from'), '%Y-%m-%d %H:%M:%S').timestamp()) if request_body.get('time_from') else None
        time_till = int(datetime.strptime(request_body.get('time_till'), '%Y-%m-%d %H:%M:%S').timestamp()) if request_body.get('time_till') else None
        node_info = request_body.get('node_info')
        get_type = request_body.get('get_type')
        data_source = node_info.get('data_source')
        handler_name = data_source.get('source')
        metric_name = node_info.get('metric_name').strip()
        instance_info = node_info.get('ip_port')
        try:
            # 获取对应的处理函数
            handler = HandlerManager.init_metric_handlers(handler_name=handler_name,handler_type=get_type)
            if not handler: raise ValueError(f"Unsupported data source: {handler_name}")
            # 执行处理函数获取对应的监控值
            result = handler(instance_info, metric_name, time_from, time_till)
            return self.my_response({"status": "ok","message": "success","data": result})
        except Exception as e:
            return self.my_response({"status": "error","message": f"获取故障树数据失败: {str(e)}","code": status.HTTP_500_INTERNAL_SERVER_ERROR})

class GetMetricHistoryByIp(BaseView):
    """获取某个机器所有指标历史数据"""
    def post(self, request):
        request_body = self.request_params
        rules = {
            "address": [],  # 节点信息
            "cmd": [],
            "time_from": [],
            "time_till": [],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: return self.my_response({"status": "error","message": str(valid_ret.errors),"code": status.HTTP_400_BAD_REQUEST})
        ip = request_body.get('address')
        metric_name = request_body.get('cmd')
        time_from = request_body.get('time_from')
        time_till = request_body.get('time_till')
        # 如果没有指定时间范围，设置为最近10分钟
        if time_from is None or time_till is None:
            time_till = int(time.time())
            time_from = time_till - 600  # 10分钟 = 600秒
        else:
            # 如果是字符串格式的时间，转换为时间戳
            if isinstance(time_from, str):
                time_from = int(datetime.strptime(time_from, '%Y-%m-%d %H:%M:%S').timestamp())
            if isinstance(time_till, str):
                time_till = int(datetime.strptime(time_till, '%Y-%m-%d %H:%M:%S').timestamp())

        try:
            result = get_zabbix_metrics(
                host_ip=ip,
                metric_name=metric_name,
                time_from=time_from,
                time_till=time_till,
                match_type='filter',
                limit=10000
            )
            
            # 对数据按时间正序排序
            if result.get('data'):
                sorted_data = sorted(result['data'], key=lambda x: x['metric_time'])
                result['data'] = sorted_data
                
            return self.my_response({
                "status": "ok",
                "message": "success",
                "data": result.get('data')
            })
        except Exception as e:
            return self.my_response({
                "status": "error",
                "message": f"获取监控项失败: {str(e)}",
                "code": status.HTTP_500_INTERNAL_SERVER_ERROR
            })

class GetAllMetricNamesByIp(BaseView):
    """获取某个机器所有指标名称"""
    def post(self, request):
        # 验证请求参数
        request_body = self.request_params
        rules = {
            "ip": [Required],  # 机器IP
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid: 
            return self.my_response({
                "status": "error",
                "message": str(valid_ret.errors),
                "code": status.HTTP_400_BAD_REQUEST
            })
            
        # ip = request_body.get('ip')
        ip = "127.0.0.1"
        result = get_all_host_metrics(ip)
        # 去掉最近值和时间戳,防止污染大模型思考,获取值需要单独的方法获取
        if result.get('data'):
            for item in result['data']:
                item.pop('lastclock', None)
                item.pop('lastvalue', None)
        # 处理 result 中的嵌套结构
        if result.get('status') == 'error':
            return self.my_response({
                "status": "error",
                "message": result.get('msg', '获取监控项失败'),
                "data": None
            })
            
        return self.my_response({
            "status": "ok",
            "message": "success",
            "data": result.get('data')
        })


class AnalyzeRootCause(BaseView):
    """分析故障根"""
    def post(self, request):
        # 验证请求参数
        request_body = self.request_params
        rules = {
            "cluster_name": [Length(2, 64)],  # 集群
            "fault_case": [Length(2, 120)],  # 场景名
            "tree_data": [Required],  # 完整的树数据
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({
                "status": "error",
                "message": str(valid_ret.errors),
                "code": status.HTTP_400_BAD_REQUEST
            })

        try:
            cluster_name = request_body.get('cluster_name')
            fault_case = request_body.get('fault_case')
            tree_data = request_body.get('tree_data')

            # 收集异常点信息
            abnormal_nodes = self._collect_abnormal_nodes(tree_data)
            
            # 构建问上下文
            context = self._format_context_for_llm(cluster_name, fault_case, abnormal_nodes)
            
            # 构建提示语
            prompt = f"""作为一个数据库专家，请分析以下场景并给出可能的根因和建议：

{context}

请从以下几个方面进行分析：
1. 根因分析：基于以上指标信息，分析哪个指标比是导致该问题的根本原因，如果当前指标不足以确定根因，可以让用户给出需要的其他信息
2. 影响评估：评估当前问题的影响范围和严重程度
3. 解决方案：提供具体的解决建议，包括紧急处理措施和长期优化建议
4. 预防措施：如何预防类似问题再次发生

请用专业的角度进行分析，并给出详细的说明。"""
            print(prompt)
            # 模大模型响应
            analysis_result = f"{prompt}"
            return self.my_response({
                "status": "ok",
                "message": "success",
                "data": analysis_result
            })

        except Exception as e:
            logger.exception(f"分析故障根因失败: {str(e)}")
            return self.my_response({
                "status": "error",
                "message": f"分析失败: {str(e)}",
                "code": status.HTTP_500_INTERNAL_SERVER_ERROR
            })

    def _collect_abnormal_nodes(self, tree_data):
        """收集树中的异常节点信息"""
        abnormal_nodes = []
        
        def recursive_find_abnormal(node):
            """递归查找异常节点"""
            # 检查节点是否异常且有指标信息
            if (node.get('node_status') in ['warning','error', 'critical'] and node.get('metric_name')):
                abnormal_nodes.append(node)
            # 递归处理子节点
            for child in node.get('children', []):
                recursive_find_abnormal(child)
        # 开始递归查找
        recursive_find_abnormal(tree_data)
        return abnormal_nodes

    def _format_context_for_llm(self, cluster_name, fault_case, abnormal_nodes):
        """将故障信息格式化为结构化上下文"""
        context = f"""集群 {cluster_name} 出现了 "{fault_case}" 场景的异常。\n发现以下异常指标：\n"""
        
        for idx, node in enumerate(abnormal_nodes, 1):
            context += f"{idx}. {node['key']}\n"  # 显示完整路径
            context += f"   • ip_port: {node['ip_port']}\n"
            context += f"   • 指标名称: {node['metric_name']}\n"
            if node.get('metric_extra_info'):
                extra_info = node['metric_extra_info']
                # 如果是变化率指标，添加变化率信息
                if extra_info.get('is_rate_change') and extra_info.get('rate_change_details'):
                    rate_details = extra_info['rate_change_details']
                    context += f"   • 变化率: {extra_info['metric_value_units_human']}\n"
                    context += f"   • 变化率信息:\n"
                    context += f"     - 前值时间: {rate_details['prev_time']}\n"
                    context += f"     - 前值: {rate_details['prev_value']}%\n"
                    context += f"     - 后值时间: {rate_details['next_time']}\n"
                    context += f"     - 后值: {rate_details['next_value']}%\n"
                    context += f"     - 时间窗口: {rate_details['time_window']}秒\n"
                else:
                    # 添加当前值和单位
                    context += f"   • 最大值: {extra_info['metric_value_units_human']}\n"
                    # 添加触发时间
                    context += f"   • 触发时间: {extra_info['metric_time']}\n"
                
                # # 添加规则条件
                # if extra_info.get('rule_condition_format_human'):
                #     context += f"   • 触发条件: {extra_info['rule_condition_format_human']}\n"
            
            context += "\n"
        
        return context


class GetLocalTime(BaseView):
    """获取服务器本地时间（北京时间）"""
    
    WEEKDAY_MAP = {
        'Monday': '星期一',
        'Tuesday': '星期二',
        'Wednesday': '星期三',
        'Thursday': '星期四',
        'Friday': '星期五',
        'Saturday': '星期六',
        'Sunday': '星期日'
    }
    
    def get(self, request):
        try:
            beijing_tz = pytz.timezone('Asia/Shanghai')
            current_time = datetime.now(beijing_tz)
            
            # 获取英文星期并转换为中文
            week_en = current_time.strftime("%A")
            week_cn = self.WEEKDAY_MAP.get(week_en)
            
            time_data = {
                "timestamp": int(current_time.timestamp()),
                "datetime": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "date": current_time.strftime("%Y-%m-%d"),
                "time": current_time.strftime("%H:%M:%S"),
                "week": week_cn,  # 中文星期
                "timezone": "Asia/Shanghai"
            }
            
            return self.my_response({
                "status": "ok",
                "message": "success",
                "data": time_data,
                "code": status.HTTP_200_OK
            })
            
        except Exception as e:
            return self.my_response({
                "status": "error",
                "message": f"获取时间信息失败: {str(e)}",
                "data": None,
                "code": status.HTTP_500_INTERNAL_SERVER_ERROR
            })

class GetESIndexFields(BaseView):
    """获取ES索引的字段信息"""
    def post(self, request):
        try:
            request_body = self.request_params
            rules = {
                "index": [Required],  # 索引名称
            }
            valid_ret = validate(rules, request_body)
            if not valid_ret.valid:
                return self.my_response({
                    "status": "error",
                    "message": str(valid_ret.errors),
                    "code": 400
                })

            index = request_body.get('index')
            fields = get_es_index_fields(index)
            
            return self.my_response({
                "status": "ok",
                "message": "success",
                "data": fields
            })
        except Exception as e:
            return self.my_response({
                "status": "error",
                "message": f"获取索引字段失败: {str(e)}",
                "code": 500
            })


class GetESMetrics(BaseView):
    def post(self, request):
        try:
            request_body = self.request_params
            rules = {
                "index": [Required],      # 索引名称，必填
                "server": [Required],     # ES服务器IP，必填
                "time_from": [],          # 开始时间，可选
                "time_to": [],            # 结束时间，可选
                "fields": [],             # 查询字段列表，可选
                "conditions": []          # 查询条件列表，可选
            }
            valid_ret = validate(rules, request_body)
            if not valid_ret.valid:
                return self.my_response({
                    "status": "error",
                    "message": str(valid_ret.errors),
                    "code": 400
                })

            index = request_body.get('index')
            ip = request_body.get('servrer')
            time_from = request_body.get('time_from')
            time_to = request_body.get('time_to')
            
            # 如果没有传递时间，设置默认时间范围为最近5分钟
            if not time_from or not time_to:
                time_to = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                time_from = (datetime.now() - timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
            # 验证结束时间必须大于开始时间
            elif datetime.strptime(time_to, '%Y-%m-%d %H:%M:%S') <= datetime.strptime(time_from, '%Y-%m-%d %H:%M:%S'):
                return self.my_response({
                    "status": "error",
                    "message": "结束时间必须大于开始时间",
                    "code": 400
                })

            fields = request_body.get('fields', [])
            conditions = request_body.get('conditions', [])

            # 构建查询条件
            query_conditions = []
            
            # 添加时间范围条件
            if time_from and time_to:
                query_conditions.append({
                    "time_range": {
                        "@timestamp": {
                            "gte": time_from,
                            "lte": time_to
                        }
                    }
                })
            
            # 添加其他条件
            if conditions:
                for condition in conditions:
                    query_conditions.append({
                        "field": condition.get('field'),
                        "operator": condition.get('operator'),
                        "value": condition.get('value')
                    })

            # 调用ES API获取数据
            results = get_es_metrics(
                ip, 
                index,
                query_conditions=query_conditions
            )
            
            # 直接获取文档内容，去掉 _source 层
            simplified_results = [hit['_source'] for hit in results.get('hits', {}).get('hits', [])]
            if fields:
                simplified_results = [
                    {
                        field: doc[field] for field in fields
                        if field in doc
                    }
                    for doc in simplified_results
                ]

            return self.my_response({
                "status": "ok",
                "message": "success",
                "data": simplified_results
            })
        except Exception as e:
            return self.my_response({
                "status": "error",
                "message": f"获取索引字段失败: {str(e)}",
                "code": 500
            })
        
        
class GetClusterServers(BaseView):
    def post(self, request):
        request_body = self.request_params
        rules = {
            "cluster_name": [Required],
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
                return self.my_response({
                    "status": "error",
                    "message": str(valid_ret.errors),
                    "code": 400
                })
        cluster_name = request_body.get('cluster_name')
        
        # 查询MySQL集群实例信息
        sql = f"SELECT cluster_name, instance_name, instance_role FROM mysql_cluster_instance WHERE cluster_name='{cluster_name}'"
        results = db_helper.find_all(sql)
        data = results.get('data')
        
        # 处理实例数据，提取IP和端口信息
        servers = []
        for instance in data:
            instance_name = instance['instance_name']
            instance_parts = instance_name.split('_')
            if len(instance_parts) >= 2:
                ip = instance_parts[0]
                port = instance_parts[1]
                role = "主库" if instance['instance_role'] == 'M' else "从库"
                
                servers.append({
                    "ip": ip,
                    "port": port,
                    "role": role,
                    "name": f"{cluster_name}->{instance_name}->{role}",
                    "type": "mysql"
                })
        
        return self.my_response({
            "status": "ok",
            "data": servers,
            "message": "获取集群服务器成功"
        })
        
class GetCluster(BaseView):
    def post(self, request):
        sql = "SELECT cluster_name FROM mysql_cluster"
        results = db_helper.find_all(sql)
        data = results.get('data')
        return self.my_response({
            "status": "ok",
            "data": data,
            "message": "获取集群成功"
        })