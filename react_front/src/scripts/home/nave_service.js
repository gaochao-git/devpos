import React,{Component} from 'react';
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete, Tooltip, Menu, Layout, Icon
} from "antd";
import {Link,withRouter} from 'react-router-dom';
const { SubMenu } = Menu;


class NavService extends Component {
    render() {
        if (this.props.location.pathname==='/'){
            var path = '/service/server/Server'
        }else{
            var path = this.props.location.pathname
        }
        return(
            <Menu
                mode="inline"
                style={{ height: '100%' }}
                theme='dark'
                defaultOpenKeys={[window.localStorage.current_nav_l1]}
                selectedKeys={[path]}
            >
                <SubMenu key="server" title={<span><Icon type="cloud-server" /><span>Server</span></span>}>
                    <Menu.Item key="/service/server/Server">
                        <Link to="/service/server/Server">主机</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="mysql" title={<span><Icon type="database" /><span>MySQL</span></span>}>
                    <Menu.Item key="/service/mysql/mysqlInstance">
                        <Link to="/service/mysql/mysqlInstance">实例</Link>
                    </Menu.Item>
                    <Menu.Item key="/service/mysql/mysqlCluster">
                        <Link to="/service/mysql/mysqlCluster">集群</Link >
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="redis" title={<span><Icon type="database" /><span>Redis</span></span>}>
                    <Menu.Item key="/service/redis/redisInstance">
                        <Link to="/service/redis/redisInstance">实例</Link>
                    </Menu.Item>
                    <Menu.Item key="/service/redis/redisCluster">
                        <Link to="/service/redis/redisCluster">集群</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="worksheet" title={<span><Icon type="laptop" /><span>工单</span></span>}>
                    <Menu.Item key="/service/worksheet/auditSqlIndex">
                        <Link to="/service/worksheet/auditSqlIndex">SQL审核</Link>
                    </Menu.Item>
                    <Menu.Item key="/service/worksheet/privilegesApply">
                        <Link to="/service/worksheet/privilegesApply">权限申请</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="console" title={<span><Icon type="code" /><span>控制台</span></span>}>
                    <Menu.Item key="/service/console/mysqlConsole">
                        <Link to="/service/console/mysqlConsole">MySQL数据查询</Link>
                    </Menu.Item>
                    <Menu.Item key="2">
                        <Link to="/service/console/metaCompare">MySQL表结构对比</Link>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
export default withRouter(NavService);