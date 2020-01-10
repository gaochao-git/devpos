# devpos自动化运维框架由python3+django+react+ant组成,只是一个框架,开发者可以在里面添加自己需要的功能

## 安装步骤
```shell
git clone https://github.com/gaochao-git/devpos.git
```
## 启动步骤
```
1.启动后端
    后端django_backend/django_backend/settings.py修改mysql连接信息
    cd $path/devepos/django_backend
    python3.5 manage.py runserver 0.0.0.0:8000
2.启动前端
    cd $path/devepos/react_front
    npm install 
    yarn start
```

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
