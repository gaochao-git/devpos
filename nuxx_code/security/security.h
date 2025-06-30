/*Time 2022-xx-xx*/
/*Auther gaochao*/

#ifndef NUXX_SECURITY_INCLUDED
#define NUXX_SECURITY_INCLUDED

#include "my_global.h"
#include "sql_class.h"
#include "table.h"

/**
 * 安全扩展头文件
 * 实现防篡改审计和数据完整性保护功能
 */

// 安全级别枚举
enum nuxx_security_level {
  NUXX_SEC_LOW = 0,            // 低级别
  NUXX_SEC_MEDIUM,             // 中级别
  NUXX_SEC_HIGH,               // 高级别
  NUXX_SEC_CRITICAL            // 关键级别
};

// 审计操作类型
enum nuxx_audit_operation {
  NUXX_AUDIT_SELECT = 0,       // 查询操作
  NUXX_AUDIT_INSERT,           // 插入操作
  NUXX_AUDIT_UPDATE,           // 更新操作
  NUXX_AUDIT_DELETE,           // 删除操作
  NUXX_AUDIT_CREATE,           // 创建操作
  NUXX_AUDIT_DROP,             // 删除操作
  NUXX_AUDIT_ALTER,            // 修改操作
  NUXX_AUDIT_GRANT,            // 授权操作
  NUXX_AUDIT_REVOKE,           // 撤销操作
  NUXX_AUDIT_LOGIN,            // 登录操作
  NUXX_AUDIT_LOGOUT            // 登出操作
};

// 数据完整性检查结果
enum nuxx_integrity_result {
  NUXX_INTEGRITY_OK = 0,       // 完整性正常
  NUXX_INTEGRITY_MODIFIED,     // 数据被修改
  NUXX_INTEGRITY_DELETED,      // 数据被删除
  NUXX_INTEGRITY_CORRUPTED     // 数据损坏
};

// 安全配置
struct nuxx_security_config {
  bool enable_audit;            // 是否启用审计
  bool enable_integrity_check;  // 是否启用完整性检查
  bool enable_tamper_detection; // 是否启用防篡改检测
  bool enable_encryption;       // 是否启用加密
  nuxx_security_level security_level; // 安全级别
  char *audit_log_path;         // 审计日志路径
  char *integrity_file_path;    // 完整性文件路径
  char *encryption_key;         // 加密密钥
  ulonglong check_interval;     // 检查间隔(秒)
  int max_audit_records;        // 最大审计记录数
};

// 审计记录
struct nuxx_audit_record {
  ulonglong timestamp;          // 时间戳
  nuxx_audit_operation operation; // 操作类型
  char *user;                   // 用户
  char *host;                   // 主机
  char *database;               // 数据库
  char *table;                  // 表名
  char *sql_text;               // SQL文本
  char *old_data;               // 修改前数据
  char *new_data;               // 修改后数据
  char *client_ip;              // 客户端IP
  char *session_id;             // 会话ID
  nuxx_audit_record *next;      // 下一个记录
};

// 数据完整性记录
struct nuxx_integrity_record {
  char *table_name;             // 表名
  char *checksum;               // 校验和
  ulonglong record_count;       // 记录数
  ulonglong last_check_time;    // 最后检查时间
  nuxx_integrity_result status; // 完整性状态
  char *hash_algorithm;         // 哈希算法
  nuxx_integrity_record *next;  // 下一个记录
};

// 安全扩展上下文
struct nuxx_security_context {
  nuxx_security_config config;
  nuxx_audit_record *audit_queue;    // 审计队列
  nuxx_audit_record *audit_tail;     // 队列尾部
  nuxx_integrity_record *integrity_list; // 完整性记录列表
  uint audit_count;                   // 审计记录数
  uint integrity_count;               // 完整性记录数
  mysql_mutex_t mutex;                // 互斥锁
  mysql_cond_t cond;                  // 条件变量
  my_thread_handle audit_thread;      // 审计线程
  bool thread_running;                // 线程运行状态
  File audit_file;                    // 审计文件句柄
  File integrity_file;                // 完整性文件句柄
};

// 初始化安全扩展
int nuxx_security_init(THD *thd);

// 清理安全扩展
int nuxx_security_cleanup(THD *thd);

// 记录审计日志
int nuxx_security_audit(THD *thd, nuxx_audit_operation operation,
                       const char *database, const char *table,
                       const char *sql_text, const char *old_data,
                       const char *new_data);

// 数据完整性检查
int nuxx_security_check_integrity(THD *thd, const char *table_name);

// 计算表校验和
char *nuxx_security_calculate_checksum(THD *thd, const char *table_name);

// 验证数据完整性
nuxx_integrity_result nuxx_security_verify_integrity(THD *thd, const char *table_name);

// 防篡改检测
int nuxx_security_detect_tampering(THD *thd, const char *table_name);

// 加密敏感数据
char *nuxx_security_encrypt_data(const char *data, size_t length);

// 解密敏感数据
char *nuxx_security_decrypt_data(const char *encrypted_data, size_t length);

// 获取安全统计信息
void nuxx_get_security_stats(THD *thd, String *result);

// 设置安全配置
int nuxx_security_set_config(THD *thd, const char *config_json);

// 导出审计日志
int nuxx_security_export_audit(THD *thd, const char *file_path);

// 清理过期审计记录
int nuxx_security_cleanup_audit(THD *thd, int days_to_keep);

// 安全事件告警
int nuxx_security_alert(THD *thd, const char *event_type, const char *message);

// 权限验证增强
bool nuxx_security_verify_permission(THD *thd, const char *operation, const char *object);

// 敏感数据脱敏
char *nuxx_security_mask_sensitive_data(const char *data, const char *mask_pattern);

#endif /* NUXX_SECURITY_INCLUDED */ 