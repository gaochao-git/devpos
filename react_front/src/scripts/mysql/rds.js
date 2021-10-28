import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, data, Card, AutoComplete, Tooltip,message,Col,Descriptions,Collapse} from "antd";
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
const { Panel } = Collapse;

export default class Rds extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            submit_info:[],
            showSubmitVisible:false,
            topo_source_placeholder:"说明:\n  部署实例1\n  部署实例2=>同步实例1\n例如:\n  47.104.2.74_3306\n  47.104.2.75_3306=>47.104.2.74_3306",
            rds_placeholder:"说明:sdf\nsdfsf\n\n\n\n",
            deploy_topos:"",
            deploy_version:"",
            idc:"",
            deploy_archit:"",
            mem:"",
            cpu:"",
            disk:""

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
                    <TabPane tab="RDS资源申请" key="2">
                        <Row>
                          <Col span={12}>
                                <div className="sub-title-input">
                                <span style={{ marginRight: 20 }}>选择机房: </span>
                                <Select defaultValue="BJ10" style={{ width: 300 }} onChange={e => this.setState({idc:e})}>
                                    <Option value="BJ10">BJ10</Option>
                                    <Option value="BJ11">BJ11</Option>
                                </Select>
                            </div>
                            <div>
                                <p>{this.state.rds_placeholder}</p>
                            </div>
                            <div className="sub-title-input">
                                <span style={{ marginRight: 20 }}>选择类型: </span>
                                <Select defaultValue="MHA" style={{ width: 300 }} onChange={e => this.setState({deploy_archit:e})}>
                                    <Option value="m">单点</Option>
                                    <Option value="ms">主从</Option>
                                    <Option value="MHA">高可用</Option>
                                </Select>
                            </div>
                            <div>
                                <p style={{color:"red"}}>推荐使用高可用版,最高99.99%可用性,数据复制强一致,RPO=0</p>
                            </div>
                            <div className="sub-title-input">
                                <span style={{ marginRight: 20 }}>选择版本: </span>
                                <Select defaultValue="mysql5.7.22" style={{ width: 300 }} onChange={e => this.setState({deploy_version:e})}>
                                    <Option value="mysql5.7.22">MySQL5.7</Option>
                                    <Option value="mysql8.0.22">MySQL8.0</Option>
                                </Select>
                            </div>
                            <div>
                                <p>{this.state.rds_placeholder}</p>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div className="sub-title-input">
                                <span style={{ marginRight: 20 }}>选择CPU: </span>
                                <Select defaultValue="2" style={{ width: 300 }} onChange={e => this.setState({cpu:e})}>
                                    <Option value="2">2核</Option>
                                    <Option value="4">4核</Option>
                                    <Option value="8">8核</Option>
                                    <Option value="16">16核</Option>
                                    <Option value="32">32核</Option>
                                    <Option value="64">64核</Option>
                                    <Option value="128">128核</Option>
                                </Select>
                            </div>
                            <div>
                                <p>{this.state.rds_placeholder}</p>
                            </div>
                            <div className="sub-title-input">
                                <span style={{ marginRight: 20 }}>选择内存: </span>
                                <Select defaultValue="2" style={{ width: 300 }} onChange={e => this.setState({mem:e})}>
                                    <Option value="2">2GB</Option>
                                    <Option value="4">4GB</Option>
                                    <Option value="8">8GB</Option>
                                    <Option value="16">16GB</Option>
                                    <Option value="32">32GB</Option>
                                    <Option value="64">64GB</Option>
                                </Select>
                            </div>
                            <div>
                                <p>{this.state.rds_placeholder}</p>
                            </div>
                            <div className="sub-title-input">
                                <span style={{ marginRight: 20 }}>选择磁盘: </span>
                                <Select defaultValue="150" style={{ width: 300 }} onChange={e => this.setState({disk:e})}>
                                    <Option value="150">100GB</Option>
                                    <Option value="150">150GB</Option>
                                    <Option value="200">200GB</Option>
                                    <Option value="250">250GB</Option>
                                    <Option value="300">300GB</Option>
                                </Select>
                            </div>
                            <div>
                                <p>{this.state.rds_placeholder}</p>
                            </div>

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
                            <Button onClick={()=>this.submitDeployMysql()} type="primary" style={{ marginRight: '10px' }}>执行</Button>
                            <Button onClick={() => this.setState({showSubmitVisible:false})} type="primary">返回</Button>
                        </Row>
                    </Modal>
            </div>
        )
    }
}