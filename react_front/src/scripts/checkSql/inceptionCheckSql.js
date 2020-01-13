import React,{Component} from 'react';
import axios from 'axios'
import { Layout, Button,Table, Menu, Icon, Input } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import { backendServerApiRoot } from "../common/util"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { TextArea } = Input


export default class checkSql extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            des_ip:"",
            des_port:"",
            check_sql:"",
            check_sql_info:[],
        }
    }

    componentDidMount() {
        //this.GetClusterInfo()
    }

    async GetClusterInfo() {
        let res = await axios.get(`${backendServerApiRoot}/check_sql_info/`);
        console.log(res.data);
        this.setState({
            check_sql_results: res.data
        })
    }

    handleHostIpChange = (value) => {
        console.log(value)
        this.setState({
            des_ip: value
        })
    }
    handleHostPortChange = (value) => {
        console.log(value)
        this.setState({
            des_port: value
        })
    }
    handleSqlChange = (value) => {
        console.log(value)
        this.setState({
            check_sql: value
        })
    }
    async handleSqlSubmit() {
        let params = {
            db_ip: this.state.des_ip,
            db_port: this.state.des_port,
            check_sql_info: this.state.check_sql
        };
        console.log(params);
        let res = await axios.post(`${backendServerApiRoot}/check_sql_info/`,{params});
        console.log(res.data);
        this.setState({
            check_sql_results: res.data
        })
    }


    render() {
        let {check_sql_results} = this.state;
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
            title: 'sql',
            dataIndex: 'sql',
          },
          {
            title: 'results',
            dataIndex: 'results',
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
                        <Link className="title-text" to="/checkSql">
                            SQL工单
                        </Link>
                    </div>
                </div>
                <div className="sub-title-input">
                    <Input required size="large" placeholder="数据库主库地址ip" onChange={e => this.handleHostIpChange(e.target.value)}/>
                    <Input size="large" placeholder="数据库端口" style={{marginLeft:10}} onChange={e => this.handleHostPortChange(e.target.value)}/>
                </div>
                <div>
                    <TextArea rows={10} placeholder="sql"  onChange={e => this.handleSqlChange(e.target.value)}/>
                    <Button type="primary" onClick={()=>{this.handleSqlSubmit()}}>检测</Button>
                </div>
                <Table dataSource={this.state.check_sql_results} columns={columns} bordered />
            </div>
        )
    }
}