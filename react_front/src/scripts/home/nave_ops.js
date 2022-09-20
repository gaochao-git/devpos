import React,{Component} from 'react';
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete, Tooltip, Menu, Layout, Icon
} from "antd";
import {Link, withRouter} from 'react-router-dom';
const { SubMenu } = Menu;


class NavOps extends Component {
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
                <SubMenu key="deploy" title={<span><Icon type="cloud-server" /><span>部署</span></span>}>
                    <Menu.Item key="/ops/deploy/deployMysql">
                        <Link to="/ops/deploy/deployMysql"><span>部署mysql集群ansible</span></Link>
                    </Menu.Item>
                    <Menu.Item key="/ops/deploy/deployMysqlJks">
                        <Link to="/ops/deploy/deployMysqlJks"><span>部署mysql集群Jks</span></Link>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
export default withRouter(NavOps);