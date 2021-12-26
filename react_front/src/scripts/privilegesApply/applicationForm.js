import React,{Component} from 'react';
import axios from 'axios'
import {Table, Input, Form, Tabs,message} from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import CreatePrivateUser from "./createPrivateUser";
import PrivilegesExtend from "./privilegesExtend";
import MyAxios from "../common/interface"


axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { Search } = Input;
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
        this.GetApplyFromInfo()
    }
    //获取所有机器信息
    async GetApplyFromInfo() {
        let params = {
            search_applicant:"",
        };
        await MyAxios.post('/db_dcl/v1/get_application_form_info/', {params}).then(
            res => {res.data.status==="ok" ?
                this.setState({
                    user_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }
    //模糊搜索
    async GetSearchFromInfo(applicant_name) {
        let params = {
            search_applicant:applicant_name,
        };
        await MyAxios.post('/db_dcl/v1/get_application_form_info/',{params}).then(
            res => {res.data.status==="ok" ?
                this.setState({
                    server_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }


    render() {
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
                          placeholder="请输入申请人"
                          onSearch={value => this.GetSearchFromInfo(value)}
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
                                <Column title = '申请人' dataIndex = 'applicant'/>
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
