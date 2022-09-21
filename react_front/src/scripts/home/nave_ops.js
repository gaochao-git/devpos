import React,{Component} from 'react';
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete, Tooltip, Menu, Layout, Icon
} from "antd";
import {Link, withRouter} from 'react-router-dom';
const { SubMenu } = Menu;


class NavOps extends Component {
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
                <SubMenu key="deploy" title={<span><Icon type="cloud-server" /><span>部署</span></span>}>
                    <Menu.Item key="deployMysql">
                        <Link to="/ops/deploy/deployMysql"><span>部署mysql集群ansible</span></Link>
                    </Menu.Item>
                    <Menu.Item key="deployMysqlJks">
                        <Link to="/ops/deploy/deployMysqlJks"><span>部署mysql集群Jks</span></Link>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
export default withRouter(NavOps);