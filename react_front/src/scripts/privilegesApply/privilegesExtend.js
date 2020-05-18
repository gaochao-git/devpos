import React from 'react';
import axios from 'axios'
import {Button, Input, Form, Row, Card, Checkbox, message, Table} from "antd";
import "antd/dist/antd.css";
import "../../styles/index.scss"
import {getUser} from "../common/util";



axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const server = 'http://127.0.0.1:8000';
const FormItem = Form.Item;
const CheckboxGroup = Checkbox.Group;
const Column = Table.Column;

const plainOptions = ['insert,delete,update', 'select', 'create','drop','alter','replication slave,replication client'];
const defaultCheckedList = ['select'];

export default class PrivilegesExtend extends React.Component  {
    constructor(props) {
        super(props);
        this.state = {
            user_info:[],
            showDataVisible: false,
            confirmLoading: false,
            checkedList: defaultCheckedList,
            indeterminate: true,
            login_user_name:"",                        //当前登录用户名
            login_user_name_role:"",                   //当前登录用户角色
            grant_dev_name: "",
            privileges_info:[],
            grant_db_master_port:"",
            grant_db_master_ip:"",
            grant_user_name:"",
        }
    }

    handleSubmit = e => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            console.log('Received values of form: ', values);
            let params = {
                grant_db_master_ip: values["DB_master_ip"],
                grant_db_master_port: values["DB_master_port"],
                grant_user_name: values["User_name"],
                grant_dev_name: this.state.login_user_name,
                grant_privileges : this.state.checkedList.join(",")
            };
            axios.post(`${server}/privileges_extend_info/`,{params}).then(
                res => {res.data.status==="ok" ? message.success(res.data.message) && this.props.form.resetFields() : message.error(res.data.message)}
            ).catch(err => {message.error(err.message)});
            this.setState({
                showDataVisible: false
            });

        });
        //this.props.form.resetFields();
        // window.location.reload();
    };

    componentDidMount() {
        getUser().then(res => {
            this.setState({
                login_user_name: res.data.username,
                //login_user_name_role: res.data.title,
                login_user_name_role: res.data.title,
            })
        }).catch(error=>{
            console.log(error)
        })

    }

    async handleViewPrivileges() {
        let params = {
            grant_db_master_port:this.state.grant_db_master_port,
            grant_db_master_ip:this.state.grant_db_master_ip,
            grant_user_name:this.state.grant_user_name,
        };
        console.log(params);
        axios.post(`${server}/privilege_view_user/`,{params}).then(
                res => {
                    console.log(res.data)
                        this.setState({
                            privileges_info: res.data
                        });
                }
        ).catch(err => {message.error(err.message)});
    }

    handleHostPortChange = (value) => {
        console.log(value)
        this.setState({
            grant_db_master_port: value
        })
    }

    handleHostIpChange = (value) => {
        console.log(value)
        this.setState({
            grant_db_master_ip: value
        })
    }

    handleUserChange = (value) => {
        console.log(value)
        this.setState({
            grant_user_name: value
        })
    }


    onChange = checkedList => {
        console.log(checkedList.join(","));
        this.setState({
          checkedList,
          indeterminate: !!checkedList.length && checkedList.length < plainOptions.length,
          checkAll: checkedList.length === plainOptions.length,
        });
      };

      onCheckAllChange = e => {
        this.setState({
          checkedList: e.target.checked ? plainOptions : [],
          indeterminate: false,
          checkAll: e.target.checked,
        });
      };



    render() {
        const {getFieldDecorator} = this.props.form;
        return (
            <div className="server-list">
                <div>
                    <Form className="ant-advanced-search-form" labelCol={{ span: 4 }} onSubmit={this.handleSubmit}>
                        <Row gutter={20}>
                            <Card>
                                <FormItem  label='DB_master_ip'>
                                    {getFieldDecorator('DB_master_ip', {rules: [{required: true, message: '请输入DB_master_ip'}],})(<Input style={{ width: '20%' }} placeholder='请输入DB_master_ip' onChange={e => this.handleHostIpChange(e.target.value)}/>)}
                                </FormItem>
                                <FormItem  label='DB_master_port'>
                                    {getFieldDecorator('DB_master_port', {rules: [{required: true, message: '请输入DB_master_port'}],})(<Input style={{ width: '20%' }} placeholder='请输入DB_master_port' onChange={e => this.handleHostPortChange(e.target.value)}/>)}
                                </FormItem>
                                <FormItem  label='User_name'>
                                    {getFieldDecorator('User_name', {rules: [{required: true, message: '请输入User_name'}],})(<Input style={{ width: '20%' }} placeholder='请输入User_name' onChange={e => this.handleUserChange(e.target.value)}/>)}
                                    <Button type="primary" style={{marginLeft:10}} onClick={()=>{this.handleViewPrivileges()}}>查看已有权限</Button>
                                </FormItem>

                                <FormItem  label='Privileges'>
                                    {getFieldDecorator('Privileges')
                                    (<div>
                                        <CheckboxGroup
                                          options={plainOptions}
                                          value={this.state.checkedList}
                                          onChange={this.onChange}
                                        />
                                      </div>)
                                    }
                                </FormItem>
                            </Card>
                            <Button type="primary" htmlType="submit">submit</Button>
                        </Row>
                        <Table
                                dataSource={this.state.privileges_info}
                                pagination={{ pageSize: 10 }}
                                scroll={{ y: 400 }}
                                rowKey={(row ,index) => index}
                                size="small"
                            >
                                <Column title = '用户名' dataIndex = 'user'/>
                                <Column title = 'IP' dataIndex = 'host'/>
                                <Column title = '已有权限' dataIndex = 'privilege'/>
                                <Column title = '数据库' dataIndex = 'db'/>
                            </Table>
                    </Form>
                </div>
            </div>
        )
    }
}
PrivilegesExtend = Form.create()(PrivilegesExtend);
