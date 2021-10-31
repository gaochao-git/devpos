from enum import Enum


class StatusCode(Enum):
    """状态码枚举类"""
    OK = (200, '成功')
    ERROR = (1000, '动态填写')
    ERR_NOT_LOGIN = (1201, '用户名未登陆')
    ERR_LOGIN_EXPIRE = (1202, '登陆过期')
    ERR_LOGIN_FAIL = (1203, '登陆失败')
    PARAM_ERR = (2201, '参数错误')
    ERR_DB = (2202, '数据库错误')

    @property
    def code(self):
        """获取状态码"""
        return self.value[0]

    @property
    def errmsg(self):
        """获取状态码信息"""
        return self.value[1]