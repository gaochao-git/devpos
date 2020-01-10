import React,{Component} from 'react';
import axios from 'axios'
import { Layout, Button,Table, Menu, Icon } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';

const server = 'http://127.0.0.1:8000';


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

    async GetClusterInfo() {
        let res = await axios.get(`${server}/get_cluster_info/`);
        console.log(res.data);
        this.setState({
            cluster_info: res.data
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
            title: 'cluster_name',
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
            title: 'cluster_type',
            dataIndex: 'cluster_type',
          },
          {
            title: 'cluster_status',
            dataIndex: 'cluster_status',
          },
          {
            title: 'instance_name',
            colSpan: 1,
            dataIndex: 'instance_name',
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
                        <Link className="title-text" to="/mysqlCluster">
                            集群信息
                        </Link>
                    </div>

                </div>
                <div className="searchbar">
            </div>
                <Table dataSource={this.state.cluster_info} columns={columns} bordered />
            </div>
        )
    }
}