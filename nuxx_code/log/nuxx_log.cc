/*Time 2022-xx-xx*/
/*Auther gaochao*/

#include "nuxx_log.h"
#include "sql_class.h"
#include "log.h"
#include "my_sys.h"
#include "m_string.h"
#include "my_thread.h"

/**
 * 日志扩展实现文件
 * 实现高性能日志记录和日志分析功能
 */

// 全局日志扩展上下文
static nuxx_log_context *g_log_ctx = NULL;

// 日志级别字符串
static const char *log_level_strings[] = {
  "ERROR", "WARN", "INFO", "DEBUG", "TRACE"
};

// 日志类型字符串
static const char *log_type_strings[] = {
  "SQL", "SLOW", "ERROR", "AUDIT", "PERFORMANCE"
};

// 日志写入线程函数
static void *log_writer_thread(void *arg)
{
  nuxx_log_context *ctx = (nuxx_log_context *)arg;
  
  while (ctx->thread_running) {
    mysql_mutex_lock(&ctx->mutex);
    
    // 等待日志条目
    while (ctx->log_queue == NULL && ctx->thread_running) {
      mysql_cond_wait(&ctx->cond, &ctx->mutex);
    }
    
    if (!ctx->thread_running) {
      mysql_mutex_unlock(&ctx->mutex);
      break;
    }
    
    // 处理日志队列
    nuxx_log_entry *entry = ctx->log_queue;
    ctx->log_queue = entry->next;
    if (!ctx->log_queue) {
      ctx->log_tail = NULL;
    }
    
    mysql_mutex_unlock(&ctx->mutex);
    
    // 写入日志文件
    char log_buffer[2048];
    struct tm *tm_info;
    time_t timestamp = entry->timestamp / 1000000;
    tm_info = localtime(&timestamp);
    
    my_snprintf(log_buffer, sizeof(log_buffer),
                "[%04d-%02d-%02d %02d:%02d:%02d.%06llu] [%s] [%s] [%s@%s] [%s] %s\n",
                tm_info->tm_year + 1900, tm_info->tm_mon + 1, tm_info->tm_mday,
                tm_info->tm_hour, tm_info->tm_min, tm_info->tm_sec,
                entry->timestamp % 1000000,
                log_level_strings[entry->level],
                log_type_strings[entry->type],
                entry->user ? entry->user : "unknown",
                entry->host ? entry->host : "unknown",
                entry->thread_id ? entry->thread_id : "unknown",
                entry->message ? entry->message : "");
    
    // 根据日志类型写入不同文件
    File target_file = ctx->log_file;
    if (entry->type == NUXX_LOG_SLOW && ctx->slow_log_file != -1) {
      target_file = ctx->slow_log_file;
    } else if (entry->type == NUXX_LOG_AUDIT && ctx->audit_log_file != -1) {
      target_file = ctx->audit_log_file;
    }
    
    if (target_file != -1) {
      my_write(target_file, (uchar*)log_buffer, strlen(log_buffer), MYF(0));
    }
    
    // 释放日志条目
    if (entry->message) my_free(entry->message);
    if (entry->sql_text) my_free(entry->sql_text);
    if (entry->user) my_free(entry->user);
    if (entry->host) my_free(entry->host);
    if (entry->thread_id) my_free(entry->thread_id);
    my_free(entry);
  }
  
  return NULL;
}

// 初始化日志扩展
int nuxx_log_init(THD *thd)
{
  DBUG_ENTER("nuxx_log_init");
  
  // 分配全局上下文
  g_log_ctx = (nuxx_log_context *)my_malloc(
    sizeof(nuxx_log_context), MYF(MY_ZEROFILL));
  
  if (!g_log_ctx) {
    DBUG_RETURN(1);
  }
  
  // 初始化默认配置
  g_log_ctx->config.enable_sql_log = true;
  g_log_ctx->config.enable_slow_log = true;
  g_log_ctx->config.enable_audit_log = true;
  g_log_ctx->config.enable_performance_log = false;
  g_log_ctx->config.log_file_path = strdup("/var/log/mysql/nuxx.log");
  g_log_ctx->config.slow_log_path = strdup("/var/log/mysql/nuxx-slow.log");
  g_log_ctx->config.audit_log_path = strdup("/var/log/mysql/nuxx-audit.log");
  g_log_ctx->config.slow_query_time = 1000000; // 1秒
  g_log_ctx->config.max_log_size = 100 * 1024 * 1024; // 100MB
  g_log_ctx->config.log_rotation_count = 10;
  g_log_ctx->config.log_level = NUXX_LOG_INFO;
  
  // 初始化日志上下文
  g_log_ctx->log_queue = NULL;
  g_log_ctx->log_tail = NULL;
  g_log_ctx->log_count = 0;
  g_log_ctx->total_log_size = 0;
  g_log_ctx->thread_running = false;
  g_log_ctx->log_file = -1;
  g_log_ctx->slow_log_file = -1;
  g_log_ctx->audit_log_file = -1;
  
  // 初始化互斥锁和条件变量
  mysql_mutex_init(key_mutex_nuxx_log, &g_log_ctx->mutex, MY_MUTEX_INIT_FAST);
  mysql_cond_init(key_cond_nuxx_log, &g_log_ctx->cond, NULL);
  
  // 打开日志文件
  g_log_ctx->log_file = my_open(g_log_ctx->config.log_file_path, 
                                O_CREAT | O_APPEND | O_WRONLY, MYF(0));
  g_log_ctx->slow_log_file = my_open(g_log_ctx->config.slow_log_path, 
                                     O_CREAT | O_APPEND | O_WRONLY, MYF(0));
  g_log_ctx->audit_log_file = my_open(g_log_ctx->config.audit_log_path, 
                                      O_CREAT | O_APPEND | O_WRONLY, MYF(0));
  
  // 启动日志写入线程
  g_log_ctx->thread_running = true;
  my_thread_attr_t attr;
  my_thread_attr_init(&attr);
  my_thread_attr_setdetachstate(&attr, MY_THREAD_CREATE_JOINABLE);
  
  if (my_thread_create(&g_log_ctx->log_thread, &attr, log_writer_thread, g_log_ctx) != 0) {
    g_log_ctx->thread_running = false;
    DBUG_RETURN(1);
  }
  
  DBUG_RETURN(0);
}

// 清理日志扩展
int nuxx_log_cleanup(THD *thd)
{
  DBUG_ENTER("nuxx_log_cleanup");
  
  if (g_log_ctx) {
    // 停止日志线程
    g_log_ctx->thread_running = false;
    mysql_cond_signal(&g_log_ctx->cond);
    
    // 等待线程结束
    void *thread_result;
    my_thread_join(&g_log_ctx->log_thread, &thread_result);
    
    // 处理剩余的日志条目
    mysql_mutex_lock(&g_log_ctx->mutex);
    nuxx_log_entry *entry = g_log_ctx->log_queue;
    while (entry) {
      nuxx_log_entry *next = entry->next;
      if (entry->message) my_free(entry->message);
      if (entry->sql_text) my_free(entry->sql_text);
      if (entry->user) my_free(entry->user);
      if (entry->host) my_free(entry->host);
      if (entry->thread_id) my_free(entry->thread_id);
      my_free(entry);
      entry = next;
    }
    mysql_mutex_unlock(&g_log_ctx->mutex);
    
    // 销毁互斥锁和条件变量
    mysql_cond_destroy(&g_log_ctx->cond);
    mysql_mutex_destroy(&g_log_ctx->mutex);
    
    // 关闭日志文件
    if (g_log_ctx->log_file != -1) my_close(g_log_ctx->log_file, MYF(0));
    if (g_log_ctx->slow_log_file != -1) my_close(g_log_ctx->slow_log_file, MYF(0));
    if (g_log_ctx->audit_log_file != -1) my_close(g_log_ctx->audit_log_file, MYF(0));
    
    // 释放配置内存
    if (g_log_ctx->config.log_file_path) my_free(g_log_ctx->config.log_file_path);
    if (g_log_ctx->config.slow_log_path) my_free(g_log_ctx->config.slow_log_path);
    if (g_log_ctx->config.audit_log_path) my_free(g_log_ctx->config.audit_log_path);
    
    my_free(g_log_ctx);
    g_log_ctx = NULL;
  }
  
  DBUG_RETURN(0);
}

// 添加日志条目到队列
static int add_log_entry(nuxx_log_level level, nuxx_log_type type, 
                        const char *message, const char *sql_text, 
                        ulonglong duration, THD *thd)
{
  if (!g_log_ctx || !g_log_ctx->thread_running) return 1;
  
  // 检查日志级别
  if (level > g_log_ctx->config.log_level) return 0;
  
  // 创建日志条目
  nuxx_log_entry *entry = (nuxx_log_entry *)my_malloc(sizeof(nuxx_log_entry), MYF(0));
  if (!entry) return 1;
  
  entry->timestamp = my_micro_time();
  entry->level = level;
  entry->type = type;
  entry->duration = duration;
  entry->next = NULL;
  
  // 复制消息
  entry->message = message ? strdup(message) : NULL;
  entry->sql_text = sql_text ? strdup(sql_text) : NULL;
  
  // 获取用户信息
  if (thd) {
    entry->user = thd->security_ctx->user ? strdup(thd->security_ctx->user) : NULL;
    entry->host = thd->security_ctx->host ? strdup(thd->security_ctx->host) : NULL;
    
    char thread_id_str[32];
    my_snprintf(thread_id_str, sizeof(thread_id_str), "%lu", thd->thread_id);
    entry->thread_id = strdup(thread_id_str);
  } else {
    entry->user = NULL;
    entry->host = NULL;
    entry->thread_id = NULL;
  }
  
  // 添加到队列
  mysql_mutex_lock(&g_log_ctx->mutex);
  
  if (g_log_ctx->log_tail) {
    g_log_ctx->log_tail->next = entry;
  } else {
    g_log_ctx->log_queue = entry;
  }
  g_log_ctx->log_tail = entry;
  g_log_ctx->log_count++;
  
  mysql_mutex_unlock(&g_log_ctx->mutex);
  
  // 通知日志线程
  mysql_cond_signal(&g_log_ctx->cond);
  
  return 0;
}

// 记录SQL日志
int nuxx_log_sql(THD *thd, const char *sql, ulonglong duration)
{
  if (!g_log_ctx->config.enable_sql_log) return 0;
  
  return add_log_entry(NUXX_LOG_INFO, NUXX_LOG_SQL, 
                      "SQL executed", sql, duration, thd);
}

// 记录慢查询日志
int nuxx_log_slow_query(THD *thd, const char *sql, ulonglong duration)
{
  if (!g_log_ctx->config.enable_slow_log || 
      duration < g_log_ctx->config.slow_query_time) return 0;
  
  char message[256];
  my_snprintf(message, sizeof(message), "Slow query executed in %llu microseconds", duration);
  
  return add_log_entry(NUXX_LOG_WARN, NUXX_LOG_SLOW, 
                      message, sql, duration, thd);
}

// 记录审计日志
int nuxx_log_audit(THD *thd, const char *operation, const char *details)
{
  if (!g_log_ctx->config.enable_audit_log) return 0;
  
  char message[512];
  my_snprintf(message, sizeof(message), "AUDIT: %s - %s", 
              operation ? operation : "unknown", 
              details ? details : "no details");
  
  return add_log_entry(NUXX_LOG_INFO, NUXX_LOG_AUDIT, 
                      message, NULL, 0, thd);
}

// 记录性能日志
int nuxx_log_performance(THD *thd, const char *metric, double value)
{
  if (!g_log_ctx->config.enable_performance_log) return 0;
  
  char message[256];
  my_snprintf(message, sizeof(message), "PERFORMANCE: %s = %.2f", 
              metric ? metric : "unknown", value);
  
  return add_log_entry(NUXX_LOG_DEBUG, NUXX_LOG_PERFORMANCE, 
                      message, NULL, 0, thd);
}

// 记录错误日志
int nuxx_log_error(THD *thd, const char *error_msg)
{
  return add_log_entry(NUXX_LOG_ERROR, NUXX_LOG_ERROR_LOG, 
                      error_msg, NULL, 0, thd);
}

// 获取日志统计信息
void nuxx_get_log_stats(THD *thd, String *result)
{
  if (!g_log_ctx) return;
  
  mysql_mutex_lock(&g_log_ctx->mutex);
  
  char buffer[512];
  my_snprintf(buffer, sizeof(buffer),
              "{\"log_count\":%u,"
              "\"total_log_size\":%llu,"
              "\"enable_sql_log\":%s,"
              "\"enable_slow_log\":%s,"
              "\"enable_audit_log\":%s,"
              "\"slow_query_time\":%llu}",
              g_log_ctx->log_count,
              g_log_ctx->total_log_size,
              g_log_ctx->config.enable_sql_log ? "true" : "false",
              g_log_ctx->config.enable_slow_log ? "true" : "false",
              g_log_ctx->config.enable_audit_log ? "true" : "false",
              g_log_ctx->config.slow_query_time);
  
  mysql_mutex_unlock(&g_log_ctx->mutex);
  
  result->copy(buffer, strlen(buffer), &my_charset_utf8_general_ci);
}

// 设置日志配置
int nuxx_log_set_config(THD *thd, const char *config_json)
{
  // 这里简化处理，实际需要解析JSON配置
  if (!g_log_ctx || !config_json) return 1;
  
  // 示例：简单的配置更新
  // 实际实现中需要解析JSON并更新配置
  
  return 0;
}

// 日志轮转
int nuxx_log_rotate(THD *thd)
{
  if (!g_log_ctx) return 1;
  
  // 这里简化处理，实际需要实现日志文件轮转逻辑
  // 可以重命名当前日志文件并创建新的日志文件
  
  return 0;
}

// 日志分析
int nuxx_log_analyze(THD *thd, const char *time_range, String *result)
{
  if (!g_log_ctx || !time_range || !result) return 1;
  
  // 这里简化处理，实际需要分析日志文件
  // 可以统计慢查询、错误率、性能指标等
  
  const char *analysis = "{\"analysis\":\"Log analysis feature not implemented yet.\"}";
  result->copy(analysis, strlen(analysis), &my_charset_utf8_general_ci);
  
  return 0;
}

// 日志清理
int nuxx_log_cleanup_old(THD *thd, int days_to_keep)
{
  if (!g_log_ctx) return 1;
  
  // 这里简化处理，实际需要删除旧的日志文件
  // 可以根据文件修改时间判断是否删除
  
  return 0;
} 