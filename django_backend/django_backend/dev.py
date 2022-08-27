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
        'cursorclass': pymysql.cursors.DictCursor,
        'AUTOCOMMIT': True,  # pymysql默认AUTOCOMMIT为False,如果没有该参数django会将其设置为True,如果指定该参数django会忽略该参数
        'CONN_MAX_AGE': 0, # 默认值0,每个请求进来重新关闭建立mysql连接,定时任务不生效
        'OPTIONS': {
            'ssl': {
                'ca': None,
                'capath': None
            }
        }
    }
}

################# celery配置 ##################
# python manage.py celery  beat -S djcelery.schedulers.DatabaseScheduler -l debug  -f logs/celery_beat.log
# python manage.py celery  beat  -l debug  -f logs/celery_beat.log  # 启动定时任务
# python manage.py celery worker -E -c 4 --loglevel=INFO -f logs/celery_worker.log -Q default --purge  # 启动消费worker
# python manage.py celery worker -E -c 4 --loglevel=DEBUG -f logs/celery_worker.log -Q async_task --purge -n async_worker1
# python manage.py celerycam -l debug -f logs/celery_cam.log  # 启动监控各个任务状态及结果的进程
djcelery.setup_loader()
CELERY_IMPORTS= ('apps.celery_task.tasks',)
CELERY_ACCEPT_CONTENT = ['application/json',]
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_REDIRECT_STDOUTS_LEVEL = 'INFO'        #标准输出和标准错误输出的日志级别。可以是DEBUG, INFO, WARNING, ERROR, or CRITICAL,默认为WARNING
CELERY_TIMEZONE = 'Asia/Shanghai'
BROKER_URL = 'redis://:fffjjj@47.104.2.74:6379/0'
# CELERY_RESULT_BACKEND = 'redis://:fffjjj@47.104.2.74:6379/1' # 任务结果存入redis
CELERY_RESULT_BACKEND = 'djcelery.backends.database.DatabaseBackend'  #任务结果存到数据库celery_taskmeta表中,TiDB不支持该类型
CELERY_TASK_TRACK_STARTED = True
CELERY_ENABLE_UTC = False
USE_TZ = False
# https://docs.celeryq.dev/en/latest/userguide/configuration.html?highlight=CELERYBEAT_SCHEDULE#new-lowercase-settings
# https://pypi.org/project/django-celery/
CELERYBEAT_SCHEDULER = "djcelery.schedulers.DatabaseScheduler"  # djcelery调度器,定时任务存到django后台数据库中,django后台动态管理
CELERY_SEND_TASK_SENT_EVENT = True
# 定时任务,配置文件方式管理（定时任务支持配置文件与数据库两种管理方式）
# CELERYBEAT_SCHEDULER = 'celery.beat:PersistentScheduler'       # beat默认调度器,Berkeley DB,本地celerybeat-schedule.db文件,使用shelve进行操作
# CELERYBEAT_SCHEDULE_FILENAME = 'celerybeat-schedule.db'       # 存储最近间隔任务
# CELERYBEAT_SCHEDULER = {
#     'check_cluster_health':{
#         "task": "apps.celery_task.cron_collect_mysql_info",
#         "achedule": timedelta(seconds=30),
#         "args": (),
#     },
# }

CELERY_QUEUES = (
    Queue("default", Exchange("default"), routing_key="default"),
    # 异步任务拆分出来
    Queue("async_task", Exchange("async_task"), routing_key="async_task"),
)

# 定义celery路由
CELERY_ROUTES = {
    "app_audit_sql.tasks.inception_split": {"queue": "async_task", "routing_key": "async_task"},
    "app_audit_sql.tasks.inception_check": {"queue": "async_task", "routing_key": "async_task"},
    "app_audit_sql.tasks.inception_execute": {"queue": "async_task", "routing_key": "async_task"},
    "apps.celery_task.tasks.install_mysql": {"queue": "async_task", "routing_key": "async_task"},
}

# SQL审核文件存放路径
upload_base_path = "/Users/gaochao/gaochao-git/gaochao_repo/devpos/django_backend/app_audit_sql/upload"