import requests


class CeleryFlower:
    """
    celery flower http api
    """
    @staticmethod
    def list_task():
        """
        获取所有任务详情
        :return:
        """
        url = "http://localhost:5555/api/tasks"
        payload = {}
        headers = {
            'Authorization': 'Basic cm9vdDpyb290QDEyMw=='
        }
        response = requests.request("GET", url, headers=headers, data=payload)
        value_list = list(response.json().values())
        return value_list

    @staticmethod
    def list_workers():
        """
        获取workers信息
        :return:
        """
        url = " http://localhost:5555/api/workers"
        payload = {}
        headers = {
            'Authorization': 'Basic cm9vdDpyb290QDEyMw=='
        }
        response = requests.request("GET", url, headers=headers, data=payload)
        value_list = list(response.json().values())
        return value_list

    @staticmethod
    def list_queue():
        """
        获取队列信息
        :return:
        """
        url = "http://localhost:5555/api/queues/length"
        payload = {}
        headers = {
            'Authorization': 'Basic cm9vdDpyb290QDEyMw=='
        }
        response = requests.request("GET", url, headers=headers, data=payload)
        value_list = list(response.json().values())
        return value_list

    @staticmethod
    def revoke_task():
        """
        取消正在运行的任务
        :return:
        """
        url = "http://localhost:5555/api/task/revoke/04bb3f7e-ec1e-4fe5-b542-18c4f390f830?terminate=true"
        payload = {}
        headers = {
            'Authorization': 'Basic cm9vdDpyb290QDEyMw=='
        }
        response = requests.request("POST", url, headers=headers, data=payload)
        value_list = list(response.json().values())
        return value_list

if __name__ == '__main__':
    a = CeleryFlower.list_task()
    print(a)