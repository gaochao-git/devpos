-- 数据集管理表
CREATE TABLE `web_console_datasets` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `dataset_name` varchar(128) NOT NULL COMMENT '数据集名称',
  `dataset_description` varchar(128) COMMENT '数据集描述',
  `dataset_content` longtext NOT NULL COMMENT '数据集内容(包含表结构和业务注释)',
  `cluster_group_name` varchar(64) NOT NULL COMMENT '集群组名',
  `database_name` varchar(64) NOT NULL COMMENT '数据库名',
  `create_by` varchar(64) NOT NULL COMMENT '创建人',
  `update_by` varchar(64) NOT NULL COMMENT '更新人',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_dataset_cluster_database` (`dataset_name`,`cluster_group_name`,`database_name`),
  KEY `idx_cluster_database` (`cluster_group_name`,`database_name`),
  KEY `idx_create_by` (`create_by`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据集管理表'; 