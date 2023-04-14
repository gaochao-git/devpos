from jenkins import Jenkins,NotFoundException
import socket
import requests
import xmltodict
from datetime import datetime
import pymysql
from apps.utils import db_helper

jks_url = "http://47.104.2.74:8080/"
jks_user = "gaochao"
jks_pass = "gaochao417326"
jks_ip = "47.104.2.74"
jks_port = "8080"
JKS_REQ = f'http://{jks_user}:{jks_pass}@{jks_ip}:{jks_port}'


class MyJenkins(Jenkins):
    def __init__(self, url=jks_url, username=jks_user, password=jks_pass,
                 timeout=socket._GLOBAL_DEFAULT_TIMEOUT):
        Jenkins.__init__(self, url, username, password, timeout)
        self.url = url

    def _url_request(self, url):
        req = requests.Request(method="GET", url=url)
        try:
            ret = self.jenkins_request(req)
            return ret
        except Exception as e:
            return e

    def run_job(self, user, request_body, **jks_params):
        job_name = request_body.get('jks_job_name')
        print(job_name)
        try:
            self.assert_job_exists(job_name)
            queue_id = self.build_job(job_name,parameters=jks_params) if len(jks_params) > 0 else self.build_job(job_name)
            ret = {"status":"ok","message":"任务下发成功","data":{"queue_id":queue_id}}
            self._job_write_db(user, queue_id, job_name, request_body)
            return ret
        except Exception as e:
            if str(e) == "Requested item could not be found":
                message = "队列中存在相同任务"
            else:
                message = str(e)
            return {"status":"error","message":message}

    def _job_write_db(self,user, queue_id, job_name, jks_params):
        """
        任务写入数据库中,做一些额外记录,后续与jks任务进行拼接
        """
        jks_params = pymysql.escape_string(str(jks_params))
        sql = f"""
            insert into jks_task_info(user_name,queue_id,job_name,job_params)
            values('{user}','{queue_id}','{job_name}','{jks_params}')
        """
        db_helper.dml(sql)

    def dynamic_job_info(self, **kwargs):
        """
        返回任务信息
        :param kwargs:
        :return:
        """
        job_name = kwargs.get('job_name')
        queue_id = int(kwargs.get('job_queue_id')) if kwargs.get('job_queue_id') else ""
        job_number = int(kwargs.get('job_number')) if kwargs.get('job_number') else ""
        print(job_name,queue_id,job_number)
        if isinstance(queue_id, int) and not job_number:
            filter_url = f'{jks_url}/job/{job_name}/api/xml?tree=builds[building,result,queueId,number]{{0,5}}&xpath=//build[queueId={queue_id}]'
            ret = self._url_request(filter_url)
            if isinstance(ret,NotFoundException):
                log_info = {"result": "unknown", "building": False, "console_log": ""}
                return log_info
            parser = xmltodict.parse(ret.content)
            job_info = dict(parser['build'])
        elif isinstance(job_number,int):
            job_info = self.get_build_info(job_name, job_number)
        else:
            raise f'{kwargs}数据不符合要求'
        log = self.console_log(job_name, job_number=job_info['number'])
        log_info = {"result": job_info.get("result"),"building":job_info.get("building"),"console_log": log}
        return log_info

    def console_log(self,job_name, job_number,type = "Html"):
        url = f'{jks_url}/job/{job_name}/{job_number}/logText/progressive{type}'
        ret = self._url_request(url)
        return ret.text


def job_builds_dict(job_name, count=100):
    """获取job_name信息"""
    url = f'{JKS_REQ}/job/{job_name}/api/python?tree=builds[building,result,timestamp,queueId,number]{{,{count}}}'
    req = requests.get(url)
    ret = eval(req.content)['builds']
    job_dict = {}
    for i in ret:
        building = "yes" if i.get("result") == "true" else "no"
        job_dict[i["queueId"]] = {
            "number":i.get("number"),
            "building":building,
            "result":i.get("result"),
            'update_time':datetime.fromtimestamp(i.get('timestamp') // 1000)
        }
    return job_dict