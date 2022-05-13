import React,{Component} from 'react';
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete, Tooltip, Menu, Layout, Icon
} from "antd";
import {Link, withRouter} from 'react-router-dom';
const { SubMenu } = Menu;


class NavManage extends Component {
    render() {
        //定义侧边栏主按钮与菜单对应关系
        var menu_path = {
            "/userRole":"sub1",
            "/taskManage":"sub2",
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
            message.warning('路由未找到')
        }
        return(
            <Menu
                mode="inline"
                style={{ height: '100%' }}
                theme='dark'
                defaultOpenKeys={[main_sub]}
                selectedKeys={[path]}
            >
                <SubMenu key="sub1" title={<span><Icon type="user" /><span>用户管理</span></span>}>
                    <Menu.Item key="/userRole">
                        <Link to="/userRole">角色管理</Link>
                    </Menu.Item>
                </SubMenu>
                <SubMenu key="sub2" title={<span><Icon type="robot" /><span>任务管理</span></span>}>
                    <Menu.Item key="/taskManage">
                        <Link to="/taskManage">Celery任务</Link>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        )
    }
}
//使用withRouter可以确保打开连接tab显示正确位置
export default withRouter(NavManage);