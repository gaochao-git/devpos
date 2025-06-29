/*Time 2022-xx-xx*/
/*Auther gaochao*/

#ifndef NUXX_LOG_INCLUDED
#define NUXX_LOG_INCLUDED

#include "my_global.h"
#include "sql_class.h"
#include "log.h"

/**
 * 日志扩展头文件
 * 实现高性能日志记录和日志分析功能
 */

// 日志级别枚举
enum nuxx_log_level {
  NUXX_LOG_ERROR = 0,          // 错误
  NUXX_LOG_WARN,               // 警告
  NUXX_LOG_INFO,               // 信息
  NUXX_LOG_DEBUG,              // 调试
  NUXX_LOG_TRACE               // 跟踪
};

// 日志类型枚举
enum nuxx_log_type {
  NUXX_LOG_SQL = 0,            // SQL日志
  NUXX_LOG_SLOW,               // 慢查询日志
  NUXX_LOG_ERROR_LOG,          // 错误日志
  NUXX_LOG_AUDIT,              // 审计日志
  NUXX_LOG_PERFORMANCE         // 性能日志
};

// 日志配置
struct nuxx_log_config {
  bool enable_sql_log;          // 是否启用SQL日志
  bool enable_slow_log;         // 是否启用慢查询日志
  bool enable_audit_log;        // 是否启用审计日志
  bool enable_performance_log;  // 是否启用性能日志
  char *log_file_path;          // 日志文件路径
  char *slow_log_path;          // 慢查询日志路径
  char *audit_log_path;         // 审计日志路径
  ulonglong slow_query_time;    // 慢查询阈值(微秒)
  size_t max_log_size;          // 最大日志文件大小
  int log_rotation_count;       // 日志轮转数量
  nuxx_log_level log_level;     // 日志级别
};

// 日志条目
struct nuxx_log_entry {
  ulonglong timestamp;          // 时间戳
  nuxx_log_level level;         // 日志级别
  nuxx_log_type type;           // 日志类型
  char *message;                // 日志消息
  char *sql_text;               // SQL文本
  ulonglong duration;           // 执行时间
  char *user;                   // 用户
  char *host;                   // 主机
  char *thread_id;              // 线程ID
  nuxx_log_entry *next;         // 下一个条目
};

// 日志扩展上下文
struct nuxx_log_context {
  nuxx_log_config config;
  nuxx_log_entry *log_queue;    // 日志队列
  nuxx_log_entry *log_tail;     // 队列尾部
  uint log_count;               // 日志数量
  ulonglong total_log_size;     // 总日志大小
  mysql_mutex_t mutex;          // 互斥锁
  mysql_cond_t cond;            // 条件变量
  my_thread_handle log_thread;  // 日志线程
  bool thread_running;          // 线程运行状态
  File log_file;                // 日志文件句柄
  File slow_log_file;           // 慢查询日志文件句柄
  File audit_log_file;          // 审计日志文件句柄
};

// 初始化日志扩展
int nuxx_log_init(THD *thd);

// 清理日志扩展
int nuxx_log_cleanup(THD *thd);

// 记录SQL日志
int nuxx_log_sql(THD *thd, const char *sql, ulonglong duration);

// 记录慢查询日志
int nuxx_log_slow_query(THD *thd, const char *sql, ulonglong duration);

// 记录审计日志
int nuxx_log_audit(THD *thd, const char *operation, const char *details);

// 记录性能日志
int nuxx_log_performance(THD *thd, const char *metric, double value);

// 记录错误日志
int nuxx_log_error(THD *thd, const char *error_msg);

// 获取日志统计信息
void nuxx_get_log_stats(THD *thd, String *result);

// 设置日志配置
int nuxx_log_set_config(THD *thd, const char *config_json);

// 日志轮转
int nuxx_log_rotate(THD *thd);

// 日志分析
int nuxx_log_analyze(THD *thd, const char *time_range, String *result);

// 日志清理
int nuxx_log_cleanup_old(THD *thd, int days_to_keep);

#endif /* NUXX_LOG_INCLUDED */ 