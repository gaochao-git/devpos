import axios from 'axios'
import { Table, Input,message } from "antd";
import { backendServerApiRoot } from "../common/util";
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.timeout = 30000
axios.defaults.baseURL = backendServerApiRoot
const MyAxios = axios.create()


MyAxios.interceptors.request.use(
    config => {
      const token = localStorage.getItem('token')
      if (token ) {
        // 判断是否存在token，如果存在的话，则每个http header都加上token
        // Bearer Token 规范
        // console.log(token)
        config.headers.Authorization =  'Bearer ' + token;
      }
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
        case "1201":
          message.error('用户未登陆')
        case "1202":
          message.error('登陆过期')
          window.localStorage.removeItem("token")
          window.location.reload()
        case "1203":
          message.error('用户登陆验证失败')
      }

    }
    return response
  },
  //接口错误状态处理，也就是说无响应时的处理
  error => {
    return Promise.reject(error) // 返回接口返回的错误信息
  }
)


export default MyAxios