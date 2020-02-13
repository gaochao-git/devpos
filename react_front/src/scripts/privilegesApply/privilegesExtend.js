import React from 'react';
import axios from 'axios'
import { Button, Input,Form,Row,Card,Checkbox,message} from "antd";
import "antd/dist/antd.css";
import "../../styles/index.scss"

axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const server = 'http://127.0.0.1:8000';
const FormItem = Form.Item;
const CheckboxGroup = Checkbox.Group;

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
                grant_person_name: values["Person_name"],
                grant_request_type: values["Request_type"],
                grant_department: values["Department"],
                grant_leader: values["Leader"],
                grant_dba: values["DBA"],
                //grant_table: values["Table"],
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
                                <FormItem  label='Person_name'>
                                    {getFieldDecorator('Person_name', {rules: [{required: true, message: '请输入申请人姓名'}],})(<Input style={{ width: '20%' }} placeholder='请输入申请人姓名'/>)}
                                </FormItem>
                                <FormItem  label='Request_type'>
                                    {getFieldDecorator('Request_type', {rules: [{required: true, message: '请输入工单类型'}]})(<Input style={{ width: '20%' }} placeholder='请输入工单类型'/>)}
                                </FormItem>
                                <FormItem  label='Department'>
                                    {getFieldDecorator('Department', {rules: [{required: true, message: '请输入部门'}]})(<Input style={{ width: '20%' }} placeholder='请输入部门'/>)}
                                </FormItem>
                                <FormItem  label='Leader'>
                                    {getFieldDecorator('Leader', {rules: [{required: true, message: '请输入业务Leader'}]})(<Input style={{ width: '20%' }} placeholder='请输入业务Leader'/>)}
                                </FormItem>
                                <FormItem  label='DBA'>
                                    {getFieldDecorator('DBA', {rules: [{required: true, message: '请输入DBA姓名'}]})(<Input style={{ width: '20%' }} placeholder='请输入DBA姓名'/>)}
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
PrivilegesExtend = Form.create()(PrivilegesExtend);
