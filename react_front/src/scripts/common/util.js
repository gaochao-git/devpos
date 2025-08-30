import axios from 'axios'
import MyAxios from "../common/interface"
import { message } from "antd"

// 多环境配置后端路由
export function env(){
    switch (process.env.NODE_ENV){
        case "development":
            return {APIROOT:"http://127.0.0.1:8111/api", JIRA_URL:"http://jira.qq.com/browse/"}
        case "production":
            return {APIROOT:"http://47.104.2.74:8111/api", JIRA_URL:"http://jira.qq.com/browse/"}
        case "build_gaochao":
            return {APIROOT:"http://gaochao.qq.com:8111/api", JIRA_URL:"http://jira.qq.com/browse/"}
    }
}
//后端api地址
export const backendServerApiRoot = env().APIROOT
export const JIRA_URL = env().JIRA_URL