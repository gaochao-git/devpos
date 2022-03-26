from enum import Enum


class StatusCode(Enum):
    """状态码枚举类"""
    OK = (200, 'success')
    ERR_NO_LOGIN = (401, 'no login')
    ERR_LOGIN_EXPIRE = (402, 'login expire')
    ERR_NO_PERMISSION = (403, 'no permission')
    ERR_COMMON = (5000, 'server error')
    ERR_PARAM = (5001, 'param error')
    ERR_DB = (5002, 'db error')

    @property
    def code(self):
        """获取状态码"""
        return self.value[0]

    @property
    def msg(self):
        """获取状态码信息"""
        return self.value[1]