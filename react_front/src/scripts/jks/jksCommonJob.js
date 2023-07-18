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
            jks_job_config_list:[],
            jks_job_comment:"",
            showSubmitVisible:false,
            default_jks_job_params:[],  //默认渲染的参数
            submit_jks_job_params:[],  //真正传递给jks执行的参数
        }
    }

    componentDidMount() {
        this.getJksJobConfigList()
    }
    //获取工单信息
    async getJksJobConfigList() {
        await MyAxios.post('/jks/v1/get_jks_job_config_list/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    jks_job_config_list: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }

    //提交任务
    async submitJob() {
        let params = {
            jks_job_name: this.state.jks_job_name,
            jks_job_params: this.state.submit_jks_job_params,
        };
        await MyAxios.post('/jks/v1/dispatch_jks_job/',params).then(
            res => {
                if(res.data.status==="ok") {
                    this.setState({showSubmitVisible:false});
                    message.success("提交任务成功");
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
                    //选项参数第一个值为默认值,不仅仅在页面需要展示,也需要在提交任务时将参数赋值
                    let jks_job_params  = JSON.parse(res.data.data[0]['jks_job_params'].replace(/\n/g,"\\n").replace(/\r/g,"\\r"))
                    let format_jks_job_params_list = []
                    jks_job_params.forEach((item)=>{
                        let format_jks_job_params_dict = {}
                        if (item['type']==="选项参数"){
                            format_jks_job_params_dict['params_name'] = item['params_name']
                            format_jks_job_params_dict['params_value'] = item['params_value'].split('\n')[0]
                        }else{
                            format_jks_job_params_dict['params_name'] = item['params_name']
                            format_jks_job_params_dict['params_value'] = item['params_value']
                        }
                    })
                    this.setState({
                        default_jks_job_params: jks_job_params,
                        submit_jks_job_params: format_jks_job_params_list,  //
                        jks_job_comment: res.data.data[0]['jks_job_comment'],
                    });
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    //修改参数值
    modifyParams = (params_name,params_value) =>{
        console.log(params_name,params_value)
        let default_jks_job_params = [...this.state.submit_jks_job_params];
        default_jks_job_params.forEach((item) => {
          if (params_name === item['params_name']) {
            item['params_value']=params_value
          }
        });
        console.log(this.state.submit_jks_job_params)
    }

    render() {
        return (
            <div className="container">
                <Tabs>
                    <TabPane tab="JKS任务执行" key="1">
                    <Row gutter={24}>
                        <Col span={8}>
                            选择任务
                            <Select
                                value={this.state.job_name}
                                style={{width:'100%',marginBottom:"30px"}}
                                onChange={e => this.setState({jks_job_name:e},()=>this.getJksJobConfigDetail())}
                            >
                                {this.state.jks_job_config_list.map((record) => <Option key={record.jks_job_name} value={record.jks_job_name}>{record.jks_job_name}</Option>)}
                            </Select>
                            任务描述
                            <TextArea disabled={true} rows={8} value={this.state.jks_job_comment} style={{width:'100%'}}/>
                        </Col>
                        <Col span={16}>
                            {this.state.default_jks_job_params.map(record =>{
                                  return (
                                      <div>
                                          {record.type==="选项参数" ?
                                              <div style={{marginBottom:30}}>
                                                  {record.params_name}: {record.params_comment}
                                                  <Select style={{width:'100%'}} onChange={value => this.modifyParams(record.params_name,value)}>
                                                      {record.params_value.split("\n").map((type) => <Option key={type} value={type}>{type}</Option>)}
                                                  </Select>
                                              </div>
                                              :null
                                          }
                                          {record.type==="文本参数" ?
                                              <div style={{marginBottom:30}}>
                                                  {record.params_name}: {record.params_comment}
                                                  <TextArea rows={record.extra_info} key={record.params_value} defaultValue={record.params_value} style={{width:'100%'}}  onChange={e => this.modifyParams(record.params_name,e.target.value)}/>
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
                        <Button type="primary" loading={this.state.sql_check_loading} onClick={()=>{this.setState({showSubmitVisible:true})}}>开始构建</Button>
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