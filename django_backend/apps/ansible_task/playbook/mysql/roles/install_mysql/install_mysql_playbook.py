from ansible.parsing.dataloader import DataLoader
from ansible.vars.manager import VariableManager
from ansible.inventory.manager import InventoryManager
from ansible.executor.playbook_executor import PlaybookExecutor
from ansible import context
from ansible.module_utils.common.collections import ImmutableDict
import json
from ansible.plugins.callback import CallbackBase
import logging
logger = logging.getLogger('devops')

class ResultsCollector(CallbackBase):
    def v2_runner_on_ok(self, result):
        host = result._host
        logger.info('ok: [%s]' % host)

    def v2_playbook_on_no_hosts_matched(self):
        self.output = "skipping: No match hosts."

    def v2_playbook_on_no_hosts_remaining(self):
        print('remaining')

    def v2_playbook_on_task_start(self, task, is_conditional):
        logger.info('%s' % task)

    def v2_playbook_on_play_start(self, play):
        logger.info('PLAY [%s]' % play)

    def v2_playbook_on_stats(self, stats):
        """
        192.168.1.31 : ok=5    changed=3    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
        :param stats:
        :return:
        """
        logger.info('PLAY RECAP ********************************')
        hosts = sorted(stats.processed.keys())
        for h in hosts:
            exec_ret = {}
            t = stats.summarize(h)
            exec_ret[h] = {"ok": t['ok'],"changed": t['changed'],"unreachable": t['unreachable'],"skipped": t['skipped'],"failed": t['failures']}
            logger.info(exec_ret)

    def v2_runner_on_failed(self, result, ignore_errors=False):
        host = result._host
        logger.info('FAILED [%s] =>%s' % (host, result._result))

    def v2_runner_on_unreachable(self, result):
        host = result._host
        logger.info('UNREACHABLE[%s] =>%s' % (host, result._result))


def install_mysql(playbook_path, sources, port, version):
    print("开始调用playbook")
    playbook_run(playbook_path, sources, port, version)


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
        passwords=None,
    )
    playbook._tqm._stdout_callback = ResultsCollector()
    result = playbook.run()
    print(result)
    return result


if __name__ == '__main__':
    host_list = ['47.104.2.74', '47.104.2.75']
    sources = ','.join(host_list)
    port = 3310
    version = 'mysql5722'
    playbook_path = ['/Users/gaochao/gaochao-git/gaochao_repo/devpos/django_backend/apps/ansible_task/playbook/mysql/roles/install_mysql/task/install_mysql.yml']
    playbook_run(playbook_path, sources, port, version)