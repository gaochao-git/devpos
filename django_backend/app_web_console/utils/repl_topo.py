#!/bin/env python
# -*- coding:utf-8 -*-
# @Time    : 2021/7/24 上午8:02
# @Author  : gaochao
# @File    :  replication_topology.py

import logging as logger
import sys
import pymysql
import argparse
import prettytable as pt
import time

sys.setrecursionlimit(100)


def target_source_find_all(ip, port, sql, my_connect_timeout=2):
    """
    连接远程数据库执行查询命令
    :param ip:
    :param port:
    :param sql:
    :param my_connect_timeout:
    :return:
    """
    ip_port_sql_cache_key = ip + str(port) + sql
    if ip_port_sql_cache_key in ip_port_sql_cache_dict:
        return ip_port_sql_cache_dict[ip_port_sql_cache_key]
    ins = ip+ '_' + str(port)
    conn = False
    data = []
    try:
        if ins in ip_port_cache_dict:
            conn = ip_port_cache_dict[ins]
        else:
            conn = pymysql.connect(host=ip, port=int(port), user=db_all_remote_user, passwd=db_all_remote_pass, db="", charset="utf8",connect_timeout=my_connect_timeout)
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        status = "ok"
        message = "执行成功"
        code = ""
        ip_port_cache_dict[ins] = conn
    except Exception as e:
        status = "error"
        message = "connect_ip:%s,connect_port:%s,sql:%s,error:%s" %(ip, port, sql, str(e))
        code = 2201
    finally:
        #if conn: cursor.close()
        #if conn: conn.close()
        content = {"status": status, "message": message, "code": code, "data": data} 
        ip_port_sql_cache_dict[ip_port_sql_cache_key] = content
        return content


def target_source_ping(ip, port):
    """
    ping远程服务器
    :param ip:
    :param port:
    :return:
    """
    sql = "select 1"
    return target_source_find_all(ip, port, sql, 0.2)


class ReplInfo():
    def __init__(self, ip, port):
        self.output_instance_list = []
        self.output_node_relation_list = []
        self.input_ip = ip
        self.input_port = port

    def repl_topol_show(self):
        """
        查看拓扑结构入口函数
        :return:
        """
        # 探测输入的ip、port是否可以连接
        ping_ret = target_source_ping(self.input_ip, self.input_port)
        if ping_ret['status'] != "ok": return ping_ret
        # 获取集群top节点
        status, top_host, top_port = ReplInfo.get_top_node(self.input_ip, self.input_port)
        if status == "error": return {"status": status, "message": "集群为M<-->M架构,暂时不支持获取"}
        logger.info("获取到top_node:%s_%s", top_host, top_port)
        # 通过top节点获取集群所有节点
        self.get_all_node(top_host, top_port)
        # 初始化拓扑树实例
        repl_tree = ReplTree(self.output_node_relation_list)
        # 生成拓扑图
        draw_tree_result_list = repl_tree.drwa_tree()
        # 替换拓扑图输出结构
        out_repl_tree = ""
        max_length = max([len(node) for node in draw_tree_result_list])
        tb = pt.PrettyTable()
        if summary:
            tb.field_names = ['topo','read_only','semi_master','semi_slave','io','sql','behind','conn','run','time']
        else:
            tb.field_names = ['topo']
        tb.align['topo'] = 'l'
        for node in draw_tree_result_list:
            node = node.replace(":","_")
            if node.find('None') < 0:
                if summary:
                    node = self.node_info(max_length, node, table, tb)
                else:
                    tb.add_row([node])
                out_repl_tree = out_repl_tree + node + "\n"
        if table:
            out_repl_tree =tb
        # 去重
        output_instance_list_pre = list(set(self.output_instance_list))
        output_instance_list = []
        for ins in output_instance_list_pre:
            ins_dict = {'instance_name': ins}
            output_instance_list.append(ins_dict)
        repl_info = [{"output_node_relation_list":out_repl_tree}, {"node_list": output_instance_list}]
        logger.info("repl_info:%s" % repl_info)
        content = {"status":"ok", "message":"ok", "data": repl_info}
        return content
    
    def node_info(self,max_length,node,table,tb):
        my_node = node
        if node.startswith('|'):
            ip = node.split(' ')[1].split('_')[0]
            port = node.split(' ')[1].split('_')[1]
        else:
            ip = node.split('_')[0]
            port = node.split('_')[1]
        # 获取read_only信息
        sql = "select @@global.read_only as read_only"
        read_only_info = target_source_find_all(ip,port,sql,0.2)
        if read_only_info['data'][0]['read_only'] == 0:
            read_only = 'OFF'
        else:
            read_only = 'ON'
        space_length = max_length - len(node)
        node = node + ' '*space_length + ' ' + read_only
       
        # 获取半同步信息
        sql = '''
                  select case @@global.rpl_semi_sync_master_enabled when 0 then "OFF" when 1 then "ON" else "no_semi" end as semi_master_enabled,
                         case @@global.rpl_semi_sync_slave_enabled when 0 then "OFF" when 1 then "ON" else "no_semi" end as semi_slave_enabled
              '''
        semi_info = target_source_find_all(ip,port,sql,0.2)
        node = node + " " + semi_info['data'][0]['semi_master_enabled']
        node = node + " " + semi_info['data'][0]['semi_slave_enabled']
        sql = "select count(*) as conn from information_schema.processlist where user not in('system user')"
        conn_info = target_source_find_all(ip,port,sql,0.2)
        conn_threads = str(conn_info['data'][0]['conn'])
        node = node + " " + conn_threads
        sql = "select count(*) as run from information_schema.processlist where command in ('Query','Execute')"
        run_info = target_source_find_all(ip,port,sql,0.2) 
        run_threads = str(run_info['data'][0]['run'])
        node = node + " " + run_threads
        sql = "select now() as time"
        time_info = target_source_find_all(ip,port,sql,0.2)
        cur_time = time_info['data'][0]['time']
        node = node + " " + str(cur_time)
        # 获取复制信息
        sql1 = "show slave status"
        slave_info = target_source_find_all(ip,port,sql1,0.2)
        if len(slave_info['data']) >0:
            io = slave_info['data'][0]['Slave_IO_Running']
            sql = slave_info['data'][0]['Slave_SQL_Running']
            behind = slave_info['data'][0]['Seconds_Behind_Master']
            node = node + ' ' + 'io-sql-begind=%s-%s-%s' %(io,sql,behind)
        else:
            io = ''
            sql = ''
            behind = ''
        if table:
            tb.add_row([my_node,read_only,semi_info['data'][0]['semi_master_enabled'],semi_info['data'][0]['semi_slave_enabled'],io,sql,behind,conn_threads,run_threads,cur_time])
        return node
            
    @staticmethod
    def get_top_node(host, port):
        """
        递归获取拓扑结构中的master,该方法可以做为一个静态方法被单独调用,用来获取一个集群的top节点
        获取top节点不能只向上获取,否则会出现双主无限循环调用
        :param host:
        :param port:
        :return:
        """
        # 获取输入节点的master
        temp_master = ReplInfo.get_master_by_node(host, port)
        # 获取输入节点的slave
        slave_list = ReplInfo.get_slave_by_node(host, port)
        if temp_master in slave_list:
            logger.error("集群为M<-->M架构,暂时不支持获取")
            return "error", "", ""
        if temp_master == "":           # 自己上面没有主节点则自己就是主节点,直接返回就行,递归到最后节点必定会走到这一层
            return "ok", host, port
        temp_master_host, temp_master_port = temp_master.split(":")[0], temp_master.split(":")[1]
        return ReplInfo.get_top_node(temp_master_host, temp_master_port)

    @staticmethod
    def get_master_by_node(host, port):
        """
        从指定节点获取上层master节点
        :param host:
        :param port:
        :return: ""|ip_port
        """
        sql = "show slave status"
        ret = target_source_find_all(host, port, sql, 0.2)
        # 如果获取失败或者没有获取到slave则返回"",不再继续向下探测
        if ret['status'] != "ok" or len(ret['data']) == 0: return ""
        # 如果获取到slave信息则执行下面流程
        master_info = ret['data'][0]
        master_host = master_info.get('Master_Host')
        master_port = master_info.get('Master_Port')
        slave_io_status = master_info.get('Slave_IO_Running')
        slave_sql_status = master_info.get('Slave_SQL_Running')
        # 有slave信息但是无效则认为没有
        if slave_io_status == "No":
            return ""
        elif slave_io_status == "Connecting":
            print('NOTE!!! %s_%s slave_io_stats状态为Connecting,忽略对应主节点' % (host,port))
            return ""
        else:
            return "%s:%s" % (master_host, master_port)

    @staticmethod
    def get_slave_by_node(host, port):
        """
        从指定节点获取下层slave列表节点
        :param host:
        :param port:
        :return:
        """
        slave_groups = []
        ins = "%s_%s" % (host, port)

        # 获取该node的server_uuid
        sql = "select @@server_uuid as server_uuid"
        ret = target_source_find_all(host, port, sql, 0.2)
        if ret['status'] != "ok": return slave_groups
        ins_server_uuid = ret['data'][0]['server_uuid']

        # 获取slave_host、slave_port
        sql1 = """
                   select substring_index(host,':',1) as master_ip 
                   from information_schema.processlist
                   where command like 'Binlog Dump%'
               """
        sql2 = "show slave hosts"
        ret1 = target_source_find_all(host, port, sql1, 0.2)
        ret2 = target_source_find_all(host, port, sql2, 0.2)
        if ret1['status'] != "ok" or ret2['status'] != "ok": return slave_groups
        slave_host_list = [item.get('master_ip') for item in ret1['data']]
        slave_port_list = [item.get('Port') for item in ret2['data']]

        # 根据host、port进行排列组合
        instance_list = []
        for slave_host in slave_host_list:
            for slave_port in slave_port_list:
                instance = slave_host + ":" + str(slave_port)
                if instance in instance_list:
                    pass
                else:
                    instance_list.append(instance)

        '''
        遍历排列组合生成的所有slave实例：
          1.本集群中的可以连接的实例,保留
          2.本集群宕机的实例,无法连接,忽略
          3.排列组合生成的现实当中不存在的实例,无法连接,忽略
          4.订阅binlog的非mysql实例,如canal等服务,无法连接,忽略
          5.非该node下的可连接其他集群的实例,忽略
          6.非该node下的不可连接其他集群的实例,忽略
        '''
        for slave_instance in instance_list:
            slave_host = slave_instance.split(":")[0]
            slave_port = slave_instance.split(":")[1]
            # 过滤无法连接的实例
            ping_ret = target_source_ping(slave_host, slave_port)
            if ping_ret['status'] != 'ok':
                logger.info("该实例连接失败需要过滤:%s" % slave_instance)
                continue
            # 过滤可以连接但是是其他集群的节点,连接上去show slave status看是否有值,如果没有值直接过滤,如果有值判断主库是不是ins
            sql3 = "show slave status"
            slave_ret = target_source_find_all(slave_host, slave_port, sql3, 0.2)
            if len(slave_ret['data']) == 0:
                logger.info("%s_%s不是slave角色直接抛弃" %(slave_host, slave_port))
                continue
            else:
                my_info = slave_ret['data'][0]
                my_host = my_info.get('Master_Host')
                my_port = my_info.get('Master_Port')
                my_ins = my_host + ":" + str(my_port)
                # 判断my_ins与ins是否是同一个实例,如果是则保留,否则忽略,通过2层判断一层不行用兜底方案
                my_ins_server_uuid_ret = target_source_find_all(my_host, my_port, sql, 0.2)
                # 如果操查询失败则用my_ins与ins做对比,对于vip场景可能不准
                if my_ins_server_uuid_ret['status'] != "ok":
                    if my_ins != ins:
                        logger.info("排列组合生成的%s_%s 这个slave的master与探测node不一致,可能是其他集群的节点,需要忽略")
                        continue
                my_ins_server_uuid = my_ins_server_uuid_ret['data'][0]['server_uuid']
                if my_ins_server_uuid != ins_server_uuid:
                    logger.info("排列组合生成的%s_%s 这个slave的master的server_uuid与探测node的server_uuid不一致,可能是其他集群的节点,需要忽略")
                    continue
            slave_groups.append(slave_instance)
            logger.info("获取到有效的slave角色为%s" % slave_groups)
        return slave_groups

    def get_all_node(self, top_host, top_port):
        """
        根据集群top节点获取该集群所有节点
        :param top_host:
        :param top_port:
        :return:
        """
        # 获取该节点server_uuid
        sql_server_uuid = "select @@server_uuid as server_uuid"
        ret = target_source_find_all(top_host, top_port, sql_server_uuid, 0.2)
        if ret['status'] != "ok": return
        instance_server_uuid = ret['data'][0]['server_uuid']

        instance = "%s:%s" % (top_host, top_port)
        self.output_instance_list.append(instance.replace(":", "_"))
        # 获取该节点的所有slave
        slave_instance_list = ReplInfo.get_slave_by_node(top_host, top_port)
        # 如果从top节点没有获取到slave则说明是一个单点
        if len(slave_instance_list) == 0:
            self.output_node_relation_list.append({instance:None})
            return
        # 循环instance中的所有slave
        for s in slave_instance_list:
            # 如果当前slave与top节点相等,说明出现互相复制,暂时不支持
            assert s != instance
            # 确定当前slave的ip、port
            item_host = s.split(":")[0]
            item_port = s.split(":")[1]
            # 从当前slave继续获取下层slave
            sql = "show slave status"
            ret = target_source_find_all(item_host, item_port, sql, 0.2)
            # 如果执行失败或者没有获取到slave信息则过滤掉该节点
            if ret['status'] != "ok" or len(ret['data']) == 0:
                continue
            # 从该slave节点获取到的master信息
            my_host = ret['data'][0]['Master_Host']
            my_port = ret['data'][0]['Master_Port']
            # my_instance = my_host + ":" + my_port
            # 原始是通过判断my_instance与instance是否一致来判断,但是会忽略从库是通过vip连接的场景,所以通过server_uuid来判断
            my_server_uuid_ret = target_source_find_all(my_host, my_port, sql_server_uuid, 0.2)
            if my_server_uuid_ret['status'] == "ok":
                my_ins_server_uuid = my_server_uuid_ret['data'][0]['server_uuid']
                if my_ins_server_uuid == instance_server_uuid:
                    slave_host = s.split(":")[0]
                    slave_port = s.split(":")[1]
                    self.output_node_relation_list.append({instance: s})
                    self.output_instance_list.append(s.replace(":", "_"))
                    self.get_all_node(slave_host, slave_port)  # 递归向下获取


class ReplTree():
    """
    生成拓扑树
    output_node_relation_list = [{'172.16.1.210_3306': '172.16.1.211:3306'}, {'172.16.1.211:3306': '172.16.1.212:3306'},{'172.16.1.211:3306': '172.16.1.213:3306'}, {'172.16.1.212:3306': None},{'172.16.1.213:3306': None}]
    repl_tree = ReplTree(output_node_relation_list)
    draw_tree_result_list = repl_tree.drwa_tree()
    print(draw_tree_result_list)
    for node in draw_tree_result_list:
        if node.find('None') < 0:
            print(node)
    """

    def __init__(self, nodes):
        self.nodes = nodes
    def get_root(self):
        """
        :return:
        """
        return [master for master in [list(node.keys())[0] for node in self.nodes] if not self.get_master(master)][0]

    def get_master(self, slave):
        """
        :param slave:
        :return:
        """
        return [node for node in self.nodes if slave in node.values()]

    def get_slave(self, master):
        """
        :param master:
        :return:
        """
        return [[repl.get(master)] for repl in self.nodes if master in repl.keys()]

    def get_child(self, node):
        """
        :param node:
        :return: [['172.16.1.211:3306', [['172.16.1.212:3306', [[None]]], ['172.16.1.213:3306', [[None]]]]]]
        """
        childs = self.get_slave(node)
        for child in childs:
            _c = self.get_child(child[0])
            if _c:
                child.append(_c)
        return childs

    def get_tree(self):
        """
        :return: ['172.16.1.210_3306', [['172.16.1.211:3306', [['172.16.1.212:3306', [[None]]], ['172.16.1.213:3306', [[None]]]]]]] ,len(tree)=2
        """
        return [self.get_root(), self.get_child(self.get_root())]

    def drwa_tree(self):
        """
        :return:['172.16.1.210_3306', '|____ 172.16.1.211:3306', '|________ 172.16.1.212:3306', '|____________ None', '|________ 172.16.1.213:3306', '|____________ None']
        """
        tree = self.get_tree()
        level = 0
        draw_tree_list = []
        def draw_node(node, level):
            if level == 0:
                draw_tree_list.append(node[0])
            else:
                draw_tree_list.append('|%s %s' %('_' * 4 * level, node[0]))
            if len(node) == 2:
                for inner_node in node[1]:
                    draw_node(inner_node, level + 1)
        draw_node(tree, level)
        return draw_tree_list


if __name__ == "__main__":
    db_all_remote_user = "wth"
    db_all_remote_pass = "fffjjj"
    ip_port_sql_cache_dict = {}
    ip_port_cache_dict = {}
    parser = argparse.ArgumentParser(description='Get Cluster Topo By Instance')
    parser.add_argument("-H", "--host", required=True, help="input host")
    parser.add_argument("-P", "--port", type=int, help="input port",default=3306)
    parser.add_argument("--sum",action='store_true', help="output other info",default=False)
    parser.add_argument("--table",action='store_true', help="output table format",default=False)
    args = parser.parse_args()
    host = args.host
    port = args.port
    summary = args.sum
    table = args.table
    try:
        obj = ReplInfo(host, port) 
        topo_ret = obj.repl_topol_show()
        if topo_ret['status'] != "ok":
            print(topo_ret['message'])
        else:
            print(topo_ret['data'][0]['output_node_relation_list'])
    except Exception as e:
        print(str(e))
    finally:
        for conn in ip_port_cache_dict.values():
            conn.close()
