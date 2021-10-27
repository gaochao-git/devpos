from ansible.plugins.callback import CallbackBase
import logging
logger = logging.getLogger('devops')
from apps.utils import db_helper
import pymysql
import json


class ResultsCollector(CallbackBase):
    """
    playbook callback
    """
    def __init__(self, submit_uuid):
        self.submit_uuid = submit_uuid

    def write_log_to_db(self, result, task_status=""):
        sql = """
                insert into deploy_mysql_log(submit_uuid,deploy_log,step_task_status,create_time,update_time)
                                      values('{}','{}','{}',now(),now())
              """.format(self.submit_uuid,result, task_status)
        db_helper.dml(sql)

    def v2_runner_on_ok(self, result):
        host = result._host
        # logger.info('ok: [%s],result:%s' % (host,result._result))
        # message = 'ok: [%s]' % host
        if 'changed' in result._result.keys():
            message = '  ok: [%s],changed:[%s],result:%s' % (host,result._result['changed'],result._result)
        else:
            message = '  ok: [%s],result:%s' % (host, result._result)
        logger.info(message)
        self.write_log_to_db(pymysql.escape_string(message),"ok")

    def v2_playbook_on_no_hosts_matched(self):
        self.output = "skipping: No match hosts."

    def v2_playbook_on_no_hosts_remaining(self):
        print('remaining')

    def v2_playbook_on_task_start(self, task, is_conditional):
        message = '%s' % task
        logger.info(message)
        self.write_log_to_db(pymysql.escape_string(message))

    def v2_playbook_on_play_start(self, play):
        message = 'PLAY [%s]' % play
        logger.info(message)
        self.write_log_to_db(pymysql.escape_string(message))

    def v2_playbook_on_stats(self, stats):
        """
        192.168.1.31 : ok=5    changed=3    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
        :param stats:
        :return:
        """
        logger.info('PLAY RECAP ********************************')
        self.write_log_to_db('PLAY RECAP ********************************')
        hosts = sorted(stats.processed.keys())
        for h in hosts:
            exec_ret = {}
            t = stats.summarize(h)
            exec_ret[h] = {"ok": t['ok'],"changed": t['changed'],"unreachable": t['unreachable'],"skipped": t['skipped'],"failed": t['failures']}
            logger.info(exec_ret)
            message = '  ' + str( exec_ret)
            self.write_log_to_db(pymysql.escape_string(message))

    def v2_runner_on_failed(self, result, ignore_errors=False):
        host = result._host
        message = '  FAILED [%s] result=>%s' % (host, result._result)
        logger.error(message)
        self.write_log_to_db(pymysql.escape_string(message), "fail")

    def v2_runner_on_unreachable(self, result):
        host = result._host
        message = '  UNREACHABLE[%s] result=>%s' % (host, result._result)
        logger.info(message)
        self.write_log_to_db(pymysql.escape_string(message), "unreachable")