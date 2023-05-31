import React, { Component } from 'react';
import { Table, Row, Col, Button, message, Modal, Input, Checkbox,Popconfirm,Tabs } from 'antd';
import { Link } from 'react-router-dom';
import axios from "axios";
import {backendServerApiRoot} from "../common/util";
import MyAxios from "../common/interface"
import { UnControlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/sql-hint.js';
import 'codemirror/theme/ambiance.css';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/display/fullscreen.js'
const Column = Table.Column;
const TextArea = Input.TextArea;
const { TabPane } = Tabs;
export default class ExecuteDeployMysql extends Component {
    constructor(props) {
        super(props);
        this.state = {
            submit_user:"",
            deploy_version:"",
            deploy_archit:"",
            deploy_other_param:"",
            deploy_topos:"",
            ViewExecuteSubmitSqlModalVisible:false,
            stdout_log:"",
            deployTopoVisible: false,
            check_comment:"",
            submit_check: "",
            submit_check_comment: "",
            submit_execute: "",
            deploy_status: "",
            submit_check_username:"",
            submit_execute_username: "",
            checkCommentVisible:false,
            idc: "",
            work_flow:[],
        }
    }

    componentDidMount() {
        this.getDeployMysqlInfoByUuid();
        this.getDeployLogByUuid();
        this.getWorkFlowByUuid();
    };
    //获取工单信息
    async getDeployMysqlInfoByUuid() {
        let params = {
            submit_uuid: this.props.match.params["submit_uuid"],
        };
        await MyAxios.post('/v1/service/ticket/get_deploy_mysql_info_by_uuid/',params).then(
            res => {
                if (res.data.status==="ok"){
                    console.log(res)
                   this.setState({
                     submit_user: res.data.data[0]['submit_user'],
                     deploy_version: res.data.data[0]['deploy_version'],
                     deploy_archit: res.data.data[0]['deploy_archit'],
                     deploy_other_param: res.data.data[0]['deploy_other_param'],
                     deploy_topos: res.data.data[0]['deploy_topos'],
                     submit_check: res.data.data[0]['submit_check'],
                     submit_check_comment: res.data.data[0]['submit_check_comment'],
                     submit_execute: res.data.data[0]['submit_execute'],
                     deploy_status: res.data.data[0]['deploy_status'],
                     submit_check_username: res.data.data[0]['submit_check_username'],
                     submit_execute_username: res.data.data[0]['submit_execute_username'],
                     idc: res.data.data[0]['idc'],
                   });
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }
    //获取工单流转记录
    async getWorkFlowByUuid() {
        let params = {
            submit_uuid: this.props.match.params["submit_uuid"],
        };
        await MyAxios.post('/v1/service/ticket/get_work_flow_by_uuid/',params).then(
            res => {
                if (res.data.status==="ok"){
                    console.log(res.data.data)
                   this.setState({
                     work_flow: res.data.data,
                   });
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }
    // 执行部署
    async executeDeployMysqlByUuid() {
        let params = {
            submit_uuid: this.props.match.params["submit_uuid"],
            deploy_topos: this.state.deploy_topos,
            deploy_version: this.state.deploy_version,
        };
        await MyAxios.post('/v1/service/ticket/deploy_mysql_by_uuid/',params).then(
            res => {
                if (res.data.status==="ok"){
                   this.setState({
                     ExecuteModalVisible: false,
                   });
                   message.success("发送任务成功");
                   this.getWorkFlowByUuid();
                   this.setInterVal();
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    };
    //间隔执行
    setInterVal = () => {
         this.timerId = window.setInterval(()=>this.getSubmitInfoInterval(),2000);
    }
    //定时执行下面方法
    getSubmitInfoInterval(){
        this.getDeployLogByUuid();
        this.getDeployMysqlInfoByUuid();
    }
    //获取提交SQL的详细信息
    async getDeployLogByUuid() {
        let params = {
            submit_uuid: this.props.match.params["submit_uuid"],
        };
        if( this.state.deploy_status == "执行成功" || this.state.deploy_status === "执行失败"){
            window.clearInterval(this.timerId);
            console.log("工单执完毕，关闭定时器");
            console.log(this.state.deploy_status);
        } else{
             console.log("工单执行中，定时id为:",this.timerId);
             console.log("工单执行状态:",this.state.deploy_status);
        }
        await MyAxios.post('/v1/service/ticket/get_ansible_api_log/',params).then(
            res => {
                if (res.data.status==="ok"){
                   this.setState({
                     stdout_log: res.data.data,
                   });
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    };
    //审核通过或不通过
    async PassSubmitByUuid(value) {
        this.setState({
            check_pass_loading:true
        });
        let params = {
            submit_uuid: this.props.match.params["submit_uuid"],
            check_status:value,   //2通过，3不通过
            check_username: "gaochao",
            check_comment:this.state.check_comment,
        };
        await MyAxios.post('/v1/pass_submit_deploy_mysql/',params).then(
            res => {
                if (res.data.status==="ok"){
                   this.setState({
                     CheckModalVisible: false,
                     check_pass_loading:false
                   });
                   message.success("执行成功");
                   this.getDeployMysqlInfoByUuid();
                   this.getWorkFlowByUuid();
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    };

    render() {
        const columns = [
          {
            title: '操作人',
            dataIndex: 'op_username',
          },
          {
              title: '操作类型',
              dataIndex: 'op_type',
          },
          {
              title: '处理意见',
              dataIndex: 'op_comment',
          },
          {
            title: '操作时间',
            dataIndex: 'create_time',
          },
        ];
        return (
            <section>
                <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">
                            Home
                        </Link>
                        >
                        <Link className="title-text" to="/deployMysql">
                            数据库部署
                        </Link>
                    </div>
                </div>
                <div className="padding-container">
                    <h3>工单信息</h3>
                    <Row type='flex' justify="space-around">
                        <Col span={11} className="col-detail">
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={8}>申请用户:</Col>
                                {this.state.submit_user}
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={8}>部署信息:</Col>
                                <Button className="link-button" onClick={()=>this.setState({deployTopoVisible:true})} style={{padding:5}} span={16}>查看</Button>
                            </Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>机房:</Col><Col style={{padding:5}} span={16}>{this.state.idc}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>版本:</Col><Col style={{padding:5}} span={16}>{this.state.deploy_version}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>集群类型:</Col><Col style={{padding:5}} span={16}>{this.state.deploy_archit}</Col></Row>
                        </Col>
                        <Col span={11} className="col-detail">
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>审核人:</Col>
                                <Col style={{padding:5}} span={18}>
                                    [{this.state.submit_check_username}]
                                    {this.state.submit_check==="通过" ? <span style={{color:"#52c41a"}}>[{this.state.submit_check}]</span>:<span  style={{color:"red"}}>[{this.state.submit_check}]</span>}
                                </Col>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>执行人:</Col>
                                <Col style={{padding:5}} span={18}>
                                    {this.state.submit_execute_username}
                                </Col>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>工单状态:</Col>
                                <Col style={{padding:5}} span={18}>
                                    {this.state.submit_execute}
                                </Col>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>执行结果:</Col>
                                <Col style={{padding:5}} span={18}>
                                    {this.state.deploy_status}
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                    <br/>
                    {(this.state.login_user_name_role !== "dba") ?
                        <div>
                            <h3>操作</h3>
                            <div className="input-padding">
                                { (this.state.leader_check!=="未审核" && this.state.login_user_name_role!=="leader") ? <Button type="primary" style={{marginLeft:16}} onClick={() => this.setState({CheckModalVisible:true})}>审核</Button>:null}
                                { (this.state.qa_check !== '未审核' && this.state.login_user_name_role!=="qa") ? <Button type="primary" style={{marginLeft:16}} onClick={() => this.setState({ExecuteModalVisible:true})}>执行</Button>:null}
                            </div>
                        </div>
                        :
                        null
                    }
                    <br/>
                    <Tabs>
                        <TabPane tab="部署日志" key="1">
                                <CodeMirror
                                    value={this.state.stdout_log}
                                    scroll={{x: 0,y: 500}}
                                    options={{
                                      lineNumbers: true,
                                      autoScroll:true,
                                      mode: {name: "text/x-mysql"},
                                      theme: 'ambiance',
                                    }}
                                />
                        </TabPane>
                        <TabPane tab="工单流转日志" key="2">
                            <Table
                                dataSource={this.state.work_flow}
                                rowKey={(row ,index) => index}
                                columns={columns}
                                bordered
                                size="small"
                            />
                        </TabPane>
                        <TabPane tab="jks日志" key="3">
                            <pre style={{whiteSpace:"pre"}} dangerouslySetInnerHTML = {{ __html: this.state.stdout_log}}></pre>
                        </TabPane>
                    </Tabs>
                    <Modal visible={this.state.CheckModalVisible}
                        onCancel={() => this.setState({CheckModalVisible:false})}
                        title="审核"
                        footer={false}
                    >
                        <TextArea rows={6} placeholder="审核说明"  onChange={e => this.setState({check_comment:e.target.value})}/>
                        <Row type="flex" justify='center' style={{ marginTop: '10px' }}>
                            <Button onClick={this.PassSubmitByUuid.bind(this,2)} loading={this.state.check_pass_loading} type="primary" style={{ marginRight: '10px' }}>通过</Button>
                            <Button onClick={this.PassSubmitByUuid.bind(this,3)} loading={this.state.check_pass_loading} type="primary">不通过</Button>
                        </Row>
                    </Modal>
                    <Modal visible={this.state.ExecuteModalVisible}
                        onCancel={() => this.setState({ExecuteModalVisible:false})}
                        title="确认执行?"
                        footer={false}
                        width={300}
                    >
                        <Row type="flex" justify='center' style={{ marginTop: '10px' }}>
                            <Button onClick={this.executeDeployMysqlByUuid.bind(this)} type="primary" style={{ marginRight: '10px' }}>执行</Button>
                            <Button onClick={() => this.setState({ExecuteModalVisible:false})} type="primary">返回</Button>
                        </Row>
                    </Modal>
                    <Modal visible={this.state.deployTopoVisible}
                        onCancel={() => this.setState({deployTopoVisible:false})}
                        title="部署信息预览"
                        footer={false}
                        width={960}
                    >
                        <TextArea wrap="off" style={{minHeight:300,overflow:"scroll"}} value={this.state.deploy_topos}/>
                    </Modal>
                    <Modal visible={this.state.checkCommentVisible}
                        onCancel={() => this.setState({checkCommentVisible:false})}
                        title="审核内容"
                        footer={false}
                        width={960}
                    >
                        <TextArea wrap="off" style={{minHeight:300,overflow:"scroll"}} value={this.state.submit_check_comment}/>
                    </Modal>
                </div>
                </div>
            </section>
        )
    }
}