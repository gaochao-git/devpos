#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用示例脚本
展示如何使用Zabbix和Elasticsearch API公共方法
"""

import json
import sys
import os
from datetime import datetime, timedelta

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from zabbix_api_script import create_zabbix_client, ZabbixAPI
from es_api_script import create_elasticsearch_client, ElasticsearchAPI


def demo_zabbix_monitoring():
    """演示Zabbix监控数据获取"""
    print("=" * 50)
    print("Zabbix 监控数据获取演示")
    print("=" * 50)
    
    # 配置信息（请根据实际情况修改）
    ZABBIX_CONFIG = {
        "url": "http://82.156.146.51/zabbix",
        "username": "Admin", 
        "password": "zabbix"
    }
    
    try:
        # 创建Zabbix客户端
        print("正在连接到Zabbix服务器...")
        zabbix = create_zabbix_client(
            ZABBIX_CONFIG["url"],
            ZABBIX_CONFIG["username"],
            ZABBIX_CONFIG["password"]
        )
        print("✓ Zabbix连接成功")
        
        # 1. 获取主机列表
        print("\n1. 获取主机列表:")
        hosts = zabbix.get_hosts()
        print(f"找到 {len(hosts)} 台主机")
        for host in hosts[:3]:  # 只显示前3台
            print(f"  - {host['name']} ({host['host']})")
        
        # 2. 获取监控项
        if hosts:
            host_ids = [hosts[0]['hostid']]
            print(f"\n2. 获取主机 {hosts[0]['name']} 的监控项:")
            items = zabbix.get_items(host_ids=host_ids)
            print(f"找到 {len(items)} 个监控项")
            for item in items[:5]:  # 只显示前5个
                print(f"  - {item['name']} ({item['key_']})")
        
        # 3. 获取综合监控数据
        print("\n3. 获取综合监控数据:")
        monitoring_data = zabbix.get_monitoring_data(
            host_names=[hosts[0]['host']] if hosts else None,
            hours_back=1
        )
        
        if "error" not in monitoring_data:
            print(f"✓ 成功获取监控数据")
            print(f"  - 主机数量: {len(monitoring_data.get('hosts', []))}")
            print(f"  - 监控项数量: {len(monitoring_data.get('items', []))}")
            print(f"  - 历史数据条数: {len(monitoring_data.get('history', []))}")
            print(f"  - 问题数量: {len(monitoring_data.get('problems', []))}")
        else:
            print(f"✗ 获取监控数据失败: {monitoring_data['error']}")
        
        # 4. 获取问题列表
        print("\n4. 获取问题列表:")
        problems = zabbix.get_problems()
        print(f"当前有 {len(problems)} 个问题")
        for problem in problems[:3]:  # 只显示前3个
            print(f"  - {problem.get('name', 'Unknown')} (严重程度: {problem.get('severity', 'Unknown')})")
        
        # 登出
        zabbix.logout()
        print("\n✓ Zabbix会话已结束")
        
    except Exception as e:
        print(f"✗ Zabbix操作失败: {e}")


def demo_elasticsearch_logs():
    """演示Elasticsearch日志采集"""
    print("\n" + "=" * 50)
    print("Elasticsearch 日志采集演示")
    print("=" * 50)
    
    # 配置信息（请根据实际情况修改）
    ES_CONFIG = {
        "host": "82.156.146.51",
        "port": 9200,
        "username": None,  # 无需认证
        "password": None,  # 无需认证
        "use_ssl": False
    }
    
    try:
        # 创建Elasticsearch客户端
        print("正在连接到Elasticsearch服务器...")
        es_client = create_elasticsearch_client(
            ES_CONFIG["host"],
            ES_CONFIG["port"],
            ES_CONFIG["username"],
            ES_CONFIG["password"],
            ES_CONFIG["use_ssl"]
        )
        print("✓ Elasticsearch连接成功")
        
        # 1. 获取集群健康状态
        print("\n1. 集群健康状态:")
        health = es_client.get_cluster_health()
        print(f"  - 状态: {health.get('status', 'Unknown')}")
        print(f"  - 节点数: {health.get('number_of_nodes', 'Unknown')}")
        print(f"  - 数据节点数: {health.get('number_of_data_nodes', 'Unknown')}")
        
        # 2. 列出索引
        print("\n2. 索引列表:")
        indices = es_client.list_indices()
        print(f"找到 {len(indices)} 个索引")
        for index in indices[:5]:  # 只显示前5个
            print(f"  - {index.get('index', 'Unknown')} ({index.get('docs.count', '0')} 文档)")
        
        # 3. 搜索日志（如果有索引的话）
        if indices:
            index_name = indices[0]['index']
            print(f"\n3. 搜索索引 {index_name} 中的日志:")
            
            # 搜索最近1小时的日志
            logs = es_client.search_by_time_range(
                index=index_name,
                start_time=datetime.now() - timedelta(hours=1),
                end_time=datetime.now(),
                size=10
            )
            
            total_hits = logs.get('hits', {}).get('total', {}).get('value', 0)
            print(f"找到 {total_hits} 条日志")
            
            # 显示前几条日志
            hits = logs.get('hits', {}).get('hits', [])
            for i, hit in enumerate(hits[:3]):
                source = hit.get('_source', {})
                timestamp = source.get('@timestamp', 'Unknown')
                message = source.get('message', str(source)[:100] + '...' if len(str(source)) > 100 else str(source))
                print(f"  [{i+1}] {timestamp}: {message}")
        
        # 4. 采集综合日志数据
        print("\n4. 采集综合日志数据:")
        if indices:
            # 选择有数据的索引进行采集
            selected_indices = [idx['index'] for idx in indices if int(idx.get('docs.count', '0')) > 0][:2]
            log_data = es_client.collect_logs(
                indices=selected_indices,
                hours_back=1,
                max_logs=100
            )
            
            if "error" not in log_data:
                print(f"✓ 成功采集日志数据")
                print(f"  - 索引数量: {len(log_data.get('indices', []))}")
                print(f"  - 总日志条数: {log_data.get('total_logs', 0)}")
                
                for idx_data in log_data.get('indices', []):
                    print(f"  - {idx_data['index']}: {len(idx_data['logs'])} 条日志")
            else:
                print(f"✗ 采集日志数据失败: {log_data['error']}")
        else:
            print("没有可用的索引进行日志采集")
        
        print("\n✓ Elasticsearch操作完成")
        
    except Exception as e:
        print(f"✗ Elasticsearch操作失败: {e}")


def demo_combined_usage():
    """演示组合使用两个API"""
    print("\n" + "=" * 50)
    print("组合使用演示")
    print("=" * 50)
    
    print("这个示例展示了如何在实际场景中组合使用两个API:")
    print("1. 从Zabbix获取有问题的主机列表")
    print("2. 根据问题主机，从Elasticsearch搜索相关日志")
    print("3. 生成综合报告")
    
    # 这里可以实现具体的组合逻辑
    # 由于需要实际的服务器连接，这里只是展示思路
    
    combined_report = {
        "timestamp": datetime.now().isoformat(),
        "monitoring_summary": {
            "total_hosts": 0,
            "problem_hosts": 0,
            "critical_problems": 0
        },
        "log_summary": {
            "total_logs": 0,
            "error_logs": 0,
            "warning_logs": 0
        },
        "recommendations": []
    }
    
    print(f"\n生成的综合报告示例:")
    print(json.dumps(combined_report, indent=2, ensure_ascii=False))


def main():
    """主函数"""
    print("监控数据和日志采集公共方法使用演示")
    print("=" * 60)
    
    # 演示Zabbix监控数据获取
    demo_zabbix_monitoring()
    
    # 演示Elasticsearch日志采集
    demo_elasticsearch_logs()
    
    # 演示组合使用
    demo_combined_usage()
    
    print("\n" + "=" * 60)
    print("演示完成！")
    print("\n使用说明:")
    print("1. 修改配置信息（服务器地址、用户名、密码等）")
    print("2. 安装依赖: pip install -r requirements.txt")
    print("3. 运行脚本: python example_usage.py")
    print("4. 在你的项目中导入并使用这些公共方法")


if __name__ == "__main__":
    main() 