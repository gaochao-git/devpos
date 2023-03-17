import socket
from utils.enc_sm4 import PySM4
import logging
logger = logging.getLogger('devops')

# 实例化加解密
py_sm4 = PySM4()

# 获取本机器ip来决定使用哪个配置文件
try:
    csock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    csock.connect(('8.8.8.8',80))
    (ip, port) = csock.getsockname()
    csock.close()
except socket.error as e:
    logger.error(str(e))
pro_host_list = ['123.249.100.254']
if ip in pro_host_list:
    django_database_host = '123.249.100.254'
    django_database_port = 3306
    django_database_user = 'gaochao'
    django_database_pass = py_sm4.dec_sm4('627e679465395e8fd1b3cf68a4c25814')
    inception_host = '123.249.100.254'
    inception_port = 6660
    inception_backup_host = '123.249.100.254'
    inception_backup_port = 3306
    inception_backup_user = 'gaochao'
    inception_backup_pass = py_sm4.dec_sm4('627e679465395e8fd1b3cf68a4c25814')
else:
    django_database_host = '123.249.100.254'
    django_database_port = 3306
    django_database_user = 'gaochao'
    django_database_pass = py_sm4.dec_sm4('627e679465395e8fd1b3cf68a4c25814')
    inception_host = '127.0.0.1'
    inception_port = 6660
    inception_backup_host = '123.249.100.254'
    inception_backup_port = 3306
    inception_backup_user = 'gaochao'
    inception_backup_pass = py_sm4.dec_sm4('627e679465395e8fd1b3cf68a4c25814')

CONNECT_INFO = {
    # 项目数据库配置
    'django_database_user':django_database_user,
    'django_database_pass':django_database_pass,
    'django_database_host': django_database_host,
    'django_database_port': django_database_port,
    # inception审核服务地址
    'inception_host': inception_host,
    'inception_port': inception_port,
    # inception回滚语句存放地址
    'inception_backup_host': inception_backup_host,
    'inception_backup_port': inception_backup_port
}