/*sdfsf*/
use test;
CREATE TABLE `sql_check_results` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_sql_uuid` varchar(50) NOT NULL COMMENT '请求uuid',
  `inception_id` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的ID',
  `inception_stage` varchar(20) NOT NULL DEFAULT '' COMMENT 'Inception返回的stage',
  `inception_error_level` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的错误号码',
  `inception_stage_status` varchar(64) NOT NULL DEFAULT 'Inception返回的stage status',
  `inception_error_message` text NOT NULL COMMENT 'Inception返回的错误信息',
  `inception_sql` text COMMENT 'Inception返回的需要执行的SQL',
  `inception_affected_rows` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的影响行数',
  `inception_sequence` varchar(255) NOT NULL DEFAULT '' COMMENT 'Inception返回的回滚备份序列号',
  `inception_backup_dbnames` varchar(255) NOT NULL DEFAULT '' COMMENT 'Inception返回的数据库名称',
  `inception_execute_time` varchar(100) NOT NULL DEFAULT '0' COMMENT 'Inception返回的执行耗时',
  `inception_sqlsha1` varchar(255) NOT NULL DEFAULT '' COMMENT 'Inception返回的sqlsha1',
  `inception_command` varchar(255) NOT NULL DEFAULT '' COMMENT 'Inception返回的command',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COMMENT='SQL检查结果表';

CREATE TABLE `sql_execute` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_sql_uuid` varchar(50) NOT NULL COMMENT '请求uuid',
  `submit_sql_user` varchar(50) NOT NULL COMMENT '提交SQL用户',
  `submit_sql_file_path` varchar(200) NOT NULL COMMENT '请求sql存放路径',
  `title` varchar(50) NOT NULL COMMENT '标题',
  `leader_user_name` varchar(50) NOT NULL DEFAULT '' COMMENT '开发leader',
  `qa_user_name` varchar(50) NOT NULL DEFAULT '' COMMENT '测试人员',
  `dba_check_user_name` varchar(50) NOT NULL DEFAULT '' COMMENT 'dba审核人员',
  `dba_execute_user_name` varchar(50) NOT NULL DEFAULT '' COMMENT 'dba执行人员',
  `master_ip` varchar(50) NOT NULL COMMENT '主库ip',
  `master_port` int(11) NOT NULL COMMENT '主库port',
  `execute_status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态:1-->未执行,2-->执行中,3-->执行成功,4-->执行失败',
  `comment_info` varchar(200) NOT NULL DEFAULT '' COMMENT 'sql说明',
  `leader_check` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'leader审核:1-->未审核,2-->审核通过,3-->审核不通过',
  `qa_check` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'qa审核:1-->未审核,2-->审核通过,3-->审核不通过',
  `dba_check` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'dba审核:1-->未审核,2-->审核通过,3-->审核不通过',
  `submit_sql_execute_type` varchar(50) NOT NULL DEFAULT '' COMMENT '执行类型',
  `inception_osc_config` varchar(10000) NOT NULL DEFAULT '' COMMENT 'OSC 配置,必须为json格式',
  `dba_execute` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'dba执行:1-->未执行,2-->已执行',
  `execute_results` tinyint(4) NOT NULL DEFAULT '-1' COMMENT 'dba执行:1-->成功,2-->成功含警告,3-->失败',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COMMENT='SQL工单';

CREATE TABLE `sql_execute_results` (
  `id` int(4) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_sql_uuid` varchar(50) NOT NULL COMMENT '请求uuid',
  `split_seq` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的拆分ID',
  `rerun_seq` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception执行失败后平台生成的重做序列号',
  `inception_id` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的ID',
  `inception_stage` varchar(20) NOT NULL DEFAULT '' COMMENT 'Inception返回的stage',
  `inception_error_level` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的错误号码',
  `inception_error_stage` varchar(64) NOT NULL DEFAULT 'Inception返回的errstage',
  `inception_error_message` text NOT NULL COMMENT 'Inception返回的错误  信息',
  `inception_sql` text COMMENT 'Inception返回的问题SQL内容',
  `inception_affected_rows` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的影响行数',
  `inception_sequence` varchar(255) NOT NULL DEFAULT '' COMMENT 'Inception返回的回滚备份序列号',
  `inception_backup_dbname` varchar(255) NOT NULL DEFAULT '' COMMENT 'Inception返回的数据库名称',
  `inception_execute_time` varchar(100) NOT NULL DEFAULT '0' COMMENT '执行耗时',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COMMENT='执行结果表';

CREATE TABLE `inception_variable_config` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `variable_name` varchar(200) NOT NULL DEFAULT '' COMMENT '变量名',
  `variable_value` varchar(200) NOT NULL DEFAULT '' COMMENT '变量值',
  `variable_description` varchar(2000) DEFAULT NULL COMMENT '参数解释',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8 COMMENT='inception 变量配置表';
INSERT INTO `inception_variable_config` VALUES (2,'inception_osc_chunk_size_limit','1','chunk_size_limit（pt-osc）','2015-07-16 10:02:59'),(3,'inception_osc_chunk_time','0.5','chunk_time（pt-osc）','2015-07-16 10:02:59'),(4,'inception_osc_critical_thread_connected','5000','critical_thread_connected（build_in_osc, pt_osc）','2015-07-16 10:02:59'),(5,'inception_osc_critical_thread_running','800','critical_thread_running（build_in_osc, pt_osc）','2015-07-16 10:02:59'),(6,'inception_osc_drop_new_table','1','drop_new_table（pt_osc）','2015-07-16 10:02:59'),(7,'inception_osc_drop_old_table','1','drop_old_table（pt_osc）','2015-07-16 10:02:59'),(8,'inception_osc_max_thread_connected','5000','max_thread_connected（build_in_osc, pt_osc）','2015-07-16 10:02:59'),(9,'inception_osc_max_thread_running','80','max_thread_running（build_in_osc, pt_osc）','2015-07-16 10:02:59'),(10,'inception_osc_max_lag','10','max_lag（build_in_osc, pt_osc）','2015-09-02 09:00:52'),(11,'inception_osc_recursion_method','processlist','recursion_method（pt_osc）','2015-09-22 12:20:54'),(12,'inception_osc_check_alter','on','check_alter（pt_osc）','2016-03-01 12:11:09'),(13,'inception_osc_min_table_size','0','min_table_size（build_in_osc, pt_osc）单位M，直接填数字','2016-09-20 09:55:48'),(14,'inception_osc_chunk_size','200','chunk_size（build_in_osc, pt_osc）','2017-01-04 18:23:18'),(16,'inception_biosc_lock_table_max_time','2','会话级参数，用来控制在每次将表上锁之后，如果一直还没有把Binlog消费完，则达到这个时间之 后，为了不影响业务
，先将表锁释放了，那么这个值表示的就是最大的锁表时间值。单位为秒。','2017-05-08 18:26:32'),(17,'inception_biosc_lock_wait_timeout','2','会话级参数，用来
控制RENAME线程在RENAME操作时，如果上锁时间超过这个参数的值，则这个 RENAME操作就超时了，这样就避免了对业务的更大的影响。单位为秒。','2017-05-08 18:27:06'),(18,'inception_biosc_retry_wait_time','1000','会话级参数，上面已经知道，如果锁表时间超过一定的值 (inception_biosc_lock_table_max_time)，则会释放锁让业
务恢复正常，而恢复正常需要一个时 间窗口，不可能是释放之后，马上就再加锁，那么这个参数所控制的就是在再次加锁前，等待多 少时间，等待的时间越多，有可能产生
的Binlog越多，改表时间越长，这个要根据实际的线上压力 在改表前来动态调整。','2017-05-08 18:27:26'),(19,'inception_alter_table_method','pt_osc','pt_osc,build_in_osc,direct_alter','2017-05-09 10:10:34'),(20,'inception_biosc_drop_new_table','0','针对biosc方式的删表参数','2017-05-16 18:56:25'),(21,'inception_biosc_drop_old_table','0','针对biosc方式的删表参数','2017-05-16 18:56:42'),(22,'inception_osc_check_unique_key_change','on','check-unique-key-change（pt-osc）','2017-10-17 14:31:10');

