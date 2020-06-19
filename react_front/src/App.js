import React,{Component} from 'react';
import axios from 'axios'
import {Layout, Menu, Icon, Button } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import {HashRouter,Route} from 'react-router-dom';
import mysqlCluster from './scripts/mysql/mysqlCluster'
import AuditSqlIndex from './scripts/auditSql/auditSqlIndex'
import ExecuteSql from './scripts/auditSql/executeSql'
import publicManage from "./scripts/publicUserManage/pubicUserPrivilegeManage"
import privilegesApply from "./scripts/privilegesApply/userGrant";
import OrderInformation from './scripts/privilegesApply/orderInformation'
import commonUser from "./scripts/commonUser/commonUserCharge";
import Cloud from "./scripts/Cloud/CloudInstance";
import Login from "./scripts/login/login"
import {getUser} from './scripts/common/util'
import mysqlInstance from './scripts/mysql/mysqlInstance'

const { Header, Footer, Sider, Content } = Layout;
const { SubMenu } = Menu;
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.headers.common['Authorization'] = window.localStorage.getItem('token') ;

function LoginOut(){
    console.log("退出登陆");
    window.localStorage.removeItem("token")
    window.location.reload()
}

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            login_user_name:"",
            login_user_name_role:""
        }
    }
    componentDidMount() {
        console.log("Token:",window.localStorage.getItem('token'))
        getUser().then(res => {
            this.setState({
                login_user_name: res.data.username,
                login_user_name_role: res.data.title
            })
        }).catch(error=>{
            console.log(error)
        })
    }

    render() {
        if (window.localStorage.getItem('token')) {
            return(
                <div className="App">
                    <HashRouter>
                        <Layout>
                            <Header className="header">
                                <div onClick={() => window.location.href = `/page`}>{this.state.login_user_name_role}</div>
                                <div>
                                    <span>
                                        {this.state.login_user_name}
                                    </span>
                                    <Button
                                        icon="poweroff"
                                        type="default"
                                        style={{marginLeft: 5}}
                                        onClick={LoginOut}
                                    >
                                        注销
                                    </Button>
                                </div>
                            </Header>
                            <Layout>
                                <Sider width={200} style={{ background: '#fff' }}>
                                    <Menu mode="inline" defaultSelectedKeys={['1']} defaultOpenKeys={['sub1']} style={{ height: '100%' }}>
                                        <SubMenu key="sub1" title={<span><Icon type="cloud-server" />server</span>}>
                                            <Menu.Item key="1">
                                                <Link to="/Cloud">主机</Link>
                                            </Menu.Item>
                                        </SubMenu>
                                        <SubMenu key="sub2" title={<span><Icon type="database" />MySQL</span>}>
                                            <Menu.Item key="1">
                                                <Link to="#">主机</Link>
                                            </Menu.Item>
                                            <Menu.Item key="2">
                                                <Link to="/mysqlInstance">实例</Link>
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
                                                <Link to="/auditSqlIndex">SQL审核</Link>
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
                                    <Route exact path="/" component={() => {
                                        if (this.state.is_dba) {
                                            return <Cloud/>
                                        } else {
                                            return <Cloud/>
                                        }
                                    }}/>
                                    <Route exact path="/Cloud" component={Cloud} />
                                    <Route exact path="/mysqlCluster" component={mysqlCluster} />
                                    <Route exact path="/mysqlInstance" component={mysqlInstance} />
                                    <Route exact path="/publicManage" component={publicManage} />
                                    <Route exact path="/auditSqlIndex" component={AuditSqlIndex} />
                                    <Route exact path="/viewApplySqlByUuid/:submit_sql_uuid" component={ExecuteSql} />
                                    <Route exact path="/privilegesApply" component={privilegesApply} />
                                    <Route exact path="/viewPrivilegeInfoByUuid/:order_uuid" component={OrderInformation} />
                                    <Route exact path="/commonUser" component={commonUser} />
                                    <Route exact path="/home" component={Login} />
                                </Content>
                            </Layout>
                            <Footer style={{ textAlign: 'center' }}>Devpos Design ©2020 Created By Me</Footer>
                        </Layout>
                    </HashRouter>
                </div>
            )
        }else{
            return (
                <div>
                    <Layout className="layout">
                        <Header className="header">
                            <span>请先登陆</span>
                        </Header>
                        <Content style={{ margin: '0 auto',padding:'50px 50px' }}>
                            <Login></Login>
                        </Content>
                        <Footer style={{ textAlign: 'center' }}>Devpos Design ©2020 Created By Me</Footer>
                    </Layout>,
                </div>
            )
        }
    }
}
export default App;