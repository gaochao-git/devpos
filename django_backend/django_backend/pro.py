import pymysql
pymysql.install_as_MySQLdb()
from datetime import timedelta
from kombu import Exchange,Queue
from .auth_config import CONNECT_INFO
import djcelery

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

################# celery配置 ##################
djcelery.setup_loader()
CELERY_IMPORTS= ('apps.celery_task.tasks',)
CELERY_ACCEPT_CONTENT = ['application/json',]
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERYBEAT_SCHEDULER = 'celery.beat:PersistentScheduler'
CELERY_REDIRECT_STDOUTS_LEVEL = 'INFO'        #标准输出和标准错误输出的日志级别。可以是DEBUG, INFO, WARNING, ERROR, or CRITICAL,默认为WARNING
CELERY_TIMEZONE = 'Asia/Shanghai'
BROKER_URL = 'redis://:fffjjj@47.104.2.74:6379/0'
CELERY_RESULT_BACKEND = 'redis://:fffjjj@47.104.2.74:6379/1'

# 配置定时任务
CELERYBEAT_SCHEDULER = {
    'check_cluster_health':{
        "task": "apps.celery_task.cron_check_cluster_health",
        "achedule": timedelta(seconds=30),
        "args": (),
    },
}
CELERY_QUEUES = (
    Queue("default", Exchange("default"), routing_key="default"),
    # 异步任务拆分出来
    Queue("async_task", Exchange("async_task"), routing_key="async_task"),
)
# 定义celery路由
CELERY_ROUTES = {
    "apps.celery_task.tasks.inception_execute": {"queue": "async_task", "routing_key": "async_task"},
    "apps.celery_task.tasks.inception_check": {"queue": "async_task", "routing_key": "async_task"},
    "apps.celery_task.tasks.install_mysql": {"queue": "async_task", "routing_key": "async_task"},
}

# SQL审核文件存放路径
upload_base_path = "/Users/gaochao/gaochao-git/gaochao_repo/devpos/django_backend/app_audit_sql/upload"