/*Time 2022-xx-xx*/
/*Auther gaochao*/

#include "nuxx_rw_split.h"
#include "sql_class.h"
#include "sql_lex.h"
#include "sql_parse.h"
#include "mysql_com.h"
#include "m_string.h"
#include "my_sys.h"

/**
 * 读写分离扩展实现文件
 * 实现从节点自动路由写操作到主节点的功能
 */

// 全局读写分离上下文
static nuxx_rw_split_context *g_rw_split_ctx = NULL;

// 初始化读写分离扩展
int nuxx_rw_split_init(THD *thd)
{
  DBUG_ENTER("nuxx_rw_split_init");
  
  // 分配全局上下文
  g_rw_split_ctx = (nuxx_rw_split_context *)my_malloc(
    sizeof(nuxx_rw_split_context), MYF(MY_ZEROFILL));
  
  if (!g_rw_split_ctx) {
    DBUG_RETURN(1);
  }
  
  // 初始化默认配置
  g_rw_split_ctx->config.master_host = strdup("127.0.0.1");
  g_rw_split_ctx->config.master_port = 3306;
  g_rw_split_ctx->config.master_user = strdup("root");
  g_rw_split_ctx->config.master_password = strdup("");
  g_rw_split_ctx->config.enable_rw_split = true;
  g_rw_split_ctx->config.max_retry_times = 3;
  
  // 检测当前节点类型（这里简化处理，实际需要从配置或状态检测）
  g_rw_split_ctx->is_slave_node = true; // 假设当前为从节点
  g_rw_split_ctx->write_redirect_count = 0;
  g_rw_split_ctx->master_connection = NULL;
  
  DBUG_RETURN(0);
}

// 清理读写分离扩展
int nuxx_rw_split_cleanup(THD *thd)
{
  DBUG_ENTER("nuxx_rw_split_cleanup");
  
  if (g_rw_split_ctx) {
    // 关闭主节点连接
    if (g_rw_split_ctx->master_connection) {
      mysql_close(g_rw_split_ctx->master_connection);
    }
    
    // 释放配置内存
    if (g_rw_split_ctx->config.master_host)
      my_free(g_rw_split_ctx->config.master_host);
    if (g_rw_split_ctx->config.master_user)
      my_free(g_rw_split_ctx->config.master_user);
    if (g_rw_split_ctx->config.master_password)
      my_free(g_rw_split_ctx->config.master_password);
    
    my_free(g_rw_split_ctx);
    g_rw_split_ctx = NULL;
  }
  
  DBUG_RETURN(0);
}

// 检查是否为写操作
bool nuxx_is_write_operation(LEX *lex)
{
  if (!lex) return false;
  
  // 检查SQL命令类型
  switch (lex->sql_command) {
    case SQLCOM_INSERT:
    case SQLCOM_UPDATE:
    case SQLCOM_DELETE:
    case SQLCOM_REPLACE:
    case SQLCOM_CREATE_TABLE:
    case SQLCOM_DROP_TABLE:
    case SQLCOM_ALTER_TABLE:
    case SQLCOM_CREATE_INDEX:
    case SQLCOM_DROP_INDEX:
    case SQLCOM_TRUNCATE:
    case SQLCOM_RENAME_TABLE:
      return true;
    default:
      return false;
  }
}

// 连接到主节点
static int connect_to_master()
{
  if (!g_rw_split_ctx) return 1;
  
  // 如果已有连接，先关闭
  if (g_rw_split_ctx->master_connection) {
    mysql_close(g_rw_split_ctx->master_connection);
  }
  
  // 创建新连接
  g_rw_split_ctx->master_connection = mysql_init(NULL);
  if (!g_rw_split_ctx->master_connection) return 1;
  
  // 设置连接超时
  mysql_options(g_rw_split_ctx->master_connection, MYSQL_OPT_CONNECT_TIMEOUT, "10");
  
  // 连接到主节点
  if (!mysql_real_connect(g_rw_split_ctx->master_connection,
                         g_rw_split_ctx->config.master_host,
                         g_rw_split_ctx->config.master_user,
                         g_rw_split_ctx->config.master_password,
                         NULL,
                         g_rw_split_ctx->config.master_port,
                         NULL, 0)) {
    mysql_close(g_rw_split_ctx->master_connection);
    g_rw_split_ctx->master_connection = NULL;
    return 1;
  }
  
  return 0;
}

// 重定向写操作到主节点
int nuxx_redirect_write_to_master(THD *thd, const char *sql)
{
  DBUG_ENTER("nuxx_redirect_write_to_master");
  
  if (!g_rw_split_ctx || !g_rw_split_ctx->config.enable_rw_split) {
    DBUG_RETURN(0); // 未启用读写分离
  }
  
  if (!g_rw_split_ctx->is_slave_node) {
    DBUG_RETURN(0); // 当前不是从节点，无需重定向
  }
  
  // 连接到主节点
  if (connect_to_master() != 0) {
    // 连接失败，记录错误
    my_error(ER_CONNECTION_ERROR, MYF(0), "Failed to connect to master");
    DBUG_RETURN(1);
  }
  
  // 执行SQL到主节点
  int retry_count = 0;
  int result = 0;
  
  while (retry_count < g_rw_split_ctx->config.max_retry_times) {
    result = mysql_query(g_rw_split_ctx->master_connection, sql);
    if (result == 0) {
      // 执行成功
      g_rw_split_ctx->write_redirect_count++;
      DBUG_RETURN(0);
    }
    
    // 执行失败，重试
    retry_count++;
    if (retry_count < g_rw_split_ctx->config.max_retry_times) {
      my_sleep(1000000); // 等待1秒后重试
    }
  }
  
  // 所有重试都失败
  my_error(ER_QUERY_INTERRUPTED, MYF(0), "Failed to execute write operation on master");
  DBUG_RETURN(1);
}

// 获取读写分离统计信息
void nuxx_get_rw_split_stats(THD *thd, String *result)
{
  if (!g_rw_split_ctx) return;
  
  char buffer[512];
  my_snprintf(buffer, sizeof(buffer),
              "{\"enable_rw_split\":%s,"
              "\"is_slave_node\":%s,"
              "\"write_redirect_count\":%llu,"
              "\"master_host\":\"%s\","
              "\"master_port\":%d}",
              g_rw_split_ctx->config.enable_rw_split ? "true" : "false",
              g_rw_split_ctx->is_slave_node ? "true" : "false",
              g_rw_split_ctx->write_redirect_count,
              g_rw_split_ctx->config.master_host,
              g_rw_split_ctx->config.master_port);
  
  result->copy(buffer, strlen(buffer), &my_charset_utf8_general_ci);
}

// 设置读写分离配置
int nuxx_set_rw_split_config(THD *thd, const char *config_json)
{
  // 这里简化处理，实际需要解析JSON配置
  // 可以根据需要实现完整的JSON解析逻辑
  
  if (!g_rw_split_ctx) return 1;
  
  // 示例：简单的配置更新
  // 实际实现中需要解析JSON并更新配置
  
  return 0;
} 