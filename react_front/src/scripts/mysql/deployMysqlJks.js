import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, data, Card, AutoComplete, Tooltip,message,Col,Descriptions,Collapse} from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
const { Search } = Input;
const { TabPane } = Tabs;
const FormItem = Form.Item;
const { Option } = Select;
const { TextArea } = Input
const { Panel } = Collapse;


export default class DeployMysqlJks extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            all_job_info:[],
            showSubmitVisible:false,
            topo_source_placeholder:"ip port=3306 role=主  cluster_group_name=test cluster_name = test1 ha_type=mha\n ip port=3306 role=备 repl_master_ip=master_ip repl_master_port=master_port cluster_group_name=test cluster_name = test1 ha_type=mha",
            deploy_topos:"47.104.2.74 port=3306 role=主  cluster_group_name=test cluster_name=test1 ha_type=mha\n 47.104.2.75 port=3306 role=备 repl_master_ip=47.104.2.74 repl_master_port=3306 cluster_group_name=test cluster_name=test1 ha_type=mha",
            mysql_version:"5.7.32",
            deploy_type:"新建集群",
            job_name:"install_mysql",
        }
    }

    componentDidMount() {
        this.getAllJobInfo()
    }
    //获取工单信息
    async getAllJobInfo() {
        let params = {job_name: "install_mysql"};
        await MyAxios.get('/v1/jks/get_all_job/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    all_job_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }
    //提交任务
    async submitJob() {
        let params = {
            deploy_type: this.state.deploy_type,
            deploy_topos: this.state.deploy_topos,
            mysql_version: this.state.mysql_version,
            job_name: this.state.job_name,
        };
        await MyAxios.post('/jks/v1/install_mysql/',params).then(
            res => {
                if(res.data.status==="ok") {
                    this.setState({showSubmitVisible:false});
                    message.success("提交任务成功");
                    this.getAllJobInfo();
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    render() {
        const columns = [
          {
            title: '用户',
            dataIndex: 'submit_user',
          },
          {
              title: '机房',
              dataIndex: 'idc',
          },
            {
                title: '版本',
                dataIndex: 'mysql_version',
            },
            {
                title: '高可用架构',
                dataIndex: 'deploy_archit',
            },
          {
              title: '审核状态',
              dataIndex: 'submit_check',
          },
          {
              title: '审核内容',
              dataIndex: 'submit_check_comment',
          },
         {
             title: '是否执行',
             dataIndex: 'submit_execute',
         },
          {
            title: '执行结果',
            dataIndex: 'deploy_status',
          },
          {
            title: '创建时间',
            dataIndex: 'create_time',
          },
          {
            title: '更新时间',
            dataIndex: 'update_time',
          },
          {
            title: '操作',
            render: (record) => {
              return <Link to={`/viewDeployMysqlByUuid/${record.submit_uuid}`}>查看</Link>
            }
          }

        ];
        return (
            <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">
                            Home
                        </Link>
                        >>
                        <Link className="title-text" to="/CloudInstance">
                            部署mysql-jks
                        </Link>
                    </div>
                </div>
            <div>
            </div>
                <Tabs>
                <TabPane tab="部署" key="1">
                        <div className="sub-title-input">
                            <Select defaultValue="新建集群" style={{ width: 300 }} onChange={e => this.setState({deploy_type:e})}>
                                <Option value="新建集群">新建集群</Option>
                                <Option value="增加实例">增加实例</Option>
                            </Select>
                            <Select defaultValue="选择MySQL版本" style={{ width: 300 }} onChange={e => this.setState({mysql_version:e})}>
                                <Option value="mysql5.7.22">MySQL5.7</Option>
                                <Option value="mysql8.0.22">MySQL8.0</Option>
                            </Select>
                        </div>
                        <div>
                            <TextArea rows={10} placeholder={this.state.topo_source_placeholder} onChange={e => this.setState({deploy_topos:e.target.value})}/>
                            <Button type="primary" loading={this.state.sql_check_loading} onClick={()=>{this.setState({showSubmitVisible:true})}}>提交工单</Button>
                        </div>
                    </TabPane>
                    <TabPane tab="工单列表" key="2">
                    <Table
                        dataSource={this.state.all_job_info}
                        rowKey={(row ,index) => index}
                        columns={columns}
                        pagination={{
                            showTotal: ((total) => {return `共 ${total} 条`}),
                        }}
                        bordered
                        size="small"
                    />
                    </TabPane>
                </Tabs>
                    <Modal visible={this.state.showSubmitVisible}
                        onCancel={() => this.setState({showSubmitVisible:false})}
                        title="确认提交?"
                        footer={false}
                        width={300}
                    >
                        <Row type="flex" justify='center' style={{ marginTop: '10px' }}>
                            <Button onClick={()=>this.submitJob()} type="primary" style={{ marginRight: '10px' }}>执行</Button>
                            <Button onClick={() => this.setState({showSubmitVisible:false})} type="primary">返回</Button>
                        </Row>
                    </Modal>
            </div>
        )
    }
}