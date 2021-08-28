import React,{Component} from 'react';
import axios from 'axios'
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete, Tooltip, Menu, Layout, Icon
} from "antd";
import {HashRouter, Link, Route, withRouter} from 'react-router-dom';
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


class NavService extends Component {
    render() {
        //定义侧边栏主按钮与菜单对应关系
        var menu_path = {
            "/Server":"sub1",
            "/mysqlInstance":"sub2",
            "/mysqlCluster":"sub2",
            "/redisServer":"sub3",
            "/redisInstance":"sub3",
            "/redisCluster":"sub3",
            "/auditSqlIndex":"sub4",
            "/privilegesApply":"sub4",
        }
        //确定侧边栏选中的菜单
        if (this.props.location.pathname==='/'){
            var path = '/Server'
        }else{
            var path = this.props.location.pathname
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
                defaultOpenKeys={[main_sub]}
                selectedKeys={[path]}
            >
                <SubMenu key="sub1" title={<span><Icon type="cloud-server" />server</span>}>
                    <Menu.Item key="/Server">
                        <Link to="/Server">主机</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub2" title={<span><Icon type="database" />MySQL</span>}>
                    <Menu.Item key="1">
                        <Link to="#">主机</Link>
                    </Menu.Item>
                    <Menu.Item key="/mysqlInstance">
                        <Link to="/mysqlInstance">实例</Link>
                    </Menu.Item>
                    <Menu.Item key="/mysqlCluster">
                        <Link to="/mysqlCluster">集群</Link >
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub3" title={<span><Icon type="database" />Redis</span>}>
                    <Menu.Item key="/redisServer">
                        <Link to="/redisServer">主机</Link>
                    </Menu.Item>
                    <Menu.Item key="/redisInstance">
                        <Link to="/redisInstance">实例</Link>
                    </Menu.Item>
                    <Menu.Item key="/redisCluster">
                        <Link to="/redisCluster">集群</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub4" title={<span><Icon type="laptop" />工单</span>}>
                    <Menu.Item key="/auditSqlIndex">
                        <Link to="/auditSqlIndex">SQL审核</Link>
                    </Menu.Item>
                    <Menu.Item key="/privilegesApply">
                        <Link to="/privilegesApply">权限申请</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub5" title={<span><Icon type="code" />控制台</span>}>
                    <Menu.Item key="/mysqlConsole">
                        <Link to="/mysqlConsole">MySQL</Link>
                    </Menu.Item>
                    <Menu.Item key="2">Redis</Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
export default withRouter(NavService);