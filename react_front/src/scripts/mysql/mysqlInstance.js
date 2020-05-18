import React,{Component} from 'react';
import axios from 'axios'
import { Table, Input,Badge } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import {backendServerApiRoot} from "../common/util"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
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
        let res = await axios.get(`${backendServerApiRoot}/get_mysql_instance_info/`);
        console.log(res.data);
        console.log(window && window.location && window.location.hostname);
        this.setState({
            mysql_instance_info: res.data.data
        })
    }
    //模糊搜索
    async GetSearchMysqlInstanceInfo(host_name) {
        this.setState({
            mysql_instance_info: []
        })
        let res = await axios.post(`${backendServerApiRoot}/get_search_mysql_instance_info/`,{host_name});
        console.log(res.data);
        this.setState({
            mysql_instance_info: res.data.data
        })
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
                            placeholder="主机名"
                            onSearch={value => this.GetSearchMysqlInstanceInfo(value)}
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