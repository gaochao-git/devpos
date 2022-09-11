from django.apps import apps


def change_modal_managed_for_tests():
    """
    该项目表结构变更不用django来管理,但是可以用orm进行SQL操作
    单测时需修改modal managed = False为True用于自动创建表
    :return:
    """
    for m in apps.get_models():
        if not m._meta.managed:
            print(m, m._meta.managed)
            m._meta.managed = True