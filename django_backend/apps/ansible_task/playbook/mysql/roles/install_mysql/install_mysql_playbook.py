from ansible.parsing.dataloader import DataLoader
from ansible.vars.manager import VariableManager
from ansible.inventory.manager import InventoryManager
from ansible.executor.playbook_executor import PlaybookExecutor
from ansible import context
from ansible.module_utils.common.collections import ImmutableDict
import json
import random
from apps.ansible_task.playbook.playbook_common import ResultsCollector
import logging
logger = logging.getLogger('devops')


def generate_server_id(host):
    """
    获取mysql的server_id
    :param host:
    :return:
    """
    return random.randint(100, 10000) + int(host.split('.')[-1])


def install_mysql(playbook_path, submit_uuid, topo_source, mysql_version):
    topo_list = topo_source.split('\n')
    sources = ""
    for topo_item in topo_list:
        instance = topo_item.split("=>")[0]
        sources = sources + instance.split('_')[0] + ','

    loader = DataLoader()
    inventory = InventoryManager(loader=loader, sources=sources)
    variable_manager = VariableManager(loader=loader, inventory=inventory)
    variable_manager.extra_vars['mysql_version'] = mysql_version
    # 给host设置变量
    for topo_item in topo_list:
        ins = topo_item.split("=>")[0]
        host = ins.split('_')[0]
        port = ins.split('_')[1]
        variable_manager.set_host_variable(host=host, varname='mysql_server_id', value=generate_server_id(host))
        variable_manager.set_host_variable(host=host, varname='mysql_port', value=port)
        if len(topo_item.split("=>")) == 1:
            variable_manager.set_host_variable(host=host, varname='mysql_role', value='master')
            variable_manager.set_host_variable(host=host, varname='master_ip', value='')
            variable_manager.set_host_variable(host=host, varname='master_port', value='')
        elif len(topo_item.split("=>")) == 2:
            master_ip = topo_item.split("=>")[1].split('_')[0]
            master_port = topo_item.split("=>")[1].split('_')[1]
            variable_manager.set_host_variable(host=host, varname='mysql_role', value='slave')
            variable_manager.set_host_variable(host=host, varname='master_ip', value=master_ip)
            variable_manager.set_host_variable(host=host, varname='master_port', value=master_port)
        # host = inventory.get_host(hostname=host)
        # host_vars = variable_manager.get_vars(host=host)
        # print(host_vars)

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
        passwords=None,
    )
    playbook._tqm._stdout_callback = ResultsCollector(submit_uuid)
    result = playbook.run()
    print("playbook执行结果:%s" % result)