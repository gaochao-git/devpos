import React,{Component} from 'react';
import axios from 'axios'
import { Layout, Menu, Icon } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import {HashRouter,Route} from 'react-router-dom';
import mysqlCluster from './scripts/MysqlCluster/cluster'
import checkSql from './scripts/checkSql/inceptionCheckSql'
const { Header, Footer, Sider, Content } = Layout;
const { SubMenu } = Menu;

axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';

const server = 'http://127.0.0.1:8000';



class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
        }
    }

    render() {
        return(
            <div className="App">
                <HashRouter>
                    <Layout>
                        <Header>Header</Header>
                         <Layout>
                             <Sider width={200} style={{ background: '#fff' }}>
                                <Menu mode="inline" defaultSelectedKeys={['1']} defaultOpenKeys={['sub1']} style={{ height: '100%' }}>
                                     <SubMenu key="sub1" title={<span><Icon type="cloud-server" />server</span>}>
                                        <Menu.Item key="1">云主机</Menu.Item>
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
                                           <Link to="/checkSql">SQL审核</Link>
                                       </Menu.Item>
                                       <Menu.Item key="2">权限申请</Menu.Item>
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
                                     </SubMenu>
                                </Menu>
                             </Sider>
                             <Content>
                                 <Route exact path="/mysqlCluster" component={mysqlCluster} />
                                 <Route exact path="/commonUser" component={mysqlCluster} />
                                 <Route exact path="/checkSql" component={checkSql} />
                             </Content>
                         </Layout>
                             <Footer >Footer</Footer>
                    </Layout>
                </HashRouter>
            </div>
        )
    }
}
export default App;