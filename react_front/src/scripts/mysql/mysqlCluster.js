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

export default class mysqlCluster extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            cluster_info:[],
        }
    }

    componentDidMount() {
        this.GetClusterInfo()
    }
    //获取所有集群信息
    async GetClusterInfo() {
        let res = await axios.get(`${backendServerApiRoot}/get_mysql_cluster_info/`);
        console.log(res.data);
        console.log(window && window.location && window.location.hostname);
        this.setState({
            cluster_info: res.data.data
        })
    }
    //模糊搜索
    async GetSearchClusterInfo(cluster_name) {
        this.setState({
            cluster_info: []
        })
        let res = await axios.post(`${backendServerApiRoot}/get_search_mysql_cluster_info/`,{cluster_name});
        console.log(res.data);
        this.setState({
            cluster_info: res.data.data
        })
    }

    render() {
        let {cluster_info} = this.state;
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
            title: '集群名',
            dataIndex: 'cluster_name',
            key: 'cluster_name',
            render: (text, record) => {
              const obj = {
                children: text,
                props: {},
              };
              obj.props.rowSpan = mergeCells(record.cluster_name, cluster_info, 'cluster_name');
              return obj;
            },
          },
          {
            title: '集群类型',
            dataIndex: 'cluster_type',
          },
          {
<<<<<<< HEAD:react_front/src/scripts/mysqlCluster/cluster.js
            title: '实例状态',
=======
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
>>>>>>> gaochao:react_front/src/scripts/mysql/mysqlCluster.js
            dataIndex: 'instance_status',
            render:(val) => {
                return <span>{val==="正常服务" ? <Badge status="success"/>:<Badge status="error"/>}{val}</span>
            }
          },
          {
<<<<<<< HEAD:react_front/src/scripts/mysqlCluster/cluster.js
            title: '实例名',
            colSpan: 1,
            dataIndex: 'instance_name',
          },
          {
            title: '实例角色',
=======
            title: 'role',
>>>>>>> gaochao:react_front/src/scripts/mysql/mysqlCluster.js
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
                        <Link className="title-text" to="/mysqlCluster">
                            集群信息
                        </Link>
                    </div>
                    <div>
                        <Search
                          placeholder="集群名"
                          onSearch={value => this.GetSearchClusterInfo(value)}
                          style={{ width: 200 }}
                          allowClear
                        />
                    </div>
                </div>
            <div>
            </div>
                <Table
                    dataSource={this.state.cluster_info}
                    columns={columns}
                    bordered
                    size="small"
                />
            </div>
        )
    }
}