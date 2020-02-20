import React,{Component} from 'react';
import axios from 'axios'
import { Layout, Button,Table, Menu, Icon, Input } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { Search } = Input;
const server = 'http://127.0.0.1:8000';


export default class CloudInstance extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            cloud_instance_info:[],
        }
    }

    componentDidMount() {
        this.GetClusterInfo()
    }
    //获取所有集群信息
    async GetClusterInfo() {
        let res = await axios.get(`${server}/get_cloud_info/`);
        console.log(res.data);
        this.setState({
            cloud_instance_info: res.data
        })
    }
    //模糊搜索
    async GetSearchClusterInfo(instance_name) {
        let res = await axios.post(`${server}/get_cloud_info/`,{instance_name});
        console.log(res.data);
        this.setState({
            cloud_instance_info: res.data
        })
    }

    render() {
        let {cloud_instance_info} = this.state;
        const temp = {}; // 当前重复的值,支持多列
        const mergeCells = (text, array, columns) => {
          let i = 0;
          if (text !== temp[columns]) {
            temp[columns] = text;
            array.forEach((item) => {
              if (item.instance_name === temp[columns]) {
                i += 1;
              }
            });
          }
          return i;
        };
        const columns = [
          {
            title: '主机名',
            dataIndex: 'server_hostname',
            key: 'server_hostname',
          },
          {
              title: '公网ip',
              colSpan: 1,
              dataIndex: 'server_public_ip',
          },
          {
                title: '内网ip',
                colSpan: 1,
                dataIndex: 'server_private_ip',
            },
            {
                title: '网络类型',
                colSpan: 1,
                dataIndex: 'network_type',
            },
            {
                title: '公网带宽(Mbps)',
                colSpan: 1,
                dataIndex: 'public_network_bandwidth',
            },
            {
                title: '内网带宽(Mbps)',
                colSpan: 1,
                dataIndex: 'private_network_bandwidth',
            },
          {
              title: '内存(G)',
              colSpan: 1,
              dataIndex: 'memory',
          },
          {
              title: '磁盘容量(G)',
              colSpan: 1,
              dataIndex: 'disk_capacity',
          },
         {
             title: '磁盘类型',
             colSpan: 1,
             dataIndex: 'disk_type',
         },
          {
            title: 'cpu(核数)',
            colSpan: 1,
            dataIndex: 'cpu_size',
          },
          {
            title: '操作系统',
            dataIndex: 'server_os',
          },
          {
              title: '类型',
              colSpan: 1,
              dataIndex: 'server_type',
          },
          {
              title: '用途',
              colSpan: 1,
              dataIndex: 'server_usage',
          },
          {
              title: '是否可用',
              colSpan: 1,
              dataIndex: 'status',
          },
          {
            title: '到期时间',
            dataIndex: 'deadline',
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
                        <Link className="title-text" to="/CloudInstance">
                            云主机信息
                        </Link>
                    </div>
                    <div>
                        <Button type="primary" onClick={() => {
                            this.GetClusterInfo()
                        }}>置空</Button>
                        <Search
                          placeholder="实例名"
                          onSearch={value => this.GetSearchClusterInfo(value)}
                          style={{ width: 200 }}
                        />
                    </div>
                </div>
            <div>
            </div>
                <Table
                    dataSource={this.state.cloud_instance_info}
                    columns={columns}
                    bordered
                    size="small"
                />
            </div>
        )
    }
}