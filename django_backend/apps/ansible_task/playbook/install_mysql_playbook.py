from collections import namedtuple
from ansible.parsing.dataloader import DataLoader
from ansible.vars.manager import VariableManager
from ansible.inventory.manager import InventoryManager
from ansible.executor.playbook_executor import PlaybookExecutor
from ansible import context
from ansible.module_utils.common.collections import ImmutableDict

loader = DataLoader()
passwords = dict()
host_list = ['47.104.2.74', '47.104.2.75']
sources = ','.join(host_list)
if len(host_list) == 1:
    sources += ','
inventory = InventoryManager(loader=loader, sources=sources)
variable_manager = VariableManager(loader=loader, inventory=inventory)


context.CLIARGS = ImmutableDict(connection='smart', module_path=['/to/mymodules', '/usr/share/ansible'], forks=10,
                                become=None,
                                become_method=None, become_user=None, check=False, diff=False, remote_user='root',
                                verbosity=0,syntax=None,start_at_task=None)
def playbook_run(playbook_path):
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
    playbook_run(playbook_path=['/Users/gaochao/gaochao-git/gaochao_repo/devpos/django_backend/apps/ansible_task/playbook/install_mysql.yml'])