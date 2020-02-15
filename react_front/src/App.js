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
import _ from 'lodash';
// import login, {InvalidCredentialsException} from "./util/Auth"
import {backendServerApiRoot} from "./scripts/common/util";
import store from "./scripts/login/store";
import {setToken} from "./scripts/login";


const { Header, Footer, Sider, Content } = Layout;
const { SubMenu } = Menu;
const FormItem = Form.Item;
const { Option } = Select;

export function InvalidCredentialsException(message) {
    this.message = message;
    this.name = 'InvalidCredentialsException';
}

export function LoginOut(){
    console.log("退出登陆");
    window.localStorage.clear()
    window.location.reload()
}

axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.headers.common['Authorization'] = window.localStorage.getItem('token') ;


class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user_name:"帝君"
        }
    }
    componentDidMount() {
        console.log("Token:",window.localStorage.getItem('token'))
        this.GetUserName()
    }
    //预览SQL
    async GetUserName() {
        let params = {
            token: window.localStorage.getItem('token')
        };
        let res = await axios.post(`${backendServerApiRoot}/get_login_user_name_by_token/`,{params});
        console.log("SQL预览:",res.data);
        // res.data.message==="验证成功" ? {this.setState({user_name:res.data.data[0]["username"],})}:null
        if (res.data.message==="验证成功"){
            this.setState({user_name:res.data.data[0]["username"]})
        }else{
            console.log("未登陆")
        }
    };
    render() {
        if (window.localStorage.getItem('token')) {
            return(
                <div className="App">
                    <HashRouter>
                        <Layout>
                            <Header className="header">
                                <div onClick={() => window.location.href = `/page`}>DBA</div>
                                <div>
                                    {this.state.user_name}
                                    {
                                        window.localStorage.getItem('token') ?
                                        <Button type="primary" style={{marginLeft: 5}} onClick={LoginOut}>注销</Button>
                                        :<Button type="primary" onClick={LoginOut}>登录</Button>
                                    }

                                </div>
                            </Header>
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
                        <Header className="header">
                            <span>devops</span>
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
        handleSubmit = e => {
            e.preventDefault();
            this.props.form.validateFields((err, values) => {
                console.log('Received values of form: ', values);
                //this.handleLoginSubmit(values)
                this.login(values["username"],values["password"]);
            });
        };
        async login(username, password) {
            return axios.post("http://localhost:8000" + "/auth/", {
                username,
                password
            })
                .then(function (response) {
                    store.dispatch(setToken(response.data.token));
                    window.localStorage.setItem('token', response.data.token)
                    window.location.reload()
                })
                .catch(function (error) {
                    // raise different exception if due to invalid credentials
                    if (_.get(error, 'response.status') === 400) {
                        throw new InvalidCredentialsException(error);
                    }
                    throw error;
                });
        }

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