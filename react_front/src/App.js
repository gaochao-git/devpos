import React,{Component} from 'react';
import axios from 'axios'
import {Layout, Menu, Icon, Table, Button, Input, Select, Col, Modal, Form, Popconfirm, message, Checkbox} from "antd";

import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import {HashRouter,Route} from 'react-router-dom';
import mysqlCluster from './scripts/mysqlCluster/cluster'
import UserSqlCheckSubmit from './scripts/sqlApply/userSqlCheckSubmit'
import UserSqlApply from './scripts/sqlApply/userSqlApply'
import publicManage from "./scripts/publicUserManage/pubicUserPrivilegeManage"
import privilegesApply from "./scripts/privilegesApply/userGrant";
import OrderInformation from './scripts/privilegesApply/orderInformation'
import commonUser from "./scripts/commonUser/commonUserCharge";
import Cloud from "./scripts/Cloud/CloudInstance";
import home from "./scripts/home/home"
import {backendServerApiRoot} from "./scripts/common/util";

const { Header, Footer, Sider, Content } = Layout;
const { SubMenu } = Menu;
const FormItem = Form.Item;
const { Option } = Select;

// 设置cookie
function setCookie(name, value, seconds) {
    seconds = seconds || 0;   //seconds有值就直接赋值，没有为0，这个根php不一样。
    var expires = "";
    if (seconds != 0 ) {      //设置cookie生存时间
        var date = new Date();
        date.setTime(date.getTime()+(seconds*1000));
        expires = "; expires="+date.toGMTString();
    }
    document.cookie = name+"="+escape(value)+expires+"; path=/";   //转码并赋值
}
// 清除cookie
function clearCookie(name) {
    setCookie(name, "", -1);
}
// 取得cookie
function getCookie(name) {
    var nameEQ = name + '='
    var ca = document.cookie.split(';') // 把cookie分割成组
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i] // 取得字符串
        while (c.charAt(0) == ' ') { // 判断一下字符串有没有前导空格
            c = c.substring(1, c.length) // 有的话，从第二位开始取
        }
        if (c.indexOf(nameEQ) == 0) { // 如果含有我们要的name
            return unescape(c.substring(nameEQ.length, c.length)) // 解码并截取我们要值
        }
    }
    return false
}
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            login:"false",
            name:"gaochao"
        }
    }
    render() {
        if (getCookie('userlogin_username')) {
            return(
                <div className="App">
                    <HashRouter>
                        <Layout>
                            <Header>Header</Header>
                            <Layout>
                                <Sider width={200} style={{ background: '#fff' }}>
                                    <Menu mode="inline" defaultSelectedKeys={['1']} defaultOpenKeys={['sub1']} style={{ height: '100%' }}>
                                        <SubMenu key="sub1" title={<span><Icon type="cloud-server" />server</span>}>
                                            <Menu.Item key="1">
                                                <Link to="/Cloud">云主机</Link>
                                            </Menu.Item>
                                            <Menu.Item key="2">物理机</Menu.Item>
                                        </SubMenu>
                                        <SubMenu key="sub2" title={<span><Icon type="database" />MySQL</span>}>
                                            <Menu.Item key="1">
                                                <Link to="#">主机</Link>
                                            </Menu.Item>
                                            <Menu.Item key="2">
                                                <Link to="#">实例</Link>
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
                                                <Link to="/checkSummitSql">SQL审核</Link>
                                            </Menu.Item>
                                            <Menu.Item key="2">
                                                <Link to="/privilegesApply">权限申请</Link>
                                            </Menu.Item>
                                        </SubMenu>
                                        <SubMenu key="sub5" title={<span><Icon type="code" />控制台</span>}>
                                            <Menu.Item key="1">MySQL</Menu.Item>
                                            <Menu.Item key="2">Redis</Menu.Item>
                                        </SubMenu>
                                        <SubMenu key="sub6" title={<span><Icon type="cloud-download" />数据迁移/导出</span>}>
                                            <Menu.Item key="1">迁移</Menu.Item>
                                            <Menu.Item key="2">导出</Menu.Item>
                                        </SubMenu>
                                        <SubMenu key="sub7" title={<span><Icon type="robot" />自助服务</span>}>
                                            <Menu.Item key="1">
                                                <Link to="/commonUser">公共账号管理</Link>
                                            </Menu.Item>
                                            <Menu.Item key="2">备份</Menu.Item>
                                            <Menu.Item key="3">归档</Menu.Item>
                                            <Menu.Item key="4">
                                                <Link to="/home">主页</Link>
                                            </Menu.Item>
                                        </SubMenu>
                                    </Menu>
                                </Sider>
                                <Content>
                                    <Route exact path="/Cloud" component={Cloud} />
                                    <Route exact path="/mysqlCluster" component={mysqlCluster} />
                                    <Route exact path="/publicManage" component={publicManage} />
                                    <Route exact path="/checkSummitSql" component={UserSqlCheckSubmit} />
                                    <Route exact path="/viewApplySqlByUuid/:submit_sql_uuid" component={UserSqlApply} />
                                    <Route exact path="/privilegesApply" component={privilegesApply} />
                                    <Route exact path="/viewPrivilegeInfoByUuid/:order_uuid" component={OrderInformation} />
                                    <Route exact path="/commonUser" component={commonUser} />
                                    <Route exact path="/home" component={home} />
                                </Content>
                            </Layout>
                            <Footer >Footer</Footer>
                        </Layout>
                    </HashRouter>
                </div>
            )
        }else{
            return (
                <div>
                    <Layout className="layout">
                        <Header style={{background:"#00d9ff"}}>
                            <span>头部</span>
                        </Header>
                        <Content style={{ margin: '0 auto',padding:'50px 50px' }}>
                            <Home></Home>
                        </Content>
                        <Footer style={{ textAlign: 'center' }}>devpos Design ©2020 Created by me</Footer>
                    </Layout>,
                </div>
            )
        }
    }
}
const Home = Form.create()(
    class extends React.Component {
        constructor(props) {
            super(props);
        }
        async handleLoginSubmit(values) {
            let params = {
                user_name: values["username"],
                password: values["password"]
            };
            console.log(params)
            let res = await axios.post(`${backendServerApiRoot}/login/`,{params});
            if( res.data.status === 'ok'){
                this.setState({
                    login:"true"
                });
                console.log(this.state.login);
                console.log(this.state.name);
                setCookie('userlogin_username',values["username"],36000);
                console.log(getCookie('userlogin_username'));
                window.location.reload();
            }

            else
                alert(res.data.message);
        }
        handleSubmit = e => {
            e.preventDefault();
            this.props.form.validateFields((err, values) => {
                console.log('Received values of form: ', values);
                this.handleLoginSubmit(values)
            });
        };

        render() {
            const { editItem, form, visible } = this.props;
            const { getFieldDecorator } = form;
            return (
                <div>
                    <Form onSubmit={this.handleSubmit} className="login-form">
                        <Form.Item>
                            {getFieldDecorator('username', {
                                rules: [{ required: true, message: 'Please input your username!' }],
                            })(
                                <Input
                                    prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                    placeholder="Username"
                                />,
                            )}
                        </Form.Item>
                        <Form.Item>
                            {getFieldDecorator('password', {
                                rules: [{ required: true, message: 'Please input your Password!' }],
                            })(
                                <Input
                                    prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                    type="password"
                                    placeholder="Password"
                                />,
                            )}
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="login-form-button"
                            >
                                Log in
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            )
        }
    }
)

export default App;