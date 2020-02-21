import React,{Component} from 'react';
import axios from 'axios'
import {Button, Table, Input, Modal, Checkbox, Form, Row, Card, Tabs} from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import CreatePrivateUser from "./createPrivateUser";
import PrivilegesExtend from "./privilegesExtend";


axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { Search } = Input;
const server = 'http://127.0.0.1:8000';
const FormItem = Form.Item;
const { TabPane } = Tabs;
const Column = Table.Column;

function callback(key) {
  console.log(key);
}

class privateUser extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            user_info:[],
            showDataVisible: false,
            confirmLoading: false,
        }
    }


    componentDidMount() {
        this.GetUserInfo()

    }
    //获取所有用户信息
    async GetUserInfo() {
        let res = await axios.get(`${server}/get_private_user_info/`);
        console.log(res.data);
        this.setState({
            user_info: res.data
        })
    }

    //模糊搜索
    async GetSearchUserInfo(user_name) {
        let res = await axios.post(`${server}/get_private_user_info/`,{user_name});
        console.log(res.data);
        this.setState({
            user_info: res.data
        })
    }

    render() {
        const {form} = this.props;
        const {getFieldDecorator} = this.props.form;
        let {user_info} = this.state;

        // const columns = [
        //   {
        //     title: '申请人',
        //     dataIndex: 'person_name',
        //     key: 'person_name'
        //   },
        //   {
        //     title: '工单类型',
        //     dataIndex: 'request_type',
        //   },
        //   {
        //     title: '部门',
        //     dataIndex: 'department',
        //     width: 100,
        // //
        //   },
        //   {
        //     title: '业务leader',
        //     dataIndex: 'leader',
        //     width: 100
        //   },
        //   {
        //     title: 'DBA',
        //     dataIndex: 'dba',
        //     width: 100
        //   },
        // //
        //   {
        //     title: '业务Leader审核结果',
        //     dataIndex: 'leader_check_result',
        //     width: 100
        //   },
        //   {
        //     title: 'DBA审核结果',
        //     dataIndex: 'dba_check_result',
        //     width: 100
        //   },
        //   {
        //     title: '工单状态',
        //     dataIndex: 'status',
        //     width: 100,
        //   }
        // //
        // ];


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
                        <TabPane tab="工单申请表" key="1">
                            <Table
                                dataSource={this.state.user_info}
                                pagination={{ pageSize: 10 }}
                                //scroll={{ y: 500 }}     添加滚动条的参数
                                rowKey={(row ,index) => index}
                                rowClassName={(record, index) => {
                                let className = 'row-detail-default ';
                                if (record.leader_check_result === "未审核"||record.dba_check_result === "未审核"||record.status === "未执行"||record.status === "执行失败") className = 'row-detail-error';
                                return className;}}
                                size="small"
                            >
                                <Column title = '申请人' dataIndex = 'person_name'/>
                                <Column title = '工单类型' dataIndex = 'request_type'/>
                                <Column title = '部门' dataIndex = 'department'/>
                                <Column title = '业务leader' dataIndex = 'leader'/>
                                <Column title = 'DBA' dataIndex = 'dba'/>
                                <Column title = 'Leader审核' dataIndex = 'leader_check_result'/>
                                <Column title = 'DBA审核' dataIndex = 'dba_check_result'/>
                                <Column title = '工单状态' dataIndex = 'status'/>
                                <Column title = '申请时间' dataIndex = 'ctime'/>
                                <Column title="操作"
                                    render={record => {
                                        return <Link to={`/viewPrivilegeInfoByUuid/${record.order_uuid}`}>查看</Link>
                                    }}
                                />
                            </Table>
                        </TabPane>
                        <TabPane tab="添加新用户" key="2">
                            <CreatePrivateUser></CreatePrivateUser>
                        </TabPane>
                        <TabPane tab="扩展权限" key="3">
                            <PrivilegesExtend></PrivilegesExtend>
                        </TabPane>
                        <TabPane tab="扩展IP" key="4">
                            <PrivilegesExtend></PrivilegesExtend>
                        </TabPane>
                        <TabPane tab="扩展库表" key="5">
                            <PrivilegesExtend></PrivilegesExtend>
                        </TabPane>
                    </Tabs>
                </div>
            </div>
        )
    }
}
export default Form.create()(privateUser);
