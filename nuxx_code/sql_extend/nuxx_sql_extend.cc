/*Time 2022-xx-xx*/
/*Auther gaochao*/

#include "nuxx_sql_extend.h"
#include "sql_class.h"
#include "item.h"
#include "item_func.h"
#include "sql_string.h"
#include "my_sys.h"
#include "m_string.h"
#include <time.h>
#include <sys/time.h>

/**
 * NUXX SQL 扩展实现文件，实现自定义 SQL 函数。
 */

// 初始化扩展（如有需要可注册函数等）
int nuxx_sql_extend_init(THD *thd)
{
  DBUG_ENTER("nuxx_sql_extend_init");
  // 这里可做初始化工作
  DBUG_RETURN(0);
}

// 清理扩展
int nuxx_sql_extend_cleanup(THD *thd)
{
  DBUG_ENTER("nuxx_sql_extend_cleanup");
  // 这里可做清理工作
  DBUG_RETURN(0);
}

// 系统信息函数实现，返回 JSON 格式的系统信息
String *Item_func_nuxx_sysinfo::val_str(String *str)
{
  DBUG_ENTER("Item_func_nuxx_sysinfo::val_str");
  // 获取当前线程、时间等信息
  char buffer[1024];
  struct timeval tv;
  gettimeofday(&tv, NULL);
  my_snprintf(buffer, sizeof(buffer),
              "{\"function\":\"nuxx_sysinfo\","
              "\"timestamp\":%ld.%06ld,"
              "\"thread_id\":%lu,"
              "\"mysql_version\":\"%s\"}",
              tv.tv_sec, tv.tv_usec,
              current_thd->thread_id(),
              MYSQL_SERVER_VERSION);
  str->copy(buffer, strlen(buffer), &my_charset_utf8_general_ci);
  null_value = false;
  DBUG_RETURN(str);
}

void Item_func_nuxx_sysinfo::fix_length_and_dec()
{
  max_length = 1024;
  decimals = 0;
}

// 高精度时间戳函数实现
String *Item_func_nuxx_timestamp::val_str(String *str)
{
  DBUG_ENTER("Item_func_nuxx_timestamp::val_str");
  struct timeval tv;
  struct tm *tm_info;
  char buffer[64];
  gettimeofday(&tv, NULL);
  tm_info = localtime(&tv.tv_sec);
  my_snprintf(buffer, sizeof(buffer),
              "%04d-%02d-%02d %02d:%02d:%02d.%06ld",
              tm_info->tm_year + 1900,
              tm_info->tm_mon + 1,
              tm_info->tm_mday,
              tm_info->tm_hour,
              tm_info->tm_min,
              tm_info->tm_sec,
              tv.tv_usec);
  str->copy(buffer, strlen(buffer), &my_charset_utf8_general_ci);
  null_value = false;
  DBUG_RETURN(str);
}

void Item_func_nuxx_timestamp::fix_length_and_dec()
{
  max_length = 64;
  decimals = 0;
}

// 字符串操作函数实现
String *Item_func_nuxx_string_ops::val_str(String *str)
{
  DBUG_ENTER("Item_func_nuxx_string_ops::val_str");
  if (arg_count < 2)
  {
    null_value = true;
    DBUG_RETURN(NULL);
  }
  String *input_str = args[0]->val_str(str);
  String *operation = args[1]->val_str(str);
  if (args[0]->null_value || args[1]->null_value)
  {
    null_value = true;
    DBUG_RETURN(NULL);
  }
  String result;
  const char *op = operation->c_ptr_safe();
  // 根据操作类型处理字符串
  if (strcasecmp(op, "reverse") == 0)
  {
    result.copy(input_str->ptr(), input_str->length(), input_str->charset());
    result.reverse();
  }
  else if (strcasecmp(op, "upper") == 0)
  {
    result.copy(input_str->ptr(), input_str->length(), input_str->charset());
    result.to_upper();
  }
  else if (strcasecmp(op, "lower") == 0)
  {
    result.copy(input_str->ptr(), input_str->length(), input_str->charset());
    result.to_lower();
  }
  else
  {
    result.copy(input_str->ptr(), input_str->length(), input_str->charset());
  }
  str->copy(result.ptr(), result.length(), result.charset());
  null_value = false;
  DBUG_RETURN(str);
}

void Item_func_nuxx_string_ops::fix_length_and_dec()
{
  max_length = args[0]->max_length;
  decimals = 0;
}

// 数学运算函数实现
// 支持 add/subtract/multiply/divide/power/modulo
// 例如 nuxx_math(3, 2, 'add')
double Item_func_nuxx_math::val_real()
{
  DBUG_ENTER("Item_func_nuxx_math::val_real");
  if (arg_count < 3)
  {
    null_value = true;
    DBUG_RETURN(0.0);
  }
  double val1 = args[0]->val_real();
  double val2 = args[1]->val_real();
  String *operation = args[2]->val_str(&tmp_value);
  if (args[0]->null_value || args[1]->null_value || args[2]->null_value)
  {
    null_value = true;
    DBUG_RETURN(0.0);
  }
  const char *op = operation->c_ptr_safe();
  double result = 0.0;
  if (strcasecmp(op, "add") == 0)
    result = val1 + val2;
  else if (strcasecmp(op, "subtract") == 0)
    result = val1 - val2;
  else if (strcasecmp(op, "multiply") == 0)
    result = val1 * val2;
  else if (strcasecmp(op, "divide") == 0)
  {
    if (val2 != 0.0)
      result = val1 / val2;
    else
    {
      null_value = true;
      DBUG_RETURN(0.0);
    }
  }
  else if (strcasecmp(op, "power") == 0)
    result = pow(val1, val2);
  else if (strcasecmp(op, "modulo") == 0)
    result = fmod(val1, val2);
  else
    result = val1;
  null_value = false;
  DBUG_RETURN(result);
}

void Item_func_nuxx_math::fix_length_and_dec()
{
  decimals = NOT_FIXED_DEC;
} 