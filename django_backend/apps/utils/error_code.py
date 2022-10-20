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
    ERR_API = (5003, 'api disabled')

    @property
    def code(self):
        """获取状态码"""
        return self.value[0]

    @property
    def msg(self):
        """获取状态码信息"""
        return self.value[1]


def err_goto_exit(err_msg, err_code=StatusCode.ERR_COMMON.code):
    """
    抛出异常，减少错误场景下多层级别返回response
    这个异常信息msg会被my_middleware中的process_exception捕获并返回给客户端
    不直接使用raise Exception(str)是因为封装成公共方法便于后续功能扩展
    :param err_msg:
    :param err_code:
    :return:
    """
    err_msg = 'err_goto_exit' + ":" + err_msg
    raise Exception(err_msg, err_code)