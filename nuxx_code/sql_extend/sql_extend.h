/*Time 2022-xx-xx*/
/*Auther gaochao*/

#ifndef NUXX_SQL_EXTEND_INCLUDED
#define NUXX_SQL_EXTEND_INCLUDED

#include "my_global.h"
#include "sql_class.h"
#include "item.h"
#include "item_func.h"

class THD;

/**
 * NUXX SQL 扩展头文件，声明自定义 SQL 函数和初始化/清理接口。
 */

// 初始化扩展
int nuxx_sql_extend_init(THD *thd);
// 清理扩展
int nuxx_sql_extend_cleanup(THD *thd);

// 系统信息函数
class Item_func_nuxx_sysinfo : public Item_str_func
{
public:
  Item_func_nuxx_sysinfo(List<Item> &list) : Item_str_func(list) {}
  const char *func_name() const { return "nuxx_sysinfo"; }
  String *val_str(String *str); // 获取系统信息
  void fix_length_and_dec();    // 设置返回长度
};

// 高精度时间戳函数
class Item_func_nuxx_timestamp : public Item_str_func
{
public:
  Item_func_nuxx_timestamp(List<Item> &list) : Item_str_func(list) {}
  const char *func_name() const { return "nuxx_timestamp"; }
  String *val_str(String *str); // 获取时间戳
  void fix_length_and_dec();
};

// 字符串操作函数
class Item_func_nuxx_string_ops : public Item_str_func
{
public:
  Item_func_nuxx_string_ops(List<Item> &list) : Item_str_func(list) {}
  const char *func_name() const { return "nuxx_string_ops"; }
  String *val_str(String *str); // 字符串操作
  void fix_length_and_dec();
};

// 数学运算函数
class Item_func_nuxx_math : public Item_real_func
{
public:
  Item_func_nuxx_math(List<Item> &list) : Item_real_func(list) {}
  const char *func_name() const { return "nuxx_math"; }
  double val_real();           // 数学运算
  void fix_length_and_dec();
};

#endif /* NUXX_SQL_EXTEND_INCLUDED */ 