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


export default class JksCommonJob extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            jks_job_name: "选择任务",
            jks_job_config_list:['install_mysql','start_mysql'],
            jks_job_comment:"",
            showSubmitVisible:false,
            mysql_version:"5.7.32",
            deploy_type:"新建集群",
            job_name:"install_mysql",
            showParamsVisible:false,
            task_params:"",
            history_job_log:"",
            showJobStopVisible:false,
            stop_number:"",
            jks_job_params:[],
            stop_job_name:"",
//            jks_job_params: [{'key': 1, 'params_name': 'act', 'params_value': 'on\noff', 'type': '选项参数', 'params_comment': '踢库/上库'}, {'key': 2, 'params_name': 'name', 'params_value': '', 'type': '字符串参数', 'params_comment': '库名'}, {'key': 3, 'params_name': 'idc', 'params_value': '10', 'type': '文本参数', 'params_comment': '机房'}]
        }
    }

    componentDidMount() {
        this.getJksJobConfigList()
    }
    //获取工单信息
    async getJksJobConfigList() {
        let params = {job_name: "install_mysql"};
        await MyAxios.post('/jks/v1/get_jks_job_config_list/',params).then(
            res => {res.data.status==="ok" ?
                this.setState({
                    jks_job_config_list: res.data.data
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

    //获取任务配置
    async getJksJobConfigDetail() {
        let params = {jks_job_name: this.state.jks_job_name};
        await MyAxios.post('/jks/v1/get_jks_job_config_detail/',params).then(
            res => {
                if(res.data.status==="ok") {
                    this.setState({
                        jks_job_params: JSON.parse(res.data.data[0]['jks_job_params'].replace(/\n/g,"\\n").replace(/\r/g,"\\r")),
                        jks_job_comment: res.data.data[0]['jks_job_comment'],
                    });
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    //修改参数值
    async modifyParams(params_name,params_value) {
        console.log(params_name,params_value)
        let jks_job_params = [...this.state.jks_job_params];
        jks_job_params.forEach((item) => {
          if (params_name === item['params_name']) {
            item['params_value']=params_value
          }
        });
        console.log(this.state.jks_job_params)
//        let params = {jks_job_name: e};
//        await MyAxios.post('/jks/v1/install_mysql/',params).then(
//            res => {
//                if(res.data.status==="ok") {
//                    this.setState({showSubmitVisible:false});
//                    message.success("提交任务成功");
//                    this.getAllJobInfo();
//                }else{
//                    message.error(res.data.message)
//                }
//            }
//        ).catch(err => {message.error(err.message)})
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
            <div className="container">
                <Tabs>
                    <TabPane tab="JKS任务执行" key="1">
                    <Row gutter={24}>
                        <Col span={8}>
                            选择任务
                            <Select style={{width:'100%',marginBottom:30}} onChange={e => this.setState({jks_job_name:e},()=>this.getJksJobConfigDetail())}>
                                {this.state.jks_job_config_list.map((record) => <Option key={record.jks_job_name} value={record.jks_job_name}>{record.jks_job_name}</Option>)}
                            </Select>
                            任务描述
                            <TextArea disabled={true} rows={8} value={this.state.jks_job_comment} style={{width:'100%'}}/>
                        </Col>
                        <Col span={16}>
                            {this.state.jks_job_params.map(record =>{
                                  return (
                                      <div>
                                          {record.type==="选项参数" ?
                                              <div style={{marginBottom:30}}>
                                                  {record.params_name}: {record.params_comment}
                                                  <Select style={{width:'100%'}} onChange={e => this.modifyParams(record.params_name,e)}>
                                                      {record.params_value.split("\n").map((type) => <Option key={type} value={type}>{type}</Option>)}
                                                  </Select>
                                              </div>
                                              :null
                                          }
                                          {record.type==="文本参数" ?
                                              <div style={{marginBottom:30}}>
                                                  {record.params_name}: {record.params_comment}
                                                  <TextArea rows={record.extra_info} defaultValue={record.params_value} style={{width:'100%'}}  onChange={e => this.modifyParams(record.params_name,e.target.value)}/>
                                              </div>
                                              :null
                                          }{record.type==="字符串参数" ?
                                              <div style={{marginBottom:30}} >
                                                  {record.params_name}: {record.params_comment}
                                                  <Input defaultValue={record.params_value} style={{width:'100%'}}  onChange={e => this.modifyParams(record.params_name,e.target.value)}/>
                                              </div>
                                              :null
                                          }
                                      </div>
                                  )
                              })
                            }
                        </Col>

                      </Row>
                        <Button type="primary" loading={this.state.sql_check_loading} onClick={()=>{this.setState({showSubmitVisible:true})}}>提交工单</Button>
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