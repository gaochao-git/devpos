from jenkins import Jenkins,NotFoundException
import socket
import requests
import xmltodict

jks_url = "http://47.104.2.74:8080/"
jks_user = "gaochao"
jks_pass = "xxxxx"


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

    def run_job(self,user,request_body, **jks_params):
        try:
            job_name = request_body.get('jks_job_name')
            self.assert_job_exists(job_name)
            queue_id = self.build_job(job_name,parameters=jks_params)
            ret = {"status":"ok","message":"任务下发成功","data":{"queue_id":queue_id}}
            return ret
        except Exception as e:
            if str(e) == "Requested item could not be found":
                message = "队列中存在相同任务"
            else:
                message = str(e)
            return {"status":"error","message":message}

    def dynamic_job_info(self,**kwargs):
        """
        返回任务信息
        :param kwargs:
        :return:
        """
        job_name = kwargs.get('job_name')
        queue_id = int(kwargs.get('queue_id')) if kwargs.get('queue_id') else ""
        job_number = int(kwargs.get('job_number')) if kwargs.get('job_number') else ""
        if isinstance(queue_id, int) and not job_number:
            filter_url = f'{jks_url}/job/{job_name}/api/xml?tree=builds[building,result,queueId,number]{{0,5}}&xpath=//build[queueId={queue_id}]'
            ret = self._url_request(filter_url)
            if isinstance(ret,NotFoundException):
                log_info = {"result": "unkown", "building": False, "console_log": ""}
                return log_info
            parser = xmltodict.parse(ret.content)
            job_info = dict(parser['build'])
        elif isinstance(job_number,int):
            job_info = self.get_build_info(job_name,job_number)
        else:
            raise f'{kwargs}数据不符合要求'
        log = self.console_log(job_name, job_number=job_info['number'])
        log_info = {"result": job_info.get("result"),"building":job_info.get("building"),"console_log": log}
        return log_info

    def console_log(self,job_name, job_numbrer,type = "Html"):
        url = f'{jks_url}/job/{job_name}/{job_numbrer}/logText/progressive{type}'
        ret = self._url_request(url)
        return ret.text