import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import { Table, Input,message,Button,Modal,Form,Icon, Select,Tabs,Pagination,Tag,Row,Col,Card} from "antd";
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
const { Option } = Select;

function callback(key) {
  console.log(key);
}
function onChange(pageNumber) {
      console.log('Page: ', pageNumber);
    }
const TASK_TYPE = ['Interval','Crontab']
const TASK_ENABLE = [0,1]
const QUEUE_LIST = ["default","async"]
const EXCHANGE_LIST = ["default","async"]
const ROUTING_LIST = ["default","async"]
const INTERVAL_LIST = ["seconds","minutes","hours","days","microseconds"]


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
            task_type:"Interval",
            interval_unit:"seconds"
        }
    }

    componentDidMount() {
        this.getTaskInfo()
        this.getRegisterTaskInfo()
//        this.getTaskLogInfo()
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
    async addTask(values) {
        let params = {
                task: values['task'],
                task_name: values['task_name'],
                task_desc: values['task_desc'],
                register_task: values['register_task'],
                is_enable: values['is_enable'],
                task_type: values['task_type'],
                task_rule: this.state.task_type==="Interval" ? values['task_rule'] + '-' + this.state.interval_unit:values['task_rule'],
                task_args: JSON.parse(values['task_args']),
                task_queue: values['task_queue'],
                task_exchange: values['task_exchange'],
                task_routing: values['task_routing']
            };
            await MyAxios.post('/task_manage/v1/add_task/',params).then(
            res => {
                if (res.data.status==="ok")
                {
                    message.success(res.data.message);
                    this.getTaskInfo();
                    this.setState({showAddRoleModal:false})
                    this.props.form.resetFields();
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    handleSubmit = e => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            console.log('Received values of form: ', values,this.state.check_sql_results);
            this.addTask(values)
        });
    };

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
                }else if (text==='FAILURE'){
                    color = 'red';
                }
                else{
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
        const postfixSelector = getFieldDecorator('prefix', {
          initialValue: 'seconds',
        })(
          <Select style={{ width: 120 }} onChange={(e) => { this.setState({ interval_unit: e }) }}>
            {INTERVAL_LIST.map((task_type) => <Select.Option key={task_type} value={task_type}>{task_type}</Select.Option>)}
          </Select>,
        );
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
                        <TabPane tab="定时任务管理" key="2">
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
//                    onOk={() => this.addRoleName()}
                    footer={false}
                    title="添加任务"
                    width={900}
                >

                    <Form onSubmit={this.handleSubmit} className="login-form" style={{ width: 800 }}>
                        <Row gutter={16}>
                        <Card>
                            <Col span={12}>
                            <Form.Item label='任务名'>
                            {getFieldDecorator('task_name', {rules: [{ required: true, message: '输入任务名' }],})
                                (<Input placeholder="输入任务名"/>,)
                            }
                        </Form.Item>
                        <Form.Item label='任务描述'>
                            {getFieldDecorator('task_desc', {rules: [{ required: true, message: '输入任务描述' }],})
                                (<Input placeholder="输入任务描述"/>,)
                            }
                        </Form.Item>
                        <FormItem  label='选择已注册任务'>
                             {getFieldDecorator('task', {rules: [{required: true, message: '选择注册任务'}],})(
                                 <Select>
                                     {this.state.register_task_info.map((register_task) => <Select.Option key={register_task} value={register_task}>{register_task}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        <FormItem  label='任务类型'>
                             {getFieldDecorator('task_type', {rules: [{required: true, message: '选择任务类型'}],initialValue: 'Interval'})(
                                 <Select onChange={e => this.setState({task_type:e})}>
                                     {TASK_TYPE.map((task_type) => <Select.Option key={task_type} value={task_type}>{task_type}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        <Form.Item label='任务规则'>
                            {getFieldDecorator('task_rule', {
                                rules: [{ required: true, message: '输入任务规则' }],
                            })(
                                this.state.task_type==="Interval" ? <Input addonAfter={postfixSelector} placeholder="输入数字"/> :<Input placeholder="* * * * *(linux 定时任务格式)"/>
                            )}
                        </Form.Item>
                        </Col>
                        <Col span={12}>
                        <FormItem  label='是否开启'>
                             {getFieldDecorator('is_enable', {rules: [{required: true, message: '选择是否开启'}],initialValue: 0})(
                                 <Select>
                                     {TASK_ENABLE.map((is_enable) => <Select.Option key={is_enable} value={is_enable}>{is_enable}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        <Form.Item label='参数'>
                            {getFieldDecorator('task_args', {rules: [{ required: true, message: '输入参数' }],})
                                (<Input placeholder='输入参数[args,args2]或者{"key1":"value","key2":"value"}'/>,)
                            }
                        </Form.Item>
                        <FormItem  label='选择Queue'>
                             {getFieldDecorator('task_queue', {rules: [{required: true, message: '选择queue'}],initialValue: 'default'})(
                                 <Select>
                                     {QUEUE_LIST.map((record,index) => <Select.Option key={index} value={record}>{record}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        <FormItem  label='选择Exchange'>
                             {getFieldDecorator('task_exchange', {rules: [{required: true, message: '选择exchange'}],initialValue: 'default'})(
                                 <Select>
                                     {EXCHANGE_LIST.map((record,index) => <Select.Option key={index} value={record}>{record}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        <FormItem  label='选择Routing key'>
                             {getFieldDecorator('task_routing', {rules: [{required: true, message: '选择routing'}],initialValue: 'default'})(
                                 <Select>
                                     {ROUTING_LIST.map((record,index) => <Select.Option key={index} value={record}>{record}</Select.Option>)}
                                 </Select>
                             )}
                        </FormItem>
                        </Col>
                        </Card>

                    </Row>
                        <Button type="primary" loading={this.state.sql_submit_loading} htmlType="submit">submit</Button>
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