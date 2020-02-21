import axios from "axios";
//后端服务器
export const backendServerApiRoot = 'http://127.0.0.1:8000'
//export const backendServerApiRoot = 'http://192.168.0.109:8000'
//根据token获取登陆信息
let login_user_info = null
export async function getUser() {
  if (window.localStorage.getItem('token')) {
    let params = {
      token: window.localStorage.getItem('token')
    };
    const res = await axios.post(`${backendServerApiRoot}/get_login_user_name_by_token/`,{params}).catch(error=>{
      console.log(error)
    })
    if (res.data["message"]==="验证成功")
      login_user_info = await res.data
  }

  console.log(login_user_info)
  return login_user_info
}