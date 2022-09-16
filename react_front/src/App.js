import React,{Component} from 'react';
import axios from 'axios'
import {Layout, Menu, Icon, Button, Tooltip,message} from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import MyAxios from "./scripts/common/interface"
import HeadTimer from "./scripts/common/headTimer"
import {HashRouter,Route,BrowserRouter} from 'react-router-dom';
import mysqlCluster from './scripts/mysql/mysqlCluster'
import DeployMysql from "./scripts/mysql/deployMysql"
import DeployMysqlJks from "./scripts/mysql/deployMysqlJks"
import Rds from "./scripts/mysql/rds"
import ExecuteDeployMysql from "./scripts/mysql/executeDeployMysql"
import AuditSqlIndex from './scripts/auditSql/auditSqlIndex'
import ExecuteSql from './scripts/auditSql/executeSql'
import publicManage from "./scripts/publicUserManage/pubicUserPrivilegeManage"
import privilegesApply from "./scripts/privilegesApply/applicationForm";
import OrderInformation from './scripts/privilegesApply/orderInformation'
import commonUser from "./scripts/commonUser/commonUserCharge";
import Server from "./scripts/Server/Server";
import Login from "./scripts/login/login"
import mysqlInstance from './scripts/mysql/mysqlInstance'
import mysqlConsole from './scripts/console/mysqlConsole'
import MysqlConsoleNew from './scripts/console/mysqlConsoleNew'
import NavService from './scripts/home/nave_service'
import NavManage from './scripts/home/nave_manage'
import NavOps from './scripts/home/nave_ops'
import imgURL from './my_logo.jpg'
import HomeDbaInfo from './scripts/bigScreen/home_dba'
import UserRole from './scripts/permission/userRole'
import DatabaseResource from './scripts/permission/database_resource'
import TaskManage from './scripts/task/taskManage'
import MetaCompare from './scripts/console/metaCompare'


const { Header, Footer, Sider, Content } = Layout;
const { SubMenu } = Menu;

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
            login_user_role:"",
            current_nav:"",
            current_time:"",
            week_day:"",
            collapsed:false
        }
    }
    componentDidMount() {
        console.log(window.localStorage.getItem('token'))
        if (window.localStorage.getItem('token')){
          this.getUserInfo();
        };
        //如果tab主标签存在则跳到指定tab，否则跳到服务标签
        if (window.localStorage.current_nav){
            this.setState({current_nav: window.localStorage.current_nav});
        }else {
            this.setState({current_nav:"服务"});
        };
    }

    //根据token获取登陆信息
    async getUserInfo() {
        let headers = {"global_loading":false}
        await MyAxios.post('/login/v1/get_login_user_info/',{headers}).then(
            res => {
                if(res.data.status==="ok")
                {
                    this.setState({
                        login_name:res.data.data[0]['name'],
                        login_user_name:res.data.data[0]['username'],
                        login_user_role:res.data.data[0]['user_role'],
                        login_user_email:res.data.data[0]['email']
                    },)
                }else
                {
                   message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    //更改服务、运维、管理标签
    handlerClick = e =>{
        this.setState({current_nav:e.key});
        window.localStorage.setItem("current_nav", e.key)
    }

    onCollapse = collapsed => {
        this.setState({
        collapsed: !this.state.collapsed,
      });
    };
    render() {
        if (window.localStorage.getItem('token')) {
            return(
                <div className="App">
                    <BrowserRouter>
                        <Layout>
                            <Header className="header">
                                <div className="logo" style={{width:'10%'}}>
                                    <img alt="Logo" src={imgURL} style={{width:'30px',marginRight:'20px'}}/>
                                    <Icon
                                      className="trigger"
                                      type={this.state.collapsed ? 'menu-unfold' : 'menu-fold'}
                                      onClick={this.onCollapse}
                                    />
                                </div>

                                <Menu
                                    theme="dark"
                                    mode="horizontal"
                                    defaultOpenKeys={[this.state.current_nav]}
                                    onClick={this.handlerClick}
                                    selectedKeys={[this.state.current_nav]}
                                    style={{width:'60%'}}
                                >
                                    <Menu.Item key="服务" style={{marginLeft:'35px'}} >
                                        <Link to="/Server">服务</Link>
                                    </Menu.Item>
                                    <Menu.Item key="运维" style={{marginLeft:'20px'}}>
                                        <Link to="/deployMysql">运维</Link>
                                    </Menu.Item>
                                    <Menu.Item key="管理" style={{marginLeft:'20px'}}>
                                        <Link to="/userRole">管理</Link>
                                    </Menu.Item>
                                </Menu>
                                <HeadTimer />
                                <Tooltip
                                    title={
                                        <span>
                                            用户名:{this.state.login_user_name}
                                            <br/>角色:{this.state.login_user_role}
                                            <br/>部门:
                                            <br/>邮箱:{this.state.login_user_email}
                                        </span>
                                    }
                                >
                                    <Icon type="user" />{this.state.login_name}
                                </Tooltip>
                                <Button
                                    icon="poweroff"
                                    type="default"
                                    style={{marginLeft: 5}}
                                    onClick={LoginOut}
                                >
                                    注销
                                </Button>
                            </Header>
                            <Layout>
                                <Sider
                                    style={{ background: '#15344a',minHeight:'860px'}}
                                    collapsible
                                    collapsed={this.state.collapsed}
                                    onCollapse={this.onCollapse}
                                    trigger={null}
                                >
                                    {this.state.current_nav === "服务"? <NavService/>:null}
                                    {this.state.current_nav === "运维"? <NavOps/>:null}
                                    {this.state.current_nav === "管理"? <NavManage/>:null}
                                </Sider>
                                <Content
                                    style={{
                                      background: '#fff',
                                      minHeight: 280,
                                    }}
                                >
                                    <Route exact path="/" component={() => {
                                        if (this.state.is_dba) {
                                            return <HomeDbaInfo/>
                                        } else {
                                            return <HomeDbaInfo/>
                                        }
                                    }}/>
                                    <Route exact path="/Server" component={Server} />
                                    <Route exact path="/mysqlCluster" component={mysqlCluster} />
                                    <Route exact path="/mysqlInstance" component={mysqlInstance} />
                                    <Route exact path="/publicManage" component={publicManage} />
                                    <Route exact path="/auditSqlIndex" component={AuditSqlIndex} />
                                    <Route exact path="/viewApplySqlByUuid/:submit_sql_uuid" component={ExecuteSql} />
                                    <Route exact path="/privilegesApply" component={privilegesApply} />
                                    <Route exact path="/viewPrivilegeInfoByUuid/:order_uuid" component={OrderInformation} />
                                    <Route exact path="/commonUser" component={commonUser} />
                                    <Route exact path="/home" component={Login} />
                                    <Route exact path="/mysqlConsole" component={mysqlConsole} />
                                    <Route exact path="/homeDbaInfo" component={HomeDbaInfo} />
                                    <Route exact path="/deployMysql" component={DeployMysql} />
                                    <Route exact path="/deployMysqljks" component={DeployMysqlJks} />
                                    <Route exact path="/viewDeployMysqlByUuid/:submit_uuid" component={ExecuteDeployMysql} />
                                    <Route exact path="/rds" component={Rds} />
                                    <Route exact path="/userRole" component={UserRole} />
                                    <Route exact path="/databaseResource" component={DatabaseResource} />
                                    <Route exact path="/taskManage" component={TaskManage} />
                                    <Route exact path="/mysqlConsoleNew" component={MysqlConsoleNew} />
                                    <Route exact path="/metaCompare" component={MetaCompare} />
                                </Content>
                            </Layout>
                            <Footer style={{ textAlign: 'center' }}>Devpos Design ©2020 Created By Me</Footer>
                        </Layout>
                    </BrowserRouter>
                </div>
            )
        }else{
            return (
                <div className="App">
                <BrowserRouter>
                    <Layout className="layout">
                        <Content style={{ margin: '0 auto',padding:'300px 300px' }}>
                            <Login></Login>
                        </Content>
                        <Footer style={{ textAlign: 'center'}}>Devpos Design ©2020 Created By Me</Footer>
                    </Layout>,
                </BrowserRouter>
                </div>
            )
        }
    }
}
export default App;