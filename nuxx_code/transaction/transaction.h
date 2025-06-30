/*Time 2022-xx-xx*/
/*Auther gaochao*/

#ifndef NUXX_TRANSACTION_INCLUDED
#define NUXX_TRANSACTION_INCLUDED

#include "my_global.h"
#include "sql_class.h"
#include "transaction.h"

/**
 * 事务扩展头文件
 * 实现分布式事务、事务优化和长事务管理功能
 */

// 事务状态枚举
enum nuxx_transaction_state {
  NUXX_TRX_INIT = 0,           // 初始化
  NUXX_TRX_ACTIVE,             // 活跃
  NUXX_TRX_PREPARED,           // 已准备
  NUXX_TRX_COMMITTED,          // 已提交
  NUXX_TRX_ROLLED_BACK,        // 已回滚
  NUXX_TRX_TIMEOUT             // 超时
};

// 分布式事务节点信息
struct nuxx_trx_node {
  char *node_id;               // 节点ID
  char *node_host;             // 节点地址
  int node_port;               // 节点端口
  bool is_coordinator;         // 是否为协调者
  nuxx_transaction_state state; // 节点事务状态
};

// 长事务信息
struct nuxx_long_trx_info {
  char *trx_id;                // 事务ID
  ulonglong start_time;        // 事务开始时间
  ulonglong duration_ms;       // 持续时间（毫秒）
  char *user;                  // 用户
  char *host;                  // 主机
  ulong lock_count;            // 持有锁数量
  bool is_killed;              // 是否已被终止
  nuxx_long_trx_info *next;    // 下一个长事务
};

// 事务扩展配置
struct nuxx_transaction_config {
  ulonglong timeout_ms;        // 事务超时时间(毫秒)
  bool enable_distributed;     // 是否启用分布式事务
  bool enable_optimization;    // 是否启用事务优化
  int max_retry_times;         // 最大重试次数
  char *coordinator_host;      // 协调者地址
  int coordinator_port;        // 协调者端口
  // 长事务相关配置
  ulonglong long_trx_threshold_ms; // 长事务阈值（毫秒）
  ulonglong long_trx_check_interval_ms; // 长事务检测间隔（毫秒）
  bool auto_kill_long_trx;     // 是否自动终止长事务
};

// 事务扩展上下文
struct nuxx_transaction_context {
  nuxx_transaction_config config;
  nuxx_trx_node *nodes;        // 参与节点列表
  uint node_count;             // 节点数量
  char *current_trx_id;        // 当前事务ID
  nuxx_transaction_state state; // 当前事务状态
  ulonglong start_time;        // 事务开始时间
  mysql_mutex_t mutex;         // 互斥锁
  // 长事务管理
  nuxx_long_trx_info *long_trx_list; // 长事务链表
  uint long_trx_count;         // 长事务数量
  my_thread_handle long_trx_thread;  // 长事务检测线程
  bool long_trx_thread_running;      // 检测线程运行状态
};

// 初始化事务扩展
int nuxx_transaction_init(THD *thd);

// 清理事务扩展
int nuxx_transaction_cleanup(THD *thd);

// 开始分布式事务
int nuxx_transaction_begin(THD *thd, const char *trx_id);

// 准备事务
int nuxx_transaction_prepare(THD *thd, const char *trx_id);

// 提交事务
int nuxx_transaction_commit(THD *thd, const char *trx_id);

// 回滚事务
int nuxx_transaction_rollback(THD *thd, const char *trx_id);

// 获取事务状态
int nuxx_transaction_status(THD *thd, const char *trx_id, String *result);

// 添加参与节点
int nuxx_transaction_add_node(THD *thd, const char *trx_id, 
                             const char *node_id, const char *node_host, int node_port);

// 事务优化建议
int nuxx_transaction_optimize(THD *thd, const char *sql, String *suggestion);

// 设置事务配置
int nuxx_transaction_set_config(THD *thd, const char *config_json);

// 事务监控
void nuxx_transaction_monitor(THD *thd, String *stats);

// 长事务检测线程启动/停止
int nuxx_long_trx_monitor_start(THD *thd);
int nuxx_long_trx_monitor_stop(THD *thd);

// 获取长事务列表
void nuxx_long_trx_list(THD *thd, String *result);

// 手动终止长事务
int nuxx_kill_long_trx(THD *thd, const char *trx_id);

#endif /* NUXX_TRANSACTION_INCLUDED */ 