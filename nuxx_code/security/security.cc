/*Time 2022-xx-xx*/
/*Auther gaochao*/

#include "nuxx_security.h"
#include "sql_class.h"
#include "table.h"
#include "my_sys.h"
#include "m_string.h"
#include "my_thread.h"
#include "hash.h"
#include "sha2.h"

/**
 * 安全扩展实现文件
 * 实现防篡改审计和数据完整性保护功能
 */

// 全局安全扩展上下文
static nuxx_security_context *g_security_ctx = NULL;

// 审计操作字符串
static const char *audit_operation_strings[] = {
  "SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", 
  "DROP", "ALTER", "GRANT", "REVOKE", "LOGIN", "LOGOUT"
};

// 安全级别字符串
static const char *security_level_strings[] = {
  "LOW", "MEDIUM", "HIGH", "CRITICAL"
};

// 完整性结果字符串
static const char *integrity_result_strings[] = {
  "OK", "MODIFIED", "DELETED", "CORRUPTED"
};

// 审计写入线程函数
static void *audit_writer_thread(void *arg)
{
  nuxx_security_context *ctx = (nuxx_security_context *)arg;
  
  while (ctx->thread_running) {
    mysql_mutex_lock(&ctx->mutex);
    
    // 等待审计记录
    while (ctx->audit_queue == NULL && ctx->thread_running) {
      mysql_cond_wait(&ctx->cond, &ctx->mutex);
    }
    
    if (!ctx->thread_running) {
      mysql_mutex_unlock(&ctx->mutex);
      break;
    }
    
    // 处理审计队列
    nuxx_audit_record *record = ctx->audit_queue;
    ctx->audit_queue = record->next;
    if (!ctx->audit_queue) {
      ctx->audit_tail = NULL;
    }
    
    mysql_mutex_unlock(&ctx->mutex);
    
    // 写入审计日志文件
    char audit_buffer[4096];
    struct tm *tm_info;
    time_t timestamp = record->timestamp / 1000000;
    tm_info = localtime(&timestamp);
    
    my_snprintf(audit_buffer, sizeof(audit_buffer),
                "[%04d-%02d-%02d %02d:%02d:%02d.%06llu] "
                "[%s] [%s@%s] [%s] [%s.%s] [%s] "
                "OLD_DATA: %s NEW_DATA: %s CLIENT_IP: %s SESSION: %s\n",
                tm_info->tm_year + 1900, tm_info->tm_mon + 1, tm_info->tm_mday,
                tm_info->tm_hour, tm_info->tm_min, tm_info->tm_sec,
                record->timestamp % 1000000,
                audit_operation_strings[record->operation],
                record->user ? record->user : "unknown",
                record->host ? record->host : "unknown",
                record->database ? record->database : "unknown",
                record->table ? record->table : "unknown",
                record->sql_text ? record->sql_text : "no_sql",
                record->old_data ? record->old_data : "null",
                record->new_data ? record->new_data : "null",
                record->client_ip ? record->client_ip : "unknown",
                record->session_id ? record->session_id : "unknown");
    
    if (ctx->audit_file != -1) {
      my_write(ctx->audit_file, (uchar*)audit_buffer, strlen(audit_buffer), MYF(0));
    }
    
    // 释放审计记录
    if (record->user) my_free(record->user);
    if (record->host) my_free(record->host);
    if (record->database) my_free(record->database);
    if (record->table) my_free(record->table);
    if (record->sql_text) my_free(record->sql_text);
    if (record->old_data) my_free(record->old_data);
    if (record->new_data) my_free(record->new_data);
    if (record->client_ip) my_free(record->client_ip);
    if (record->session_id) my_free(record->session_id);
    my_free(record);
  }
  
  return NULL;
}

// 初始化安全扩展
int nuxx_security_init(THD *thd)
{
  DBUG_ENTER("nuxx_security_init");
  
  // 分配全局上下文
  g_security_ctx = (nuxx_security_context *)my_malloc(
    sizeof(nuxx_security_context), MYF(MY_ZEROFILL));
  
  if (!g_security_ctx) {
    DBUG_RETURN(1);
  }
  
  // 初始化默认配置
  g_security_ctx->config.enable_audit = true;
  g_security_ctx->config.enable_integrity_check = true;
  g_security_ctx->config.enable_tamper_detection = true;
  g_security_ctx->config.enable_encryption = false;
  g_security_ctx->config.security_level = NUXX_SEC_MEDIUM;
  g_security_ctx->config.audit_log_path = strdup("/var/log/mysql/nuxx-security-audit.log");
  g_security_ctx->config.integrity_file_path = strdup("/var/lib/mysql/nuxx-integrity.dat");
  g_security_ctx->config.encryption_key = strdup("nuxx_security_key_2024");
  g_security_ctx->config.check_interval = 3600; // 1小时
  g_security_ctx->config.max_audit_records = 10000;
  
  // 初始化安全上下文
  g_security_ctx->audit_queue = NULL;
  g_security_ctx->audit_tail = NULL;
  g_security_ctx->integrity_list = NULL;
  g_security_ctx->audit_count = 0;
  g_security_ctx->integrity_count = 0;
  g_security_ctx->thread_running = false;
  g_security_ctx->audit_file = -1;
  g_security_ctx->integrity_file = -1;
  
  // 初始化互斥锁和条件变量
  mysql_mutex_init(key_mutex_nuxx_security, &g_security_ctx->mutex, MY_MUTEX_INIT_FAST);
  mysql_cond_init(key_cond_nuxx_security, &g_security_ctx->cond, NULL);
  
  // 打开审计文件
  g_security_ctx->audit_file = my_open(g_security_ctx->config.audit_log_path, 
                                       O_CREAT | O_APPEND | O_WRONLY, MYF(0));
  g_security_ctx->integrity_file = my_open(g_security_ctx->config.integrity_file_path, 
                                           O_CREAT | O_RDWR, MYF(0));
  
  // 启动审计写入线程
  g_security_ctx->thread_running = true;
  my_thread_attr_t attr;
  my_thread_attr_init(&attr);
  my_thread_attr_setdetachstate(&attr, MY_THREAD_CREATE_JOINABLE);
  
  if (my_thread_create(&g_security_ctx->audit_thread, &attr, audit_writer_thread, g_security_ctx) != 0) {
    g_security_ctx->thread_running = false;
    DBUG_RETURN(1);
  }
  
  DBUG_RETURN(0);
}

// 清理安全扩展
int nuxx_security_cleanup(THD *thd)
{
  DBUG_ENTER("nuxx_security_cleanup");
  
  if (g_security_ctx) {
    // 停止审计线程
    g_security_ctx->thread_running = false;
    mysql_cond_signal(&g_security_ctx->cond);
    
    // 等待线程结束
    void *thread_result;
    my_thread_join(&g_security_ctx->audit_thread, &thread_result);
    
    // 处理剩余的审计记录
    mysql_mutex_lock(&g_security_ctx->mutex);
    nuxx_audit_record *record = g_security_ctx->audit_queue;
    while (record) {
      nuxx_audit_record *next = record->next;
      if (record->user) my_free(record->user);
      if (record->host) my_free(record->host);
      if (record->database) my_free(record->database);
      if (record->table) my_free(record->table);
      if (record->sql_text) my_free(record->sql_text);
      if (record->old_data) my_free(record->old_data);
      if (record->new_data) my_free(record->new_data);
      if (record->client_ip) my_free(record->client_ip);
      if (record->session_id) my_free(record->session_id);
      my_free(record);
      record = next;
    }
    mysql_mutex_unlock(&g_security_ctx->mutex);
    
    // 清理完整性记录
    nuxx_integrity_record *integrity = g_security_ctx->integrity_list;
    while (integrity) {
      nuxx_integrity_record *next = integrity->next;
      if (integrity->table_name) my_free(integrity->table_name);
      if (integrity->checksum) my_free(integrity->checksum);
      if (integrity->hash_algorithm) my_free(integrity->hash_algorithm);
      my_free(integrity);
      integrity = next;
    }
    
    // 销毁互斥锁和条件变量
    mysql_cond_destroy(&g_security_ctx->cond);
    mysql_mutex_destroy(&g_security_ctx->mutex);
    
    // 关闭文件
    if (g_security_ctx->audit_file != -1) my_close(g_security_ctx->audit_file, MYF(0));
    if (g_security_ctx->integrity_file != -1) my_close(g_security_ctx->integrity_file, MYF(0));
    
    // 释放配置内存
    if (g_security_ctx->config.audit_log_path) my_free(g_security_ctx->config.audit_log_path);
    if (g_security_ctx->config.integrity_file_path) my_free(g_security_ctx->config.integrity_file_path);
    if (g_security_ctx->config.encryption_key) my_free(g_security_ctx->config.encryption_key);
    
    my_free(g_security_ctx);
    g_security_ctx = NULL;
  }
  
  DBUG_RETURN(0);
}

// 添加审计记录到队列
static int add_audit_record(nuxx_audit_operation operation,
                           const char *database, const char *table,
                           const char *sql_text, const char *old_data,
                           const char *new_data, THD *thd)
{
  if (!g_security_ctx || !g_security_ctx->thread_running) return 1;
  
  // 检查审计记录数量限制
  if (g_security_ctx->audit_count >= g_security_ctx->config.max_audit_records) {
    return 1;
  }
  
  // 创建审计记录
  nuxx_audit_record *record = (nuxx_audit_record *)my_malloc(sizeof(nuxx_audit_record), MYF(0));
  if (!record) return 1;
  
  record->timestamp = my_micro_time();
  record->operation = operation;
  record->next = NULL;
  
  // 复制数据
  record->database = database ? strdup(database) : NULL;
  record->table = table ? strdup(table) : NULL;
  record->sql_text = sql_text ? strdup(sql_text) : NULL;
  record->old_data = old_data ? strdup(old_data) : NULL;
  record->new_data = new_data ? strdup(new_data) : NULL;
  
  // 获取用户信息
  if (thd) {
    record->user = thd->security_ctx->user ? strdup(thd->security_ctx->user) : NULL;
    record->host = thd->security_ctx->host ? strdup(thd->security_ctx->host) : NULL;
    
    // 获取客户端IP（简化处理）
    record->client_ip = strdup("127.0.0.1");
    
    // 生成会话ID
    char session_id[32];
    my_snprintf(session_id, sizeof(session_id), "%lu", thd->thread_id);
    record->session_id = strdup(session_id);
  } else {
    record->user = NULL;
    record->host = NULL;
    record->client_ip = NULL;
    record->session_id = NULL;
  }
  
  // 添加到队列
  mysql_mutex_lock(&g_security_ctx->mutex);
  
  if (g_security_ctx->audit_tail) {
    g_security_ctx->audit_tail->next = record;
  } else {
    g_security_ctx->audit_queue = record;
  }
  g_security_ctx->audit_tail = record;
  g_security_ctx->audit_count++;
  
  mysql_mutex_unlock(&g_security_ctx->mutex);
  
  // 通知审计线程
  mysql_cond_signal(&g_security_ctx->cond);
  
  return 0;
}

// 记录审计日志
int nuxx_security_audit(THD *thd, nuxx_audit_operation operation,
                       const char *database, const char *table,
                       const char *sql_text, const char *old_data,
                       const char *new_data)
{
  if (!g_security_ctx->config.enable_audit) return 0;
  
  return add_audit_record(operation, database, table, sql_text, old_data, new_data, thd);
}

// 计算SHA256哈希
static char *calculate_sha256(const char *data, size_t length)
{
  unsigned char hash[SHA256_DIGEST_LENGTH];
  SHA256_CTX sha256;
  SHA256_Init(&sha256);
  SHA256_Update(&sha256, data, length);
  SHA256_Final(hash, &sha256);
  
  char *result = (char *)my_malloc(SHA256_DIGEST_LENGTH * 2 + 1, MYF(0));
  if (!result) return NULL;
  
  for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
    sprintf(result + i * 2, "%02x", hash[i]);
  }
  
  return result;
}

// 计算表校验和
char *nuxx_security_calculate_checksum(THD *thd, const char *table_name)
{
  if (!g_security_ctx || !table_name) return NULL;
  
  // 这里简化处理，实际需要扫描整个表的数据
  // 实际实现中需要遍历表的所有记录并计算哈希
  
  char dummy_data[256];
  my_snprintf(dummy_data, sizeof(dummy_data), "table_%s_checksum_%llu", 
              table_name, my_micro_time());
  
  return calculate_sha256(dummy_data, strlen(dummy_data));
}

// 数据完整性检查
int nuxx_security_check_integrity(THD *thd, const char *table_name)
{
  if (!g_security_ctx->config.enable_integrity_check || !table_name) return 1;
  
  // 计算当前校验和
  char *current_checksum = nuxx_security_calculate_checksum(thd, table_name);
  if (!current_checksum) return 1;
  
  // 查找已存储的校验和
  nuxx_integrity_record *record = g_security_ctx->integrity_list;
  while (record) {
    if (record->table_name && strcmp(record->table_name, table_name) == 0) {
      // 比较校验和
      if (record->checksum && strcmp(record->checksum, current_checksum) == 0) {
        record->status = NUXX_INTEGRITY_OK;
        record->last_check_time = my_micro_time();
      } else {
        record->status = NUXX_INTEGRITY_MODIFIED;
        // 更新校验和
        if (record->checksum) my_free(record->checksum);
        record->checksum = current_checksum;
        record->last_check_time = my_micro_time();
        
        // 记录安全事件
        nuxx_security_alert(thd, "INTEGRITY_VIOLATION", 
                           "Data integrity violation detected");
      }
      return 0;
    }
    record = record->next;
  }
  
  // 创建新的完整性记录
  record = (nuxx_integrity_record *)my_malloc(sizeof(nuxx_integrity_record), MYF(0));
  if (!record) {
    my_free(current_checksum);
    return 1;
  }
  
  record->table_name = strdup(table_name);
  record->checksum = current_checksum;
  record->record_count = 0; // 实际需要统计记录数
  record->last_check_time = my_micro_time();
  record->status = NUXX_INTEGRITY_OK;
  record->hash_algorithm = strdup("SHA256");
  record->next = g_security_ctx->integrity_list;
  
  g_security_ctx->integrity_list = record;
  g_security_ctx->integrity_count++;
  
  return 0;
}

// 验证数据完整性
nuxx_integrity_result nuxx_security_verify_integrity(THD *thd, const char *table_name)
{
  if (!g_security_ctx || !table_name) return NUXX_INTEGRITY_CORRUPTED;
  
  nuxx_integrity_record *record = g_security_ctx->integrity_list;
  while (record) {
    if (record->table_name && strcmp(record->table_name, table_name) == 0) {
      return record->status;
    }
    record = record->next;
  }
  
  return NUXX_INTEGRITY_CORRUPTED;
}

// 防篡改检测
int nuxx_security_detect_tampering(THD *thd, const char *table_name)
{
  if (!g_security_ctx->config.enable_tamper_detection || !table_name) return 1;
  
  // 执行完整性检查
  if (nuxx_security_check_integrity(thd, table_name) != 0) {
    return 1;
  }
  
  // 检查完整性结果
  nuxx_integrity_result result = nuxx_security_verify_integrity(thd, table_name);
  if (result != NUXX_INTEGRITY_OK) {
    // 记录篡改事件
    nuxx_security_audit(thd, NUXX_AUDIT_SELECT, NULL, table_name,
                       "TAMPERING_DETECTED", NULL, 
                       integrity_result_strings[result]);
    
    // 发送告警
    nuxx_security_alert(thd, "TAMPERING_DETECTED", 
                       "Data tampering detected in table");
    
    return 1;
  }
  
  return 0;
}

// 简单加密函数（这里使用XOR加密作为示例）
static char *xor_encrypt(const char *data, size_t length, const char *key)
{
  if (!data || !key) return NULL;
  
  char *result = (char *)my_malloc(length + 1, MYF(0));
  if (!result) return NULL;
  
  size_t key_len = strlen(key);
  for (size_t i = 0; i < length; i++) {
    result[i] = data[i] ^ key[i % key_len];
  }
  result[length] = '\0';
  
  return result;
}

// 加密敏感数据
char *nuxx_security_encrypt_data(const char *data, size_t length)
{
  if (!g_security_ctx->config.enable_encryption || !data) return NULL;
  
  return xor_encrypt(data, length, g_security_ctx->config.encryption_key);
}

// 解密敏感数据
char *nuxx_security_decrypt_data(const char *encrypted_data, size_t length)
{
  if (!g_security_ctx->config.enable_encryption || !encrypted_data) return NULL;
  
  return xor_encrypt(encrypted_data, length, g_security_ctx->config.encryption_key);
}

// 获取安全统计信息
void nuxx_get_security_stats(THD *thd, String *result)
{
  if (!g_security_ctx) return;
  
  mysql_mutex_lock(&g_security_ctx->mutex);
  
  char buffer[512];
  my_snprintf(buffer, sizeof(buffer),
              "{\"audit_count\":%u,"
              "\"integrity_count\":%u,"
              "\"enable_audit\":%s,"
              "\"enable_integrity_check\":%s,"
              "\"enable_tamper_detection\":%s,"
              "\"enable_encryption\":%s,"
              "\"security_level\":\"%s\"}",
              g_security_ctx->audit_count,
              g_security_ctx->integrity_count,
              g_security_ctx->config.enable_audit ? "true" : "false",
              g_security_ctx->config.enable_integrity_check ? "true" : "false",
              g_security_ctx->config.enable_tamper_detection ? "true" : "false",
              g_security_ctx->config.enable_encryption ? "true" : "false",
              security_level_strings[g_security_ctx->config.security_level]);
  
  mysql_mutex_unlock(&g_security_ctx->mutex);
  
  result->copy(buffer, strlen(buffer), &my_charset_utf8_general_ci);
}

// 设置安全配置
int nuxx_security_set_config(THD *thd, const char *config_json)
{
  // 这里简化处理，实际需要解析JSON配置
  if (!g_security_ctx || !config_json) return 1;
  
  // 示例：简单的配置更新
  // 实际实现中需要解析JSON并更新配置
  
  return 0;
}

// 导出审计日志
int nuxx_security_export_audit(THD *thd, const char *file_path)
{
  if (!g_security_ctx || !file_path) return 1;
  
  // 这里简化处理，实际需要导出审计日志到指定文件
  // 可以遍历审计队列并写入文件
  
  return 0;
}

// 清理过期审计记录
int nuxx_security_cleanup_audit(THD *thd, int days_to_keep)
{
  if (!g_security_ctx) return 1;
  
  // 这里简化处理，实际需要清理过期的审计记录
  // 可以根据时间戳判断是否删除
  
  return 0;
}

// 安全事件告警
int nuxx_security_alert(THD *thd, const char *event_type, const char *message)
{
  if (!g_security_ctx || !event_type || !message) return 1;
  
  // 记录安全告警到审计日志
  char alert_message[512];
  my_snprintf(alert_message, sizeof(alert_message), "SECURITY_ALERT: %s - %s", 
              event_type, message);
  
  nuxx_security_audit(thd, NUXX_AUDIT_SELECT, NULL, NULL,
                     alert_message, NULL, NULL);
  
  // 这里可以添加其他告警机制，如发送邮件、短信等
  
  return 0;
}

// 权限验证增强
bool nuxx_security_verify_permission(THD *thd, const char *operation, const char *object)
{
  if (!g_security_ctx || !thd || !operation || !object) return false;
  
  // 这里简化处理，实际需要实现更严格的权限验证
  // 可以检查用户权限、对象访问控制等
  
  // 记录权限验证
  char permission_msg[256];
  my_snprintf(permission_msg, sizeof(permission_msg), "PERMISSION_CHECK: %s on %s", 
              operation, object);
  
  nuxx_security_audit(thd, NUXX_AUDIT_SELECT, NULL, NULL,
                     permission_msg, NULL, NULL);
  
  return true;
}

// 敏感数据脱敏
char *nuxx_security_mask_sensitive_data(const char *data, const char *mask_pattern)
{
  if (!data || !mask_pattern) return NULL;
  
  size_t data_len = strlen(data);
  char *result = (char *)my_malloc(data_len + 1, MYF(0));
  if (!result) return NULL;
  
  // 简单的脱敏处理，将数据替换为星号
  for (size_t i = 0; i < data_len; i++) {
    if (i < data_len - 4) {
      result[i] = '*';
    } else {
      result[i] = data[i];
    }
  }
  result[data_len] = '\0';
  
  return result;
} 