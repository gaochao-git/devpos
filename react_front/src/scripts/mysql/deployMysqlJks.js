import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, data, Card, AutoComplete, Tooltip,message,Col,Descriptions,Collapse,Tag} from "antd";
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
            showParamsVisible:false,
            task_params:"",
            history_job_log:"",
            showJobStopVisible:false,
            stop_number:"",
            stop_job_name:"",
        }
    }

    componentDidMount() {
        this.getAllJobInfo()
    }
    //获取工单信息
    async getAllJobInfo() {
        let params = {job_name: "install_mysql"};
        await MyAxios.post('/jks/v1/job_list/',params).then(
            res => {res.data.status==="ok" ?
                this.setState({
                    all_job_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }
    //获取日志信息
    async getJobLog(job_number, job_queue_id) {
        let params = {
                         job_number:job_number,
                         job_queue_id:job_queue_id,
                         job_name: "install_mysql"
                     };
        await MyAxios.post('/jks/v1/job_log/',params).then(
            res => {res.data.status==="ok" ?
                this.setState({
                    showJobLogVisible:true,
                    history_job_log: res.data.data.console_log.replace(/\r\n/g,'<br/>')
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }
     //停止任务
    async JobStop() {
        let params = {job_name:this.state.stop_job_name,job_number:this.state.stop_number,};
        await MyAxios.post('/jks/v1/job_stop/',params).then(
            res => {
                if(res.data.status==="ok"){
                    message.success(res.data.message)
                   this.setState({showJobStopVisible:false})
                }else{
                    message.error(res.data.message)
                }
            }
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
            dataIndex: 'user_name',
          },
          {
              title: 'job_name',
              dataIndex: 'job_name',
          },
            {
                title: 'queue_id',
                dataIndex: 'queue_id',
            },
            {
                title: 'job_number',
                dataIndex: 'number',
            },
            {
                title: '构建中',
                dataIndex: 'building',
            },
          {
              title: '构建结果',
              dataIndex: 'result',
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
            title: '任务参数',
            dataIndex: 'job_params',
            render: (text,record) => {
              return (
                <Button type="dash" onClick={()=>{this.setState({task_params:text, showParamsVisible:true})}}>查看参数</Button>
              )
            }
          }
          ,
          {
            title: '操作',
            render: (text,record) => {
              return (
              <div>
                <Button type="danger"  onClick={()=>{this.setState({stop_number: record.number,stop_job_name:record.job_name, showJobStopVisible:true})}}>停止任务</Button>
                <Button type="primary" onClick={()=>{this.getJobLog(record.number, record.queue_id)}}>查看日志</Button>
              </div>

              )
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
                    <Modal visible={this.state.showParamsVisible}
                        onCancel={() => this.setState({showParamsVisible:false})}
                        title="任务参数"
                        footer={false}
                        width={1200}
                    >
                        {this.state.task_params===""?null:
                        <TextArea wrap="off" style={{overflow:"scroll"}} rows={10} value={JSON.stringify(eval('(' + this.state.task_params + ')'),null,4)}/>}
                    </Modal>
                    <Modal visible={this.state.showJobLogVisible}
                        onCancel={() => this.setState({showJobLogVisible:false})}
                        title="日志信息"
                        footer={false}
                        width={1200}
                    >
                        <div dangerouslySetInnerHTML = {{ __html: this.state.history_job_log}}></div>
                    </Modal>
                    <Modal visible={this.state.showJobStopVisible}
                        onCancel={() => this.setState({showJobStopVisible:false})}
                        title="停止任务"
                        footer={false}
                        width={300}
                    >
                        <Button onClick={()=>this.JobStop()} type="danger" style={{ marginRight: '10px' }}>停止任务</Button>
                        <Button onClick={() => this.setState({showJobStopVisible:false})} type="primary">返回</Button>
                    </Modal>
            </div>
        )
    }
}