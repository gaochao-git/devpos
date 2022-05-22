import React from 'react';
import axios from 'axios'
import { Button, Input,Form,Row,Card,Checkbox,message} from "antd";
import MyAxios from "../common/interface";
import "antd/dist/antd.css";
import "../../styles/index.scss"
const TextArea = Input.TextArea;


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
            login_application_user_name:"",
            login_application_user_name_role:"",
        }
    }

    componentDidMount() {
        console.log(111)

    };


    handleSubmit = e => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            this.createUser(values)
        });
        //this.props.form.resetFields();
        //window.location.reload();
    };

    async createUser(values) {
        let params = {
                des_master_ip_port_list: values["des_master_ip_port_list"],
                app_user_name: values["app_user_name"],
                app_user_ip_list: values["app_ip"],
                db_table: values["db_table"],
                privileges : this.state.checkedList.join(",")
            };
        await MyAxios.post('/db_dcl/v1/privileges_create_user_info/',params).then(
            res=>{
                if (res.data.status === "ok"){
                    message.success(res.data.message);
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err=>{message.error(err.message)})
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
        const {getFieldDecorator} = this.props.form;
        return (
            <div className="server-list">
                <div>
                    <Form className="ant-advanced-search-form" labelCol={{ span: 4 }} onSubmit={this.handleSubmit}>
                        <Row gutter={20}>
                            <Card>
                                <FormItem  label='des_master_ip_port_list'>
                                    {getFieldDecorator('des_master_ip_port_list', {rules: [{required: true, message: '请输入des_master_ip_port_list'}]})(
                                        <TextArea style={{ width: '40%' }} placeholder='请输入数据库ip_port或者ip_port列表'/>
                                    )}
                                </FormItem>
                                <FormItem  label='db_table'>
                                    {getFieldDecorator('db_table', {rules: [{required: true, message: '请输入需要授权的db.table'}]})(
                                        <TextArea style={{ width: '40%' }} placeholder='请输入需要授权的d.table'/>
                                    )}
                                </FormItem>
                                <FormItem  label='app_user_name'>
                                    {getFieldDecorator('app_user_name', {rules: [{required: true, message: '请输入app_user_name'}],})(<Input style={{ width: '40%' }} placeholder='请输入app_user_name'/>)}
                                </FormItem>
                                <FormItem  label='app_ip'>
                                    {getFieldDecorator('app_ip', {rules: [{required: true, message: 'app_ip'}]})(
                                        <TextArea style={{ width: '40%' }} placeholder='请输入应用服务器ip或者ip列表'/>
                                    )}
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
