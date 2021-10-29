import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import { Table, Input,message } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import { backendServerApiRoot } from "../common/util"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { Search } = Input;


export default class Server extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            server_info:[],
            filteredInfo: null,
            sortedInfo: null,
            server_type_filer:[{text: '物理机', value: '物理机'},{text: '云主机', value: '云主机'}],
            idc_filter: [{ text: 'bj10', value: 'bj10' },{ text: 'bj11', value: 'bj11' },{ text: 'sh20', value: 'sh20' },{ text: 'sh21', value: 'sh21' },{ text: 'sz30', value: 'sz30' },{ text: 'sz31', value: 'sz31' }]

        }
    }

    componentDidMount() {
        this.GetServerInfo()
    }
    //获取所有机器信息
    async GetServerInfo() {
        await MyAxios.get('/v1/get_server_info/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    server_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }
    //模糊搜索
    async GetSearchServerInfo(server_name) {
        let params = {
            search_server_name:server_name,
            mem:"2G"
        };
        await MyAxios.get('/get_server_info/',{params}).then(
            res => {res.data.status==="ok" ?
                this.setState({
                    server_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }

    render() {
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
              filters: this.state.server_type_filer,
              filterMultiple: false,
              onFilter: (value, record) =>  record.server_type === (value),
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
            title: '过保日期',
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
                            主机信息
                        </Link>
                    </div>
                    <div>
                        <Search
                          placeholder="主机名"
                          onSearch={value => this.GetSearchServerInfo(value)}
                          style={{ width: 200 }}
                          allowClear
                        />
                    </div>
                </div>
            <div>
            </div>
                <Table
                    dataSource={this.state.server_info}
                    columns={columns}
                    pagination={{
                        total:this.state.server_info.length,
                        showTotal:(count=this.state.server_info.length)=>{return '共'+count+'条'}
                    }}
                    bordered
                    size="small"
                />
            </div>
        )
    }
}