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
    def __init__(self, submit_uuid, deploy_topos, deploy_version):
        self.topo_source = deploy_topos
        self.mysql_version = deploy_version
        self.submit_uuid = submit_uuid
        self.playbook_path = ['/Users/gaochao/gaochao-git/gaochao_repo/devpos/django_backend/apps/ansible_task/playbook/mysql/roles/install_mysql/task/install_mysql.yml']

    def task_run(self):
        current_process()._config = {'semprefix': '/mp'}   # 不加这一行通过celery调用ansible会报`AttributeError: 'Worker' object has no attribute '_config'``
        install_mysql_playbook.install_mysql(self.playbook_path, self.submit_uuid, self.topo_source, self.mysql_version)
