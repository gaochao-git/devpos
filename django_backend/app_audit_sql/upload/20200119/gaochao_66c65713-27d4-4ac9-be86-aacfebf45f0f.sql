use test;
CREATE TABLE table_info (
    `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键id',
    `table_prefix` VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '表名前缀，如 user_info',
    `current_table` VARCHAR(128)  NOT NULL DEFAULT '' COMMENT '当前正在使用的表，如 user_info_1',
    `back_table` VARCHAR(128)  NOT NULL DEFAULT '' COMMENT '备用的表，如 user_info_2',
    `update_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '操作时间',
    PRIMARY KEY (`id`),
    INDEX `idx_table_prefix`(`table_prefix`)
)ENGINE=INNODB DEFAULT CHARSET=utf8mb4 COMMENT '使用与备用信息表';

CREATE TABLE `user_value_ranking_1`(
    id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'id' primary key,
    username varchar(32) not null default '' COMMENT 'user name',
    grow_value int not null default 0 COMMENT '成长值',
    ranking decimal(4, 2) not null default 0.0 COMMENT '排行占比',

    UNIQUE KEY uniq_username (`username`)
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4 COMMENT='用户价值排行';

CREATE TABLE `user_value_ranking_2`(
    id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'id' primary key,
    username varchar(32) not null default '' COMMENT 'user name',
    grow_value int not null default 0 COMMENT '成长值',
    ranking decimal(4, 2) not null default 0.0 COMMENT '排行占比',

    UNIQUE KEY uniq_username (`username`)
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4 COMMENT='用户价值排行';

