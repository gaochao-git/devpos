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
            deploy_mysql_log:""
        }
    }

    componentDidMount() {
        this.GetDeployMysqlInfoByUuid(this.props.match.params["submit_uuid"])
    };
    //获取工单信息
    async GetDeployMysqlInfoByUuid(submit_uuid) {
        let params = {
            submit_uuid: submit_uuid,
        };
        await MyAxios.post('/get_deploy_mysql_info_by_uuid/',params).then(
            res => {
                if (res.data.status==="ok"){
                   this.setState({
                     submit_user: res.data.data[0]['submit_user'],
                     deploy_version: res.data.data[0]['deploy_version'],
                     deploy_archit: res.data.data[0]['deploy_archit'],
                     deploy_other_param: res.data.data[0]['deploy_other_param'],
                     deploy_topos: res.data.data[0]['deploy_topos'],
                   });
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }
    //提交预览SQL
    async executeDeployMysqlByUuid() {
        let params = {
            submit_uuid: this.props.match.params["submit_uuid"],
            deploy_topos: this.state.deploy_topos,
            deploy_version: this.state.deploy_version,
        };
        await MyAxios.post('/deploy_mysql_by_uuid/',params).then(
            res => {
                if (res.data.status==="ok"){
                   this.setState({
                     ExecuteModalVisible: false,
                   });
                   message.success("发送任务成功");
                   this.setInterVal();
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    };
    //间隔执行
    setInterVal = () => {
         this.timerId = window.setInterval(this.GetDeployLogByUuid.bind(this),1000);
    }
    //获取提交SQL的详细信息
    async GetDeployLogByUuid() {
        let params = {
            submit_uuid: this.props.match.params["submit_uuid"],
        };
        if( this.state.execute_status === "执行成功" || this.state.execute_status === "执行失败"  || this.state.execute_status === "执行成功(含警告)"){
            window.clearInterval(this.timerId);
            console.log("工单执完毕，关闭定时器");
        } else{
             console.log("工单执行中，定时id为:",this.timerId);
             console.log("工单执行状态:",this.state.execute_status);
        }
        await MyAxios.post('/get_deploy_mysql_log/',params).then(
            res => {
                if (res.data.status==="ok"){
                   this.setState({
                     deploy_mysql_log: res.data.data,
                   });
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    };
    //查看SQL审核结果
    async GetSqlCheckResultsByUuid(uuid) {
        this.setState({
            sql_check_results_loading:true
        })
        // let token = window.localStorage.getItem('token')
        let params = {
            submit_uuid: this.props.match.params["submit_uuid"],
        };
        let res = await axios.post(`${backendServerApiRoot}/get_check_sql_results_by_uuid/`,{params});
        let inception_error_level_rray=[];
        for(var i=0;i<res.data.data.length;i++){
            inception_error_level_rray.push(res.data.data[i]["inception_error_level"])
        };
        this.setState({
            view_check_sql_result:res.data.data,
            sql_check_max_code: Math.max.apply(null,inception_error_level_rray),
            sql_check_code_explain: Math.max.apply(null,inception_error_level_rray)!==0 ? "异常":"正常",
            sql_check_results_loading:false
        });
    };
    //审核通过或不通过
    async PassSubmitSqlByUuid(value) {
        this.setState({
            sql_check_pass_loading:true
        });
        let params = {
            submit_uuid: this.state.submit_uuid,
            apply_results:value,
            check_user_name:this.state.login_user_name,
            check_user_name_role:this.state.login_user_name_role,
            check_comment:this.state.check_comment,
        };
        let res = await axios.post(`${backendServerApiRoot}/pass_submit_sql_by_uuid/`,{params});
        message.success(res.data.message);
        this.setState({
            ApplyModalVisible: false,
            view_submit_sql_info:res.data.data,
            sql_check_pass_loading:false
        });
        this.GetSqlApplyByUuid(this.state.submit_uuid);
    };


    //平台自动执行SQL
    async ExecuteBySplitSqlFilePath(split_sql_file_path) {
        //如果current_split_seq是最小则直接执行,否则判断他前面的是否已经执行,如果前面没执行,后面不允许执行,代码需要code
        this.setState({
            execute_status: "执行中"
        });
        let params = {
            submit_uuid: this.state.submit_uuid,
            inception_backup: this.state.inception_backup,
            inception_check_ignore_warning: this.state.inception_check_ignore_warning,
            inception_execute_ignore_error: this.state.inception_execute_ignore_error,
            split_sql_file_path:split_sql_file_path,
            execute_user_name:this.state.login_user_name
        };
        let file_execute_dict = {};
        for ( var item=0;item<this.state.view_submit_split_sql_info.length;item++){
            file_execute_dict[this.state.view_submit_split_sql_info[item]["split_seq"]] = this.state.view_submit_split_sql_info[item]["dba_execute"]
            if (this.state.view_submit_split_sql_info[item]["split_sql_file_path"] === split_sql_file_path){
                var current_split_seq = this.state.view_submit_split_sql_info[item]["split_seq"]
            }
        }
        let inception_error_level_rray=[];
        for(var i=0;i<this.state.view_check_sql_result.length;i++){
            inception_error_level_rray.push(this.state.view_check_sql_result[i]["inception_error_level"])
        };
        if (this.state.sql_check_max_code === 2){
           message.error("审核存在错误,请先处理错误")
        }else if (this.state.inception_check_ignore_warning === 0 && this.state.sql_check_max_code === 1){
            message.error("审核存在警告,请处理警告或忽略警告执行")
        }else if (current_split_seq !== 1 && file_execute_dict[current_split_seq -1] !== "已执行"){
            message.error("上面SQL执行完毕下面SQL才能执行")
        }else {
            if (this.state.execute_sql_flag !== split_sql_file_path) {
                this.setState({
                    execute_sql_flag: split_sql_file_path
                });
                await axios.post(`${backendServerApiRoot}/execute_submit_sql_by_file_path/`, {params}).then(
                    res => {
                        res.data.status === "ok" ? message.success(res.data.message,3) && this.setInterVal() : message.error(res.data.message);
                    }
                );
            } else {
                message.error("该工单正在执行,请误多次点击!!!");
            }
        }
    };

    //查看执行SQL结果
    async ViewExecuteSubmitSqlResultsByUuid(split_sql_file_path) {
        console.log(split_sql_file_path)
        let params = {
            submit_uuid: this.state.submit_uuid,
            split_sql_file_path:split_sql_file_path
        };
        let res = await axios.post(`${backendServerApiRoot}/get_execute_results_by_split_sql_file_path/`,{params});
        this.setState({
            execute_sql_results: res.data.data,
            ViewExecuteSubmitSqlModalVisible:true,
        });
    };


    //查看进度
    async getExecuteProcessByUuid(split_sql_file_path) {
        let params = {
            submit_uuid: this.state.submit_uuid,
            split_sql_file_path:split_sql_file_path
        };
        let res = await axios.post(`${backendServerApiRoot}/get_execute_process_by_uuid/`,{params});
        this.setState({
            execute_sql_process_results: res.data.data,
            ViewExecuteSubmitSqlProcessModalVisible:true,
            split_sql_file_path:split_sql_file_path
        });
        this.timerProcessId = window.setInterval(this.getExecuteProcessByUuidTimeInterval.bind(this),1000);
    }
    //定时查看进度，并更新进度到表里
    async getExecuteProcessByUuidTimeInterval() {
        let params = {
            split_sql_file_path:this.state.split_sql_file_path,
            submit_uuid: this.state.submit_uuid,
        };
        let res = await axios.post(`${backendServerApiRoot}/get_execute_process_by_uuid/`,{params});
        if (res.data.data.length>0 && res.data.data[0]["inception_execute_percent"]!==0){
            this.setState({
                execute_sql_process_results: res.data.data
            });
        }else {
            this.setState({
                ViewExecuteSubmitSqlProcessModalVisible:false
            });
        }
    }

    render() {
        const temp = {}; // 当前重复的值,支持多列
        const mergeCells = (text, array, columns) => {
          let i = 0;
          if (text !== temp[columns]) {
            temp[columns] = text;
            array.forEach((item) => {
                console.log(item.split_seq)
              if (item.split_seq === temp[columns]) {
                i += 1;
              }
            });
          }
          return i;
        };
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
                            <Row gutter={8}><Col style={{padding:5}} span={8}>主题:</Col><Col style={{padding:5}} span={16}>{this.state.submit_sql_title}</Col></Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={8}>申请用户:</Col>
                                {this.state.submit_user}
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={8}>部署信息:</Col>
                            </Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>版本:</Col><Col style={{padding:5}} span={16}>{this.state.deploy_version}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>架构:</Col><Col style={{padding:5}} span={16}>{this.state.deploy_archit}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>自定义参数:</Col><Col style={{padding:5}} span={16}>{this.state.deploy_other_param}</Col></Row>

                        </Col>
                        <Col span={11} className="col-detail">
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>审核人:</Col>
                                <Col style={{padding:5}} span={18}>
                                    [{this.state.leader_user_name}]
                                        {this.state.leader_check==="通过" ? <span style={{color:"#52c41a"}}>[{this.state.leader_check}]</span>:<span  style={{color:"red"}}>[{this.state.leader_check}]</span>}
                                </Col>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>审核内容:</Col>
                                <Col style={{padding:5}} span={18}>
                                    [{this.state.dba_check_user_name}]
                                    {this.state.dba_check === "通过" ? <span style={{color:"#52c41a"}}>[{this.state.dba_check}]</span>:<span  style={{color:"red"}}>[{this.state.dba_check}]</span>}
                                </Col>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>执行人:</Col>
                                <Col style={{padding:5}} span={18}>
                                    [{this.state.dba_execute_user_name}]
                                    {this.state.dba_execute === "已执行" ? <span style={{color:"#52c41a"}}>[{this.state.dba_execute}]</span>:<span  style={{color:"red"}}>[{this.state.dba_execute}]</span>}
                                </Col>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>执行结果:</Col>
                                <Col style={{padding:5}} span={18}>
                                    [{this.state.dba_execute_user_name}]
                                    {this.state.dba_execute === "已执行" ? <span style={{color:"#52c41a"}}>[{this.state.dba_execute}]</span>:<span  style={{color:"red"}}>[{this.state.dba_execute}]</span>}
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                    <br/>
                    {(this.state.login_user_name_role !== "dba") ?
                        <div>
                            <h3>操作</h3>
                            <div className="input-padding">
                                { (this.state.leader_check!=="未审核" && this.state.login_user_name_role!=="leader") ? <Button type="primary" style={{marginLeft:16}} onClick={() => this.setState({ApplyModalVisible:true})}>审核</Button>:null}
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
                                    value={this.state.deploy_mysql_log}
                                    options={{
                                      lineNumbers: true,
                                      mode: {name: "text/x-mysql"},
                                      theme: 'ambiance',
//                                      fullScreen: true
                                    }}
                                />
                        </TabPane>
                        <TabPane tab="工单流转日志" key="2">
                            Content of Tab Pane 3
                        </TabPane>
                    </Tabs>
                    <Modal visible={this.state.showSubmitSqlViewVisible}
                        onCancel={() => this.setState({showSubmitSqlViewVisible:false})}
                        title="SQL预览"
                        footer={false}
                        width={960}
                    >
                        <TextArea wrap="off" style={{minHeight:300,overflow:"scroll"}} value={this.state.submit_sql}/>
                    </Modal>
                    <Modal visible={this.state.ApplyModalVisible}
                        onCancel={() => this.setState({ApplyModalVisible:false})}
                        title="审核"
                        footer={false}
                    >
                        <TextArea rows={6} placeholder="审核说明"  onChange={e => this.setState({check_comment:e.target.value})}/>
                        <Row type="flex" justify='center' style={{ marginTop: '10px' }}>
                            <Button onClick={this.PassSubmitSqlByUuid.bind(this,'通过')} loading={this.state.sql_check_pass_loading} type="primary" style={{ marginRight: '10px' }}>通过</Button>
                            <Button onClick={this.PassSubmitSqlByUuid.bind(this,'不通过')} loading={this.state.sql_check_pass_loading} type="primary">不通过</Button>
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
                    <Modal visible={this.state.ViewExecuteSubmitSqlModalVisible}
                        onCancel={() => this.setState({ViewExecuteSubmitSqlModalVisible:false})}
                        title="执行结果"
                        footer={false}
                        width={1340}
                    >
                    </Modal>
                    <Modal visible={this.state.SplitSQLModalVisible}
                        onCancel={() => this.setState({SplitSQLModalVisible:false})}
                        title="SQL预览"
                        footer={false}
                        width={960}
                    >
                        <TextArea wrap="off" style={{minHeight:300,overflow:"scroll"}} value={this.state.submit_split_sql}/>
                    </Modal>
                </div>
                </div>
            </section>
        )
    }
}