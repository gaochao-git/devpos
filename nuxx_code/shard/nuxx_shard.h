/*Time 2022-xx-xx*/
/*Auther gaochao*/

#ifndef NUXX_SHARD_INCLUDED
#define NUXX_SHARD_INCLUDED

#include "my_global.h"
#include "sql_class.h"

/**
 * 分库分表（分片）扩展头文件
 * 实现分片元数据管理、分片路由、SQL重写等功能
 */

// 分片类型
enum nuxx_shard_type {
  NUXX_SHARD_DATABASE = 0,   // 分库
  NUXX_SHARD_TABLE,          // 分表
  NUXX_SHARD_DATABASE_TABLE  // 分库分表
};

// 分片节点信息
struct nuxx_shard_node {
  char *node_id;             // 节点ID
  char *host;                // 节点主机
  int port;                  // 节点端口
  char *user;                // 连接用户名
  char *password;            // 连接密码
  bool is_active;            // 节点是否可用
};

// 分片表元数据
struct nuxx_shard_table {
  char *logic_table;         // 逻辑表名
  char *shard_key;           // 分片键
  nuxx_shard_type type;      // 分片类型
  int shard_count;           // 分片数量
  nuxx_shard_node *nodes;    // 分片节点数组
  char **physical_tables;    // 物理表名数组
};

// 分片全局配置
struct nuxx_shard_config {
  bool enable_sharding;      // 是否启用分片
  int max_shard_count;       // 最大分片数
  char *default_shard_key;   // 默认分片键
  char *metadata_path;       // 分片元数据文件路径
};

// 分片上下文
struct nuxx_shard_context {
  nuxx_shard_config config;
  nuxx_shard_table *tables;  // 分片表数组
  int table_count;           // 分片表数量
  mysql_mutex_t mutex;       // 互斥锁
};

// 初始化分片扩展
int nuxx_shard_init(THD *thd);

// 清理分片扩展
int nuxx_shard_cleanup(THD *thd);

// 注册分片表
int nuxx_shard_register_table(THD *thd, const char *logic_table, const char *shard_key,
                             nuxx_shard_type type, int shard_count, nuxx_shard_node *nodes);

// 注销分片表
int nuxx_shard_unregister_table(THD *thd, const char *logic_table);

// 分片路由：根据分片键值路由到物理表和节点
int nuxx_shard_route(THD *thd, const char *logic_table, const char *shard_key_value,
                    char **out_node_id, char **out_physical_table);

// SQL重写：将逻辑SQL重写为物理分片SQL
int nuxx_shard_rewrite_sql(THD *thd, const char *logic_sql, const char *logic_table,
                          const char *shard_key_value, String *out_sql);

// 分片元数据加载/保存
int nuxx_shard_load_metadata(THD *thd);
int nuxx_shard_save_metadata(THD *thd);

// 分片统计信息
void nuxx_shard_stats(THD *thd, String *result);

// 设置分片配置
int nuxx_shard_set_config(THD *thd, const char *config_json);

#endif /* NUXX_SHARD_INCLUDED */ 