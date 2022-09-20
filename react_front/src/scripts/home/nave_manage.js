import React,{Component} from 'react';
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete, Tooltip, Menu, Layout, Icon
} from "antd";
import {Link, withRouter} from 'react-router-dom';
const { SubMenu } = Menu;


class NavManage extends Component {
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
                <SubMenu key="permission" title={<span><Icon type="user" /><span>用户管理</span></span>}>
                    <Menu.Item key="/manage/permission/userRole">
                        <Link to="/manage/permission/userRole">角色管理</Link>
                    </Menu.Item>
                    <Menu.Item key="/manage/permission/databaseResource">
                        <Link to="/manage/permission/databaseResource">database管理</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="task" title={<span><Icon type="robot" /><span>任务管理</span></span>}>
                    <Menu.Item key="/manage/task/taskManage">
                        <Link to="/manage/task/taskManage">Celery任务</Link>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
//使用withRouter可以确保打开连接tab显示正确位置
export default withRouter(NavManage);