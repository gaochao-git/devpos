from apps.utils import db_helper
from multiprocessing.dummy import Pool as ThreadPool
import pymysql
from utils import cloud_time

from celery.utils.log import get_task_logger   # 多线程task_name、task_id为???问题
logger = get_task_logger(__name__)


class CollectMysql:
    """
    收集mysql信息
    全局变量
    全局状态
    复制信息
        show slave status;
        show slave hosts;
    binlog信息
        show master status;
        show binary logs;
    """
    def __init__(self, pool_count):
        self._pool_count = pool_count

    def task_run(self):
        """
        获取所有mysql实例-->并发所有集群实例获取信息,然后组装信息存入数据库，对集群名排序可以减少集群不同实例收集时间
        :return:
        """
        logger.info("任务开始执行")
        sql = "SELECT instance_name FROM mysql_cluster_instance order by cluster_name"
        ret = db_helper.find_all(sql)
        assert ret['status'] == 'ok'
        instance_list = ret['data']

        # 可迭代对象丢给线程池并发执行
        pool = ThreadPool(self._pool_count)
        pool.map(self._collect_info, instance_list)
        pool.close()
        pool.join()
        logger.info("任务执行结束")

    def _collect_info(self, instance_dict):
        """
        收集信息
        :param do_compare_dict:
        :return:
        """
        # 获取目标表结构md5
        instance_name = instance_dict.get('instance_name')
        ip = instance_name.split('_')[0].strip()
        port = instance_name.split('_')[1].strip()
        connections = pymysql.escape_string(str(self._get_connections(ip, port)))
        get_global_var = pymysql.escape_string(str(self._get_global_var(ip, port)))
        global_status = pymysql.escape_string(str(self._get_global_status(ip, port)))
        slave_status = pymysql.escape_string(str(self._get_slave_status(ip, port)))

        sql = f"""
            update mysql_cluster_instance set 
                instance_connection='{connections}',
                instance_var='{get_global_var}',
                instance_status='{global_status}',
                instance_slave_status='{slave_status}',
                update_time=now()
            where instance_name='{instance_name}'
        """
        db_helper.dml(sql)

    def _get_connections(self, ip, port):
        """获取连接数"""
        sql = 'select * from information_schema.processlist'
        ret = db_helper.target_source_find_all(ip, port ,sql)
        if ret['status'] == "ok":
            conn_threads = len(ret['data'])
            active_threads = len([i for i in ret['data'] if i.get('COMMAND') in['Query','Execute'] ])
        else:
            conn_threads = None
            active_threads = None
        return {"conn_threads": conn_threads, "active_threads": active_threads}

    def _get_global_var(self, ip, port):
        """获取全局变量"""
        sql = "show global variables"
        ret = db_helper.target_source_find_all(ip, port ,sql)
        var_dict = {}
        for i in ret['data']: var_dict[i.get('Variable_name')] = i.get('Value')
        filter_dict = {}
        filter_dict['read_only'] = var_dict.get('read_only')
        filter_dict['version'] = var_dict.get('version')
        filter_dict['character_set_server'] = var_dict.get('character_set_server')
        filter_dict['have_ssl'] = var_dict.get('have_ssl')
        filter_dict['tls_version'] = var_dict.get('tls_version')
        filter_dict['system_time_zone'] = var_dict.get('system_time_zone')
        filter_dict['time_zone'] = var_dict.get('time_zone')
        filter_dict['long_query_time'] = var_dict.get('long_query_time')
        filter_dict['interactive_timeout'] = var_dict.get('interactive_timeout')
        filter_dict['wait_timeout'] = var_dict.get('wait_timeout')
        filter_dict['sync_binlog'] = var_dict.get('sync_binlog')
        filter_dict['rpl_semi_sync_master_enabled'] = var_dict.get('rpl_semi_sync_master_enabled')
        filter_dict['rpl_semi_sync_master_timeout'] = var_dict.get('rpl_semi_sync_master_timeout')
        filter_dict['rpl_semi_sync_master_wait_no_slave'] = var_dict.get('rpl_semi_sync_master_wait_no_slave')
        filter_dict['rpl_semi_sync_master_wait_point'] = var_dict.get('rpl_semi_sync_master_wait_point')
        filter_dict['rpl_semi_sync_master_wait_no_slave'] = var_dict.get('rpl_semi_sync_master_wait_no_slave')
        filter_dict['rpl_semi_sync_slave_enabled'] = var_dict.get('rpl_semi_sync_slave_enabled')
        filter_dict['innodb_buffer_pool_size'] = var_dict.get('innodb_buffer_pool_size')
        filter_dict['innodb_fast_shutdown'] = var_dict.get('innodb_fast_shutdown')
        filter_dict['innodb_flush_log_at_trx_commit'] = var_dict.get('innodb_flush_log_at_trx_commit')
        return filter_dict

    def _get_global_status(self, ip, port):
        """获取全局状态"""
        sql = "show global status"
        ret = db_helper.target_source_find_all(ip, port ,sql)
        status_dict = {}
        for i in ret['data']: status_dict[i.get('Variable_name')] = i.get('Value')
        filter_dict = {}
        filter_dict['Rpl_semi_sync_master_clients'] = status_dict.get('Rpl_semi_sync_master_clients')
        filter_dict['Rpl_semi_sync_master_status'] = status_dict.get('Rpl_semi_sync_master_status')
        filter_dict['Uptime'] = cloud_time.secs_to_hms(int(status_dict.get('Uptime')))
        return filter_dict

    def _get_slave_status(self, ip, port):
        """获取复制信息"""
        sql = "show slave status"
        ret = db_helper.target_source_find_all(ip, port ,sql)
        if len(ret['data']) == 0: return {}
        return ret['data'][0]
