from ansible.plugins.callback import CallbackBase
import logging
logger = logging.getLogger('devops')


class ResultsCollector(CallbackBase):
    """
    playbook callback
    """
    def v2_runner_on_ok(self, result):
        host = result._host
        # logger.info('ok: [%s],result:%s' % (host,result._result))
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