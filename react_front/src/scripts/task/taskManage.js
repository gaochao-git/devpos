import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import { Table, Input,message,Button,Modal,Form,Icon, Select,Tabs,Pagination,Tag} from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import { backendServerApiRoot } from "../common/util"
import { MyTable } from "../common/myTable"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { Search } = Input;
const FormItem = Form.Item;
const { TabPane } = Tabs;

function callback(key) {
  console.log(key);
}
function onChange(pageNumber) {
      console.log('Page: ', pageNumber);
    }
const TASK_TYPE = ['Interval','Crontab']
const TASK_ENABLE = ["开启","不开启"]


class TaskManage extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            showAddRoleModal:false,
            add_role_name:"",
            del_role_name:"",
            //==================
            task_config_info:[],
            register_task_info:[],
            task_log_info:[],
        }
    }

    componentDidMount() {
        this.getTaskInfo()
        this.getRegisterTaskInfo()
        this.timer= setInterval(() => {
            this.getTaskLogInfo()
        }, 1000);
    }
    componentWillUnmount() {
      if (this.timer != null) {
        clearInterval(this.timer);
      }
    }
    //获取所有配置任务
    async getTaskInfo() {
        await MyAxios.get('/task_manage/v1/get_task_info/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    task_config_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }
    //获取所有已注册的任务
    async getRegisterTaskInfo() {
        await MyAxios.get('/task_manage/v1/get_register_task/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    register_task_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }
    //获取任务运行日志
    async getTaskLogInfo() {
        await MyAxios.get('/task_manage/v1/get_task_log/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    task_log_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }

    //删除角色
    async delRoleName() {
        let params = {role_name:this.state.del_role_name}
        await MyAxios.post('/permission/v1/del_role_name/',params).then(
            res => {
                if (res.data.status==="ok")
                {
                    message.success(res.data.message);
                    this.getUserRoleInfo();
                    this.setState({del_role_name:"",showDelRoleModal:false})
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    //增加角色
    async addRoleName() {
        let params = {role_name:this.state.add_role_name}
        await MyAxios.post('/permission/v1/add_role_name/',params).then(
            res => {
                if (res.data.status==="ok")
                {
                    message.success(res.data.message);
                    this.getUserRoleInfo();
                    this.setState({add_role_name:"",showAddRoleModal:false})
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }



    render() {
        const columns = [
          {
            title: '任务名',
            dataIndex: 'name',
          },
          {
              title: '任务',
              dataIndex: 'task',
          },
          {
                title: '类型',
                dataIndex: 'type',
          },
          {
                title: '规则',
                dataIndex: 'rule',
          },
          {
                title: 'enabled',
                dataIndex: 'enabled',
          },
          {
                title: '最近运行时间',
                dataIndex: 'last_run_at',
          },
          {
                title: '已运行次数',
                dataIndex: 'total_run_count',
          },
          {
                title: 'args',
                dataIndex: 'args',
          },
          {
              title: 'kwargs',
              dataIndex: 'kwargs',
          },
          {
                title: 'queue',
                dataIndex: 'queue',
          },
          {
                title: 'exchange',
                dataIndex: 'exchange',
          },
          {
                title: 'routing_key',
                dataIndex: 'routing_key',
          },
          {
                title: 'expires',
                dataIndex: 'expires',
          },
          {
                title: 'date_changed',
                dataIndex: 'date_changed',
          },
          {
                title: 'description',
                dataIndex: 'description',
          },
          {
            title: '操作',
            fixed: 'right',
            render: (record) => {
              return (
              <div>
                <Button type="primary" onClick={()=>{this.setState({del_role_name:record.role_name,showDelRoleModal:true})}}>修改</Button>
                <Button type="danger" onClick={()=>{this.setState({del_role_name:record.role_name,showDelRoleModal:true})}}>删除</Button>
              </div>
              )
            }
          }
        ];
        const task_monitor_columns = [
          {
            title: 'state',
            dataIndex: 'state',
            sorter:(a,b)=>a.state.localeCompare(b.state),
            render: (text,record,index) => {
                let color = 'red';
                if (text === 'SUCCESS') {
                  color = 'green';
                }else{
                    color = 'blue';
                }
                return (
                    <Tag color={color}>{text}</Tag>);
            },
          },
          {
              title: 'task_id',
              dataIndex: 'task_id',
          },
          {
                title: 'name',
                dataIndex: 'name',
                sorter:(a,b)=>a.state.localeCompare(b.state),
          },
          {
                title: 'tstamp',
                dataIndex: 'tstamp',
          },
          {
                title: 'args',
                dataIndex: 'args',
                sorter:(a,b)=>a.state.localeCompare(b.state),
          },
          {
                title: 'kwargs',
                dataIndex: 'kwargs',
                sorter:(a,b)=>a.state.localeCompare(b.state),
          },
          {
                title: 'eta',
                dataIndex: 'eta',
          },
          {
                title: 'expires',
                dataIndex: 'expires',
          },
          {
              title: 'result',
              dataIndex: 'result',
          },
          {
                title: 'traceback',
                dataIndex: 'traceback',
          },
          {
                title: 'runtime',
                dataIndex: 'runtime',
          },
          {
                title: 'retries',
                dataIndex: 'retries',
          },
          {
                title: 'hidden',
                dataIndex: 'expires',
          },
          {
                title: 'date_changed',
                dataIndex: 'date_changed',
          },
          {
                title: 'worker_id',
                dataIndex: 'worker_id',
          },
          {
            title: '操作',
            fixed: 'right',
            render: (record) => {
              return (
              <div>
                <Button type="danger" onClick={()=>{this.setState({del_role_name:record.role_name,showDelRoleModal:true})}}>revoke</Button>
              </div>
              )
            }
          }
        ];
        const {form} = this.props;
        const {getFieldDecorator} = form;
        return (
            <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">
                            Home
                        </Link>
                        >>
                        <Link className="title-text" to="/UserRole">
                            任务管理
                        </Link>
                    </div>
                </div>
            <div>
            </div>
                <div>
                    <Tabs defaultActiveKey="1" onChange={callback}>
                        <TabPane tab="任务运行监控" key="1">
                            <MyTable
                                dataSource={this.state.task_log_info}
                                scroll={{ x: true }}
                                columns={task_monitor_columns}
                            />
                        </TabPane>
                        <TabPane tab="队列信息" key="2">
                            <Table
                                dataSource={this.state.task_config_info}
                                columns={columns}
                                pagination={{
                                    total:this.state.task_config_info.length,
                                    showTotal:(count=this.state.task_config_info.length)=>{return '共'+count+'条'},
                                }}
                                bordered
                                size="small"
                                scroll={{ x: true }}
                            />
                            <Button type="primary" onClick={()=>{this.setState({showAddRoleModal:true})}}>新增任务</Button>
                        </TabPane>
                        <TabPane tab="定时任务管理" key="3">
                            <Table
                                dataSource={this.state.task_config_info}
                                columns={columns}
                                pagination={{
                                    showTotal: ((total) => {return `共 ${total} 条`}),
                                    showSizeChanger:true,
                                    pageSize: 10 ,
                                    pageSizeOptions: ['10', '20', '30', '40', '50', '100', '500', '1000'],
                                    showQuickJumper:true,
                                    defaultCurrent:1,
                                    onChange: ((page, pageSize) => {
                                        console.log(page,pageSize)
                                    }),
                                    onShowSizeChange: (page) => {
                                        console.log(page)
                                    }
                                }}
                                bordered
                                size="small"
                                scroll={{ x: true }}
                            />
                            <Button type="primary" onClick={()=>{this.setState({showAddRoleModal:true})}}>新增任务</Button>
                        </TabPane>
                    </Tabs>
                </div>
                <Modal visible={this.state.showAddRoleModal}
                    onCancel={() => this.setState({showAddRoleModal:false})}
                    onOk={() => this.addRoleName()}
                    title="添加任务"
                    width={600}
                >
                    <Form onSubmit={this.handleLoginSubmit} className="login-form">
                        <Form.Item label='任务名'>
                            {getFieldDecorator('password', {rules: [{ required: true, message: 'Please input your Password!' }],})
                                (<Input placeholder="输入任务名"/>,)
                            }
                        </Form.Item>
                        <Form.Item label='任务描述'>
                            {getFieldDecorator('password', {rules: [{ required: true, message: 'Please input your Password!' }],})
                                (<Input placeholder="输入任务描述"/>,)
                            }
                        </Form.Item>
                        <FormItem  label='选择已注册任务'>
                             {getFieldDecorator('register_task', {rules: [{required: true, message: '请输入执行类型'}],})(
                                 <Select>
                                     {this.state.register_task_info.map((register_task) => <Select.Option key={register_task} value={register_task}>{register_task}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        <FormItem  label='是否开启'>
                             {getFieldDecorator('is_enable', {rules: [{required: true, message: '请输入执行类型'}],})(
                                 <Select>
                                     {TASK_ENABLE.map((is_enable) => <Select.Option key={is_enable} value={is_enable}>{is_enable}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        <FormItem  label='任务类型'>
                             {getFieldDecorator('task_type', {rules: [{required: true, message: '请输入执行类型'}],})(
                                 <Select>
                                     {TASK_TYPE.map((task_type) => <Select.Option key={task_type} value={task_type}>{task_type}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        <Form.Item label='触发规则'>
                            {getFieldDecorator('username', {
                                rules: [{ required: true, message: 'Please input your username!' }],
                            })(
                                <Input placeholder="5s/3min/1h/2day"/>,
                            )}
                        </Form.Item>

                        <Form.Item label='参数'>
                            {getFieldDecorator('password', {rules: [{ required: true, message: 'Please input your Password!' }],})
                                (<Input placeholder='输入参数[args,args2]或者{"key1":"value","key2":"value"}'/>,)
                            }
                        </Form.Item>
                        <FormItem  label='选择Queue'>
                             {getFieldDecorator('queue', {rules: [{required: true, message: '请输入执行类型'}],})(
                                 <Select>
                                     {TASK_TYPE.map((record,index) => <Select.Option key={index} value={record}>{record}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        <FormItem  label='选择Exchange'>
                             {getFieldDecorator('exchange', {rules: [{required: true, message: '请输入执行类型'}],})(
                                 <Select>
                                     {TASK_TYPE.map((record,index) => <Select.Option key={index} value={record}>{record}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        <FormItem  label='选择Routing key'>
                             {getFieldDecorator('routing_key', {rules: [{required: true, message: '请输入执行类型'}],})(
                                 <Select>
                                     {TASK_TYPE.map((record,index) => <Select.Option key={index} value={record}>{record}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                    </Form>
                </Modal>
                <Modal visible={this.state.showDelRoleModal}
                    onCancel={() => this.setState({showDelRoleModal:false})}
                    onOk={() => this.delRoleName()}
                    width={300}
                >
                   删除角色: {this.state.del_role_name}
                </Modal>
            </div>
        )
    }
}

export default Form.create()(TaskManage);