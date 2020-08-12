# 一、devops平台功能
```shell script
DBA自动化管理平台
```
# 二、相关组件
```shell script
WEB服务器：nginx + uwsgi
后端：python3 + django +celery + MySQL + Redis
前端：nodejs + react + ant
```
# 三、项目开发指南
### git clone 项目
```shell
gaochao@localhost:~ # git clone https://github.com/gaochao-git/devops.git
```
### 启动项目
```
1.启动后端(建议安装anaconda管理python多版本环境)
    1)进入django_backend目录,安装python相关模块
        pip3.5 install -r requriements.txt
    2)$yourpath/devpos/django_backend/django_backend/settings.py修改mysql连接信息
    3)启动后端django
        python3.5 manage.py runserver 0.0.0.0:8000
    4)启动celery
        python3.5 manage.py celery worker --concurrency=4  --loglevel=info --logfile=./logs/celery.log
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
```
配置文件----------------devpos/django_backend/django_backend/settings.py
路由文件----------------devpos/django_backend/django_backend/urls.py
http交互接口文件---------devpos/django_backend/apps/controller/功能名_controller.py
业务逻辑层--------------devpos/django_backend/apps/service/功能名.py
数据库交互层-------------devpos/django_backend/apps/dao/功能名_dao.py
celery异步任务----------devpos/django_backend/task.py
```
#### 前端代码说明
```
首页html--------devpos/react_front/public/index.html
首页js----------devpos/react_front/src/index.js
布局及路由文件---devpos/react_front/src/App.js
js代码----------devpos/react_front/src/scripts
css代码---------devpos/react_front/src/styles
公共配置---------devpos/react_front/src/common          #后端server api在util.js中配置
```
***
#### 参考下面步骤进行新功能开发
```shell
1.后端代码及API开发
    后端django_backend/django_backend/url.py添加url和方法，参考get_cluster_info
    后端django_backend/apps/views.py添加方法，参考get_cluster_info_func
2.前端页面开发
    src/scripts里面创建功能目录，参考mysqlCluster集群信息配置
    src/scripts功能目录里面创建文件，开始开发，参考mysqlCluster集群信息配置
    react_front/src/app.js首页中content块中添加对应路由信息，参考mysqlCluster集群信息配置
    react_front/src/app.js首页import该方法，参考mysqlCluster集群信息配置
```
# 四、上线部署指南
## 部署前端
```shell script
1.更改/Users/gaochao/gaochao-git/gaochao_repo/devops/react_front/src/scripts/common/util.js 将backendServerApiRoot改为域名或者公网ip
2.本地编译打包并上传到部署服务器
cd /Users/gaochao/gaochao-git/gaochao_repo/devops/react_front
yarn build
tar zcpvf build.tar.gz ./build
scp build.tar.gz root@'xxxxxx':/tmp
3.启动前端测试是否能够运行
```
## 部署后端
```shell script
1.部署服务器git clone项目
2.安装相关依赖包
3.修改相关配置文件
4.开发服务器启动测试
```

## uwsgi代理django
```shell script
1.安装uwsgi
pip3.5 install uwsgi
2.测试uwsgi是否能够工作，参考网上帖子
3.修改uwsgi.ini配置文件
cd /Users/gaochao/gaochao-git/gaochao_repo/devops/django_backend
vim uwsgi.ini
[uwsgi]
# 应该用http-socket,不能用socket,不能用127.0.0.1,不能用公网ip
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
uwsgi --ini uwsgi.ini 
```

## nginx配置及代理react、uwsgi
```shell script
1.安装nginx
yum -y install nginx
systempctl start nginx
2.将前端build目录copy到/etc/nginx目录下
3.新建一个配置文件,配置nginx
vim /etc/nginx/conf.d/devops.conf
# 前后端代理配置
server {
    listen      80;
    server_name 公网ip或域名;
    root    /etc/nginx/build/;
    index   index.htm  index.html;
    # 前端
    location / {
        try_files $uri $uri/ /index.html;
    }
    # 后端
    location  /api {
        include uwsgi_params;
        uwsgi_pass 172.17.208.83:8000; #"这里就是uwsgi.ini配置文件中的地址"
   }
}
4.生效配置文件
nginx -s reload
```

## 浏览器访问看是否正常工作