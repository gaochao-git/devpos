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
        let {mysql_instance_info} = this.state;
        const temp = {}; // 当前重复的值,支持多列
        const mergeCells = (text, array, columns) => {
            let i = 0;
            if (text !== temp[columns]) {
                temp[columns] = text;
                array.forEach((item) => {
                    if (item.cluster_name === temp[columns]) {
                        i += 1;
                    }
                });
            }
            return i;
        };
        const columns = [
            {
                title: 'cluster_name',
                dataIndex: 'cluster_name',
                key: 'cluster_name',
            },
            {
                title: 'cluster_type',
                dataIndex: 'cluster_type',
            },
            {
                title: 'instance_name',
                colSpan: 1,
                dataIndex: 'instance_name',
            },
            {
                title: '主机名',
                dataIndex: 'host_name',
            },
            {
                title: 'instance_status',
                dataIndex: 'instance_status',
                render:(val) => {
                    return <span>{val==="正常服务" ? <Badge status="success"/>:<Badge status="error"/>}{val}</span>
                }
            },
            {
                title: 'role',
                dataIndex: 'role',
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