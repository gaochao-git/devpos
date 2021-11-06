import celery
from celery.signals import after_task_publish,before_task_publish,celeryd_init
from celery.signals import task_success

"""
celery几种任务信号:https://docs.celeryproject.org/en/latest/userguide/signals.html
djcelery目前调用信号不生效
 * before_task_publish : 任务发布前
 * after_task_publish : 任务发布后
 * task_prerun : 任务执行前
 * task_postrun : 任务执行后
 * task_retry : 任务重试时
 * task_success : 任务成功时
 * task_failure : 任务失败时
 * task_revoked : 任务被撤销或终止时
"""
class MyTaskCallback(celery.Task):
    """
    增加celery回调功能
    """
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """
        任务失败时执行
        """
        print("我执行失败了")

    def on_success(self, retval, task_id, args, kwargs):
        """
        任务成功时执行
        """
        print("我执行成功了:%s" % retval)
        print(retval, task_id, args, kwargs)

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """
        任务重试时执行
        """
        print("我需要重试")

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        """
        任务返回时
        """
        print("我返回信息了")
        print(status, retval, task_id, args, kwargs, einfo)

@before_task_publish.connect(sender="inception_check")
def task_send_handler(sender=None, body=None, **kwargs):
    print ('after_task_publish: task_id: {body[id]}; sender: {sender}'.format(body=body, sender=sender))

