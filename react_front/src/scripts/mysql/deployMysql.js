import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
//import { Table, Input,message,Tabs } from "antd";
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, data, Card, AutoComplete, Tooltip,message} from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import { backendServerApiRoot } from "../common/util"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { Search } = Input;
const { TabPane } = Tabs;
const FormItem = Form.Item;
const { Option } = Select;
const { TextArea } = Input

export default class DeployMysql extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            submit_info:[],
            showSubmitVisible:false,
            topo_source_placeholder:"说明:\n  部署实例1\n  部署实例2=>同步实例1\n例如:\n  47.104.2.74_3306\n  47.104.2.75_3306=>47.104.2.74_3306",
            deploy_topos:"",
            deploy_version:"",
            idc:"",
            deploy_archit:"",

        }
    }

    componentDidMount() {
        this.getDeploySubmitInfo()
    }
    //获取工单信息
    async getDeploySubmitInfo() {
        await MyAxios.post('/get_deploy_mysql_submit_info/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    submit_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }
    //提交工单
    async submitDeployMysql() {
        let params = {
            deploy_topos: this.state.deploy_topos,
            deploy_version: this.state.deploy_version,
            idc: this.state.idc,
            deploy_archit: this.state.deploy_archit,
        };
        await MyAxios.post('/submit_deploy_mysql/',params).then(
            res => {
                if(res.data.status==="ok") {
                    this.setState({showSubmitVisible:false});
                    message.success("提交任务成功");
                    this.getDeploySubmitInfo();
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
                dataIndex: 'deploy_version',
            },
            {
                title: '高可用架构',
                dataIndex: 'deploy_archit',
            },
            {
                title: '自定义参数',
                dataIndex: 'deploy_other_param',
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
                            部署mysql
                        </Link>
                    </div>
                </div>
            <div>
            </div>
                <Tabs>
                    <TabPane tab="工单列表" key="1">
                    <Table
                        dataSource={this.state.submit_info}
                        rowKey={(row ,index) => index}
                        columns={columns}
                        pagination={{
                            total:this.state.submit_info.length,
                            showTotal:(count=this.state.submit_info.length)=>{return '共'+count+'条'}
                        }}
                        bordered
                        size="small"
                    />
                    </TabPane>
                    <TabPane tab="新建部署工单" key="2">
                    <div className="sub-title-input">
                        <Select defaultValue="选择机房" style={{ width: 150 }} onChange={e => this.setState({idc:e})}>
                            <Option value="BJ10">BJ10</Option>
                            <Option value="BJ11">BJ11</Option>
                        </Select>
                        <Select defaultValue="选择高可用架构" style={{ width: 150 }} onChange={e => this.setState({deploy_archit:e})}>
                            <Option value="ms">主从</Option>
                            <Option value="MHA">MHA</Option>
                        </Select>
                        <Select defaultValue="选择MySQL版本" style={{ width: 150 }} onChange={e => this.setState({deploy_version:e})}>
                            <Option value="mysql5.7.22">MySQL5.7.22</Option>
                            <Option value="mysql8.0.22">MySQL8.0.22</Option>
                        </Select>
                    </div>
                    <div>
                        <TextArea rows={10} placeholder={this.state.topo_source_placeholder} onChange={e => this.setState({deploy_topos:e.target.value})}/>
                        <Button type="primary" loading={this.state.sql_check_loading} onClick={()=>{this.setState({showSubmitVisible:true})}}>提交工单</Button>
                    </div>

                    <Modal visible={this.state.showSubmitVisible}
                        onCancel={() => this.setState({showSubmitVisible:false})}
                        title="确认提交?"
                        footer={false}
                        width={300}
                    >
                        <Row type="flex" justify='center' style={{ marginTop: '10px' }}>
                            <Button onClick={()=>this.submitDeployMysql()} type="primary" style={{ marginRight: '10px' }}>执行</Button>
                            <Button onClick={() => this.setState({showSubmitVisible:false})} type="primary">返回</Button>
                        </Row>
                    </Modal>
                </TabPane>
                </Tabs>
            </div>
        )
    }
}