import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import { Table, Input,Badge,message } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
const { Search } = Input;


export default class mysqlInstance extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            mysql_instance_info:[],
        }
    }

    componentDidMount() {
        this.GetMysqlInstanceInfo()
    }
    //获取所有mysql实例信息
    async GetMysqlInstanceInfo() {
        await MyAxios.get('/db_resource/v1/get_mysql_instance_info/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    cluster_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }
    //模糊搜索
    async GetSearchMysqlInstanceInfo(host_ip) {
        let params = { host_ip:host_ip};
        await MyAxios.get('/db_resource/v1/get_mysql_instance_info/',{params}).then(
            res => {res.data.status==="ok" ?
                this.setState({
                    cluster_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }

    render() {
        const columns = [
            {
                title: '主机名',
                dataIndex: 'host_name',
            },
            {
                title: 'host_ip',
                dataIndex: 'host_ip',
            },
            {
                title: 'port',
                dataIndex: 'port',
            },
            {
                title: 'server_charset',
                dataIndex: 'server_charset',
            },
            {
                title: 'version',
                dataIndex: 'version',
            },
            {
                title: 'bufferpool',
                dataIndex: 'bufferpool',
            },
            {
                title: 'instance_status',
                dataIndex: 'instance_status',
                render:(val) => {
                    return <span>{val==="正常服务" ? <Badge status="success"/>:<Badge status="error"/>}{val}</span>
                }
            },
            {
                title: 'read_only',
                dataIndex: 'read_only',
            },
            {
                title: 'master_ip',
                dataIndex: 'master_ip',
            },
            {
                title: 'master_port',
                dataIndex: 'master_port',
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
                        <Link className="title-text" to="/mysqlInstance">
                            实例信息
                        </Link>
                    </div>
                    <div>
                        <Search
                            placeholder="ip"
                            onSearch={ip => this.GetSearchMysqlInstanceInfo(ip)}
                            style={{ width: 200 }}
                            allowClear
                        />
                    </div>
                </div>
                <div>
                </div>
                <Table
                    dataSource={this.state.mysql_instance_info}
                    columns={columns}
                    bordered
                    size="small"
                />
            </div>
        )
    }
}