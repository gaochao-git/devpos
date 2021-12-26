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
                <SubMenu key="sub1" title={<span><Icon type="cloud-server" />部署</span>}>
                    <Menu.Item key="/deployMysql">
                        <Link to="/deployMysql">部署mysql集群</Link>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
export default NavOps;