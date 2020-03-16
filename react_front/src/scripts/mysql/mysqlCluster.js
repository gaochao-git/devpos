import React,{Component} from 'react';
import axios from 'axios'
import {Table, Input, Badge, Tabs, Card, Col, Row, Button} from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import {backendServerApiRoot} from "../common/util"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { Search } = Input;
const { TabPane } = Tabs;
const Column = Table.Column;
function callback(key) {
  console.log(key);
}
export default class mysqlCluster extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            cluster_info:[],
        }
    }

    componentDidMount() {
        this.GetClusterInfo()
    }
    //获取所有集群信息
    async GetClusterInfo() {
        let res = await axios.get(`${backendServerApiRoot}/get_mysql_cluster_info/`);
        console.log(res.data);
        console.log(window && window.location && window.location.hostname);
        this.setState({
            cluster_info: res.data.data
        })
    }
    //模糊搜索
    async GetSearchClusterInfo(cluster_name) {
        this.setState({
            cluster_info: []
        })
        let res = await axios.post(`${backendServerApiRoot}/get_search_mysql_cluster_info/`,{cluster_name});
        console.log(res.data);
        this.setState({
            cluster_info: res.data.data
        })
    }

    render() {
        let {cluster_info} = this.state;
        const temp = {}; // 当前重复的值,支持多列
        const mergeCells = (text, array, columns) => {
          let i = 0;
          if (text !== temp[columns]) {
            temp[columns] = text;
            array.forEach((item) => {
              if (item.cluster_name === temp[columns]) {
                i += 1;
              }
            });
          }
          return i;
        };
        const columns = [
          {
            title: '集群名',
            dataIndex: 'cluster_name',
            key: 'cluster_name',
            render: (text, record) => {
              const obj = {
                children: text,
                props: {},
              };
              obj.props.rowSpan = mergeCells(record.cluster_name, cluster_info, 'cluster_name');
              return obj;
            },
          },
          {
            title: '集群类型',
            dataIndex: 'cluster_type',
          },
          {
              title: '主机名',
              dataIndex: 'host_name',
          },
          {
              title: '实例名',
              colSpan: 1,
              dataIndex: 'instance_name',
          },
          {
            title: '实例状态',
            dataIndex: 'instance_status',
            render:(val) => {
                return <span>{val==="正常服务" ? <Badge status="success"/>:<Badge status="error"/>}{val}</span>
            }
          },
          {
            title: 'read_only',
            dataIndex: 'read_only',
          },
          {
              title: '版本',
              dataIndex: 'version',
          },
          {
              title: '字符集',
              dataIndex: 'server_charset',
          },
          {
              title: 'master_ip',
              dataIndex: 'master_ip',
          },
          {
              title: 'master_port',
              dataIndex: 'master_port',
          },
        ];
        const hostDataSource = [
            {
                key: '1',
                hostname: 'l-fbdb1.dba.cn1',
                disk_avaliable: 32,
                disk_io: 0.7,
                cpu: 0.7,
                load: 23,
                net_interface_in:400,
                net_interface_out:400,
            },
            {
                key: '2',
                hostname: 'l-fbdb2.dba.cn1',
                disk_avaliable: 32,
                disk_io: 0.7,
                cpu: 0.7,
                load: 23,
                net_interface_in:400,
                net_interface_out:400,
            },
            {
                key: '3',
                hostname: 'l-fbdb3.dba.cn1',
                disk_avaliable: 32,
                disk_io: 0.7,
                cpu: 0.7,
                load: 23,
                net_interface_in:400,
                net_interface_out:400,
            },
        ];
        const mysqlCommonDataSource = [
            {
                key: '1',
                hostname: 'l-fbdb1.dba.cn1',
                port: 3320,
                instance_name: '10.88.74.185_3320',
                is_alive: 'Yes',
                current_running_sql_count: 24,
                current_connected_user_ratio: 0.1,
                hold_global_lock: "NO",
                hold_meta_lock: "NO",
            },
            {
                key: '2',
                hostname: 'l-fbdb2.dba.cn1',
                port: 3320,
                instance_name: '10.88.74.185_3320',
                is_alive: 'Yes',
                current_running_sql_count: 3,
                current_connected_user_ratio: 0.5,
                hold_global_lock: "NO",
                hold_meta_lock: "NO",
            },
            {
                key: '3',
                hostname: 'l-fbdb3.dba.cn1',
                port: 3320,
                instance_name: '10.88.74.185_3320',
                is_alive: 'Yes',
                current_running_sql_count: 8,
                current_connected_user_ratio: 0.95,
                hold_global_lock: "NO",
                hold_meta_lock: "NO",
            },
        ];
        const mysqlReplicationDataSource = [
            {
                key: '1',
                hostname: 'l-fbdb1.dba.cn1',
                instance_name: '10.88.74.185_3320',
                port: 3320,
                io_thread: 'Yes',
                sql_thread: 'Yes',
                seconds_behind_master : 0,
            },
            {
                key: '2',
                hostname: 'l-fbdb2.dba.cn1',
                port: 3320,
                instance_name: '10.88.74.185_3320',
                io_thread: 'Yes',
                sql_thread: 'Yes',
                seconds_behind_master : 0,
            },
            {
                key: '3',
                hostname: 'l-fbdb3.dba.cn1',
                port: 3320,
                instance_name: '10.88.74.185_3320',
                io_thread: 'Yes',
                sql_thread: 'Yes',
                seconds_behind_master : 0,
            },
        ];
        const galeraDataSource = [
            {
                key: '1',
                hostname: 'l-fbdb1.dba.cn1',
                instance_name: '10.88.74.185_3320',
                port: 3320,
                wsrep_cluster_name: "gaochao_test_wsrep_cluster",
                wsrep_cluster_size: 3,
                wsrep_local_state_comment:"Synced",
                wsrep_connected: 'ON',
                wsrep_ready : 'ON',
            },
            {
                key: '2',
                hostname: 'l-fbdb2.dba.cn1',
                instance_name: '10.88.74.185_3320',
                port: 3320,
                wsrep_cluster_name: "gaochao_test_wsrep_cluster",
                wsrep_cluster_size: 3,
                wsrep_local_state_comment:"Synced",
                wsrep_connected: 'ON',
                wsrep_ready : 'ON',
            },
            {
                key: '3',
                hostname: 'l-fbdb3.dba.cn1',
                instance_name: '10.88.74.185_3320',
                port: 3320,
                namespace: "gaochao_test_wsrep_cluster",
                wsrep_cluster_size: 3,
                wsrep_local_state_comment:"Synced",
                wsrep_connected: 'ON',
                wsrep_ready : 'ON',
            },
        ];
        const mysqlErrorLogDataSource = [
            {
                key: '1',
                hostname: 'l-fbdb1.dba.cn1',
                instance_name: '10.88.74.185_3320',
                port: 3320,
                error_log_info: "dead lock",
            },
            {
                key: '2',
                hostname: 'l-fbdb2.dba.cn1',
                instance_name: '10.88.74.185_3320',
                port: 3320,
                error_log_info: "dead lock",
            },
            {
                key: '3',
                hostname: 'l-fbdb3.dba.cn1',
                instance_name: '10.88.74.185_3320',
                port: 3320,
                error_log_info: "dead lock",
            },
        ];
        const mysqlSlowLogDataSource = [
            {
                key: '1',
                hostname: 'l-fbdb1.dba.cn1',
                instance_name: '10.88.74.185_3320',
                port: 3320,
                lock_time_sql_count:30,
                rows_sent_sql_count:10,
                rows_examined_sql_count:100,
                rows_affected_sql_count:100,
            },
            {
                key: '2',
                hostname: 'l-fbdb2.dba.cn1',
                instance_name: '10.88.74.185_3320',
                port: 3320,
                lock_time_sql_count:30,
                rows_sent_sql_count:10,
                rows_examined_sql_count:100,
                rows_affected_sql_count:100,
            },
            {
                key: '3',
                hostname: 'l-fbdb3.dba.cn1',
                instance_name: '10.88.74.185_3320',
                port: 3320,
                lock_time_sql_count:30,
                rows_sent_sql_count:10,
                rows_examined_sql_count:100,
                rows_affected_sql_count:100,
            },
        ];
        return (
            <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">
                            Home
                        </Link>
                        >>
                        <Link className="title-text" to="/mysqlCluster">
                            集群信息
                        </Link>
                    </div>
                    <div>
                        <Search
                          placeholder="集群名"
                          onSearch={value => this.GetSearchClusterInfo(value)}
                          style={{ width: 200 }}
                          allowClear
                        />
                    </div>
                </div>
                <Table
                    dataSource={this.state.cluster_info}
                    columns={columns}
                    bordered
                    size="small"
                />
                <Tabs defaultActiveKey="1" onChange={callback}>
                    <TabPane tab="诊断" key="1">
                        <div className="site-card-wrapper">
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Card title="主机诊断" bordered={false} size="small">
                                        <Table
                                            dataSource={hostDataSource}
                                            rowKey={(row ,index) => index}
                                            pagination={false}
                                            size="small"
                                            bordered={true}
                                        >
                                            <Column title="主机名" dataIndex="hostname"/>
                                            <Column title="磁盘剩余空间(M)" dataIndex="disk_avaliable"/>
                                            <Column title="磁盘io(%util)" dataIndex="disk_io"/>
                                            <Column title="Cpu(%)" dataIndex="cpu"/>
                                            <Column title="load" dataIndex="load"/>
                                            <Column title="网卡流量入(Mib)" dataIndex="net_interface_in"/>
                                            <Column title="网卡流量出(Mib)" dataIndex="net_interface_out"/>
                                        </Table>
                                    </Card>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Card title="MySQL通用诊断" bordered={false} size="small">
                                        <Table
                                            dataSource={mysqlCommonDataSource}
                                            rowKey={(row ,index) => index}
                                            pagination={false}
                                            size="small"
                                            bordered={true}
                                        >
                                            {/*<Column title="主机名" dataIndex="hostname"/>*/}
                                            {/*<Column title="端口" dataIndex="port"/>*/}
                                            <Column title="实例名" dataIndex="instance_name"/>
                                            <Column title="是否运行" dataIndex="is_alive"/>
                                            {/*<Column title="运行sql数量" dataIndex="current_running_sql_count"/>*/}
                                            <Column title="运行sql数量"
                                                render={record => {
                                                        return (
                                                            <div>
                                                                {record.current_running_sql_count>=24 ? <span className = 'row-detail-error'>{record.current_running_sql_count}</span>:<span>{record.current_running_sql_count}</span>}
                                                                <Button className="link-button" style={{marginLeft:15}}  onClick={()=>{this.viewRunningSqlByInstanceName(record.instance_name)}}>查看详情</Button>
                                                            </div>

                                                        )
                                                    }
                                                }
                                            />
                                            {/*<Column title="连接数比例" dataIndex="current_connected_user_ratio"/>*/}
                                            <Column title="当前连接数/最大连接数(%)"
                                                // render={record => {
                                                //     return <Link to={`/viewConnectedUserByInstanceName/${record.instance_name}`}>{record.current_connected_user_ratio}</Link>
                                                // }}
                                                render={record => {
                                                        return (
                                                            <div>
                                                                {record.current_connected_user_ratio>=0.95 ? <span className = 'row-detail-error'>{record.current_connected_user_ratio *100}</span>:<span>{record.current_connected_user_ratio*100}</span>}
                                                                <Button className="link-button" style={{marginLeft:15}}  onClick={()=>{this.viewConnectedUserByInstanceName(record.instance_name)}}>查看详情</Button>
                                                                <Button className="link-button" style={{marginLeft:15}}  onClick={()=>{this.viewConnectedUserByInstanceName(record.instance_name)}}>更改连接数</Button>
                                                            </div>

                                                        )
                                                    }
                                                }
                                            />
                                            <Column title="全局锁" dataIndex="hold_global_lock"/>
                                            <Column title="元数据锁" dataIndex="hold_meta_lock"/>
                                        </Table>
                                    </Card>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={13}>
                                    <Card title="galera诊断" bordered={false} size="small">
                                        <Table
                                            dataSource={galeraDataSource}
                                            rowKey={(row ,index) => index}
                                            pagination={false}
                                            size="small"
                                            bordered={true}
                                        >
                                            <Column title="实例名" dataIndex="instance_name"/>
                                            <Column title="wsrep_local_state_comment" dataIndex="wsrep_local_state_comment"/>
                                            <Column title="wsrep_connected" dataIndex="wsrep_connected"/>
                                            <Column title="wsrep_ready" dataIndex="wsrep_ready"/>
                                        </Table>
                                    </Card>
                                </Col>
                                <Col span={11}>
                                    <Card title="replication诊断" bordered={false} size="small">
                                        <Table
                                            dataSource={mysqlReplicationDataSource}
                                            rowKey={(row ,index) => index}
                                            pagination={false}
                                            size="small"
                                            bordered={true}
                                        >
                                            {/*<Column title="主机名" dataIndex="hostname"/>*/}
                                            {/*<Column title="端口" dataIndex="port"/>*/}
                                            <Column title="实例名" dataIndex="instance_name"/>
                                            <Column title="io_thread" dataIndex="io_thread"/>
                                            <Column title="sql_thread" dataIndex="sql_thread"/>
                                            <Column title="delay(s)" dataIndex="seconds_behind_master"/>
                                        </Table>
                                    </Card>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Card title="慢查询日志诊断(最近600s)" bordered={false} size="small">
                                        <Table
                                            dataSource={mysqlSlowLogDataSource}
                                            rowKey={(row ,index) => index}
                                            pagination={false}
                                            size="small"
                                            bordered={true}
                                        >
                                            {/*<Column title="主机名" dataIndex="hostname"/>*/}
                                            {/*<Column title="端口" dataIndex="port"/>*/}
                                            <Column title="实例名" dataIndex="instance_name"/>
                                            {/*<Column title="Lock_time异常sql数量(>1s)" dataIndex="lock_time_sql_count"/>*/}
                                            <Column title="Lock_time异常sql数量(>1s)"
                                                render={record => {
                                                        return (
                                                            <div>
                                                                {record.lock_time_sql_count>=24 ? <span className = 'row-detail-error'>{record.lock_time_sql_count}</span>:<span>{record.lock_time_sql_count}</span>}
                                                                <Button className="link-button" style={{marginLeft:15}}  onClick={()=>{this.viewRunningSqlByInstanceName(record.lock_time_sql_count)}}>查看详情</Button>
                                                            </div>

                                                        )
                                                    }
                                                }
                                            />
                                            {/*<Column title="Rows_sent异常sql数量(>1万)" dataIndex="rows_sent_sql_count"/>*/}
                                            <Column title="Rows_sent异常sql数量(>1万)"
                                                render={record => {
                                                        return (
                                                            <div>
                                                                {record.rows_sent_sql_count>=24 ? <span className = 'row-detail-error'>{record.rows_sent_sql_count}</span>:<span>{record.rows_sent_sql_count}</span>}
                                                                <Button className="link-button" style={{marginLeft:15}}  onClick={()=>{this.viewRunningSqlByInstanceName(record.rows_sent_sql_count)}}>查看详情</Button>
                                                            </div>

                                                        )
                                                    }
                                                }
                                            />
                                            {/*<Column title="Rows_examined异常SQL数量(>1万)" dataIndex="rows_examined_sql_count"/>*/}
                                            <Column title="Rows_examined异常SQL数量(>1万)"
                                                render={record => {
                                                        return (
                                                            <div>
                                                                {record.rows_examined_sql_count>=24 ? <span className = 'row-detail-error'>{record.rows_examined_sql_count}</span>:<span>{record.rows_examined_sql_count}</span>}
                                                                <Button className="link-button" style={{marginLeft:15}}  onClick={()=>{this.viewRunningSqlByInstanceName(record.rows_examined_sql_count)}}>查看详情</Button>
                                                            </div>

                                                        )
                                                    }
                                                }
                                            />
                                            {/*<Column title="Rows_affected异常SQL数量(>1万)" dataIndex="rows_affected_sql_count"/>*/}
                                            <Column title="Rows_affected异常SQL数量(>1万)"
                                                render={record => {
                                                        return (
                                                            <div>
                                                                {record.rows_affected_sql_count>=24 ? <span className = 'row-detail-error'>{record.rows_affected_sql_count}</span>:<span>{record.rows_affected_sql_count}</span>}
                                                                <Button className="link-button" style={{marginLeft:15}}  onClick={()=>{this.viewRunningSqlByInstanceName(record.rows_affected_sql_count)}}>查看详情</Button>
                                                            </div>

                                                        )
                                                    }
                                                }
                                            />
                                        </Table>
                                    </Card>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Card title="错误日志诊断(最近600s)" bordered={false} size="small">
                                        <Table
                                            dataSource={mysqlErrorLogDataSource}
                                            rowKey={(row ,index) => index}
                                            pagination={false}
                                            size="small"
                                            bordered={true}
                                        >
                                            <Column title="实例名" dataIndex="instance_name"/>
                                            <Column title="错误日志信息" dataIndex="error_log_info"/>
                                        </Table>
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    </TabPane>
                    <TabPane tab="Tab 2" key="2">
                        Content of Tab Pane 2
                    </TabPane>
                    <TabPane tab="Tab 3" key="3">
                        Content of Tab Pane 3
                    </TabPane>
              </Tabs>
            </div>
        )
    }
}