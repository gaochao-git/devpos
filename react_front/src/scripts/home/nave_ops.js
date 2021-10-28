import React,{Component} from 'react';
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete, Tooltip, Menu, Layout, Icon
} from "antd";
import {Link} from 'react-router-dom';
const { SubMenu } = Menu;


class NavOps extends Component {
    render() {
        return(
            <Menu
                mode="inline"
                style={{ height: '100%' }}
                theme='dark'
            >
                <SubMenu key="sub1" title={<span><Icon type="cloud-server" />server</span>}>
                    <Menu.Item key="1">
                        <Link to="/Server">主机</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub2" title={<span><Icon type="database" />MySQL</span>}>
                    <Menu.Item key="1">
                        <Link to="#">主机</Link>
                    </Menu.Item>
                    <Menu.Item key="2">
                        <Link to="/mysqlInstance">实例</Link>
                    </Menu.Item>
                    <Menu.Item key="3">
                        <Link to="/mysqlCluster">集群</Link >
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub3" title={<span><Icon type="database" />Redis</span>}>
                    <Menu.Item key="1">
                        <Link to="/redisServer">主机</Link>
                    </Menu.Item>
                    <Menu.Item key="2">
                        <Link to="/redisInstance">实例</Link>
                    </Menu.Item>
                    <Menu.Item key="3">
                        <Link to="/redisCluster">集群</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub4" title={<span><Icon type="laptop" />工单</span>}>
                    <Menu.Item key="1">
                        <Link to="/auditSqlIndex">SQL审核</Link>
                    </Menu.Item>
                    <Menu.Item key="2">
                        <Link to="/privilegesApply">权限申请</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub5" title={<span><Icon type="code" />控制台</span>}>
                    <Menu.Item key="1">
                        <Link to="/mysqlConsole">MySQL</Link>
                    </Menu.Item>
                    <Menu.Item key="2">Redis</Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
export default NavOps;