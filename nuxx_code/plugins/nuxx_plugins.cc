/*Time 2022-xx-xx*/
/*Auther gaochao*/

#include "nuxx_plugins.h"
#include "sql_class.h"
#include "sql_plugin.h"
#include "my_sys.h"
#include "m_string.h"
#include "my_dir.h"

/**
 * 插件扩展实现文件
 * 实现动态插件加载和管理功能
 */

// 全局插件管理器上下文
static nuxx_plugins_context *g_plugins_ctx = NULL;

// 初始化插件扩展
int nuxx_plugins_init(THD *thd)
{
  DBUG_ENTER("nuxx_plugins_init");
  
  // 分配全局上下文
  g_plugins_ctx = (nuxx_plugins_context *)my_malloc(
    sizeof(nuxx_plugins_context), MYF(MY_ZEROFILL));
  
  if (!g_plugins_ctx) {
    DBUG_RETURN(1);
  }
  
  // 初始化插件管理器
  g_plugins_ctx->max_plugins = 100;
  g_plugins_ctx->plugin_count = 0;
  g_plugins_ctx->plugin_dir = strdup("/usr/local/mysql/lib/plugin");
  
  // 分配插件列表
  g_plugins_ctx->plugins = (nuxx_plugin_info *)my_malloc(
    sizeof(nuxx_plugin_info) * g_plugins_ctx->max_plugins, MYF(MY_ZEROFILL));
  
  if (!g_plugins_ctx->plugins) {
    my_free(g_plugins_ctx->plugin_dir);
    my_free(g_plugins_ctx);
    g_plugins_ctx = NULL;
    DBUG_RETURN(1);
  }
  
  // 初始化互斥锁
  mysql_mutex_init(key_mutex_nuxx_plugins, &g_plugins_ctx->mutex, MY_MUTEX_INIT_FAST);
  
  DBUG_RETURN(0);
}

// 清理插件扩展
int nuxx_plugins_cleanup(THD *thd)
{
  DBUG_ENTER("nuxx_plugins_cleanup");
  
  if (g_plugins_ctx) {
    mysql_mutex_lock(&g_plugins_ctx->mutex);
    
    // 卸载所有已加载的插件
    for (uint i = 0; i < g_plugins_ctx->plugin_count; i++) {
      if (g_plugins_ctx->plugins[i].is_loaded) {
        // 这里应该调用插件的卸载函数
        if (g_plugins_ctx->plugins[i].plugin_handle) {
          // dlclose(g_plugins_ctx->plugins[i].plugin_handle);
        }
      }
      
      // 释放插件信息内存
      if (g_plugins_ctx->plugins[i].plugin_name)
        my_free(g_plugins_ctx->plugins[i].plugin_name);
      if (g_plugins_ctx->plugins[i].plugin_path)
        my_free(g_plugins_ctx->plugins[i].plugin_path);
      if (g_plugins_ctx->plugins[i].version)
        my_free(g_plugins_ctx->plugins[i].version);
      if (g_plugins_ctx->plugins[i].description)
        my_free(g_plugins_ctx->plugins[i].description);
    }
    
    mysql_mutex_unlock(&g_plugins_ctx->mutex);
    
    // 销毁互斥锁
    mysql_mutex_destroy(&g_plugins_ctx->mutex);
    
    // 释放内存
    if (g_plugins_ctx->plugins)
      my_free(g_plugins_ctx->plugins);
    if (g_plugins_ctx->plugin_dir)
      my_free(g_plugins_ctx->plugin_dir);
    
    my_free(g_plugins_ctx);
    g_plugins_ctx = NULL;
  }
  
  DBUG_RETURN(0);
}

// 查找插件
static nuxx_plugin_info *find_plugin(const char *plugin_name)
{
  if (!g_plugins_ctx || !plugin_name) return NULL;
  
  for (uint i = 0; i < g_plugins_ctx->plugin_count; i++) {
    if (g_plugins_ctx->plugins[i].plugin_name &&
        strcmp(g_plugins_ctx->plugins[i].plugin_name, plugin_name) == 0) {
      return &g_plugins_ctx->plugins[i];
    }
  }
  
  return NULL;
}

// 加载插件
int nuxx_plugin_load(THD *thd, const char *plugin_name, const char *plugin_path)
{
  DBUG_ENTER("nuxx_plugin_load");
  
  if (!g_plugins_ctx || !plugin_name || !plugin_path) {
    DBUG_RETURN(1);
  }
  
  // 检查权限
  if (!nuxx_plugin_verify_permissions(thd, plugin_name)) {
    my_error(ER_ACCESS_DENIED_ERROR, MYF(0), "Plugin load permission denied");
    DBUG_RETURN(1);
  }
  
  // 检查依赖
  if (!nuxx_plugin_check_dependencies(plugin_name)) {
    my_error(ER_PLUGIN_IS_NOT_LOADED, MYF(0), "Plugin dependencies not satisfied");
    DBUG_RETURN(1);
  }
  
  mysql_mutex_lock(&g_plugins_ctx->mutex);
  
  // 检查插件是否已存在
  nuxx_plugin_info *existing_plugin = find_plugin(plugin_name);
  if (existing_plugin) {
    if (existing_plugin->is_loaded) {
      mysql_mutex_unlock(&g_plugins_ctx->mutex);
      my_error(ER_PLUGIN_IS_LOADED, MYF(0), plugin_name);
      DBUG_RETURN(1);
    }
  }
  
  // 检查插件数量限制
  if (g_plugins_ctx->plugin_count >= g_plugins_ctx->max_plugins) {
    mysql_mutex_unlock(&g_plugins_ctx->mutex);
    my_error(ER_OUT_OF_RESOURCES, MYF(0), "Too many plugins loaded");
    DBUG_RETURN(1);
  }
  
  // 添加新插件
  uint index = g_plugins_ctx->plugin_count++;
  nuxx_plugin_info *plugin = &g_plugins_ctx->plugins[index];
  
  plugin->plugin_name = strdup(plugin_name);
  plugin->plugin_path = strdup(plugin_path);
  plugin->is_loaded = false;
  plugin->load_time = 0;
  plugin->version = strdup("1.0.0");
  plugin->description = strdup("NUXX Plugin");
  plugin->plugin_handle = NULL;
  
  // 尝试加载插件（这里简化处理）
  // 实际实现中需要使用 dlopen 加载动态库
  plugin->is_loaded = true;
  plugin->load_time = my_micro_time();
  
  mysql_mutex_unlock(&g_plugins_ctx->mutex);
  
  DBUG_RETURN(0);
}

// 卸载插件
int nuxx_plugin_unload(THD *thd, const char *plugin_name)
{
  DBUG_ENTER("nuxx_plugin_unload");
  
  if (!g_plugins_ctx || !plugin_name) {
    DBUG_RETURN(1);
  }
  
  mysql_mutex_lock(&g_plugins_ctx->mutex);
  
  nuxx_plugin_info *plugin = find_plugin(plugin_name);
  if (!plugin) {
    mysql_mutex_unlock(&g_plugins_ctx->mutex);
    my_error(ER_PLUGIN_IS_NOT_LOADED, MYF(0), plugin_name);
    DBUG_RETURN(1);
  }
  
  if (!plugin->is_loaded) {
    mysql_mutex_unlock(&g_plugins_ctx->mutex);
    my_error(ER_PLUGIN_IS_NOT_LOADED, MYF(0), plugin_name);
    DBUG_RETURN(1);
  }
  
  // 卸载插件（这里简化处理）
  // 实际实现中需要调用插件的卸载函数
  if (plugin->plugin_handle) {
    // dlclose(plugin->plugin_handle);
    plugin->plugin_handle = NULL;
  }
  
  plugin->is_loaded = false;
  
  mysql_mutex_unlock(&g_plugins_ctx->mutex);
  
  DBUG_RETURN(0);
}

// 获取插件列表
int nuxx_plugin_list(THD *thd, String *result)
{
  if (!g_plugins_ctx) return 1;
  
  mysql_mutex_lock(&g_plugins_ctx->mutex);
  
  char buffer[4096];
  char *ptr = buffer;
  int len = 0;
  
  len += my_snprintf(ptr + len, sizeof(buffer) - len, "{\"plugins\":[");
  
  for (uint i = 0; i < g_plugins_ctx->plugin_count; i++) {
    if (i > 0) len += my_snprintf(ptr + len, sizeof(buffer) - len, ",");
    
    len += my_snprintf(ptr + len, sizeof(buffer) - len,
                      "{\"name\":\"%s\","
                      "\"path\":\"%s\","
                      "\"loaded\":%s,"
                      "\"version\":\"%s\","
                      "\"description\":\"%s\"}",
                      g_plugins_ctx->plugins[i].plugin_name ?: "",
                      g_plugins_ctx->plugins[i].plugin_path ?: "",
                      g_plugins_ctx->plugins[i].is_loaded ? "true" : "false",
                      g_plugins_ctx->plugins[i].version ?: "",
                      g_plugins_ctx->plugins[i].description ?: "");
  }
  
  len += my_snprintf(ptr + len, sizeof(buffer) - len, "]}");
  
  mysql_mutex_unlock(&g_plugins_ctx->mutex);
  
  result->copy(buffer, len, &my_charset_utf8_general_ci);
  
  return 0;
}

// 获取插件状态
int nuxx_plugin_status(THD *thd, const char *plugin_name, String *result)
{
  if (!g_plugins_ctx || !plugin_name) return 1;
  
  mysql_mutex_lock(&g_plugins_ctx->mutex);
  
  nuxx_plugin_info *plugin = find_plugin(plugin_name);
  if (!plugin) {
    mysql_mutex_unlock(&g_plugins_ctx->mutex);
    return 1;
  }
  
  char buffer[512];
  my_snprintf(buffer, sizeof(buffer),
              "{\"name\":\"%s\","
              "\"loaded\":%s,"
              "\"load_time\":%llu,"
              "\"version\":\"%s\","
              "\"description\":\"%s\"}",
              plugin->plugin_name ?: "",
              plugin->is_loaded ? "true" : "false",
              plugin->load_time,
              plugin->version ?: "",
              plugin->description ?: "");
  
  mysql_mutex_unlock(&g_plugins_ctx->mutex);
  
  result->copy(buffer, strlen(buffer), &my_charset_utf8_general_ci);
  
  return 0;
}

// 设置插件配置
int nuxx_plugin_set_config(THD *thd, const char *plugin_name, const char *config_json)
{
  // 这里简化处理，实际需要解析JSON配置
  if (!g_plugins_ctx || !plugin_name || !config_json) return 1;
  
  // 示例：简单的配置更新
  // 实际实现中需要解析JSON并更新插件配置
  
  return 0;
}

// 插件热更新
int nuxx_plugin_hot_update(THD *thd, const char *plugin_name, const char *new_path)
{
  DBUG_ENTER("nuxx_plugin_hot_update");
  
  if (!g_plugins_ctx || !plugin_name || !new_path) {
    DBUG_RETURN(1);
  }
  
  // 先卸载旧插件
  if (nuxx_plugin_unload(thd, plugin_name) != 0) {
    DBUG_RETURN(1);
  }
  
  // 加载新插件
  int result = nuxx_plugin_load(thd, plugin_name, new_path);
  
  DBUG_RETURN(result);
}

// 插件依赖检查
bool nuxx_plugin_check_dependencies(const char *plugin_name)
{
  // 这里简化处理，实际需要检查插件依赖关系
  // 可以检查系统库、其他插件等依赖
  return true;
}

// 插件权限验证
bool nuxx_plugin_verify_permissions(THD *thd, const char *plugin_name)
{
  // 这里简化处理，实际需要检查用户权限
  // 可以检查 SUPER 权限或其他特定权限
  return true;
} 