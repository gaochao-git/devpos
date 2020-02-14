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

export default class CreateCommonUser extends React.Component  {
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
              grant_user_name: values["User_name"],
              grant_user_host: values["Host"],
              grant_database: values["Database"],
              grant_table: values["Table"],
              grant_privileges : this.state.checkedList.join(",")
            };
            axios.post(`${server}/grant_user_info/`,{params}).then(
                res => {res.data.status==="ok" ? message.success(res.data.message) && this.props.form.resetFields() : message.error(res.data.message)}
            ).catch(err => {message.error(err.message)});
            this.setState({
                showDataVisible: false
            });

        });
        // this.props.form.resetFields();
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
                                <FormItem  label='User_name'>
                                    {getFieldDecorator('User_name', {rules: [{required: true, message: '请输入User_name'}],})(<Input style={{ width: '20%' }} placeholder='请输入User_name'/>)}
                                </FormItem>
                                <FormItem  label='Host'>
                                    {getFieldDecorator('Host', {rules: [{required: true, message: '请输入Host'}],})(<Input style={{ width: '20%' }} placeholder='请输入Host'/>)}
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
CreateCommonUser = Form.create()(CreateCommonUser);
