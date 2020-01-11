# devpos自动化运维框架由python3+django+react+ant组成,只是一个框架,开发者可以在里面添加自己需要的功能

## git clone 项目
```shell
gaochao@localhost:~ # git clone https://github.com/gaochao-git/devpos.git
```
## 启动项目
```
1.启动后端(建议安装anaconda管理python多版本环境)
    1)安装python相关模块
        pip3.5 install django==2.1.1
        pip3.5 install pymysql
        pip3.5 install django-cors-headers
    2)$yourpath/devpos/django_backend/django_backend/settings.py修改mysql连接信息
    3)启动后端django
        cd $yourpath/devepos/django_backend
        python3.5 manage.py runserver 0.0.0.0:8000
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
## 后端代码说明
```
配置文件--------devpos/django_backend/django_backend/settings.py
路由文件--------devpos/django_backend/django_backend/urls.py
接口文件--------devpos/django_backend/apps/views.py    #文件名与方法自己按需编辑
```
## 前端代码说明
```
首页html--------devpos/react_front/public/index.html
首页js----------devpos/react_front/src/index.js
布局及路由文件---devpos/react_front/src/App.js
js代码----------devpos/react_front/src/scripts
css代码---------devpos/react_front/src/styles
```
***
## 参考下面步骤进行新功能开发
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
