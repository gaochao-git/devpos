import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import { Table, Input,message,Button,Modal } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import { backendServerApiRoot } from "../common/util"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { Search } = Input;


export default class UserRole extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            user_role_info:[],
            showAddRoleModal:false,
            add_role_name:"",
            del_role_name:"",
        }
    }

    componentDidMount() {
        this.getUserRoleInfo()
    }
    //获取所有角色信息
    async getUserRoleInfo() {
        await MyAxios.get('/permission/v1/get_user_role_info/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    user_role_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }

    //删除角色
    async delRoleName() {
        let params = {role_name:this.state.del_role_name}
        await MyAxios.post('/permission/v1/del_role_name/',params).then(
            res => {
                if (res.data.status==="ok")
                {
                    message.success(res.data.message);
                    this.getUserRoleInfo();
                    this.setState({del_role_name:"",showDelRoleModal:false})
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    //增加角色
    async addRoleName() {
        let params = {role_name:this.state.add_role_name}
        await MyAxios.post('/permission/v1/add_role_name/',params).then(
            res => {
                if (res.data.status==="ok")
                {
                    message.success(res.data.message);
                    this.getUserRoleInfo();
                    this.setState({add_role_name:"",showAddRoleModal:false})
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    render() {
        const columns = [
          {
            title: '角色名',
            dataIndex: 'role_name',
          },
          {
              title: '创建人',
              dataIndex: 'create_by',
          },
          {
                title: '修改人',
                dataIndex: 'update_by',
          },
          {
              title: '创建时间',
              dataIndex: 'create_time',
          },
          {
                title: '修改时间',
                dataIndex: 'update_time',
          },
          {
            title: '操作',
            render: (record) => {
              return <Button type="danger" onClick={()=>{this.setState({del_role_name:record.role_name,showDelRoleModal:true})}}>删除角色</Button>
            }
          }
        ];
        return (
            <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">
                            Home
                        </Link>
                        >>
                        <Link className="title-text" to="/UserRole">
                            角色管理
                        </Link>
                    </div>
                </div>
            <div>
            </div>
                <Table
                    dataSource={this.state.user_role_info}
                    columns={columns}
                    pagination={{
                        total:this.state.user_role_info.length,
                        showTotal:(count=this.state.user_role_info.length)=>{return '共'+count+'条'}
                    }}
                    bordered
                    size="small"
                />
                <Button type="primary" onClick={()=>{this.setState({showAddRoleModal:true})}}>增加角色</Button>
                <Modal visible={this.state.showAddRoleModal}
                    onCancel={() => this.setState({showAddRoleModal:false})}
                    onOk={() => this.addRoleName()}
                    title="确认提交?"
                    width={300}
                >
                    <Input size="default" style={{width: 200}} placeholder="角色名" onChange={e => this.setState({add_role_name:e.target.value})}/>
                </Modal>
                <Modal visible={this.state.showDelRoleModal}
                    onCancel={() => this.setState({showDelRoleModal:false})}
                    onOk={() => this.delRoleName()}
                    width={300}
                >
                   删除角色: {this.state.del_role_name}
                </Modal>
            </div>

        )
    }
}