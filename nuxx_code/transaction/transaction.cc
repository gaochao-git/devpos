/*Time 2022-xx-xx*/
/*Auther gaochao*/

#include "nuxx_transaction.h"
#include "sql_class.h"
#include "transaction.h"
#include "my_sys.h"
#include "m_string.h"
#include "my_thread.h"

/**
 * 事务扩展实现文件
 * 实现分布式事务、事务优化和长事务管理功能
 */

// 全局事务扩展上下文
static nuxx_transaction_context *g_transaction_ctx = NULL;

// 事务列表
struct nuxx_trx_entry {
  char *trx_id;
  nuxx_transaction_state state;
  ulonglong start_time;
  nuxx_trx_node *nodes;
  uint node_count;
  nuxx_trx_entry *next;
};

static nuxx_trx_entry *g_trx_list = NULL;
static mysql_mutex_t g_trx_list_mutex;

// 初始化事务扩展
int nuxx_transaction_init(THD *thd)
{
  DBUG_ENTER("nuxx_transaction_init");
  
  // 分配全局上下文
  g_transaction_ctx = (nuxx_transaction_context *)my_malloc(
    sizeof(nuxx_transaction_context), MYF(MY_ZEROFILL));
  
  if (!g_transaction_ctx) {
    DBUG_RETURN(1);
  }
  
  // 初始化默认配置
  g_transaction_ctx->config.timeout_ms = 30000; // 30秒
  g_transaction_ctx->config.enable_distributed = true;
  g_transaction_ctx->config.enable_optimization = true;
  g_transaction_ctx->config.max_retry_times = 3;
  g_transaction_ctx->config.coordinator_host = strdup("127.0.0.1");
  g_transaction_ctx->config.coordinator_port = 3306;
  
  // 初始化事务上下文
  g_transaction_ctx->nodes = NULL;
  g_transaction_ctx->node_count = 0;
  g_transaction_ctx->current_trx_id = NULL;
  g_transaction_ctx->state = NUXX_TRX_INIT;
  g_transaction_ctx->start_time = 0;
  
  // 初始化互斥锁
  mysql_mutex_init(key_mutex_nuxx_transaction, &g_transaction_ctx->mutex, MY_MUTEX_INIT_FAST);
  mysql_mutex_init(key_mutex_nuxx_trx_list, &g_trx_list_mutex, MY_MUTEX_INIT_FAST);
  
  DBUG_RETURN(0);
}

// 清理事务扩展
int nuxx_transaction_cleanup(THD *thd)
{
  DBUG_ENTER("nuxx_transaction_cleanup");
  
  if (g_transaction_ctx) {
    // 清理事务列表
    mysql_mutex_lock(&g_trx_list_mutex);
    nuxx_trx_entry *entry = g_trx_list;
    while (entry) {
      nuxx_trx_entry *next = entry->next;
      
      if (entry->trx_id) my_free(entry->trx_id);
      if (entry->nodes) my_free(entry->nodes);
      my_free(entry);
      
      entry = next;
    }
    g_trx_list = NULL;
    mysql_mutex_unlock(&g_trx_list_mutex);
    
    // 销毁互斥锁
    mysql_mutex_destroy(&g_trx_list_mutex);
    mysql_mutex_destroy(&g_transaction_ctx->mutex);
    
    // 释放配置内存
    if (g_transaction_ctx->config.coordinator_host)
      my_free(g_transaction_ctx->config.coordinator_host);
    if (g_transaction_ctx->current_trx_id)
      my_free(g_transaction_ctx->current_trx_id);
    if (g_transaction_ctx->nodes)
      my_free(g_transaction_ctx->nodes);
    
    my_free(g_transaction_ctx);
    g_transaction_ctx = NULL;
  }
  
  DBUG_RETURN(0);
}

// 查找事务
static nuxx_trx_entry *find_transaction(const char *trx_id)
{
  if (!trx_id) return NULL;
  
  mysql_mutex_lock(&g_trx_list_mutex);
  nuxx_trx_entry *entry = g_trx_list;
  while (entry) {
    if (entry->trx_id && strcmp(entry->trx_id, trx_id) == 0) {
      mysql_mutex_unlock(&g_trx_list_mutex);
      return entry;
    }
    entry = entry->next;
  }
  mysql_mutex_unlock(&g_trx_list_mutex);
  return NULL;
}

// 生成事务ID
static char *generate_transaction_id()
{
  static ulonglong counter = 0;
  char buffer[64];
  my_snprintf(buffer, sizeof(buffer), "NUXX_TRX_%llu_%llu", 
              my_micro_time(), ++counter);
  return strdup(buffer);
}

// 开始分布式事务
int nuxx_transaction_begin(THD *thd, const char *trx_id)
{
  DBUG_ENTER("nuxx_transaction_begin");
  
  if (!g_transaction_ctx) {
    DBUG_RETURN(1);
  }
  
  mysql_mutex_lock(&g_transaction_ctx->mutex);
  
  // 生成事务ID（如果未提供）
  char *final_trx_id = NULL;
  if (trx_id) {
    final_trx_id = strdup(trx_id);
  } else {
    final_trx_id = generate_transaction_id();
  }
  
  // 检查事务是否已存在
  if (find_transaction(final_trx_id)) {
    my_free(final_trx_id);
    mysql_mutex_unlock(&g_transaction_ctx->mutex);
    my_error(ER_TRANSACTION_ALREADY_EXISTS, MYF(0), final_trx_id);
    DBUG_RETURN(1);
  }
  
  // 创建新事务条目
  nuxx_trx_entry *entry = (nuxx_trx_entry *)my_malloc(sizeof(nuxx_trx_entry), MYF(0));
  if (!entry) {
    my_free(final_trx_id);
    mysql_mutex_unlock(&g_transaction_ctx->mutex);
    DBUG_RETURN(1);
  }
  
  entry->trx_id = final_trx_id;
  entry->state = NUXX_TRX_ACTIVE;
  entry->start_time = my_micro_time();
  entry->nodes = NULL;
  entry->node_count = 0;
  
  // 添加到事务列表
  mysql_mutex_lock(&g_trx_list_mutex);
  entry->next = g_trx_list;
  g_trx_list = entry;
  mysql_mutex_unlock(&g_trx_list_mutex);
  
  // 更新当前事务
  if (g_transaction_ctx->current_trx_id) {
    my_free(g_transaction_ctx->current_trx_id);
  }
  g_transaction_ctx->current_trx_id = strdup(final_trx_id);
  g_transaction_ctx->state = NUXX_TRX_ACTIVE;
  g_transaction_ctx->start_time = entry->start_time;
  
  mysql_mutex_unlock(&g_transaction_ctx->mutex);
  
  DBUG_RETURN(0);
}

// 准备事务
int nuxx_transaction_prepare(THD *thd, const char *trx_id)
{
  DBUG_ENTER("nuxx_transaction_prepare");
  
  if (!g_transaction_ctx || !trx_id) {
    DBUG_RETURN(1);
  }
  
  nuxx_trx_entry *entry = find_transaction(trx_id);
  if (!entry) {
    my_error(ER_TRANSACTION_NOT_FOUND, MYF(0), trx_id);
    DBUG_RETURN(1);
  }
  
  if (entry->state != NUXX_TRX_ACTIVE) {
    my_error(ER_TRANSACTION_INVALID_STATE, MYF(0), trx_id);
    DBUG_RETURN(1);
  }
  
  // 检查超时
  ulonglong current_time = my_micro_time();
  if (current_time - entry->start_time > g_transaction_ctx->config.timeout_ms * 1000) {
    entry->state = NUXX_TRX_TIMEOUT;
    my_error(ER_TRANSACTION_TIMEOUT, MYF(0), trx_id);
    DBUG_RETURN(1);
  }
  
  // 向所有参与节点发送准备请求（这里简化处理）
  // 实际实现中需要网络通信
  
  entry->state = NUXX_TRX_PREPARED;
  
  DBUG_RETURN(0);
}

// 提交事务
int nuxx_transaction_commit(THD *thd, const char *trx_id)
{
  DBUG_ENTER("nuxx_transaction_commit");
  
  if (!g_transaction_ctx || !trx_id) {
    DBUG_RETURN(1);
  }
  
  nuxx_trx_entry *entry = find_transaction(trx_id);
  if (!entry) {
    my_error(ER_TRANSACTION_NOT_FOUND, MYF(0), trx_id);
    DBUG_RETURN(1);
  }
  
  if (entry->state != NUXX_TRX_PREPARED && entry->state != NUXX_TRX_ACTIVE) {
    my_error(ER_TRANSACTION_INVALID_STATE, MYF(0), trx_id);
    DBUG_RETURN(1);
  }
  
  // 向所有参与节点发送提交请求（这里简化处理）
  // 实际实现中需要网络通信
  
  entry->state = NUXX_TRX_COMMITTED;
  
  DBUG_RETURN(0);
}

// 回滚事务
int nuxx_transaction_rollback(THD *thd, const char *trx_id)
{
  DBUG_ENTER("nuxx_transaction_rollback");
  
  if (!g_transaction_ctx || !trx_id) {
    DBUG_RETURN(1);
  }
  
  nuxx_trx_entry *entry = find_transaction(trx_id);
  if (!entry) {
    my_error(ER_TRANSACTION_NOT_FOUND, MYF(0), trx_id);
    DBUG_RETURN(1);
  }
  
  // 向所有参与节点发送回滚请求（这里简化处理）
  // 实际实现中需要网络通信
  
  entry->state = NUXX_TRX_ROLLED_BACK;
  
  DBUG_RETURN(0);
}

// 获取事务状态
int nuxx_transaction_status(THD *thd, const char *trx_id, String *result)
{
  if (!g_transaction_ctx || !trx_id) return 1;
  
  nuxx_trx_entry *entry = find_transaction(trx_id);
  if (!entry) return 1;
  
  const char *state_str = "UNKNOWN";
  switch (entry->state) {
    case NUXX_TRX_INIT: state_str = "INIT"; break;
    case NUXX_TRX_ACTIVE: state_str = "ACTIVE"; break;
    case NUXX_TRX_PREPARED: state_str = "PREPARED"; break;
    case NUXX_TRX_COMMITTED: state_str = "COMMITTED"; break;
    case NUXX_TRX_ROLLED_BACK: state_str = "ROLLED_BACK"; break;
    case NUXX_TRX_TIMEOUT: state_str = "TIMEOUT"; break;
  }
  
  char buffer[512];
  my_snprintf(buffer, sizeof(buffer),
              "{\"trx_id\":\"%s\","
              "\"state\":\"%s\","
              "\"start_time\":%llu,"
              "\"duration_ms\":%llu,"
              "\"node_count\":%u}",
              entry->trx_id,
              state_str,
              entry->start_time,
              (my_micro_time() - entry->start_time) / 1000,
              entry->node_count);
  
  result->copy(buffer, strlen(buffer), &my_charset_utf8_general_ci);
  
  return 0;
}

// 添加参与节点
int nuxx_transaction_add_node(THD *thd, const char *trx_id, 
                             const char *node_id, const char *node_host, int node_port)
{
  DBUG_ENTER("nuxx_transaction_add_node");
  
  if (!g_transaction_ctx || !trx_id || !node_id || !node_host) {
    DBUG_RETURN(1);
  }
  
  nuxx_trx_entry *entry = find_transaction(trx_id);
  if (!entry) {
    my_error(ER_TRANSACTION_NOT_FOUND, MYF(0), trx_id);
    DBUG_RETURN(1);
  }
  
  if (entry->state != NUXX_TRX_ACTIVE) {
    my_error(ER_TRANSACTION_INVALID_STATE, MYF(0), trx_id);
    DBUG_RETURN(1);
  }
  
  // 重新分配节点数组
  nuxx_trx_node *new_nodes = (nuxx_trx_node *)my_realloc(
    entry->nodes, sizeof(nuxx_trx_node) * (entry->node_count + 1), MYF(0));
  
  if (!new_nodes) {
    DBUG_RETURN(1);
  }
  
  entry->nodes = new_nodes;
  nuxx_trx_node *node = &entry->nodes[entry->node_count];
  
  node->node_id = strdup(node_id);
  node->node_host = strdup(node_host);
  node->node_port = node_port;
  node->is_coordinator = false;
  node->state = NUXX_TRX_ACTIVE;
  
  entry->node_count++;
  
  DBUG_RETURN(0);
}

// 事务优化建议
int nuxx_transaction_optimize(THD *thd, const char *sql, String *suggestion)
{
  if (!g_transaction_ctx || !sql || !suggestion) return 1;
  
  // 简单的事务优化建议（这里简化处理）
  // 实际实现中需要分析SQL语句并提供优化建议
  
  const char *optimization = "{\"suggestion\":\"Consider using shorter transactions and appropriate isolation levels.\"}";
  suggestion->copy(optimization, strlen(optimization), &my_charset_utf8_general_ci);
  
  return 0;
}

// 设置事务配置
int nuxx_transaction_set_config(THD *thd, const char *config_json)
{
  // 这里简化处理，实际需要解析JSON配置
  if (!g_transaction_ctx || !config_json) return 1;
  
  // 示例：简单的配置更新
  // 实际实现中需要解析JSON并更新配置
  
  return 0;
}

// 事务监控
void nuxx_transaction_monitor(THD *thd, String *stats)
{
  if (!g_transaction_ctx) return;
  
  mysql_mutex_lock(&g_trx_list_mutex);
  
  uint active_count = 0;
  uint prepared_count = 0;
  uint committed_count = 0;
  uint rolled_back_count = 0;
  uint timeout_count = 0;
  
  nuxx_trx_entry *entry = g_trx_list;
  while (entry) {
    switch (entry->state) {
      case NUXX_TRX_ACTIVE: active_count++; break;
      case NUXX_TRX_PREPARED: prepared_count++; break;
      case NUXX_TRX_COMMITTED: committed_count++; break;
      case NUXX_TRX_ROLLED_BACK: rolled_back_count++; break;
      case NUXX_TRX_TIMEOUT: timeout_count++; break;
      default: break;
    }
    entry = entry->next;
  }
  
  mysql_mutex_unlock(&g_trx_list_mutex);
  
  char buffer[512];
  my_snprintf(buffer, sizeof(buffer),
              "{\"active_transactions\":%u,"
              "\"prepared_transactions\":%u,"
              "\"committed_transactions\":%u,"
              "\"rolled_back_transactions\":%u,"
              "\"timeout_transactions\":%u}",
              active_count, prepared_count, committed_count, 
              rolled_back_count, timeout_count);
  
  stats->copy(buffer, strlen(buffer), &my_charset_utf8_general_ci);
}

// 长事务检测线程函数
static void *long_trx_monitor_thread(void *arg)
{
  nuxx_transaction_context *ctx = (nuxx_transaction_context *)arg;
  while (ctx->long_trx_thread_running) {
    mysql_mutex_lock(&ctx->mutex);
    ulonglong now = my_micro_time() / 1000; // 毫秒
    nuxx_long_trx_info *prev = NULL;
    nuxx_long_trx_info *cur = ctx->long_trx_list;
    while (cur) {
      cur->duration_ms = now - cur->start_time;
      if (!cur->is_killed && cur->duration_ms > ctx->config.long_trx_threshold_ms) {
        // 发现长事务
        if (ctx->config.auto_kill_long_trx) {
          cur->is_killed = true;
          // 这里应调用MySQL内核kill接口，简化为标记
        }
        // 可在此处记录日志或告警
      }
      prev = cur;
      cur = cur->next;
    }
    mysql_mutex_unlock(&ctx->mutex);
    my_sleep(ctx->config.long_trx_check_interval_ms * 1000); // 微秒
  }
  return NULL;
}

// 启动长事务检测线程
int nuxx_long_trx_monitor_start(THD *thd)
{
  if (!g_transaction_ctx) return 1;
  if (g_transaction_ctx->long_trx_thread_running) return 0;
  g_transaction_ctx->long_trx_thread_running = true;
  my_thread_attr_t attr;
  my_thread_attr_init(&attr);
  my_thread_attr_setdetachstate(&attr, MY_THREAD_CREATE_JOINABLE);
  if (my_thread_create(&g_transaction_ctx->long_trx_thread, &attr, long_trx_monitor_thread, g_transaction_ctx) != 0) {
    g_transaction_ctx->long_trx_thread_running = false;
    return 1;
  }
  return 0;
}

// 停止长事务检测线程
int nuxx_long_trx_monitor_stop(THD *thd)
{
  if (!g_transaction_ctx) return 1;
  if (!g_transaction_ctx->long_trx_thread_running) return 0;
  g_transaction_ctx->long_trx_thread_running = false;
  void *thread_result;
  my_thread_join(&g_transaction_ctx->long_trx_thread, &thread_result);
  return 0;
}

// 获取长事务列表
void nuxx_long_trx_list(THD *thd, String *result)
{
  if (!g_transaction_ctx) return;
  mysql_mutex_lock(&g_transaction_ctx->mutex);
  char buffer[4096];
  char *ptr = buffer;
  int len = 0;
  len += my_snprintf(ptr + len, sizeof(buffer) - len, "{\"long_transactions\":[");
  nuxx_long_trx_info *cur = g_transaction_ctx->long_trx_list;
  int first = 1;
  while (cur) {
    if (!first) len += my_snprintf(ptr + len, sizeof(buffer) - len, ",");
    len += my_snprintf(ptr + len, sizeof(buffer) - len,
      "{\"trx_id\":\"%s\",\"start_time\":%llu,\"duration_ms\":%llu,\"user\":\"%s\",\"host\":\"%s\",\"lock_count\":%lu,\"is_killed\":%s}",
      cur->trx_id ? cur->trx_id : "",
      cur->start_time,
      cur->duration_ms,
      cur->user ? cur->user : "",
      cur->host ? cur->host : "",
      cur->lock_count,
      cur->is_killed ? "true" : "false");
    first = 0;
    cur = cur->next;
  }
  len += my_snprintf(ptr + len, sizeof(buffer) - len, "]}");
  mysql_mutex_unlock(&g_transaction_ctx->mutex);
  result->copy(buffer, len, &my_charset_utf8_general_ci);
}

// 手动终止长事务
int nuxx_kill_long_trx(THD *thd, const char *trx_id)
{
  if (!g_transaction_ctx || !trx_id) return 1;
  mysql_mutex_lock(&g_transaction_ctx->mutex);
  nuxx_long_trx_info *cur = g_transaction_ctx->long_trx_list;
  while (cur) {
    if (cur->trx_id && strcmp(cur->trx_id, trx_id) == 0) {
      cur->is_killed = true;
      // 这里应调用MySQL内核kill接口，简化为标记
      mysql_mutex_unlock(&g_transaction_ctx->mutex);
      return 0;
    }
    cur = cur->next;
  }
  mysql_mutex_unlock(&g_transaction_ctx->mutex);
  return 1;
}

// 在事务开始时注册到长事务链表（示例）
static void nuxx_register_long_trx(const char *trx_id, const char *user, const char *host)
{
  if (!g_transaction_ctx || !trx_id) return;
  nuxx_long_trx_info *info = (nuxx_long_trx_info *)my_malloc(sizeof(nuxx_long_trx_info), MYF(0));
  info->trx_id = strdup(trx_id);
  info->start_time = my_micro_time() / 1000;
  info->duration_ms = 0;
  info->user = user ? strdup(user) : NULL;
  info->host = host ? strdup(host) : NULL;
  info->lock_count = 0;
  info->is_killed = false;
  info->next = NULL;
  mysql_mutex_lock(&g_transaction_ctx->mutex);
  info->next = g_transaction_ctx->long_trx_list;
  g_transaction_ctx->long_trx_list = info;
  g_transaction_ctx->long_trx_count++;
  mysql_mutex_unlock(&g_transaction_ctx->mutex);
}

// 在事务提交/回滚时从长事务链表移除（示例）
static void nuxx_unregister_long_trx(const char *trx_id)
{
  if (!g_transaction_ctx || !trx_id) return;
  mysql_mutex_lock(&g_transaction_ctx->mutex);
  nuxx_long_trx_info *prev = NULL;
  nuxx_long_trx_info *cur = g_transaction_ctx->long_trx_list;
  while (cur) {
    if (cur->trx_id && strcmp(cur->trx_id, trx_id) == 0) {
      if (prev) prev->next = cur->next;
      else g_transaction_ctx->long_trx_list = cur->next;
      if (cur->trx_id) my_free(cur->trx_id);
      if (cur->user) my_free(cur->user);
      if (cur->host) my_free(cur->host);
      my_free(cur);
      g_transaction_ctx->long_trx_count--;
      break;
    }
    prev = cur;
    cur = cur->next;
  }
  mysql_mutex_unlock(&g_transaction_ctx->mutex);
} 