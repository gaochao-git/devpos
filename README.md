# 一、devops平台功能
```text
DBA自动化管理平台
```
# 二、相关组件
```text
WEB服务器：nginx + uwsgi
后端：python3.6.3 + django2.1.1 +celery3.1.26 + MySQL5.7 + Redis4.0.9
前端：nodejs12.14.0 + react16.12.0 + ant3.26.6
SQL审核工具: inception
```
# 三、项目开发指南
### git clone 项目
```shell
gaochao@localhost:~ # git clone https://github.com/gaochao-git/devops.git
```
### 初始化项目
```text
1.生成django内置表
Python manage.py migrate 
2.初始化平台登陆用户
python3 manage.py createsuperuser
3.初始化项目表结构
4.录入主机信息(sql审核ip模式才能使用)
insert into devops.server(server_public_ip) values('47.104.2.74');
insert into team_user(uid,gid,uname,department,title) values(1,1,'gaochao','运维',4);
```
### 启动项目
```text
1.启动后端(建议安装anaconda管理python多版本环境)
    1)进入django_backend目录,安装python相关模块
        python3.6 -m pip install --upgrade pip
        pip3.6 install -r requriements.txt
    2)$yourpath/devpos/django_backend/django_backend/settings.py修改mysql连接信息
    3)启动后端django
        python3.6 manage.py runserver 0.0.0.0:8000
        python3.6 manage.py runserver 0.0.0.0:8000
    4)启动celery
        python manage.py celery worker -E -c 2 -O fair --loglevel=INFO -f logs/celery_async_worker.log -Q async_task --purge  # 异步任务worker
        python manage.py celery worker -E -c 2 -O fair --loglevel=INFO -f logs/celery_cron_worker.log -Q default --purge  # 定时任务worker
        python manage.py celery  beat -l debug  -f logs/celery_beat.log  # 定时任务beat,只能启动1个
        python manage.py celery flower --basic_auth=root:root@123        # 任监控插件,只能启动1个
        python manage.py celerycam -l debug -f logs/celery_cam.log  # 启动监控各个任务状态及结果的进程,只能启动1个,djcelery_workerstate、djcelery_taskstate
2.启动前端
    1)安装nodejs
        brew install nodejs #安装nodejs根据mac、windows、linux不同系统自行百度安装
        node -v
        npm -v
    2)安装相关依赖包并启动前端项目
        cd $yourpath/devepos/react_front
        npm install                     #本项目安装相关依赖包
        sudo npm install -g yarn        #全局安装yarn
        yarn start
```
***
#### 后端代码说明
```text
配置文件----------------devpos/django_backend/django_backend/settings.py
路由文件----------------devpos/django_backend/django_backend/urls.py
http交互接口文件---------devpos/django_backend/apps/controller/功能名_controller.py
业务逻辑层--------------devpos/django_backend/apps/service/功能名.py
数据库交互层-------------devpos/django_backend/apps/dao/功能名_dao.py
celery异步任务----------devpos/django_backend/task.py
```
#### 前端代码说明
```text
首页html--------devpos/react_front/public/index.html
首页js----------devpos/react_front/src/index.js
布局及路由文件---devpos/react_front/src/App.js
js代码----------devpos/react_front/src/scripts
css代码---------devpos/react_front/src/styles
公共配置---------devpos/react_front/src/common          #后端server api在util.js中配置
```
***
#### 参考下面步骤进行新功能开发
```text
1.后端代码及API开发
    后端django_backend/django_backend/url.py添加url和方法，参考api/get_cluster_name
    后端django_backend/apps/controller层开发
    后端django_backend/apps/service层开发
    后端django_backend/apps/dao层开发
2.前端页面开发
    src/scripts里面创建功能目录
    src/scripts功能目录里面创建文件，开始开发
    react_front/src/app.js首页中content块中添加对应路由信息
    react_front/src/app.js首页import新开发的功能
```
# 四、上线部署指南
## 部署前端
```text
1.更改/Users/gaochao/gaochao-git/gaochao_repo/devops/react_front/src/scripts/common/util.js 将backendServerApiRoot改为域名或者公网ip
2.本地编译打包并上传到部署服务器或者打包完直接用git推送上去
cd /Users/gaochao/gaochao-git/gaochao_repo/devops/react_front
yarn build     #会在react_front生成一个build目录
scp传或者git本地推部署服务器拉
3.启动前端测试是否能够运行,可以通过serve -s启动项目 (需要线安装serve:npm install -g serve),这一步可以没有，因为后面要用nginx进行代理前端
```
## 部署多环境打包
```text
1.拷贝scripts/build.js为scripts/build_gaochao.js
2.更改scripts/build_gaochao.js中process.env.NODE_ENV = 'gaochao';
3.更改package.json中的scripts:
"scripts": {
    "dev": "webpack-dev-server --inline --progress --config config/webpackDevServer.config.js --host 0.0.0.0",
    "start": "node scripts/start.js",
    "start:gaochao": "node scripts/build_gaochao.js",
    "build": "node scripts/build.js",
    "test": "node scripts/test.js"
  }
4.更改package.json中的browserslist
"browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "gaochao": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
5.打包
npm run build:gaochao
6.判断env环境
message.success(process.env.NODE_ENV)
```
## 部署后端
```text
1.部署服务器git clone项目
2.安装相关依赖包
3.修改相关配置文件
4.开发服务器启动测试
```

## uwsgi代理django
```text
1.安装uwsgi(yum安装的用不了,需要用pip安装)
pip3.5 install uwsgi
2.测试uwsgi是否能够工作，参考网上帖子
3.修改uwsgi.ini配置文件
cd /Users/gaochao/gaochao-git/gaochao_repo/devops/django_backend
vim uwsgi.ini
[uwsgi]
# 应该用http-socket,不能用socket,不能用127.0.0.1,不能用公网ip,只能用内网ip
http-socket = 内网ip:8000
master = true
chdir = /Users/gaochao/gaochao-git/gaochao_repo/devops/django_backend/
module = django_backend.wsgi
processes = 1
threads = 4
vacuum = true
stats = 127.0.0.1:9191
reload-on-rss = 25
reload-on-as = 25
pidfile = uwsgi.pid
daemonize = logs/uwsgi.log
max-requests = 6000
buffer-size=65536
2.启动uwsgi
/usr/local/python35/bin/uwsgi  --ini uwsgi.ini       #直接用系统的uwsgi启动会失败,需要用上一步安装的uwsgi启动
```

## nginx配置及代理react、uwsgi
```text
1.安装nginx
yum -y install nginx
systempctl start nginx
2.将前端build目录copy到/etc/nginx目录下
3.新建一个配置文件,配置nginx
vim /etc/nginx/conf.d/devops.conf
# 前后端代理配置
upstream test_backend{
    server 172.17.208.83:8000;
}
server {
    listen      80;
    server_name 公网ip或域名;
    root    /data/devpos/react_front/build/;   #前端编译完成的build目录
    index   index.htm  index.html;
    # 前端
    location / {
        try_files $uri $uri/ /index.html;
    }
    # 后端
    location  /api {
        include uwsgi_params;
        uwsgi_pass uwsgi://test_backend; # 非加密模式模式
        # uwsgi_pass suwsgi://test_backend; # 加密模式模式
   }
}
4.生效配置文件
nginx -s reload
```
## celery 本地开发
```shell
1.异步调用
python manage.py celery worker -E -c 2 -O fair --loglevel=INFO -f logs/celery_async_worker.log -Q async_task --purge
```
## supervisor托管celery
```shell
[root@wth ~]# yum -y install supervisor
s[root@wth ~]# systemctl start  supervisord
[root@wth supervisord.d]# vim /etc/supervisord.d/devops_beat.ini
[program:devops_beat]
command=python3.6 manage.py celery beat -l info -f ./logs/celery_beta.log
directory=/data/devops/django_backend
autostart=false
autorestart=false
startsecs=1
startretries=3
exitcodes=0,2
stopsignal=TERM
stopwaitsecs=10
user=root
redirect_stderr=true
priority=1
stopasgroup=true
killasgroup=true
stdout_logfile=/var/log/celery_beat.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=1
[root@wth supervisord.d]# supervisorctl reload
devops_beat: added process group
[root@wth supervisord.d]# supervisorctl status
devops_beat                      STOPPED   Not started


vim /etc/supervisord.d/devops_cron.ini
[program:devops_cron]
command=python3.6 manage.py celery worker -c 4 -l info -f ./logs/celery_cron_worker.log -Q celery --purge -n default_celery
directory=/data/devops/django_backend
autostart=false
autorestart=false
startsecs=1
startretries=3
exitcodes=0,2
stopsignal=TERM
stopwaitsecs=10
user=root
redirect_stderr=true
priority=1
stopasgroup=true
killasgroup=true
stdout_logfile=/var/log/devops_cron_worker.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=1


vim /etc/supervisord.d/devops_async.ini
[program:devops_async]
command=python manage.py celery worker -E -c 2 -O fair --loglevel=INFO -f logs/celery_async_worker.log -Q async_task --purge
directory=/data/devops/django_backend
autostart=false
autorestart=false
startsecs=1
startretries=3
exitcodes=0,2
stopsignal=TERM
stopwaitsecs=10
user=root
redirect_stderr=true
priority=1
stopasgroup=true
killasgroup=true
stdout_logfile=/var/log/devops_async.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=1

```
## 浏览器访问看是否正常工作