import pymysql
pymysql.install_as_MySQLdb()
from datetime import timedelta
from kombu import Exchange,Queue
from .auth_config import CONNECT_INFO

################# 数据库配置 ##################
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'HOST': CONNECT_INFO['django_database_host'],
        'PORT': CONNECT_INFO['django_database_port'],
        'USER': CONNECT_INFO['django_database_user'],
        'PASSWORD': CONNECT_INFO['django_database_pass'],
        'NAME': 'devops',
        'cursorclass':pymysql.cursors.DictCursor,
        'AUTOCOMMIT':True,           # pymysql默认AUTOCOMMIT为False,如果没有该参数django会将其设置为True,如果指定该参数django会忽略该参数
    }
}