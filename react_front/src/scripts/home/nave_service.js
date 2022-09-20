import React,{Component} from 'react';
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete, Tooltip, Menu, Layout, Icon
} from "antd";
import {Link,withRouter} from 'react-router-dom';
const { SubMenu } = Menu;


class NavService extends Component {
    render() {
        //定义侧边栏主按钮与菜单对应关系
        var menu_path = {
            "/service/Server":"sub1",
            "/service/mysqlInstance":"sub2",
            "/service/mysqlCluster":"sub2",
            "/service/redisServer":"sub3",
            "/service/redisInstance":"sub3",
            "/service/redisCluster":"sub3",
            "/service/auditSqlIndex":"sub4",
            "/service/privilegesApply":"sub4",
            "/service/deployMysql":"sub5",
            "/service/rds":"sub6",
        }
        //确定侧边栏选中的菜单
        if (this.props.location.pathname==='/'){
            var path = '/service/Server'
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
                <SubMenu key="sub1" title={<span><Icon type="cloud-server" /><span>Server</span></span>}>
                    <Menu.Item key="/service/Server">
                        <Link to="/service/Server">主机</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub2" title={<span><Icon type="database" /><span>MySQL</span></span>}>
                    <Menu.Item key="/service/mysqlInstance">
                        <Link to="/service/mysqlInstance">实例</Link>
                    </Menu.Item>
                    <Menu.Item key="/service/mysqlCluster">
                        <Link to="/service/mysqlCluster">集群</Link >
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub3" title={<span><Icon type="database" /><span>Redis</span></span>}>
                    <Menu.Item key="/service/redisInstance">
                        <Link to="/service/redisInstance">实例</Link>
                    </Menu.Item>
                    <Menu.Item key="/service/redisCluster">
                        <Link to="/service/redisCluster">集群</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub4" title={<span><Icon type="laptop" /><span>工单</span></span>}>
                    <Menu.Item key="/service/auditSqlIndex">
                        <Link to="/service/auditSqlIndex">SQL审核</Link>
                    </Menu.Item>
                    <Menu.Item key="/service/privilegesApply">
                        <Link to="/service/privilegesApply">权限申请</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub5" title={<span><Icon type="code" /><span>控制台</span></span>}>
                    <Menu.Item key="/service/mysqlConsole">
                        <Link to="/service/mysqlConsole">MySQL数据查询</Link>
                    </Menu.Item>
                    <Menu.Item key="2">
                        <Link to="/service/metaCompare">MySQL表结构对比</Link>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
export default withRouter(NavService);