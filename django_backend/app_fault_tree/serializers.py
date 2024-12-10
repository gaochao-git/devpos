from rest_framework import serializers
from .models import FaultTreeConfig, FaultTreeConfigHistory
import json
from datetime import datetime

class FaultTreeConfigSerializer(serializers.ModelSerializer):
    """故障树配置序列化器"""
    content_json = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    create_time = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S')
    update_time = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S')

    class Meta:
        model = FaultTreeConfig
        fields = [
            'id', 'ft_id', 'ft_name', 'ft_desc', 'ft_status', 'ft_content',
            'content_json', 'status_display', 'version_num',
            'create_time', 'update_time', 'create_by', 'update_by'
        ]
        read_only_fields = ['id', 'create_time', 'update_time', 'status_display']

    def get_content_json(self, obj):
        """获取JSON格式的配置内容"""
        try:
            return json.loads(obj.ft_content)
        except (json.JSONDecodeError, AttributeError):
            return {}

    def get_status_display(self, obj):
        """获取状态的显示文本"""
        status_map = {
            'draft': '草稿',
            'active': '启用'
        }
        return status_map.get(obj.ft_status, obj.ft_status)

    def validate_ft_content(self, value):
        """验证配置内容是否为有效的JSON"""
        try:
            if isinstance(value, dict):
                return json.dumps(value)
            json.loads(value)
            return value
        except json.JSONDecodeError:
            raise serializers.ValidationError("无效的JSON格式")

    def validate_ft_status(self, value):
        """验证状态值"""
        valid_status = ['draft', 'active']
        if value not in valid_status:
            raise serializers.ValidationError(f"状态必须是以下值之一: {', '.join(valid_status)}")
        return value

class FaultTreeConfigCreateSerializer(FaultTreeConfigSerializer):
    """创建故障树配置的序列化器"""
    create_time = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', required=False)
    update_time = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', required=False)

    class Meta(FaultTreeConfigSerializer.Meta):
        read_only_fields = ['id', 'status_display', 'version_num']

    def create(self, validated_data):
        # 设置默认时间
        now = datetime.now()
        validated_data['create_time'] = validated_data.get('create_time', now)
        validated_data['update_time'] = validated_data.get('update_time', now)
        validated_data['version_num'] = 1
        validated_data['ft_status'] = validated_data.get('ft_status', 'draft')
        return super().create(validated_data)

class FaultTreeConfigUpdateSerializer(FaultTreeConfigSerializer):
    """更新故障树配置的序列化器"""
    class Meta(FaultTreeConfigSerializer.Meta):
        read_only_fields = ['id', 'create_time', 'update_time', 'status_display',
                           'create_by', 'version_num']

    def update(self, instance, validated_data):
        # 更新时自动增加版本号
        instance.version_num = (instance.version_num or 1) + 1
        return super().update(instance, validated_data)

class FaultTreeConfigListSerializer(serializers.ModelSerializer):
    """故障树配置列表序列化器"""
    status_display = serializers.SerializerMethodField()
    create_time = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S')
    update_time = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S')

    class Meta:
        model = FaultTreeConfig
        fields = ['id', 'ft_id', 'ft_name', 'ft_desc', 'ft_status', 'status_display',
                 'version_num', 'create_time', 'update_time']

    def get_status_display(self, obj):
        status_map = {
            'draft': '草稿',
            'active': '启用'
        }
        return status_map.get(obj.ft_status, obj.ft_status)


class FaultTreeHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FaultTreeConfigHistory
        fields = ['id', 'history_id', 'ft_id', 'ft_content', 'version_num', 
                 'create_time', 'update_time', 'create_by', 'update_by']


class FaultTreeHistoryListSerializer(serializers.ModelSerializer):
    create_time = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S')

    class Meta:
        model = FaultTreeConfigHistory
        fields = ['id', 'history_id', 'ft_id', 'version_num', 
                 'create_time', 'create_by']