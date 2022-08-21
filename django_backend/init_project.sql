-- MySQL dump 10.13  Distrib 5.7.28, for linux-glibc2.12 (x86_64)
--
-- Host: 127.0.0.1    Database: devops
-- ------------------------------------------------------
-- Server version	5.7.28-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `devops`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `devops` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `devops`;

--
-- Table structure for table `ansible_api_log`
--

DROP TABLE IF EXISTS `ansible_api_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ansible_api_log` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_uuid` varchar(50) NOT NULL COMMENT '工单id',
  `stdout_log` text NOT NULL COMMENT '输出日志',
  `step_task_status` varchar(30) NOT NULL DEFAULT '' COMMENT '每个task执行结果状态',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COMMENT='ansible api日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_sql_log`
--

DROP TABLE IF EXISTS `audit_sql_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_sql_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `split_file` varchar(150) NOT NULL COMMENT '工单SQL文件',
  `audit_log_info` varchar(500) NOT NULL COMMENT '工单日志',
  `step_status` int(11) NOT NULL DEFAULT '-1' COMMENT '每个步骤的结果:0成功,1失败',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2312 DEFAULT CHARSET=utf8mb4 COMMENT='sql工单日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_group_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int(11) NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_user`
--

DROP TABLE IF EXISTS `auth_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `first_name` varchar(30) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_user_groups`
--

DROP TABLE IF EXISTS `auth_user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_user_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_groups_user_id_group_id_94350c0c_uniq` (`user_id`,`group_id`),
  KEY `auth_user_groups_group_id_97559544_fk_auth_group_id` (`group_id`),
  CONSTRAINT `auth_user_groups_group_id_97559544_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `auth_user_groups_user_id_6a12ed8b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_user_user_permissions`
--

DROP TABLE IF EXISTS `auth_user_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_user_user_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_user_permissions_user_id_permission_id_14a6b632_uniq` (`user_id`,`permission_id`),
  KEY `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `authtoken_token`
--

DROP TABLE IF EXISTS `authtoken_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `authtoken_token` (
  `key` varchar(40) NOT NULL,
  `created` datetime(6) NOT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `authtoken_token_user_id_35299eff_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `celery_taskmeta`
--

DROP TABLE IF EXISTS `celery_taskmeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `celery_taskmeta` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL,
  `result` longtext,
  `date_done` datetime(6) NOT NULL,
  `traceback` longtext,
  `hidden` tinyint(1) NOT NULL,
  `meta` longtext,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_id` (`task_id`),
  KEY `celery_taskmeta_hidden_23fd02dc` (`hidden`)
) ENGINE=InnoDB AUTO_INCREMENT=7804 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `celery_tasksetmeta`
--

DROP TABLE IF EXISTS `celery_tasksetmeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `celery_tasksetmeta` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `taskset_id` varchar(255) NOT NULL,
  `result` longtext NOT NULL,
  `date_done` datetime(6) NOT NULL,
  `hidden` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `taskset_id` (`taskset_id`),
  KEY `celery_tasksetmeta_hidden_593cfc24` (`hidden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloud_rbac_group_bak`
--

DROP TABLE IF EXISTS `cloud_rbac_group_bak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_rbac_group_bak` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organization` varchar(80) NOT NULL DEFAULT '' COMMENT '公司名称',
  `department` varchar(80) NOT NULL DEFAULT '' COMMENT '部门名称',
  `group_name` varchar(80) NOT NULL COMMENT '小组名称',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_department_group_name` (`department`,`group_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloud_rbac_resource`
--

DROP TABLE IF EXISTS `cloud_rbac_resource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_rbac_resource` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `resource_name` varchar(80) NOT NULL DEFAULT '' COMMENT '资源名字',
  `description` varchar(80) NOT NULL DEFAULT '' COMMENT '描述',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_resource_name` (`resource_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COMMENT='权限表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloud_rbac_role`
--

DROP TABLE IF EXISTS `cloud_rbac_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_rbac_role` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(80) NOT NULL DEFAULT '' COMMENT '角色名称',
  `create_by` varchar(50) NOT NULL DEFAULT '' COMMENT '创建人',
  `update_by` varchar(50) NOT NULL DEFAULT '' COMMENT '修改人',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COMMENT='角色表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloud_rbac_role_group_bak`
--

DROP TABLE IF EXISTS `cloud_rbac_role_group_bak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_rbac_role_group_bak` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(80) NOT NULL DEFAULT '' COMMENT '用户名',
  `group_name` varchar(80) NOT NULL DEFAULT '' COMMENT '用户组名字',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COMMENT='角色用户组关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloud_rbac_role_resource_bak`
--

DROP TABLE IF EXISTS `cloud_rbac_role_resource_bak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_rbac_role_resource_bak` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `resource_name` varchar(80) NOT NULL DEFAULT '' COMMENT '资源名字',
  `role_name` varchar(80) NOT NULL DEFAULT '' COMMENT '角色名字',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_role_name_resource_name` (`role_name`,`resource_name`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COMMENT='角色权限表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloud_rbac_user`
--

DROP TABLE IF EXISTS `cloud_rbac_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_rbac_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(80) NOT NULL DEFAULT '' COMMENT '用户名',
  `display_username` varchar(80) NOT NULL DEFAULT '' COMMENT '用户中文名称',
  `user_email` varchar(80) NOT NULL DEFAULT '' COMMENT '用户邮箱',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COMMENT='用户信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloud_rbac_user_group_bak`
--

DROP TABLE IF EXISTS `cloud_rbac_user_group_bak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_rbac_user_group_bak` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(80) NOT NULL DEFAULT '' COMMENT '用户名',
  `group_name` varchar(80) NOT NULL DEFAULT '' COMMENT '用户组名字',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COMMENT='用户用户组关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloud_rbac_user_role_bak`
--

DROP TABLE IF EXISTS `cloud_rbac_user_role_bak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_rbac_user_role_bak` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(80) NOT NULL DEFAULT '' COMMENT '用户名',
  `role_name` varchar(80) NOT NULL DEFAULT '' COMMENT '角色名',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COMMENT='用户角色表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `common_user`
--

DROP TABLE IF EXISTS `common_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公共用户表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `deploy_mysql_submit_info`
--

DROP TABLE IF EXISTS `deploy_mysql_submit_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `deploy_mysql_submit_info` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_uuid` varchar(50) NOT NULL COMMENT '工单id',
  `submit_user` varchar(50) NOT NULL COMMENT '提交用户',
  `idc` varchar(50) NOT NULL DEFAULT '' COMMENT '机房',
  `deploy_topos` text NOT NULL COMMENT '部署topo信息',
  `deploy_version` varchar(50) NOT NULL DEFAULT '' COMMENT '版本',
  `deploy_archit` varchar(50) NOT NULL DEFAULT '' COMMENT '部署架构',
  `deploy_other_param` text COMMENT '自定义参数',
  `submit_check` tinyint(4) NOT NULL DEFAULT '1' COMMENT '审核:1-->未审核,2-->审核通过,3-->审核不通过',
  `submit_check_username` varchar(50) NOT NULL DEFAULT '' COMMENT '审核人员',
  `submit_check_comment` varchar(200) NOT NULL DEFAULT '' COMMENT '审核备注',
  `submit_execute` tinyint(4) NOT NULL DEFAULT '1' COMMENT '执行:1-->未执行,2-->已执行',
  `submit_execute_username` varchar(50) NOT NULL DEFAULT '' COMMENT '执行人员',
  `deploy_status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态:1-->未执行,2-->执行中,3-->执行成功,4-->执行失败',
  `task_send_celery` varchar(50) NOT NULL DEFAULT '0' COMMENT '任务是否已经注册到celery:0未注册,1已注册',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_submit_uuid` (`submit_uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COMMENT='数据库部署工单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_admin_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint(5) unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_auth_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_content_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `djcelery_crontabschedule`
--

DROP TABLE IF EXISTS `djcelery_crontabschedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `djcelery_crontabschedule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `minute` varchar(64) NOT NULL,
  `hour` varchar(64) NOT NULL,
  `day_of_week` varchar(64) NOT NULL,
  `day_of_month` varchar(64) NOT NULL,
  `month_of_year` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `djcelery_intervalschedule`
--

DROP TABLE IF EXISTS `djcelery_intervalschedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `djcelery_intervalschedule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `every` int(11) NOT NULL,
  `period` varchar(24) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `djcelery_periodictask`
--

DROP TABLE IF EXISTS `djcelery_periodictask`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `djcelery_periodictask` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `task` varchar(200) NOT NULL,
  `args` longtext NOT NULL,
  `kwargs` longtext NOT NULL,
  `queue` varchar(200) DEFAULT NULL,
  `exchange` varchar(200) DEFAULT NULL,
  `routing_key` varchar(200) DEFAULT NULL,
  `expires` datetime(6) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL,
  `last_run_at` datetime(6) DEFAULT NULL,
  `total_run_count` int(10) unsigned NOT NULL,
  `date_changed` datetime(6) NOT NULL,
  `description` longtext NOT NULL,
  `crontab_id` int(11) DEFAULT NULL,
  `interval_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `djcelery_periodictas_crontab_id_75609bab_fk_djcelery_` (`crontab_id`),
  KEY `djcelery_periodictas_interval_id_b426ab02_fk_djcelery_` (`interval_id`),
  CONSTRAINT `djcelery_periodictas_crontab_id_75609bab_fk_djcelery_` FOREIGN KEY (`crontab_id`) REFERENCES `djcelery_crontabschedule` (`id`),
  CONSTRAINT `djcelery_periodictas_interval_id_b426ab02_fk_djcelery_` FOREIGN KEY (`interval_id`) REFERENCES `djcelery_intervalschedule` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `djcelery_periodictasks`
--

DROP TABLE IF EXISTS `djcelery_periodictasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `djcelery_periodictasks` (
  `ident` smallint(6) NOT NULL,
  `last_update` datetime(6) NOT NULL,
  PRIMARY KEY (`ident`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `djcelery_taskstate`
--

DROP TABLE IF EXISTS `djcelery_taskstate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `djcelery_taskstate` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `state` varchar(64) NOT NULL,
  `task_id` varchar(36) NOT NULL,
  `name` varchar(200) DEFAULT NULL,
  `tstamp` datetime(6) NOT NULL,
  `args` longtext,
  `kwargs` longtext,
  `eta` datetime(6) DEFAULT NULL,
  `expires` datetime(6) DEFAULT NULL,
  `result` longtext,
  `traceback` longtext,
  `runtime` double DEFAULT NULL,
  `retries` int(11) NOT NULL,
  `hidden` tinyint(1) NOT NULL,
  `worker_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_id` (`task_id`),
  KEY `djcelery_taskstate_state_53543be4` (`state`),
  KEY `djcelery_taskstate_name_8af9eded` (`name`),
  KEY `djcelery_taskstate_tstamp_4c3f93a1` (`tstamp`),
  KEY `djcelery_taskstate_hidden_c3905e57` (`hidden`),
  KEY `djcelery_taskstate_worker_id_f7f57a05_fk_djcelery_workerstate_id` (`worker_id`),
  CONSTRAINT `djcelery_taskstate_worker_id_f7f57a05_fk_djcelery_workerstate_id` FOREIGN KEY (`worker_id`) REFERENCES `djcelery_workerstate` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `djcelery_workerstate`
--

DROP TABLE IF EXISTS `djcelery_workerstate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `djcelery_workerstate` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hostname` varchar(255) NOT NULL,
  `last_heartbeat` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hostname` (`hostname`),
  KEY `djcelery_workerstate_last_heartbeat_4539b544` (`last_heartbeat`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `easyaudit_crudevent`
--

DROP TABLE IF EXISTS `easyaudit_crudevent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `easyaudit_crudevent` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_type` smallint(6) NOT NULL,
  `object_id` int(11) NOT NULL,
  `object_repr` varchar(255) DEFAULT NULL,
  `object_json_repr` longtext,
  `datetime` datetime(6) NOT NULL,
  `content_type_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_pk_as_string` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `easyaudit_crudevent_content_type_id_618ed0c6_fk_django_co` (`content_type_id`),
  KEY `easyaudit_crudevent_user_id_09177b54_fk_auth_user_id` (`user_id`),
  KEY `easyaudit_crudevent_object_id_content_type_id_48e7e97f_idx` (`object_id`,`content_type_id`),
  CONSTRAINT `easyaudit_crudevent_content_type_id_618ed0c6_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `easyaudit_crudevent_user_id_09177b54_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `easyaudit_loginevent`
--

DROP TABLE IF EXISTS `easyaudit_loginevent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `easyaudit_loginevent` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `login_type` smallint(6) NOT NULL,
  `username` varchar(255) DEFAULT NULL,
  `datetime` datetime(6) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `remote_ip` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `easyaudit_loginevent_user_id_f47fcbfb_fk_auth_user_id` (`user_id`),
  KEY `easyaudit_loginevent_remote_ip_52fb5c3c` (`remote_ip`),
  CONSTRAINT `easyaudit_loginevent_user_id_f47fcbfb_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `easyaudit_requestevent`
--

DROP TABLE IF EXISTS `easyaudit_requestevent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `easyaudit_requestevent` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `url` varchar(255) NOT NULL,
  `method` varchar(20) NOT NULL,
  `query_string` varchar(255) DEFAULT NULL,
  `remote_ip` varchar(50) DEFAULT NULL,
  `datetime` datetime(6) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `easyaudit_requestevent_user_id_da412f45_fk_auth_user_id` (`user_id`),
  KEY `easyaudit_requestevent_url_37d1b8c4` (`url`),
  KEY `easyaudit_requestevent_method_83a0c884` (`method`),
  KEY `easyaudit_requestevent_remote_ip_d43af9b2` (`remote_ip`),
  CONSTRAINT `easyaudit_requestevent_user_id_da412f45_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=320 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jks_task_info`
--

DROP TABLE IF EXISTS `jks_task_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jks_task_info` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_name` varchar(50) NOT NULL COMMENT '工单id',
  `job_name` varchar(50) NOT NULL COMMENT '任务名',
  `queue_id` int(11) NOT NULL DEFAULT '-1' COMMENT '队列id',
  `job_params` text COMMENT '任务参数',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_queue_id` (`queue_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COMMENT='jks任务表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `my_celery_task_status`
--

DROP TABLE IF EXISTS `my_celery_task_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `my_celery_task_status` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `task_id` varchar(50) NOT NULL COMMENT 'celery产生的id',
  `submit_id` varchar(50) NOT NULL COMMENT '工单id',
  `task_type` varchar(150) NOT NULL COMMENT '任务内容',
  `task_status` int(11) NOT NULL DEFAULT '0' COMMENT '任务状态:0已注册到celery,1执行中,2执行成功,3执行失败',
  `content` text COMMENT '说明',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_task_id` (`task_id`),
  UNIQUE KEY `uniq_submit_id_task_type` (`submit_id`,`task_type`)
) ENGINE=InnoDB AUTO_INCREMENT=459 DEFAULT CHARSET=utf8mb4 COMMENT='celery任务状态表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mysql_cluster`
--

DROP TABLE IF EXISTS `mysql_cluster`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6295 DEFAULT CHARSET=utf8 COMMENT='mysql集群信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mysql_cluster_instance`
--

DROP TABLE IF EXISTS `mysql_cluster_instance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mysql_cluster_instance` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `cluster_name` varchar(64) NOT NULL DEFAULT '' COMMENT '集群名称',
  `instance_name` varchar(100) NOT NULL DEFAULT '' COMMENT '实例名',
  `instance_role` varchar(64) NOT NULL DEFAULT '' COMMENT '实例角色',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_instance_name` (`instance_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COMMENT='mysql集群实例表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mysql_instance`
--

DROP TABLE IF EXISTS `mysql_instance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='mysql实例表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `private_user`
--

DROP TABLE IF EXISTS `private_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='私有用户表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `privilege_request_info`
--

DROP TABLE IF EXISTS `privilege_request_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限请求工单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `resource_config`
--

DROP TABLE IF EXISTS `resource_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `resource_config` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `company` varchar(150) NOT NULL COMMENT '公司名字',
  `resource_name` varchar(50) NOT NULL COMMENT '资源名字',
  `resource_value` text NOT NULL COMMENT '资源配置必须采用|分割,便于后续取值',
  `config_user` varchar(50) NOT NULL COMMENT '配置人员',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COMMENT='资源配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `review_work_flow`
--

DROP TABLE IF EXISTS `review_work_flow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `review_work_flow` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `review_work_flow_name` varchar(50) NOT NULL COMMENT '工单审核流名称',
  `review_steps` text COMMENT '工单流程steps',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_review_work_flow_name` (`review_work_flow_name`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COMMENT='工单审核流';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `server`
--

DROP TABLE IF EXISTS `server`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `deadline` timestamp NOT NULL DEFAULT '1970-12-31 17:01:01' COMMENT '到期时间',
  `status` tinyint(4) NOT NULL DEFAULT '-1' COMMENT '机器状态:0-->不可用,1-->可用',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_server_public_ip` (`server_public_ip`),
  UNIQUE KEY `uk_server_private_ip` (`server_private_ip`),
  UNIQUE KEY `uk_server_hostname` (`server_hostname`)
) ENGINE=InnoDB AUTO_INCREMENT=2233 DEFAULT CHARSET=utf8mb4 COMMENT='主机信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sql_check_results`
--

DROP TABLE IF EXISTS `sql_check_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `is_submit` int(11) NOT NULL DEFAULT '1' COMMENT '0代表仅审核不提交,1代表提交',
  `ctime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  KEY `idx_submit_sql_uuid` (`submit_sql_uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=2269423 DEFAULT CHARSET=utf8mb4 COMMENT='SQL检查结果表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sql_execute_results`
--

DROP TABLE IF EXISTS `sql_execute_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sql_execute_results` (
  `id` int(4) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_sql_uuid` varchar(50) NOT NULL COMMENT '请求uuid',
  `split_seq` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的拆分ID',
  `split_sql_file_path` varchar(200) NOT NULL COMMENT '请求sql存放路径',
  `rerun_seq` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception执行失败后平台生成的重做序列号',
  `inception_id` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的ID',
  `inception_stage` varchar(20) NOT NULL DEFAULT '' COMMENT 'Inception返回的stage',
  `inception_error_level` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的错误号码',
  `inception_stage_status` varchar(64) NOT NULL DEFAULT 'Inception返回的stage status',
  `inception_error_message` text NOT NULL COMMENT 'Inception返回的错误  信息',
  `inception_sql` text COMMENT 'Inception返回的问题SQL内容',
  `inception_affected_rows` int(11) NOT NULL DEFAULT '0' COMMENT 'Inception返回的影响行数',
  `inception_sequence` varchar(255) NOT NULL DEFAULT '' COMMENT 'Inception返回的回滚备份序列号',
  `inception_backup_dbname` varchar(255) NOT NULL DEFAULT '' COMMENT 'Inception返回的数据库名称',
  `inception_execute_time` decimal(16,4) NOT NULL DEFAULT '0.0000' COMMENT '执行耗时',
  `inception_sqlsha1` varchar(255) NOT NULL DEFAULT '' COMMENT 'Inception返回的sqlsha1',
  `inception_command` varchar(255) NOT NULL DEFAULT '' COMMENT 'Inception返回的command',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=824 DEFAULT CHARSET=utf8mb4 COMMENT='执行结果表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sql_execute_split`
--

DROP TABLE IF EXISTS `sql_execute_split`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `task_send_celery` int(11) NOT NULL DEFAULT '0' COMMENT '任务是否已经注册到celery:0未注册,1已注册',
  `ticket_stage_status` varchar(200) NOT NULL DEFAULT '{}' COMMENT '执行阶段及状态',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_split_sql_file_path` (`split_sql_file_path`)
) ENGINE=InnoDB AUTO_INCREMENT=719 DEFAULT CHARSET=utf8mb4 COMMENT='SQL拆分表';
/*!40101 SET character_set_client = @saved_cs_client */;

CREATE TABLE `sql_inception_osc_config` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
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

DROP TABLE IF EXISTS `sql_pre_check_results_bk`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sql_pre_check_results_bk` (
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COMMENT='SQL异步审核结果表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sql_submit_info`
--

DROP TABLE IF EXISTS `sql_submit_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sql_submit_info` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_sql_uuid` varchar(50) NOT NULL COMMENT '请求uuid',
  `submit_sql_user` varchar(50) NOT NULL COMMENT '提交SQL用户',
  `submit_sql_file_path` varchar(200) NOT NULL COMMENT '请求sql存放路径',
  `user_offer_rollback_sql_file_path` varchar(200) NOT NULL DEFAULT '' COMMENT '用户提供的回滚语句存放路径',
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
  `review_ticket` varchar(500) NOT NULL DEFAULT '{}' COMMENT '审批工单流状态',
  `submit_sql_execute_type` varchar(50) NOT NULL DEFAULT '' COMMENT '执行类型',
  `submit_sql_execute_plat_or_manual` tinyint(4) NOT NULL DEFAULT '0' COMMENT '执行类型:1-->平台执行,2-->手动执行',
  `inception_osc_config` varchar(10000) NOT NULL DEFAULT '' COMMENT 'OSC 配置,必须为json格式',
  `inception_backup` tinyint(2) NOT NULL DEFAULT '1' COMMENT '是否备份, 0不备份, 1备份',
  `inception_check_ignore_warning` tinyint(2) NOT NULL DEFAULT '0' COMMENT 'inception是否忽略检查警告继续执行,0-->不忽略警告,1-->忽略警告',
  `inception_execute_ignore_error` tinyint(2) NOT NULL DEFAULT '0' COMMENT 'inception执行遇到错误是否继续执行,0-->不继续执行,1-->继续执行',
  `dba_execute` tinyint(4) NOT NULL DEFAULT '1' COMMENT 'dba执行:1-->未执行,2-->已执行',
  `execute_status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态:1-->未执行,2-->执行中,3-->执行成功,4-->执行失败,5-->执行成功含警告,6-->手动执行,999-->未知',
  `is_submit` int(11) NOT NULL DEFAULT '1' COMMENT '是否提交工单:0不提交,1提交',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `utime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_submit_sql_uuid` (`submit_sql_uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=289 DEFAULT CHARSET=utf8mb4 COMMENT='SQL工单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team_check_role`
--

DROP TABLE IF EXISTS `team_check_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team_check_role` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `gid` int(11) NOT NULL DEFAULT '-1' COMMENT '用户归属组',
  `gname` varchar(50) NOT NULL DEFAULT '' COMMENT '组名',
  `qa_name` varchar(50) NOT NULL DEFAULT '' COMMENT 'qa',
  `leader_name` varchar(50) NOT NULL DEFAULT '' COMMENT 'leader名字',
  `dba_name` varchar(50) NOT NULL DEFAULT '' COMMENT 'dba名字',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审核成员表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team_user`
--

DROP TABLE IF EXISTS `team_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team_user` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `uid` varchar(50) NOT NULL DEFAULT '' COMMENT '用户唯一标识',
  `gid` int(11) NOT NULL DEFAULT '-1' COMMENT '用户组唯一标识',
  `uname` varchar(50) NOT NULL DEFAULT '' COMMENT '姓名',
  `department` varchar(50) NOT NULL DEFAULT '' COMMENT '部门名称',
  `title` varchar(50) NOT NULL DEFAULT '' COMMENT '职位:0-->前端开发,1-->后端开发,2-->qa,3-->leader,4-->dba',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COMMENT='团队成员表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `web_console_favorite`
--

DROP TABLE IF EXISTS `web_console_favorite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `web_console_favorite` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_name` varchar(50) NOT NULL DEFAULT '' COMMENT '用户',
  `favorite_type` varchar(50) NOT NULL DEFAULT '' COMMENT '收藏夹类型:数据源,SQL',
  `favorite_name` varchar(50) NOT NULL DEFAULT '' COMMENT '收藏夹名字',
  `favorite_detail` text NOT NULL COMMENT '收藏的详细信息',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_name_favorite_name` (`user_name`,`favorite_name`)
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COMMENT='收藏夹';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_flow_log`
--

DROP TABLE IF EXISTS `work_flow_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `work_flow_log` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `submit_uuid` varchar(50) NOT NULL COMMENT '工单id',
  `work_type` varchar(50) NOT NULL DEFAULT '' COMMENT '工单类型',
  `op_username` varchar(50) NOT NULL DEFAULT '' COMMENT '操作人',
  `op_comment` varchar(50) NOT NULL DEFAULT '' COMMENT '操作人备注',
  `op_type` varchar(50) NOT NULL DEFAULT '' COMMENT '操作类型',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COMMENT='工单流转日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Current Database: `eagle_agent`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `eagle_agent` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `eagle_agent`;

--
-- Table structure for table `agent_monitor`
--

DROP TABLE IF EXISTS `agent_monitor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `agent_monitor` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `mem_use` decimal(16,2) NOT NULL COMMENT '内存占用率',
  `cpu_use` decimal(16,2) NOT NULL COMMENT 'cpu占用率',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=153632 DEFAULT CHARSET=utf8mb4 COMMENT='agent资源占用监控表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2022-08-21 19:01:07
