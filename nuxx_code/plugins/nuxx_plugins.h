/*Time 2022-xx-xx*/
/*Auther gaochao*/

#ifndef NUXX_PLUGINS_INCLUDED
#define NUXX_PLUGINS_INCLUDED

#include "my_global.h"
#include "sql_class.h"
#include "sql_plugin.h"

/**
 * 插件扩展头文件
 * 实现动态插件加载和管理功能
 */

// 插件信息结构
struct nuxx_plugin_info {
  char *plugin_name;           // 插件名称
  char *plugin_path;           // 插件路径
  void *plugin_handle;         // 插件句柄
  bool is_loaded;              // 是否已加载
  ulonglong load_time;         // 加载时间
  char *version;               // 插件版本
  char *description;           // 插件描述
};

// 插件管理器上下文
struct nuxx_plugins_context {
  nuxx_plugin_info *plugins;   // 插件列表
  uint plugin_count;           // 插件数量
  uint max_plugins;            // 最大插件数
  mysql_mutex_t mutex;         // 互斥锁
  char *plugin_dir;            // 插件目录
};

// 初始化插件扩展
int nuxx_plugins_init(THD *thd);

// 清理插件扩展
int nuxx_plugins_cleanup(THD *thd);

// 加载插件
int nuxx_plugin_load(THD *thd, const char *plugin_name, const char *plugin_path);

// 卸载插件
int nuxx_plugin_unload(THD *thd, const char *plugin_name);

// 获取插件列表
int nuxx_plugin_list(THD *thd, String *result);

// 获取插件状态
int nuxx_plugin_status(THD *thd, const char *plugin_name, String *result);

// 设置插件配置
int nuxx_plugin_set_config(THD *thd, const char *plugin_name, const char *config_json);

// 插件热更新
int nuxx_plugin_hot_update(THD *thd, const char *plugin_name, const char *new_path);

// 插件依赖检查
bool nuxx_plugin_check_dependencies(const char *plugin_name);

// 插件权限验证
bool nuxx_plugin_verify_permissions(THD *thd, const char *plugin_name);

#endif /* NUXX_PLUGINS_INCLUDED */ 