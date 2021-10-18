import axios from 'axios'
import { backendServerApiRoot } from "../common/util";
axios.default.withCredentials = true;
axios.default.headers.post['Content-Type'] = 'application/json';
axios.default.timeout = 30000
axios.default.baseURL = backendServerApiRoot
const MyAxios = axios.create()


// 请求拦截
MyAxios.interceptors.request.use(
    function(config){
        return config
    },
    function(error){
        return Promise.reject(error)
    }
);


// 响应拦截
MyAxios.interceptors.use(
    function (response){
        if (response.data.status !='ok'){
            // sso登录验证
            if (response.data.code === 1201 || response.data.code === 1202){
                window.location = `${backendServerApiRoot}/sso_login?next=${window.localtion.href}`
            }
        }
        return response
    },
    function (error){
        return Promise.reject(error)
    }
);

export default MyAxios