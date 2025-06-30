/*Time 2022-xx-xx*/
/*Auther gaochao*/

#ifndef NUXX_STORAGE_INCLUDED
#define NUXX_STORAGE_INCLUDED

#include "my_global.h"
#include "sql_class.h"
#include "handler.h"
#include "table.h"

/**
 * 自定义存储引擎扩展头文件
 * 实现高性能的内存存储引擎
 */

// 存储引擎配置
struct nuxx_storage_config {
  size_t max_memory_size;      // 最大内存使用量
  bool enable_compression;     // 是否启用压缩
  bool enable_persistence;     // 是否启用持久化
  char *data_file_path;        // 数据文件路径
  int flush_interval;          // 刷新间隔(秒)
};

// 存储引擎上下文
struct nuxx_storage_context {
  nuxx_storage_config config;
  void *memory_pool;           // 内存池
  void *index_tree;            // 索引树
  ulonglong total_records;     // 总记录数
  ulonglong memory_used;       // 已使用内存
  mysql_mutex_t mutex;         // 互斥锁
};

// 初始化存储引擎扩展
int nuxx_storage_init(THD *thd);

// 清理存储引擎扩展
int nuxx_storage_cleanup(THD *thd);

// 创建表
int nuxx_storage_create_table(THD *thd, const char *table_name, 
                             TABLE *table, HA_CREATE_INFO *create_info);

// 删除表
int nuxx_storage_drop_table(THD *thd, const char *table_name);

// 插入记录
int nuxx_storage_insert_record(THD *thd, const char *table_name, 
                              uchar *record, uint length);

// 更新记录
int nuxx_storage_update_record(THD *thd, const char *table_name,
                              uchar *old_record, uchar *new_record);

// 删除记录
int nuxx_storage_delete_record(THD *thd, const char *table_name, uchar *record);

// 获取存储引擎统计信息
void nuxx_get_storage_stats(THD *thd, String *result);

// 设置存储引擎配置
int nuxx_set_storage_config(THD *thd, const char *config_json);

// 内存管理函数
void *nuxx_storage_alloc(size_t size);
void nuxx_storage_free(void *ptr);

// 索引操作函数
int nuxx_storage_index_insert(const char *table_name, const char *key, void *value);
void *nuxx_storage_index_lookup(const char *table_name, const char *key);
int nuxx_storage_index_delete(const char *table_name, const char *key);

#endif /* NUXX_STORAGE_INCLUDED */ 