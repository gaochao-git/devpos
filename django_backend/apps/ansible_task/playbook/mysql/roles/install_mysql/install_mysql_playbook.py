from ansible.parsing.dataloader import DataLoader
from ansible.vars.manager import VariableManager
from ansible.inventory.manager import InventoryManager
from ansible.executor.playbook_executor import PlaybookExecutor
from ansible import context
from ansible.module_utils.common.collections import ImmutableDict
from apps.ansible_task.playbook.playbook_common import ResultsCollector
from apps.utils import db_helper
from apps.utils.common import generate_server_id
import logging
logger = logging.getLogger('devops')


def install_mysql(playbook_path, submit_uuid, topo_source, mysql_version):
    """
    调用ansible api执行playbook
    :param playbook_path:
    :param submit_uuid:
    :param topo_source:
    :param mysql_version:
    :return:
    """
    # 生成sources
    topo_list = topo_source.split('\n')
    sources = ""
    for topo_item in topo_list:
        instance = topo_item.split("=>")[0]
        sources = sources + instance.split('_')[0] + ','
    # 通用设置
    logger.info("通用设置")
    context.CLIARGS = ImmutableDict(connection='smart', module_path=['/to/modules', '/usr/share/ansible'],
                                    forks=10, become=None, become_method=None, become_user=None, check=False,
                                    diff=False, remote_user='root', verbosity=0, syntax=None, start_at_task=None)
    loader = DataLoader()
    inventory = InventoryManager(loader=loader, sources=sources)
    variable_manager = VariableManager(loader=loader, inventory=inventory)
    variable_manager.extra_vars['mysql_version'] = mysql_version
    # 给host设置变量
    logger.info("开始给host设置变量")
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

    # 初始化playbook
    logger.info("初始化playbook")
    playbook = PlaybookExecutor(
        playbooks=playbook_path,
        inventory=inventory,
        variable_manager=variable_manager,
        loader=loader,
        passwords=None,
    )
    # 替换自定义的callback
    playbook._tqm._stdout_callback = ResultsCollector(submit_uuid)
    # 设置工单状态为已执行
    logger.info("设置工单状态为已执行")
    sql = "update deploy_mysql_submit_info set submit_execute=2 where submit_uuid='{}'".format(submit_uuid)
    db_helper.dml(sql)
    # 执行playbook
    logger.info("执行playbook")
    ret_code = playbook.run()
    if ret_code == 0:
        sql = "update deploy_mysql_submit_info set deploy_status=3 where submit_uuid='{}'".format(submit_uuid)
        logger.info("playbook执行成功:%s" % ret_code)
    else:
        sql = "update deploy_mysql_submit_info set deploy_status=4 where submit_uuid='{}'".format(submit_uuid)
        logger.error("playbook执行失败:%s" % ret_code)
    logger.info("playbook执行完毕,更改执行结果")
    db_helper.dml(sql)
