CREATE TABLE `common_user` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_name` varchar(50) NOT NULL DEFAULT '' COMMENT '用户名',
  `user_password` varchar(50) NOT NULL DEFAULT '' COMMENT '用户密码',
  `user_host` varchar(200) NOT NULL DEFAULT '' COMMENT '用户主机名',
  `privileges` varchar(200) NOT NULL DEFAULT '' COMMENT '用户权限',
  `db_name` varchar(200) NOT NULL DEFAULT '' COMMENT '允许访问的数据库',
  `tb_name` varchar(200) NOT NULL DEFAULT '' COMMENT '允许访问的表',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '1为有效，2为无效',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_name` (`user_name`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COMMENT='公共用户表';

CREATE TABLE `mysql_cluster` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cluster_type` varchar(30) NOT NULL DEFAULT '' COMMENT '集群类型: 单点,主从,MMM,MHA,PXC,MGR',
  `cluster_name` varchar(64) NOT NULL DEFAULT '' COMMENT '集群名称',
  `cluster_grade` tinyint(4) NOT NULL DEFAULT '0' COMMENT '集群重要等级，-1代表无需备份，0代表未定义，1代表不重要，2代表普通，3代表重要，4代表非常重要',
  `cluster_status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '集群状态，1正常服务,0不可访问，2已下线',
  `cluster_department` varchar(15) NOT NULL DEFAULT '' COMMENT '集群部门',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `udx_cluster_name` (`cluster_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COMMENT='mysql集群信息表';

CREATE TABLE `mysql_cluster_instance` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `cluster_name` varchar(64) NOT NULL DEFAULT '' COMMENT '集群名称',
  `cluster_type` varchar(50) NOT NULL DEFAULT '' COMMENT '集群类型: 单点,主从,MMM,MHA,PXC,MGR',
  `instance_name` varchar(100) NOT NULL DEFAULT '' COMMENT '实例名',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_instance_name` (`instance_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COMMENT='mysql集群实例表';

CREATE TABLE `mysql_instance` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `host_name` varchar(50) NOT NULL DEFAULT '' COMMENT '主机名',
  `host_ip` varchar(50) NOT NULL DEFAULT '' COMMENT '主机ip',
  `port` int(4) NOT NULL COMMENT 'mysql端口',
  `instance_name` varchar(100) NOT NULL DEFAULT '' COMMENT '实例名',
  `instance_status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '集群状态:0-->不可访问,1-->正常服务,2-->已下线',
  `read_only` varchar(10) NOT NULL DEFAULT '' COMMENT 'read_only状态',
  `version` varchar(50) NOT NULL DEFAULT '' COMMENT 'mysql版本',
  `bufferpool` varchar(50) NOT NULL DEFAULT '' COMMENT 'innodb bufferpool',
  `server_charset` varchar(50) NOT NULL DEFAULT '' COMMENT 'server字符集',
  `master_ip` varchar(50) NOT NULL DEFAULT '' COMMENT 'master ip',
  `master_port` varchar(50) NOT NULL DEFAULT '' COMMENT 'master port',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_host_name_port` (`host_name`,`port`),
  UNIQUE KEY `uniq_host_ip_port` (`host_ip`,`port`)
) ENGINE=InnoDB AUTO_INCREMENT=3362 DEFAULT CHARSET=utf8mb4 COMMENT='mysql实例表';

CREATE TABLE `private_user` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_name` varchar(50) NOT NULL DEFAULT '' COMMENT '用户名',
  `user_password` varchar(50) NOT NULL DEFAULT '' COMMENT '用户密码',
  `user_host` varchar(200) NOT NULL DEFAULT '' COMMENT '用户主机名',
  `privileges` varchar(200) NOT NULL DEFAULT '' COMMENT '用户权限',
  `db_name` varchar(200) NOT NULL DEFAULT '' COMMENT '允许访问的数据库',
  `tb_name` varchar(200) NOT NULL DEFAULT '' COMMENT '允许访问的表',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '1为有效，2为无效',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  `db_master_ip` varchar(200) NOT NULL DEFAULT '' COMMENT '主库机器名',
  `db_master_port` int(11) NOT NULL DEFAULT '0' COMMENT '主库机端号',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_name` (`user_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COMMENT='私有用户表';

CREATE TABLE `privilege_request_info` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `order_uuid` varchar(40) NOT NULL DEFAULT '' COMMENT '工单唯一标识',
  `person_name` varchar(50) NOT NULL DEFAULT '' COMMENT '申请人',
  `request_type` int(11) NOT NULL DEFAULT '-1' COMMENT '0-->创建新用户,1-->扩展权限,2-->扩展IP,3-->扩展数据库',
  `department` varchar(30) NOT NULL DEFAULT '' COMMENT '部门',
  `leader` varchar(20) NOT NULL DEFAULT '' COMMENT '部门leader',
  `dba` varchar(20) NOT NULL DEFAULT '' COMMENT 'DBA姓名',
  `leader_check_result` int(11) NOT NULL DEFAULT '0' COMMENT '0-->未审核,1-->审核通过,2-->审核不通过',
  `dba_check_result` int(11) NOT NULL DEFAULT '0' COMMENT '0-->未审核,1-->审核通过,2-->审核不通过',
  `db_master_ip` varchar(200) NOT NULL DEFAULT '' COMMENT '主库机器名',
  `db_master_port` int(11) NOT NULL DEFAULT '0' COMMENT '主库端口号',
  `user_name` varchar(50) NOT NULL DEFAULT '' COMMENT '申请用户',
  `user_host` varchar(200) NOT NULL DEFAULT '' COMMENT '申请主机名',
  `privileges` varchar(200) NOT NULL DEFAULT '' COMMENT '申请权限',
  `db_name` varchar(200) NOT NULL DEFAULT '' COMMENT '授权的数据库',
  `tb_name` varchar(200) NOT NULL DEFAULT '' COMMENT '授权的表',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '工单状态,1-->未执行,2-->执行成功,3-->执行失败',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_uuid` (`order_uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COMMENT='权限请求工单表';

CREATE TABLE `server` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `server_public_ip` varchar(50) NOT NULL DEFAULT '' COMMENT '主机公网ip',
  `server_private_ip` varchar(50) NOT NULL DEFAULT '' COMMENT '主机内网ip',
  `server_hostname` varchar(200) NOT NULL DEFAULT '' COMMENT '主机名',
  `server_usage` tinyint(4) NOT NULL DEFAULT '0' COMMENT 'server用途:1-->MySQL,2-->Redis,3-->混合',
  `server_type` tinyint(4) NOT NULL DEFAULT '0' COMMENT '机器类型:1-->云主机,2-->物理机',
  `server_os` varchar(50) NOT NULL DEFAULT '' COMMENT '操作系统',
  `memory` varchar(50) NOT NULL DEFAULT '' COMMENT '机器内存',
  `disk_capacity` varchar(50) NOT NULL DEFAULT '' COMMENT '磁盘容量',
  `disk_type` varchar(50) NOT NULL DEFAULT '' COMMENT '磁盘类型',
  `network_type` varchar(50) NOT NULL DEFAULT '' COMMENT '网络类型',
  `public_network_bandwidth` varchar(50) NOT NULL DEFAULT '' COMMENT '公网带宽',
  `private_network_bandwidth` varchar(50) NOT NULL DEFAULT '' COMMENT '内网带宽',
  `cpu_size` tinyint(4) NOT NULL DEFAULT '-1' COMMENT 'CPU核数',
  `deadline` timestamp NOT NULL DEFAULT '1971-01-01 01:01:01' COMMENT '到期时间',
  `status` tinyint(4) NOT NULL DEFAULT '-1' COMMENT '机器状态:0-->不可用,1-->可用',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_server_public_ip` (`server_public_ip`),
  UNIQUE KEY `uk_server_private_ip` (`server_private_ip`),
  UNIQUE KEY `uk_server_hostname` (`server_hostname`)
) ENGINE=InnoDB AUTO_INCREMENT=2232 DEFAULT CHARSET=utf8mb4 COMMENT='主机信息表';


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
  `inception_executed_time` varchar(100) NOT NULL DEFAULT '' COMMENT 'inception get osc_percent返回的该sql已经执行多长时间',
  `inception_remain_time` varchar(100) NOT NULL DEFAULT '' COMMENT 'inception get osc_percent返回的该sql预计还有多长时间执行完',
  `inception_execute_percent` int(11) NOT NULL DEFAULT '0' COMMENT 'inception get osc_percent返回的该sql执行进度',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  KEY `idx_submit_sql_uuid` (`submit_sql_uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=104034 DEFAULT CHARSET=utf8mb4 COMMENT='SQL检查结果表';

CREATE TABLE `sql_execute_results` (
  `id` int(4) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_sql_uuid` varchar(50) NOT NULL COMMENT '请求uuid',
  `split_seq` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的拆分ID',
  `split_sql_file_path` varchar(200) NOT NULL COMMENT '请求sql存放路径',
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
  `inception_execute_time` decimal(16,4) NOT NULL DEFAULT '0.0000' COMMENT '执行耗时',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=56344 DEFAULT CHARSET=utf8mb4 COMMENT='执行结果表';


CREATE TABLE `sql_execute_split` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_sql_uuid` varchar(50) NOT NULL COMMENT '请求uuid',
  `split_seq` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的拆分ID',
  `rerun_seq` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception执行失败后平台生成的重做序列号',
  `rerun_flag` tinyint(4) NOT NULL DEFAULT '-1' COMMENT '执行失败生成重做数据状态 0生成重做数据成功 1生成重做数据失败',
  `rerun_sequence` varchar(50) NOT NULL DEFAULT '' COMMENT 'xxx',
  `ddlflag` tinyint(4) NOT NULL DEFAULT '-1' COMMENT 'Inception返回的ddlflag 0不含DDL, 1含DDL',
  `sql_num` int(11) NOT NULL DEFAULT '1' COMMENT '一个split sql file中包含的sql数量',
  `split_sql_file_path` varchar(150) NOT NULL COMMENT '请求sql存放路径',
  `submit_source_db_type` tinyint(4) NOT NULL DEFAULT '-1' COMMENT '工单提交source_db类型:0-->master_ip_port,1-->cluster_name',
  `cluster_name` varchar(50) NOT NULL DEFAULT '' COMMENT '集群名字',
  `master_ip` varchar(50) NOT NULL DEFAULT '' COMMENT '主库ip',
  `master_port` int(11) NOT NULL DEFAULT '0' COMMENT '主库port',
  `submit_sql_execute_type` varchar(50) NOT NULL DEFAULT '' COMMENT '执行类型',
  `submit_sql_execute_plat_or_manual` tinyint(4) NOT NULL DEFAULT '0' COMMENT '执行类型:1-->平台执行,2-->手动执行',
  `inception_osc_config` varchar(10000) NOT NULL DEFAULT '' COMMENT 'OSC 配置,必须为json格式',
  `inception_backup` tinyint(2) NOT NULL DEFAULT '1' COMMENT '是否备份, 0不备份, 1备份',
  `inception_check_ignore_warning` tinyint(2) NOT NULL DEFAULT '0' COMMENT 'inception是否忽略检查警告继续执行,0-->不忽略警告,1-->忽略警告',
  `inception_execute_ignore_error` tinyint(2) NOT NULL DEFAULT '0' COMMENT 'inception执行遇到错误是否继续执行,0-->不继续执行,1-->继续执行',
  `dba_execute` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'dba执行:1-->未执行,2-->已执行',
  `execute_status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态:1-->未执行,2-->执行中,3-->执行成功,4-->执行失败,5-->执行成功含警告,999-->未知',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_split_sql_file_path` (`split_sql_file_path`)
) ENGINE=InnoDB AUTO_INCREMENT=474 DEFAULT CHARSET=utf8mb4 COMMENT='SQL拆分表'

CREATE TABLE `sql_inception_osc_config` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `variable_name` varchar(200) NOT NULL DEFAULT '' COMMENT '变量名',
  `variable_value` varchar(200) NOT NULL DEFAULT '' COMMENT '变量值',
  `variable_description` varchar(2000) DEFAULT NULL COMMENT '参数解释',
  `editable` tinyint(1) DEFAULT '1' COMMENT '1-->可编辑,2-->不可编辑',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8 COMMENT='inception 变量配置表';
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_chunk_size',200);
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_chunk_size_limit',1);
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_chunk_time',0.5);
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_creitical_thread_connected',500);
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_creitical_thread_running',80);
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_max_thread_connected',500);
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_max_thread_running',80);
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_drop_new_table',1);
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_drop_old_table',1);
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_max_lag',10);
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_recursion_method','processlist');
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_check_alter','on');
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_alter_table_method','pt-osc');
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_check_unique_key_change','on');
insert into sql_inception_osc_config(variable_name,variable_value) values('inception_osc_alter_foreign_keys_method','none');

CREATE TABLE `sql_submit_info` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_sql_uuid` varchar(50) NOT NULL COMMENT '请求uuid',
  `submit_sql_user` varchar(50) NOT NULL COMMENT '提交SQL用户',
  `submit_sql_file_path` varchar(200) NOT NULL COMMENT '请求sql存放路径',
  `title` varchar(50) NOT NULL COMMENT '标题',
  `leader_user_name` varchar(50) NOT NULL DEFAULT '' COMMENT '开发leader',
  `qa_user_name` varchar(50) NOT NULL DEFAULT '' COMMENT '测试人员',
  `dba_check_user_name` varchar(50) NOT NULL DEFAULT '' COMMENT 'dba审核人员',
  `dba_execute_user_name` varchar(50) NOT NULL DEFAULT '' COMMENT 'dba执行人员',
  `submit_source_db_type` tinyint(4) NOT NULL DEFAULT '-1' COMMENT '工单提交source_db类型:0-->master_ip_port,1-->cluster_name',
  `cluster_name` varchar(50) NOT NULL DEFAULT '' COMMENT '集群名字',
  `master_ip` varchar(50) NOT NULL DEFAULT '' COMMENT '主库ip',
  `master_port` int(11) NOT NULL DEFAULT '0' COMMENT '主库port',
  `comment_info` varchar(200) NOT NULL DEFAULT '' COMMENT 'sql说明',
  `leader_check` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'leader审核:1-->未审核,2-->审核通过,3-->审核不通过',
  `qa_check` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'qa审核:1-->未审核,2-->审核通过,3-->审核不通过',
  `dba_check` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'dba审核:1-->未审核,2-->审核通过,3-->审核不通过',
  `leader_check_comment` varchar(200) NOT NULL DEFAULT '' COMMENT 'leader审核备注',
  `qa_check_comment` varchar(200) NOT NULL DEFAULT '' COMMENT 'qa审核备注',
  `dba_check_comment` varchar(200) NOT NULL DEFAULT '' COMMENT 'dba审核备注',
  `submit_sql_execute_type` varchar(50) NOT NULL DEFAULT '' COMMENT '执行类型',
  `submit_sql_execute_plat_or_manual` tinyint(4) NOT NULL DEFAULT '0' COMMENT '执行类型:1-->平台执行,2-->手动执行',
  `inception_osc_config` varchar(10000) NOT NULL DEFAULT '' COMMENT 'OSC 配置,必须为json格式',
  `inception_backup` tinyint(2) NOT NULL DEFAULT '1' COMMENT '是否备份, 0不备份, 1备份',
  `inception_check_ignore_warning` tinyint(2) NOT NULL DEFAULT '0' COMMENT 'inception是否忽略检查警告继续执行,0-->不忽略警告,1-->忽略警告',
  `inception_execute_ignore_error` tinyint(2) NOT NULL DEFAULT '0' COMMENT 'inception执行遇到错误是否继续执行,0-->不继续执行,1-->继续执行',
  `dba_execute` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'dba执行:1-->未执行,2-->已执行',
  `execute_status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态:1-->未执行,2-->执行中,3-->执行成功,4-->执行失败,5-->执行成功含警告,6-->手动执行,999-->未知',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_submit_sql_uuid` (`submit_sql_uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=459 DEFAULT CHARSET=utf8mb4 COMMENT='SQL工单';


CREATE TABLE `team_check_role` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `gid` int(11) NOT NULL DEFAULT '-1' COMMENT '用户归属组',
  `gname` varchar(50) NOT NULL DEFAULT '' COMMENT '组名',
  `qa_name` varchar(50) NOT NULL DEFAULT '' COMMENT 'qa',
  `leader_name` varchar(50) NOT NULL DEFAULT '' COMMENT 'leader名字',
  `dba_name` varchar(50) NOT NULL DEFAULT '' COMMENT 'dba名字',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COMMENT='审核成员表';

CREATE TABLE `team_user` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `uid` varchar(50) NOT NULL DEFAULT '' COMMENT '用户唯一标识',
  `gid` int(11) NOT NULL DEFAULT '-1' COMMENT '用户组唯一标识',
  `uname` varchar(50) NOT NULL DEFAULT '' COMMENT '姓名',
  `department` varchar(50) NOT NULL DEFAULT '' COMMENT '部门名称',
  `title` varchar(50) NOT NULL DEFAULT '' COMMENT '职位:0-->前端开发,1-->后端开发,2-->qa,3-->leader,4-->dba',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COMMENT='团队成员表';


CREATE TABLE `deploy_mysql_submit_info` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_uuid` varchar(50) NOT NULL COMMENT '工单id',
  `submit_user` varchar(50) NOT NULL COMMENT '提交用户',
  idc varchar(50) not null default '' COMMENT '机房',
  deploy_topos varchar(50) not null default '' COMMENT '部署topo信息',
  deploy_version varchar(50) not null default '' COMMENT '版本',
  deploy_archit varchar(50) not null default '' COMMENT '部署架构',
  deploy_other_param text COMMENT '自定义参数',
  `submit_check` tinyint(4) NOT NULL DEFAULT '1' COMMENT '审核:1-->未审核,2-->审核通过,3-->审核不通过',
  `submit_check_comment` varchar(200) NOT NULL DEFAULT '' COMMENT '审核备注',
  `submit_execute` tinyint(4) NOT NULL DEFAULT '1' COMMENT '执行:1-->未执行,2-->已执行',
  `deploy_status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态:1-->未执行,2-->执行中,3-->执行成功,4-->执行失败',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_submit_uuid` (`submit_uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COMMENT='数据库部署工单';

CREATE TABLE `deploy_mysql_log` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_uuid` varchar(50) NOT NULL COMMENT '工单id',
  `deploy_log`  text NOT NULL COMMENT '输出日志',
  step_task_status varchar(30) not null default '' comment '每个task执行结果状态',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='数据库部署日志表';