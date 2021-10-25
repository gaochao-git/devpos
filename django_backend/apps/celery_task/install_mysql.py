from apps.utils import db_helper
from django.db import connection
from apps.utils import inception
from apps.dao import audit_sql_dao
from apps.utils import common
import logging
import pymysql
from apps.ansible_task.playbook.mysql.roles.install_mysql import install_mysql_playbook
logger = logging.getLogger('devops')
from multiprocessing import current_process

class InstallMysql:
    def __init__(self, ips, port, version):
        print(ips, port, version)

    def task_run(self):
        current_process()._config = {'semprefix': '/mp'}   # 不加这一行通过celery调用ansible会报`AttributeError: 'Worker' object has no attribute '_config'``
        host_list = ['47.104.2.74', '47.104.2.75']
        sources = ','.join(host_list)
        if len(host_list) == 1: sources += ','
        port = 3310
        version = 'mysql5722'
        playbook_path = ['/Users/gaochao/gaochao-git/gaochao_repo/devpos/django_backend/apps/ansible_task/playbook/mysql/roles/install_mysql/task/install_mysql.yml']
        install_mysql_playbook.install_mysql(playbook_path, sources, port, version)
