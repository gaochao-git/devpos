import socket
from apps.utils.enc_dec_pass import decrypt_data
import logging
logger = logging.getLogger('devops')


# 获取本机器ip来决定使用哪个配置文件
try:
    csock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    csock.connect(('8.8.8.8',80))
    (ip, port) = csock.getsockname()
    csock.close()
except socket.error as e:
    logger.error(str(e))

pro_host_list = ['47.104.2.74']
if ip in pro_host_list:
    django_database_host = '47.104.2.74'
    django_database_port = 3306
    django_database_user = 'gaochao'
    django_database_pass = decrypt_data('cPYHTlgHr79ec5Y835tjXQFLgecrFLs/WGW+Wp4gJLZcDGDTWrn27UEFfoCso/Z8h9kNof34wiTMvV/vY6MH5iXSCPbZ423lvYaPrBRO7rgtcWsk0LqrdrRZx/gQblOQSUXDSv3S47O2fox+jK/IO/vGk0YfY7XQGCtQaK4nQzTV/4ijsHhi0j1xb5xs6ATrOy2OWIEQkLZ+QKQmhwWwuu5F3LbdS8QmJplmqI/5k7fdpRanbiZBstkABWMWUjtfSDmnAdddGq3vtVvaUxoIiAPnSZCpkstfpdOn9JDFYiYfIzB3C6fuvzJNkm1zD0mqTaC7xwexnnfXqc3PARcZIA==')
    inception_host = '47.104.2.74'
    inception_port = 6669
    inception_backup_host = '47.104.2.74'
    inception_backup_port = 3306
    inception_backup_user = 'gaochao'
    inception_backup_pass = decrypt_data('cPYHTlgHr79ec5Y835tjXQFLgecrFLs/WGW+Wp4gJLZcDGDTWrn27UEFfoCso/Z8h9kNof34wiTMvV/vY6MH5iXSCPbZ423lvYaPrBRO7rgtcWsk0LqrdrRZx/gQblOQSUXDSv3S47O2fox+jK/IO/vGk0YfY7XQGCtQaK4nQzTV/4ijsHhi0j1xb5xs6ATrOy2OWIEQkLZ+QKQmhwWwuu5F3LbdS8QmJplmqI/5k7fdpRanbiZBstkABWMWUjtfSDmnAdddGq3vtVvaUxoIiAPnSZCpkstfpdOn9JDFYiYfIzB3C6fuvzJNkm1zD0mqTaC7xwexnnfXqc3PARcZIA==')
else:
    django_database_host = '47.104.2.74'
    django_database_port = 3306
    django_database_user = 'gaochao'
    django_database_pass = decrypt_data('cPYHTlgHr79ec5Y835tjXQFLgecrFLs/WGW+Wp4gJLZcDGDTWrn27UEFfoCso/Z8h9kNof34wiTMvV/vY6MH5iXSCPbZ423lvYaPrBRO7rgtcWsk0LqrdrRZx/gQblOQSUXDSv3S47O2fox+jK/IO/vGk0YfY7XQGCtQaK4nQzTV/4ijsHhi0j1xb5xs6ATrOy2OWIEQkLZ+QKQmhwWwuu5F3LbdS8QmJplmqI/5k7fdpRanbiZBstkABWMWUjtfSDmnAdddGq3vtVvaUxoIiAPnSZCpkstfpdOn9JDFYiYfIzB3C6fuvzJNkm1zD0mqTaC7xwexnnfXqc3PARcZIA==')
    inception_host = '47.104.2.74'
    inception_port = 6669
    inception_backup_host = '47.104.2.74'
    inception_backup_port = 3306
    inception_backup_user = 'gaochao'
    inception_backup_pass = decrypt_data('cPYHTlgHr79ec5Y835tjXQFLgecrFLs/WGW+Wp4gJLZcDGDTWrn27UEFfoCso/Z8h9kNof34wiTMvV/vY6MH5iXSCPbZ423lvYaPrBRO7rgtcWsk0LqrdrRZx/gQblOQSUXDSv3S47O2fox+jK/IO/vGk0YfY7XQGCtQaK4nQzTV/4ijsHhi0j1xb5xs6ATrOy2OWIEQkLZ+QKQmhwWwuu5F3LbdS8QmJplmqI/5k7fdpRanbiZBstkABWMWUjtfSDmnAdddGq3vtVvaUxoIiAPnSZCpkstfpdOn9JDFYiYfIzB3C6fuvzJNkm1zD0mqTaC7xwexnnfXqc3PARcZIA==')

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