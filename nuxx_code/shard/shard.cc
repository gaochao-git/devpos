/*Time 2022-xx-xx*/
/*Auther gaochao*/

#include "nuxx_shard.h"
#include "sql_class.h"
#include "my_sys.h"
#include "m_string.h"

/**
 * 分库分表（分片）扩展实现文件
 * 实现分片元数据管理、分片路由、SQL重写等功能
 */

// 全局分片上下文
static nuxx_shard_context *g_shard_ctx = NULL;

// 初始化分片扩展
int nuxx_shard_init(THD *thd)
{
  DBUG_ENTER("nuxx_shard_init");
  g_shard_ctx = (nuxx_shard_context *)my_malloc(sizeof(nuxx_shard_context), MYF(MY_ZEROFILL));
  if (!g_shard_ctx) DBUG_RETURN(1);
  g_shard_ctx->config.enable_sharding = true;
  g_shard_ctx->config.max_shard_count = 32;
  g_shard_ctx->config.default_shard_key = strdup("user_id");
  g_shard_ctx->config.metadata_path = strdup("/var/lib/mysql/nuxx_shard_meta.json");
  g_shard_ctx->tables = NULL;
  g_shard_ctx->table_count = 0;
  mysql_mutex_init(key_mutex_nuxx_shard, &g_shard_ctx->mutex, MY_MUTEX_INIT_FAST);
  DBUG_RETURN(0);
}

// 清理分片扩展
int nuxx_shard_cleanup(THD *thd)
{
  DBUG_ENTER("nuxx_shard_cleanup");
  if (g_shard_ctx) {
    mysql_mutex_lock(&g_shard_ctx->mutex);
    for (int i = 0; i < g_shard_ctx->table_count; i++) {
      nuxx_shard_table *tbl = &g_shard_ctx->tables[i];
      if (tbl->logic_table) my_free(tbl->logic_table);
      if (tbl->shard_key) my_free(tbl->shard_key);
      if (tbl->nodes) my_free(tbl->nodes);
      if (tbl->physical_tables) {
        for (int j = 0; j < tbl->shard_count; j++) {
          if (tbl->physical_tables[j]) my_free(tbl->physical_tables[j]);
        }
        my_free(tbl->physical_tables);
      }
    }
    if (g_shard_ctx->tables) my_free(g_shard_ctx->tables);
    if (g_shard_ctx->config.default_shard_key) my_free(g_shard_ctx->config.default_shard_key);
    if (g_shard_ctx->config.metadata_path) my_free(g_shard_ctx->config.metadata_path);
    mysql_mutex_unlock(&g_shard_ctx->mutex);
    mysql_mutex_destroy(&g_shard_ctx->mutex);
    my_free(g_shard_ctx);
    g_shard_ctx = NULL;
  }
  DBUG_RETURN(0);
}

// 注册分片表
int nuxx_shard_register_table(THD *thd, const char *logic_table, const char *shard_key,
                             nuxx_shard_type type, int shard_count, nuxx_shard_node *nodes)
{
  DBUG_ENTER("nuxx_shard_register_table");
  if (!g_shard_ctx || !logic_table || !shard_key || shard_count <= 0 || !nodes) DBUG_RETURN(1);
  mysql_mutex_lock(&g_shard_ctx->mutex);
  int idx = g_shard_ctx->table_count++;
  g_shard_ctx->tables = (nuxx_shard_table *)my_realloc(g_shard_ctx->tables, sizeof(nuxx_shard_table) * g_shard_ctx->table_count, MYF(0));
  nuxx_shard_table *tbl = &g_shard_ctx->tables[idx];
  tbl->logic_table = strdup(logic_table);
  tbl->shard_key = strdup(shard_key);
  tbl->type = type;
  tbl->shard_count = shard_count;
  tbl->nodes = (nuxx_shard_node *)my_malloc(sizeof(nuxx_shard_node) * shard_count, MYF(0));
  for (int i = 0; i < shard_count; i++) {
    tbl->nodes[i] = nodes[i];
  }
  tbl->physical_tables = (char **)my_malloc(sizeof(char *) * shard_count, MYF(0));
  for (int i = 0; i < shard_count; i++) {
    char buf[256];
    my_snprintf(buf, sizeof(buf), "%s_%d", logic_table, i);
    tbl->physical_tables[i] = strdup(buf);
  }
  mysql_mutex_unlock(&g_shard_ctx->mutex);
  DBUG_RETURN(0);
}

// 注销分片表
int nuxx_shard_unregister_table(THD *thd, const char *logic_table)
{
  DBUG_ENTER("nuxx_shard_unregister_table");
  if (!g_shard_ctx || !logic_table) DBUG_RETURN(1);
  mysql_mutex_lock(&g_shard_ctx->mutex);
  int found = -1;
  for (int i = 0; i < g_shard_ctx->table_count; i++) {
    if (strcmp(g_shard_ctx->tables[i].logic_table, logic_table) == 0) {
      found = i;
      break;
    }
  }
  if (found == -1) {
    mysql_mutex_unlock(&g_shard_ctx->mutex);
    DBUG_RETURN(1);
  }
  // 释放表资源
  nuxx_shard_table *tbl = &g_shard_ctx->tables[found];
  if (tbl->logic_table) my_free(tbl->logic_table);
  if (tbl->shard_key) my_free(tbl->shard_key);
  if (tbl->nodes) my_free(tbl->nodes);
  if (tbl->physical_tables) {
    for (int j = 0; j < tbl->shard_count; j++) {
      if (tbl->physical_tables[j]) my_free(tbl->physical_tables[j]);
    }
    my_free(tbl->physical_tables);
  }
  // 移动后续表
  for (int i = found; i < g_shard_ctx->table_count - 1; i++) {
    g_shard_ctx->tables[i] = g_shard_ctx->tables[i + 1];
  }
  g_shard_ctx->table_count--;
  mysql_mutex_unlock(&g_shard_ctx->mutex);
  DBUG_RETURN(0);
}

// 分片路由：根据分片键值路由到物理表和节点
int nuxx_shard_route(THD *thd, const char *logic_table, const char *shard_key_value,
                    char **out_node_id, char **out_physical_table)
{
  DBUG_ENTER("nuxx_shard_route");
  if (!g_shard_ctx || !logic_table || !shard_key_value) DBUG_RETURN(1);
  mysql_mutex_lock(&g_shard_ctx->mutex);
  nuxx_shard_table *tbl = NULL;
  for (int i = 0; i < g_shard_ctx->table_count; i++) {
    if (strcmp(g_shard_ctx->tables[i].logic_table, logic_table) == 0) {
      tbl = &g_shard_ctx->tables[i];
      break;
    }
  }
  if (!tbl) {
    mysql_mutex_unlock(&g_shard_ctx->mutex);
    DBUG_RETURN(1);
  }
  // 简单hash分片
  unsigned int hash = 0;
  for (const char *p = shard_key_value; *p; p++) hash = hash * 31 + *p;
  int shard_idx = hash % tbl->shard_count;
  if (out_node_id) *out_node_id = strdup(tbl->nodes[shard_idx].node_id);
  if (out_physical_table) *out_physical_table = strdup(tbl->physical_tables[shard_idx]);
  mysql_mutex_unlock(&g_shard_ctx->mutex);
  DBUG_RETURN(0);
}

// SQL重写：将逻辑SQL重写为物理分片SQL
int nuxx_shard_rewrite_sql(THD *thd, const char *logic_sql, const char *logic_table,
                          const char *shard_key_value, String *out_sql)
{
  DBUG_ENTER("nuxx_shard_rewrite_sql");
  char *node_id = NULL;
  char *physical_table = NULL;
  if (nuxx_shard_route(thd, logic_table, shard_key_value, &node_id, &physical_table) != 0) {
    DBUG_RETURN(1);
  }
  // 简单替换逻辑表为物理表
  String sql_buf;
  sql_buf.copy(logic_sql, strlen(logic_sql), &my_charset_utf8_general_ci);
  sql_buf.replace_all(logic_table, strlen(logic_table), physical_table, strlen(physical_table));
  out_sql->copy(sql_buf.ptr(), sql_buf.length(), &my_charset_utf8_general_ci);
  if (node_id) my_free(node_id);
  if (physical_table) my_free(physical_table);
  DBUG_RETURN(0);
}

// 分片元数据加载/保存（简化为无操作）
int nuxx_shard_load_metadata(THD *thd) { return 0; }
int nuxx_shard_save_metadata(THD *thd) { return 0; }

// 分片统计信息
void nuxx_shard_stats(THD *thd, String *result)
{
  if (!g_shard_ctx) return;
  mysql_mutex_lock(&g_shard_ctx->mutex);
  char buffer[512];
  my_snprintf(buffer, sizeof(buffer),
              "{\"enable_sharding\":%s,\"table_count\":%d,\"max_shard_count\":%d}",
              g_shard_ctx->config.enable_sharding ? "true" : "false",
              g_shard_ctx->table_count,
              g_shard_ctx->config.max_shard_count);
  mysql_mutex_unlock(&g_shard_ctx->mutex);
  result->copy(buffer, strlen(buffer), &my_charset_utf8_general_ci);
}

// 设置分片配置
int nuxx_shard_set_config(THD *thd, const char *config_json)
{
  // 这里简化处理，实际需要解析JSON配置
  if (!g_shard_ctx || !config_json) return 1;
  return 0;
} 