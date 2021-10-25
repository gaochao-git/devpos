from ansible.parsing.dataloader import DataLoader
from ansible.vars.manager import VariableManager
from ansible.inventory.manager import InventoryManager
from ansible.executor.playbook_executor import PlaybookExecutor
from ansible import context
from ansible.module_utils.common.collections import ImmutableDict
import json


def install_mysql(request):
    playbook_path = ['/Users/gaochao/gaochao-git/gaochao_repo/devpos/django_backend/apps/ansible_task/playbook/mysql/roles/install_mysql/task/install_mysql.yml']
    print(request.body)
    request_body = json.loads(str(request.body, encoding="utf-8"))
    mysql_port = request_body.get('port')
    mysql_version = request_body.get('version')
    host_list = ['47.104.2.74', '47.104.2.75']
    sources = ','.join(host_list)
    if len(host_list) == 1: sources += ','
    playbook_run(playbook_path, sources, mysql_port, mysql_version)


def playbook_run(playbook_path, sources, port, version):
    loader = DataLoader()
    inventory = InventoryManager(loader=loader, sources=sources)
    variable_manager = VariableManager(loader=loader, inventory=inventory)
    variable_manager.extra_vars['mysql_port'] = port
    variable_manager.extra_vars['mysql_version'] = version
    context.CLIARGS = ImmutableDict(connection='smart',
                                    module_path=['/anaconda2/envs/py3/lib/python3.6/site-packages/ansible/modules',
                                                 '/usr/share/ansible'],
                                    forks=10, become=None, become_method=None, become_user=None, check=False,
                                    diff=False, remote_user='root', verbosity=0, syntax=None, start_at_task=None)
    playbook = PlaybookExecutor(
        playbooks=playbook_path,
        inventory=inventory,
        variable_manager=variable_manager,
        loader=loader,
        passwords=None
    )
    result = playbook.run()
    return result


if __name__ == '__main__':
    host_list = ['47.104.2.74', '47.104.2.75']
    sources = ','.join(host_list)
    port = 3310
    version = 'mysql5722'
    playbook_path = ['/Users/gaochao/gaochao-git/gaochao_repo/devpos/django_backend/apps/ansible_task/playbook/mysql/roles/install_mysql/task/install_mysql.yml']
    playbook_run(playbook_path, sources, port, version)