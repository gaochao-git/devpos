import React from 'react';
import axios from 'axios'
import { Button, Input,message, Form,Row,Card} from "antd";
import "antd/dist/antd.css";
import "../../styles/index.scss"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const server = 'http://127.0.0.1:8000';
const FormItem = Form.Item;



export default  class MigrateCommonUser extends React.Component  {
    constructor(props) {
        super(props);
        this.state = {
            // confirmLoading: false,
        }
    }

    handleMigrateSubmit = e => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            console.log('Received values of form: ', values);
            let params = {
              des_master_ip: values["des_master_ip"],
              des_master_port: values["des_master_port"],
            };
            axios.post(`${server}/migrate_common_user/`,{params}).then(
                res => {res.data.status==="ok" ? message.success(res.data.message) : message.error(res.data.message)}
            ).catch(err => {message.error(err.message)})
        });
        this.props.form.resetFields();

    };


    render() {
        const {getFieldDecorator} = this.props.form;

        return (
            <div className="server-list">
                <div>
                    <Form className="ant-advanced-search-form" labelCol={{ span: 4 }} onSubmit={this.handleMigrateSubmit}>
                        <Row gutter={24}>
                            <Card>
                                <FormItem  label='des_master_ip'>
                                    {getFieldDecorator('des_master_ip', {rules: [{required: true, message: '请输入des_master_ip'}],})(
                                        <Input placeholder='请输入des_master_ip' style={{ width: '20%' }}/>)}
                                </FormItem>
                                <FormItem  label='des_master_port'>
                                    {getFieldDecorator('des_master_port', {rules: [{required: true, message: '请输入des_master_port'}],})(
                                        <Input placeholder='请输入des_master_port:' style={{ width: '20%' }}/>)}
                                </FormItem>
                            </Card>
                            <Button type="primary" htmlType="submit">同步</Button>
                        </Row>
                    </Form>
                </div>
            </div>
        )
    }
}
MigrateCommonUser = Form.create()(MigrateCommonUser);
