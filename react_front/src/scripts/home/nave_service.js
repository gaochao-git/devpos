import React,{Component} from 'react';
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete, Tooltip, Menu, Layout, Icon
} from "antd";
import {Link,withRouter} from 'react-router-dom';
import {routerChange} from "../common/interface"
const { SubMenu } = Menu;


class NavService extends Component {
    componentWillMount() {
        routerChange(window.location.pathname)
    }
    render() {
        var l1_path = this.props.location.pathname.split("/")[2]
        var l2_path = this.props.location.pathname.split("/")[3]
        return(
            <Menu
                mode="inline"
                style={{ height: '100%' }}
                theme='dark'
                defaultOpenKeys={[l1_path]}
                selectedKeys={[l2_path]}
            >
                <SubMenu key="server" title={<span><Icon type="cloud-server" /><span>Server</span></span>}>
                    <Menu.Item key="Server">
                        <Link to="/service/server/Server">主机</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="mysql" title={<span><Icon type="database" /><span>MySQL</span></span>}>
                    <Menu.Item key="mysqlInstance">
                        <Link to="/service/mysql/mysqlInstance">实例</Link>
                    </Menu.Item>
                    <Menu.Item key="mysqlCluster">
                        <Link to="/service/mysql/mysqlCluster">集群</Link >
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="redis" title={<span><Icon type="database" /><span>Redis</span></span>}>
                    <Menu.Item key="redisInstance">
                        <Link to="/service/redis/redisInstance">实例</Link>
                    </Menu.Item>
                    <Menu.Item key="redisCluster">
                        <Link to="/service/redis/redisCluster">集群</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="worksheet" title={<span><Icon type="laptop" /><span>工单</span></span>}>
                    <Menu.Item key="auditSqlIndex">
                        <Link to="/service/worksheet/auditSqlIndex">SQL审核</Link>
                    </Menu.Item>
                    <Menu.Item key="privilegesApply">
                        <Link to="/service/worksheet/privilegesApply">权限申请</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="console" title={<span><Icon type="code" /><span>控制台</span></span>}>
                    <Menu.Item key="mysqlConsole">
                        <Link to="/service/console/mysqlConsole">MySQL数据查询</Link>
                    </Menu.Item>
                    <Menu.Item key="metaCompare">
                        <Link to="/service/console/metaCompare">MySQL表结构对比</Link>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
export default withRouter(NavService);