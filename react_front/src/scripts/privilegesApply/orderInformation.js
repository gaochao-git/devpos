import React from 'react';
import axios from 'axios'
import {Button, Col, Form, Row, Card, Table, message,Modal,Input,} from "antd";
import "antd/dist/antd.css";
import "../../styles/index.scss"
import {Link} from "react-router-dom";
import {backendServerApiRoot, getUser} from "../common/util";

axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const server = 'http://127.0.0.1:8000';
const Column = Table.Column;
const { TextArea } = Input;


export default class OrderInformation extends React.Component  {
    constructor(props) {
        super(props);
        this.state = {
            showDataVisible: false,
            checkOrderVisible:false,   //审核modal是否可见
            confirmLoading: false,
            indeterminate: true,
            dev_name:"",               //申请人
            request_type:"",           //工单类型
            department:"",             //部门
            leader:"",                 //业务leader
            dba:"",                    //DBA
            leader_check_result:"",    //业务Leader审核结果
            dba_check_result:"",       //DBA审核结果
            db_master_ip:"",           //数据库地址
            db_master_port:"",         //数据库port
            user_host:"",              //用户host
            db_name:"",                //库名
            tb_name:"",                //表名
            user_name:"",              //用户
            ctime:"",                  //工单创建时间
            utime:"",                  //工单更新时间
            order_info:[],             //工单信息
            login_user_name:"",        //当前登录用户名
            login_user_name_role:"",   //当前登录用户角色

        }
    }

    showCheckModal = () => {
        this.setState({
          checkOrderVisible: true,
        });
      };



    componentDidMount() {
        this.GetUserInfo();
        getUser().then(res => {
            this.setState({
                login_user_name: res.data.username,
                login_user_name_role: res.data.title,
            })
        }).catch(error=>{
            console.log(error)
        })

    }


    //获取所有用户信息
    async GetUserInfo() {
        console.log(this.props.match.params["order_uuid"]);
        let params = {
          order_uuid: this.props.match.params["order_uuid"],
        };
        let res = await axios.post(`${server}/get_order_info/`,{params});
        console.log(res.data);
        this.setState({
            dev_name: res.data[0]["person_name"],
            leader: res.data[0]["leader"],
            dba: res.data[0]["dba"],
            department: res.data[0]["department"],
            request_type: res.data[0]["request_type"],
            leader_check_result: res.data[0]["leader_check_result"],
            dba_check_result: res.data[0]["dba_check_result"],
            db_master_port: res.data[0]["db_master_port"],
            db_master_ip: res.data[0]["db_master_ip"],
            user_name: res.data[0]["user_name"],
            execute_status: res.data[0]["status"],
            utime: res.data[0]["utime"],
            ctime: res.data[0]["ctime"],
            order_info:res.data
        })

    }

    //审核工单-->通过
    async handleCheckSubmitPass() {
        console.log(this.props.match.params["order_uuid"]);
        let params = {
          order_uuid: this.props.match.params["order_uuid"],
          check_result:"通过",
          login_user_name_role: this.state.login_user_name_role
        };
        console.log(params);
        axios.post(`${server}/check_order/`,{params}).then(
                res => {res.data.status==="ok" ? message.success(res.data.message,3) && this.GetUserInfo() : message.error(res.data.message) && this.GetUserInfo()}
        ).catch(err => {message.error(err.message,3)});
        this.setState({
            checkOrderVisible: false
        });

    }

    //审核工单-->不通过
    async handleCheckSubmitNoPass() {
        console.log(this.props.match.params["order_uuid"]);
        let params = {
          order_uuid: this.props.match.params["order_uuid"],
          check_result:"不通过",
          login_user_name_role: this.state.login_user_name_role
        };
        console.log(params);
        axios.post(`${server}/check_order/`,{params}).then(
                res => {res.data.status==="ok" ? message.success(res.data.message,3) && this.GetUserInfo() : message.error(res.data.message) && this.GetUserInfo()}
        ).catch(err => {message.error(err.message,3)});
        this.setState({
            checkOrderVisible: false
        });

    }

    //执行工单
    async handleSqlSubmit() {
        console.log(this.props.match.params["order_uuid"]);
        let params = {
          order_uuid: this.props.match.params["order_uuid"],
        };
        console.log(params);
        axios.post(`${server}/execute_order/`,{params}).then(
                res => {res.data.status==="ok" ? message.success(res.data.message) && this.GetUserInfo() : message.error(res.data.message) && this.GetUserInfo()}
        ).catch(err => {message.error(err.message)});
        this.setState({
            showDataVisible: false
        });
    }

    handleCancel = e => {
        console.log(e);
        this.setState({
          checkOrderVisible: false,
        });
    };




    render() {
        const {form} = this.props;
        const {getFieldDecorator} = this.props.form;
        return (
            <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">
                            Home
                        </Link>
                        >>
                        <Link className="title-text" to="/privilegesApply">
                            用户权限申请
                        </Link>
                    </div>
                </div>


                <div>
                    <Row gutter={20}>
                        <Card title="申请基础信息" bordered={false}>
                            <Col span={8}>
                                <p>申请人: {this.state.dev_name}</p>
                                <p>
                                    leader: {this.state.leader}
                                    [{this.state.leader_check_result}]
                                </p>
                                <p>
                                    DBA: {this.state.dba}
                                    [{this.state.dba_check_result}]
                                </p>
                                <p>部门: {this.state.department}</p>
                                <p>工单类型: {this.state.request_type}</p>
                            </Col>
                            <Col span={8}>
                                <p>数据库地址: {this.state.db_master_ip}</p>
                                <p>数据库端口: {this.state.db_master_port}</p>
                                <p>工单创建时间: {this.state.ctime}</p>
                                <p>工单更新时间: {this.state.utime}</p>
                                <p>执行状态: {this.state.execute_status}</p>
                            </Col>
                        </Card>
                        <Card title="权限详细信息" bordered={false}>
                            <Table
                                dataSource={this.state.order_info}
                                pagination={{ pageSize: 10 }}
                                scroll={{ y: 400 }}
                                rowKey={(row ,index) => index}
                                size="small"
                            >
                                <Column title = '用户名' dataIndex = 'user_name'/>
                                <Column title = '主机列表' dataIndex = 'user_host'/>
                                <Column title = '数据库列表' dataIndex = 'db_name'/>
                                <Column title = '权限列表' dataIndex = 'privileges'/>
                            </Table>
                        </Card>
                    </Row>
                </div>
                <div>
                    {this.state.login_user_name_role==="leader" && this.state.leader_check_result==="未审核" ? <Button type="primary" onClick={()=>{this.showCheckModal()}}>审核</Button>:null}
                    {this.state.login_user_name_role==="dba" && this.state.dba_check_result==="未审核" && this.state.leader_check_result==="通过" ? <Button type="primary" onClick={()=>{this.showCheckModal()}}>审核</Button>:null}
                    {this.state.login_user_name_role==="dba" && this.state.dba_check_result==="通过" && this.state.execute_status==="未执行" ? <Button type="primary" onClick={()=>{this.handleSqlSubmit()}}>执行</Button>:null}
                </div>
                <Modal
                    title="工单审核"
                    visible={this.state.checkOrderVisible}
                    onCancel={this.handleCancel}
                    okText= "通过"
                    cancelText= "不通过"
                    footer={null}
                >
                    <TextArea></TextArea>
                        <Button type="primary" onClick={()=>{this.handleCheckSubmitPass()}}>通过</Button>
                        <Button type="primary" onClick={()=>{this.handleCheckSubmitNoPass()}}>不通过</Button>
                </Modal>


            </div>
        )
    }
}
OrderInformation = Form.create()(OrderInformation);
