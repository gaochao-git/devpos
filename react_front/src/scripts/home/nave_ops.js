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
                <SubMenu key="sub1" title={<span><Icon type="cloud-server" /><span>部署</span></span>}>
                    <Menu.Item key="/deployMysql">
                        <Link to="/deployMysql"><span>部署mysql集群</span></Link>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
export default NavOps;