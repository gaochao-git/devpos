/*Time 2022-xx-xx*/
/*Auther gaochao*/

#ifndef NUXX_RW_SPLIT_INCLUDED
#define NUXX_RW_SPLIT_INCLUDED

#include "my_global.h"
#include "sql_class.h"
#include "sql_lex.h"

/**
 * 读写分离扩展头文件
 * 实现从节点自动路由写操作到主节点的功能
 */

// 读写分离配置结构
struct nuxx_rw_split_config {
  char *master_host;           // 主节点地址
  int master_port;             // 主节点端口
  char *master_user;           // 主节点用户名
  char *master_password;       // 主节点密码
  bool enable_rw_split;        // 是否启用读写分离
  int max_retry_times;         // 最大重试次数
};

// 读写分离上下文
struct nuxx_rw_split_context {
  nuxx_rw_split_config config;
  MYSQL *master_connection;    // 主节点连接
  bool is_slave_node;          // 当前是否为从节点
  ulonglong write_redirect_count; // 写操作重定向计数
};

// 初始化读写分离扩展
int nuxx_rw_split_init(THD *thd);

// 清理读写分离扩展
int nuxx_rw_split_cleanup(THD *thd);

// 检查是否为写操作
bool nuxx_is_write_operation(LEX *lex);

// 重定向写操作到主节点
int nuxx_redirect_write_to_master(THD *thd, const char *sql);

// 获取读写分离统计信息
void nuxx_get_rw_split_stats(THD *thd, String *result);

// 设置读写分离配置
int nuxx_set_rw_split_config(THD *thd, const char *config_json);

#endif /* NUXX_RW_SPLIT_INCLUDED */ 