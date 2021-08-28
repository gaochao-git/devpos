import React,{Component} from 'react';
import axios from 'axios'
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete, Tooltip, Menu, Layout, Icon
} from "antd";
import {HashRouter, Link, Route,withRouter} from 'react-router-dom';
import "antd/dist/antd.css";
import {getUser} from "../common/util";
import Server from "../Server/Server";
import mysqlCluster from "../mysql/mysqlCluster";
import mysqlInstance from "../mysql/mysqlInstance";
import publicManage from "../publicUserManage/pubicUserPrivilegeManage";
import AuditSqlIndex from "../auditSql/auditSqlIndex";
import ExecuteSql from "../auditSql/executeSql";
import privilegesApply from "../privilegesApply/applicationForm";
import OrderInformation from "../privilegesApply/orderInformation";
import commonUser from "../commonUser/commonUserCharge";
import Login from "../login/login";
import mysqlConsole from "../console/mysqlConsole";

const { SubMenu } = Menu;


class NavManage extends Component {
    render() {
        const path = this.props.location.pathname
        //定义侧边栏主按钮与菜单对应关系
        var menu_path = {
            "/commonUser":"sub1",
            "/home":"sub1",
        }
        //确定侧边栏默认展开的menu
        if (path in menu_path){
            var main_sub = menu_path[path]
        }else{
            var main_sub = ""
        }
        return(
            <Menu
                mode="inline"
                style={{ height: '100%' }}
                theme='dark'
                defaultOpenKeys={main_sub}
                selectedKeys={[path]}
            >
                <SubMenu key="sub1" title={<span><Icon type="robot" />用户管理</span>}>
                    <Menu.Item key="/commonUser">
                        <Link to="/commonUser">公共账号管理</Link>
                    </Menu.Item>
                    <Menu.Item key="/home">
                        <Link to="/home">主页</Link>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
//使用withRouter可以确保打开连接tab显示正确位置
export default withRouter(NavManage);