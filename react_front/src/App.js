import React,{Component} from 'react';
import axios from 'axios'
import moment from 'moment';
import {Layout, Menu, Icon, Button, Tooltip,message} from "antd";
import WaterMark from 'watermark-component-for-react';
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
import TableDesign from './scripts/console/tableDesign'
import JksJobConfig from './scripts/configManage/jksJobConfig'
import JksCommonJob from './scripts/jks/jksCommonJob'
import { backendServerApiRoot } from "./scripts/common/util";
import FaultTreeConfig from  "./scripts/faultTreeConfig/index"
import LinkSentinel from './scripts/mysql/linkSentinel'
import AIFactory from './scripts/aiApp/aIFactory'

const { Header, Footer, Sider, Content } = Layout;
const { SubMenu } = Menu;

function LoginOut(){
    console.log("退出登陆");
    window.localStorage.removeItem("token");
    window.location.reload();
}

//sso登出使用
function LoginOutSSO(){
    window.localStorage.removeItem("userinfo");
    let aa = encodeURIComponent(`${window.location.href}`);
    let bb = encodeURIComponent(`?next=${aa}`);
    window.location = `${backendServerApiRoot}/sso_logout?next=api/sso_login/${bb}`;
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
            collapsed:false,
            waterText: ""
        }
    }
    componentDidMount() {
        this.getUserInfo();
        this.routerChange();
    }

    routerChange= ()=>{
        console.log('window.location.pathname')
        var path = window.location.pathname.split("/")[1]
        if (path=="service"){
            this.setState({current_nav:"服务"})
        }else if (path=="ops"){
            this.setState({current_nav:"运维"})
        }else if (path=="manage"){
            this.setState({current_nav:"管理"})
        }
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
                        login_user_email:res.data.data[0]['email'],
                        waterText: res.data.data[0]['name'] + ", " + moment().format('YYYY-MM-DD')
                    });
                    window.localStorage.setItem("userinfo", JSON.stringify(res.data.data[0]))
                }else
                {
                   message.error(res.data.message);
                   window.localStorage.removeItem("userinfo");
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    //更改服务、运维、管理标签
    handlerClick = e =>{
        this.setState({current_nav:e.key});
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
                                        <Link to="/service/server/Server">服务</Link>
                                    </Menu.Item>
                                    <Menu.Item key="运维" style={{marginLeft:'20px'}}>
                                        <Link to="/ops/deploy/deployMysql">运维</Link>
                                    </Menu.Item>
                                    <Menu.Item key="管理" style={{marginLeft:'20px'}}>
                                        <Link to="/manage/permission/userRole">管理</Link>
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
                                <Content style={{background: '#fff',minHeight: 280}}>
                                    {this.state.waterText.length!==0 && <WaterMark content={this.state.waterText} rotate={16} globalAlpha={0.1}>
                                        <Route exact path="/" component={() => {return <HomeDbaInfo/>}}/>
                                        <Route exact path="/home" component={Login} />
                                        <Route exact path="/homeDbaInfo" component={HomeDbaInfo} />
                                        <Route exact path="/service/server/Server" component={Server} />
                                        <Route exact path="/service/mysql/mysqlCluster" component={mysqlCluster} />
                                        <Route exact path="/service/mysql/mysqlInstance" component={mysqlInstance} />
                                        <Route exact path="/service/worksheet/auditSqlIndex" component={AuditSqlIndex} />
                                        <Route exact path="/service/worksheet/viewApplySqlByUuid/:submit_sql_uuid" component={ExecuteSql} />
                                        <Route exact path="/service/worksheet/privilegesApply" component={privilegesApply} />
                                        <Route exact path="/service/worksheet/viewPrivilegeInfoByUuid/:order_uuid" component={OrderInformation} />
                                        <Route exact path="/service/console/mysqlConsoleNew" component={MysqlConsoleNew} />
                                        <Route exact path="/service/console/metaCompare" component={MetaCompare} />
                                        <Route exact path="/service/console/mysqlConsole" component={mysqlConsole} />
                                        <Route exact path="/ops/deploy/viewDeployMysqlByUuid/:submit_uuid" component={ExecuteDeployMysql} />
                                        <Route exact path="/service/deploy/rds" component={Rds} />
                                        <Route exact path="/manage/permission/databaseResource" component={DatabaseResource} />
                                        <Route exact path="/ops/deploy/deployMysql" component={DeployMysql} />
                                        <Route exact path="/ops/deploy/deployMysqljks" component={DeployMysqlJks} />
                                        <Route exact path="/manage/permission/userRole" component={UserRole} />
                                        <Route exact path="/manage/task/taskManage" component={TaskManage} />
                                        <Route exact path="/manage/permission/publicManage" component={publicManage} />
                                        <Route exact path="/manage/config/jksJobConfig" component={JksJobConfig} />
                                        <Route exact path="/manage/permission/commonUser" component={commonUser} />
                                        <Route exact path="/service/console/tableDesign" component={TableDesign} />
                                        <Route exact path="/ops/deploy/jksCommonJob" component={JksCommonJob} />
                                        <Route exact path="/manage/config/faultTreeConfig" component={FaultTreeConfig} />
                                        <Route exact path="/service/mysql/linkSentinel" component={LinkSentinel} />
                                        <Route exact path="/service/aiApp/aIFactory" component={AIFactory} />
                                    </WaterMark>}
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