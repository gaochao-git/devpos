from django.test import TransactionTestCase
from apps.models import MysqlCluster
from apps.unit_test.common import change_modal_managed_for_tests


class TestMysqlCluster(TransactionTestCase):
    # fixtures = ['db.json']
    change_modal_managed_for_tests()

    def setUp(self):
        change_modal_managed_for_tests()
        aa = MysqlCluster.objects.values()
        assert len(aa) == 0
        print("start")

    def tearDown(self):
        print("end")

    def test_case(self):
        """
        If no Articles exist, 
        'latest_article_list' should be empty
        """
        print(2222)
