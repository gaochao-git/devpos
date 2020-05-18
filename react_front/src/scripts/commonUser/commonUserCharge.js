import React,{Component} from 'react';
import axios from 'axios'
import {Button,Table, Input,Modal,Form,Row,Tabs,Card} from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import CreateCommonUser from "./createCommonUser";
import MigrateCommonUser from "./migrateCommonUser";
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { Search } = Input;
const server = 'http://127.0.0.1:8000';
const FormItem = Form.Item;
const { TabPane } = Tabs;

function callback(key) {
  console.log(key);
}

class commonUser extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            des_name: "",
            user_info:[],
            showDataVisible: false,
            showMigrateAccountDataVisible:false,
            confirmLoading: false,
        }
    }

    //预览添加用户数据 modal返回按钮
    showDataHandleCancel = (e) => {
        this.setState({
            showDataVisible: false,
        });
    };

    //预览同步账户数据 modal返回按钮
    showMigrateAccountModalHandleCancel = (e) => {
        this.setState({
            showMigrateAccountDataVisible: false,
        });
    };

    componentDidMount() {
        this.GetUserInfo()
    }
    //获取所有公用账户信息
    async GetUserInfo() {
        let res = await axios.get(`${server}/get_user_info/`);
        console.log(res.data);
        this.setState({
            user_info: res.data
        })
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
              grant_privileges: values["Privileges"],
            };
            let res = axios.post(`${server}/grant_user_info/`,{params});
            this.setState({
                showDataVisible: false
            })
        });
    };


    //模糊搜索
    async GetSearchUserInfo(user_name) {
        let res = await axios.post(`${server}/get_user_info/`,{user_name});
        console.log(res.data);
        this.setState({
            user_info: res.data
        })
    }

    render() {
        const {getFieldDecorator} = this.props.form;
        let {user_info} = this.state;
        const temp = {}; // 当前重复的值,支持多列
        const mergeCells = (text, array, columns) => {
          let i = 0;
          if (text !== temp[columns]) {
            temp[columns] = text;
            array.forEach((item) => {
              if (item.user_name === temp[columns]) {
                i += 1;
              }
            });
          }
          return i;
        };

        const columns = [
          {
            title: 'user_name',
            dataIndex: 'user_name',
            width: 100,
            key: 'user_name',
            render: (text, record) => {
              const obj = {
                children: text,
                props: {},
              };
              obj.props.rowSpan = mergeCells(record.user_name, user_info, 'user_name');
              return obj;
            },
          },
          {
            title: 'user_password',
            dataIndex: 'user_password',
            width: 100
          },
          {
            title: 'user_host',
            dataIndex: 'user_host',
            width: 100

          },
          {
            title: 'privileges',
            dataIndex: 'privileges',
            width: 200
          },
          {
            title: 'db_name',
            dataIndex: 'db_name',
            width: 100
          },
          {
            title: 'tb_name',
            dataIndex: 'tb_name',
            width: 100
          },
          {
            title: 'status',
            dataIndex: 'status',
            width: 100,
          },

        ];


        return (
            <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">
                            Home
                        </Link>
                        >>
                        <Link className="title-text" to="/commonUser">
                            公共账号信息
                        </Link>
                    </div>
                    <div>
                        <Search
                          placeholder="用户名"
                          onSearch={value => this.GetSearchUserInfo(value)}
                          style={{ width: 200 }}
                          allowClear
                        />
                    </div>
                </div>
                <div>
                        <Tabs defaultActiveKey="1" onChange={callback}>
                            <TabPane tab="公共账号列表" key="1">
                                <Table columns={columns} dataSource={this.state.user_info} pagination={{ pageSize: 10 }} scroll={{ y: 400 }} size="small" />
                            </TabPane>
                            <TabPane tab="添加公共账号" key="2">
                                <CreateCommonUser></CreateCommonUser>
                            </TabPane>
                            <TabPane tab="同步公共账号" key="3">
                                <MigrateCommonUser></MigrateCommonUser>
                            </TabPane>
                        </Tabs>
                </div>
                    <Modal
                        title="添加公共账号"
                        visible={this.state.showDataVisible}
                        //onOk={this.handleSqlSubmit.bind(this)}
                        onCancel={this.showDataHandleCancel}
                        width='960px'
                        footer={false}
                    >
                        <Form className="ant-advanced-search-form" labelCol={{ span: 4 }} onSubmit={this.handleSubmit}>
                            <Row gutter={20}>
                                <Card>
                                    <FormItem  label='User_name'>
                                        {getFieldDecorator('User_name', {rules: [{required: true, message: '请输入User_name'}],})
                                        (<Input style={{ width: '20%' }} placeholder='请输入User_name'/>)}
                                    </FormItem>
                                    <FormItem  label='Host'>
                                        {getFieldDecorator('Host', {rules: [{required: true, message: '请输入Host'}],})
                                        (<Input style={{ width: '20%' }} placeholder='请输入Host'/>)}
                                    </FormItem>
                                    <FormItem  label='Database'>
                                        {getFieldDecorator('Database', {rules: [{required: true, message: '请输入需要授权的Database'}]})
                                        (<Input style={{ width: '20%' }} placeholder='请输入需要授权的Database'/>)}
                                    </FormItem>
                                    <FormItem  label='Table'>
                                        {getFieldDecorator('Table', {rules: [{required: true, message: '请输入需要授权的Table'}]})
                                        (<Input style={{ width: '20%' }} placeholder='请输入需要授权的Table'/>)}
                                    </FormItem>
                                    <FormItem  label='Privileges'>
                                        {getFieldDecorator('Privileges', {rules: [{required: true, message: '请输入需要申请的Privileges'}],})
                                        (<Input style={{ width: '50%' }} placeholder='请输入需要申请的Privileges'/>)}
                                    </FormItem>
                                </Card>
                                <Button type="primary" htmlType="submit">submit</Button>
                            </Row>
                        </Form>
                    </Modal>
                    <Modal
                        title="同步公共账号"
                        visible={this.state.showMigrateAccountDataVisible}
                        //onOk={this.handleSqlSubmit.bind(this)}
                        onCancel={this.showMigrateAccountModalHandleCancel}
                        width='960px'
                        footer={false}
                    >
                        <Form className="ant-advanced-search-form" labelCol={{ span: 4 }} onSubmit={this.handleMigrateSubmit}>
                            <Row gutter={24}>
                                <Card>
                                    <FormItem  label='des_master_ip'>
                                        {getFieldDecorator('des_master_ip', {rules: [{required: true, message: '请输入des_master_ip'}],})(
                                            <Input placeholder='请输入des_master_ip'/>)}
                                    </FormItem>
                                    <FormItem  label='des_master_port'>
                                        {getFieldDecorator('des_master_port', {rules: [{required: true, message: '请输入des_master_port'}],})(
                                            <Input placeholder='请输入des_master_port:'/>)}
                                    </FormItem>
                                </Card>
                                <Button type="primary" htmlType="submit">同步</Button>
                            </Row>
                        </Form>
                    </Modal>
            </div>
        )
    }
}
export default Form.create()(commonUser);
