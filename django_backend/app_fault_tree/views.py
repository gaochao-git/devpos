from validator import Required, In, validate, Length, InstanceOf,Range
from rest_framework import status
from apps.utils.common import CheckValidators,BaseView,my_response
from django.db import transaction
from datetime import datetime
from .models import FaultTreeConfig, FaultTreeConfigHistory
from .fault_tree_utils import FaultTreeProcessor
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

            # 处理筛选条件
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
    """获取故障树分析数据"""

    def post(self, request):
        # 验证请求参数
        request_body = self.request_params
        rules = {
            "cluster_name": [Length(2, 64)],  # 集群名
            "fault_case": [Length(2, 120)],  # 场景名
            "time_from": [],  # 开始时间,格式如 2023-12-01 00:00:00,非必填
            "time_till": [],  # 结束时间,格式如 2023-12-01 00:00:05,非必填
        }
        valid_ret = validate(rules, request_body)
        if not valid_ret.valid:
            return self.my_response({
                "status": "error",
                "message": str(valid_ret.errors),
                "code": status.HTTP_400_BAD_REQUEST
            })

        # 获取请求参数
        cluster_name = request_body.get('cluster_name')
        fault_case = request_body.get('fault_case')
        # 转换为时间戳
        time_from = int(datetime.strptime(request_body.get('time_from'), '%Y-%m-%d %H:%M:%S').timestamp()) if request_body.get('time_from') else None
        time_till = int(datetime.strptime(request_body.get('time_till'), '%Y-%m-%d %H:%M:%S').timestamp()) if request_body.get('time_till') else None

        try:
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

            # 获取配置内容并处理
            tree_data = FaultTreeConfigSerializer().get_content_json(fault_tree)
            # 对初始化树进行填充及处理
            processor = FaultTreeProcessor()
            processed_data = processor.process_tree(tree_data, cluster_name, time_from, time_till)

            return self.my_response({
                "status": "ok",
                "message": "success",
                "data": processed_data
            })

        except Exception as e:
            return self.my_response({
                "status": "error",
                "message": f"获取故障树数据失败: {str(e)}",
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
            handler = HandlerManager.init_metric_handlers(metric_name=metric_name,handler_name=handler_name,handler_type=get_type)
            if not handler: raise ValueError(f"Unsupported data source: {handler_name}")
            # 执行处理函数获取对应的监控值
            result = handler(instance_info, metric_name, time_from, time_till)
            return self.my_response({"status": "ok","message": "success","data": result})
        except Exception as e:
            return self.my_response({"status": "error","message": f"获取故障树数据失败: {str(e)}","code": status.HTTP_500_INTERNAL_SERVER_ERROR})

class AnalyzeRootCause(BaseView):
    """分析故障根因"""
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

            # 收集异常节点信息
            abnormal_nodes = self._collect_abnormal_nodes(tree_data)
            
            # 构建问题上下文
            context = self._format_context_for_llm(cluster_name, fault_case, abnormal_nodes)
            
            # 构建提示语
            prompt = f"""作为一个数据库专家，请分析以下场景并给出可能的根因和建议：

{context}

请从以下几个方面进行分析：
1. 根因分析：基于以上指标信息，分析哪个指标比是导致该问题的根本原因，
2. 影响评估：评估当前问题的影响范围和严重程度
3. 解决方案：提供具体的解决建议，包括紧急处理措施和长期优化建议
4. 预防措施：如何预防类似问题再次发生

请用专业的角度进行分析，并给出详细的说明。"""

            # TODO: 调用实际的大模型API
            # response = call_llm_api(prompt)
            print(prompt)
            # 模拟大模型响应
            analysis_result = f"模拟大模型分析结果：\n{prompt}"

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
            if (node.get('node_status') in ['error', 'critical'] and 
                node.get('metric_name')):
                node_info = {
                    'key': node.get('key'),  # 保存完整路径
                    'name': node.get('name', 'Unknown'),
                    'metric_name': node.get('metric_name'),
                    'description': node.get('description', ''),
                }
                
                # 添加指标详细信息
                if node.get('metric_extra_info'):
                    metric_info = node['metric_extra_info']
                    node_info.update({
                        'metric_value': metric_info.get('metric_value', ''),
                        'rule_condition_format': metric_info.get('rule_condition_format', ''),
                        'metric_time': metric_info.get('metric_time', ''),
                        'impact_analysis': metric_info.get('impact_analysis', '未提供影响分析'),
                        'suggestion': metric_info.get('suggestion', '未提供处理建议')
                    })
                
                abnormal_nodes.append(node_info)
            
            # 递归处理子节点
            for child in node.get('children', []):
                recursive_find_abnormal(child)
        
        # 开始递归查找
        recursive_find_abnormal(tree_data)
        return abnormal_nodes

    def _format_context_for_llm(self, cluster_name, fault_case, abnormal_nodes):
        """将故障信息格式化为结构化的上下文"""
        context = f"""集群 {cluster_name} 出现了 "{fault_case}" 场景的异常。

发现以下异常指标：

"""
        for idx, node in enumerate(abnormal_nodes, 1):
            context += f"{idx}. {node['key']}\n"  # 显示完整路径
            context += f"   • 指标名称: {node['metric_name']}\n"
            if node.get('metric_value'):
                context += f"   • 当前值: {node['metric_value']}\n"
            if node.get('metric_time'):
                context += f"   • 触发时间: {node['metric_time']}\n"
            context += "\n"
        
        return context
