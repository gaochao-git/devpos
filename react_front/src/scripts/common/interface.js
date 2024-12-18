import axios from 'axios'
import { Table, Input,message,Spin } from "antd";
import ReactDOM from 'react-dom'
import { backendServerApiRoot } from "../common/util";
import Login from "../login/login"
import {BrowserRouter} from 'react-router-dom'
import React,{Component} from 'react';
const router = new BrowserRouter()
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.headers.global_loading = true
axios.defaults.timeout = 60000
axios.defaults.baseURL = backendServerApiRoot
const MyAxios = axios.create()

//如果某个接口想关闭全局loading
//let params = {task_name:this.state.del_task_name}
//let headers = {"global_loading":false}
//await MyAxios.post('/task_manage/v1/del_task/',params,{headers})
//await MyAxios.get('/task_manage/v1/del_task/',{params,headers})

function showLoading(){
    var dom = document.createElement('div')
    dom.setAttribute('id', 'loading')
    document.body.appendChild(dom)
    ReactDOM.render(<Spin spinning={true} tip="加载中" size="large"/>, dom)
}

function hideLoading(){
    if (document.getElementById("loading")){
        document.body.removeChild(document.getElementById("loading"))
    }
}

// 添加流式请求处理函数
async function streamFetch(url, params, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        ...options.headers
    };

    // 处理全局loading
    if (headers.global_loading) {
        showLoading();
        delete headers.global_loading;
    }

    try {
        const response = await fetch(backendServerApiRoot + url, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        let partialData = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            partialData += new TextDecoder().decode(value);
            
            try {
                const result = JSON.parse(partialData);
                if (result.status !== "ok") {
                    switch (result.code) {
                        case 401:
                            message.error('用户未登陆');
                            break;
                        case 402:
                            message.error('登陆过期');
                            window.localStorage.removeItem("token");
                            window.location.reload();
                            break;
                    }
                }
                if (options.onData) {
                    options.onData(result);
                }
                partialData = '';
            } catch (e) {
                continue;
            }
        }
    } catch (error) {
        console.error('Stream request failed:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

// 添加stream.fetch方法到MyAxios
MyAxios.stream = {
    fetch: (url, params, options = {}) => streamFetch(url, params, options)
};

MyAxios.interceptors.request.use(
    config => {
      const token = localStorage.getItem('token')
      // 判断是否存在token，如果存在的话，则每个http header都加上token
      if (token ) {
        config.headers.Authorization =  'Bearer ' + token;
      }
      // 全局请求loading
      if (Object.keys(config.headers).includes("global_loading")){
        if (config.headers.global_loading){
            showLoading()
        }
        delete config.headers.global_loading //使用完立即删除掉,防止跨域失败
      }
      //放行拦截
      return config
    },
    err => {
      return Promise.reject(err)
    }
)

MyAxios.interceptors.response.use(
  response => {
    //拦截响应，做统一处理
    if (response.data.status !=="ok") {
      switch (response.data.code) {
        case 401:
          message.error('用户未登陆')
          //window.location=`${backendServerApiRoot}/sso_login?next=${window.location.href}` //sso登陆用
        case 402:
          message.error('登陆过期')
          window.localStorage.removeItem("token")
          window.location.reload()
          //window.location=`${backendServerApiRoot}/sso_login?next=${window.location.href}` //sso登陆用
      }
    }
    hideLoading()
    return response
  },
  error => {//接口错误状态处理，也就是说无响应时的处理
    hideLoading()
    return Promise.reject(error) // 返回接口返回的错误信息
  }
)


export default MyAxios