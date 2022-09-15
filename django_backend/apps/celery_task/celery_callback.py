import celery
from celery.signals import after_setup_task_logger,after_setup_logger
from celery.app.log import TaskFormatter
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
        pass

    def on_success(self, retval, task_id, args, kwargs):
        """
        任务成功时执行
        """
        pass

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """
        任务重试时执行
        """
        pass

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        """
        任务返回时
        """
        pass


@after_setup_task_logger.connect
def setup_task_logger(logger, *args, **kwargs):
    """自定义celery worker日志格式"""
    for handler in logger.handlers:
        handler.setFormatter(TaskFormatter('%(asctime)s|%(threadName)s|%(task_id)s|%(filename)s|%(lineno)d|%(levelname)s|%(message)s'))


@after_setup_logger.connect()
def setup_loggers(logger, *args, **kwargs):
    """自定义celery beat及总日志格式"""
    for handler in logger.handlers:
        handler.setFormatter(TaskFormatter('%(asctime)s|%(threadName)s|%(levelname)s|%(message)s'))
