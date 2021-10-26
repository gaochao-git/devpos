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


export default class DeployMysql extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            submit_info:[],
        }
    }

    componentDidMount() {
        this.GetDeploySubmitInfo()
    }
    //获取工单信息
    async GetDeploySubmitInfo() {
        await MyAxios.post('/get_deploy_mysql_submit_info/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    submit_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }

    render() {
        const columns = [
          {
            title: '提交用户',
            dataIndex: 'submit_user',
          },
          {
              title: '机房',
              dataIndex: 'idc',
          },
          {
              title: '部署集群信息',
              dataIndex: 'deploy_topos',
            },
            {
                title: '版本',
                dataIndex: 'deploy_version',
            },
            {
                title: '高可用架构',
                dataIndex: 'deploy_archit',
            },
            {
                title: '自定义参数',
                dataIndex: 'deploy_other_param',
            },
          {
              title: '工单审核状态',
              dataIndex: 'submit_check',
          },
          {
              title: '审核内容',
              dataIndex: 'submit_check_comment',
          },
         {
             title: '工单是否执行',
             dataIndex: 'submit_execute',
         },
          {
            title: '工单执行状态',
            dataIndex: 'deploy_status',
          },
          {
            title: '创建时间',
            dataIndex: 'create_time',
          },
          {
            title: '更新时间',
            dataIndex: 'update_time',
          },
          {
            title: '操作',
            render: (record) => {
              return <Link to={`/viewDeployMysqlByUuid/${record.submit_uuid}`}>查看</Link>
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
                        <Link className="title-text" to="/CloudInstance">
                            部署mysql
                        </Link>
                    </div>
                </div>
            <div>
            </div>
                <Table
                    dataSource={this.state.submit_info}
                    rowKey={(row ,index) => index}
                    columns={columns}
                    pagination={{
                        total:this.state.submit_info.length,
                        showTotal:(count=this.state.submit_info.length)=>{return '共'+count+'条'}
                    }}
                    bordered
                    size="small"
                />
            </div>
        )
    }
}