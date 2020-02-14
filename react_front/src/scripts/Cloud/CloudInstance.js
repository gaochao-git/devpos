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
            title: 'instance_name',
            dataIndex: 'instance_name',
            key: 'instance_name',
            render: (text, record) => {
              const obj = {
                children: text,
                props: {},
              };
              obj.props.rowSpan = mergeCells(record.instance_name, cloud_instance_info, 'instance_name');
              return obj;
            },
          },
          {
            title: 'instance_host',
            colSpan: 1,
            dataIndex: 'instance_host',
          },
          {
            title: 'instance_password',
            dataIndex: 'instance_password',
          },
          {
            title: 'instance_status',
            colSpan: 1,
            dataIndex: 'instance_status',
          },
          {
            title: 'network',
            colSpan: 1,
            dataIndex: 'network',
          },
          {
            title: 'cpu_size',
            colSpan: 1,
            dataIndex: 'cpu_size',
          },
          {
            title: 'disk_size',
            dataIndex: 'disk_size',
          },
          {
            title: 'deadline',
            dataIndex: 'deadline',
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
                <Table dataSource={this.state.cloud_instance_info} columns={columns} bordered />
            </div>
        )
    }
}