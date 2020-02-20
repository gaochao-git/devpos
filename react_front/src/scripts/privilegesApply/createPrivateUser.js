import React from 'react';
import axios from 'axios'
import { Button, Input,Form,Row,Card,Checkbox,message} from "antd";
import "antd/dist/antd.css";
import "../../styles/index.scss"
import {backendServerApiRoot, getUser} from "../common/util";


axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const server = 'http://127.0.0.1:8000';
const FormItem = Form.Item;
const CheckboxGroup = Checkbox.Group;

const plainOptions = ['insert,delete,update', 'select', 'create','drop','alter','replication slave,replication client'];
const defaultCheckedList = ['select'];

export default class CreatePrivateUser extends React.Component  {
    constructor(props) {
        super(props);
        this.state = {
            user_info:[],
            showDataVisible: false,
            confirmLoading: false,
            checkedList: defaultCheckedList,
            indeterminate: true,
            login_user_name:"",
            login_user_name_role:"",
        }
    }

    componentDidMount() {
        getUser().then(res => {
            this.setState({
                login_user_name: res.data.username,
                login_user_name_role: res.data.title,
            })
        }).catch(error=>{
            console.log(error)
        })

    };


    handleSubmit = e => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            console.log('Received values of form: ', values);
            let params = {
                grant_db_master_ip: values["DB_master_ip"],
                grant_db_master_port: values["DB_master_port"],
                grant_user_name: values["User_name"],
                grant_user_host: values["User_ip"],
                grant_database: values["Database"],
                grant_table: values["Table"],
                grant_dev_name: this.state.login_user_name,
                grant_privileges : this.state.checkedList.join(",")
            };
            axios.post(`${server}/privileges_create_user_info/`,{params}).then(
                res => {res.data.status==="ok" ? message.success(res.data.message) && this.props.form.resetFields() : message.error(res.data.message)}
            ).catch(err => {message.error(err.message)});
            this.setState({
                showDataVisible: false
            });

        });
        //this.props.form.resetFields();
        //window.location.reload();
    };

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
        const {form} = this.props;
        const {getFieldDecorator} = this.props.form;
        return (
            <div className="server-list">
                <div>
                    <Form className="ant-advanced-search-form" labelCol={{ span: 4 }} onSubmit={this.handleSubmit}>
                        <Row gutter={20}>
                            <Card>
                                <FormItem  label='DB_master_ip'>
                                    {getFieldDecorator('DB_master_ip', {rules: [{required: true, message: '请输入DB_master_ip'}],})(<Input style={{ width: '20%' }} placeholder='请输入DB_master_ip'/>)}
                                </FormItem>
                                <FormItem  label='DB_master_port'>
                                    {getFieldDecorator('DB_master_port', {rules: [{required: true, message: '请输入DB_master_port'}],})(<Input style={{ width: '20%' }} placeholder='请输入DB_master_port'/>)}
                                </FormItem>
                                <FormItem  label='User_name'>
                                    {getFieldDecorator('User_name', {rules: [{required: true, message: '请输入User_name'}],})(<Input style={{ width: '20%' }} placeholder='请输入User_name'/>)}
                                </FormItem>
                                <FormItem  label='User_ip'>
                                    {getFieldDecorator('User_ip', {rules: [{required: true, message: '请输入User_ip'}],})(<Input style={{ width: '20%' }} placeholder='请输入User_ip'/>)}
                                </FormItem>
                                <FormItem  label='Database'>
                                    {getFieldDecorator('Database', {rules: [{required: true, message: '请输入需要授权的Database'}]})(<Input style={{ width: '20%' }} placeholder='请输入需要授权的Database'/>)}
                                </FormItem>
                                <FormItem  label='Table'>
                                    {getFieldDecorator('Table', {rules: [{required: true, message: '请输入需要授权的Table'}]})(<Input style={{ width: '20%' }} placeholder='请输入需要授权的Table'/>)}
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
                    </Form>
                </div>
            </div>
        )
    }
}
CreatePrivateUser = Form.create()(CreatePrivateUser);
