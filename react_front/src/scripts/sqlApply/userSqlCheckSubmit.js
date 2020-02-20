import React,{Component} from 'react';
import axios from 'axios'
import { Button,Table, Input, Modal, Tabs, Form, Row, Select, message, Card, AutoComplete } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import { backendServerApiRoot } from "../common/util"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { TextArea } = Input
const { TabPane } = Tabs;
const Column = Table.Column;
const FormItem = Form.Item;
const { Option } = Select;
const { Search } = Input;
//const server = 'http://192.168.0.104:8000';
// function callback(key) {
//   console.log(key);
// }


class UserSqlCheckSubmit extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expand:false,
            selectEnvOptionData:['生产','测试'],
            selectExecuteTyoeOptionData:['立即执行','暂缓执行'],
            des_ip:"",
            des_port:"",
            check_sql:"",
            check_sql_info:[],
            check_sql_results:[],
            showDataVisible: false,
            submit_sql_info:[],
            submit_sql_button_disabled:"hide",
            submit_sql_flag:"未提交",
            login_user:"",
            sql_check_loading:false,
            sql_submit_loading:false,
            des_ip_list:[],
            submit_source_db_type:"cluster",
            cluster_name:"",
            cluster_name_list:[],
        }
    }
    componentDidMount() {
        this.GetSubmitSqlInfo()
    }
    //获取已经提交的SQL列表
    async GetSubmitSqlInfo() {
        let res = await axios.get(`${backendServerApiRoot}/get_submit_sql_info/`,);
        console.log(res.data);
        this.setState({
            submit_sql_info: res.data.data,
        });
    }
    //检测SQL
    async handleSqlCheck() {
        this.state.submit_source_db_type==="cluster" ? this.handleClusterNameSqlCheck(): this.handleMasterIpPortSqlCheck()
    }
    //cluster_name检测SQL
    async handleClusterNameSqlCheck() {
        if (this.state.cluster_name.length===0 || this.state.check_sql.length===0){
            console.log(this.state.cluster_name)
            message.error("输入框不能为空")

        }else{
            let params = {
                db_ip: this.state.des_ip,
                db_port: this.state.des_port,
                check_sql_info: this.state.check_sql,
                cluster_name:this.state.cluster_name,
                submit_source_db_type:this.state.submit_source_db_type
            };
            this.setState({
                check_sql_results: [],
                sql_check_loading:true,
                submit_sql_button_disabled:"hide"
            });
            console.log(params);
            // let res = await axios.post(`${backendServerApiRoot}/check_sql/`,{params});
            await axios.post(`${backendServerApiRoot}/check_sql/`,{params}).then(
                res => {res.data.status==="ok"?
                    this.setState({
                        check_sql_results: res.data.data,
                        submit_sql_button_disabled:"show",
                        sql_check_loading:false,
                    })
                    :
                    message.error(res.data.message,3) && this.setState({check_sql_results: [],sql_check_loading:false,})
                }
            ).catch(err => {
                message.error(err, 3);
                this.setState({
                    check_sql_results: [],
                    sql_check_loading:false,
                });
            })
        }
    }
    //master_ip_port检测SQL
    async handleMasterIpPortSqlCheck() {
        if (this.state.des_ip.length===0 || this.state.des_port.length===0 || this.state.check_sql.length===0){
            message.error("输入框不能为空")
        }else{
            let params = {
                db_ip: this.state.des_ip,
                db_port: this.state.des_port,
                check_sql_info: this.state.check_sql,
                cluster_name:this.state.cluster_name,
                submit_source_db_type:this.state.submit_source_db_type
            };
            this.setState({
                check_sql_results: [],
                sql_check_loading:true,
                submit_sql_button_disabled:"hide"
            });
            console.log(params);
            // let res = await axios.post(`${backendServerApiRoot}/check_sql/`,{params});
            await axios.post(`${backendServerApiRoot}/check_sql/`,{params}).then(
                res => {res.data.status==="ok"?
                    this.setState({
                        check_sql_results: res.data.data,
                        submit_sql_button_disabled:"show",
                        sql_check_loading:false,
                    })
                    :
                    message.error(res.data.message,3) && this.setState({check_sql_results: [],sql_check_loading:false,})
                }
            ).catch(err => {
                message.error(err, 3);
                this.setState({
                    check_sql_results: [],
                    sql_check_loading:false,
                });
            })
        }
    }

    //组装提交SQL信息,防止多次提交
    handleSubmit = e => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            console.log('Received values of form: ', values,this.state.check_sql_results);
            values["check_sql_results"] = this.state.check_sql_results;
            this.state.submit_sql_flag === "未提交" ? this.handleSqlSubmit(values) : message.error(this.state.submit_sql_flag)
        });
    };
    //提交SQL
    async handleSqlSubmit(value) {
        this.setState({
            sql_submit_loading:true
        });
        let params = {
            submit_source_db_type:this.state.submit_source_db_type,
            cluster_name:this.state.cluster_name,
            db_ip: this.state.des_ip,
            db_port: this.state.des_port,
            check_sql: this.state.check_sql,
            title:value["Title"],
            // leader:value["LEADER"],
            // qa:value["QA"],
            env:value["ENV"],
            info:value["INFO"],
            check_sql_results: value["check_sql_results"],
            submit_sql_execute_type: value["执行类型"],
            comment_info: value["comment_info"],
            login_user:"小黑",
        };
        console.log(params)
        let res = await axios.post(`${backendServerApiRoot}/submit_sql/`,{params});
        if( res.data.status === 'ok'){
            this.setState({
                sql_submit_loading:false
            });
            window.location.reload();
        }
        else
            alert(res.data.message);
    }

    //master ip输入框
    onSearch = searchText => {
        this.handleGetMasterIp(searchText)
    };
    //根据master ip输入框自动补全ip
    async handleGetMasterIp(value) {
        if (value.length>=1){
            let params = {
                db_master_ip_or_hostname: value
            };
            console.log(params)
            let res = await axios.post(`${backendServerApiRoot}/get_master_ip/`,{params});
            if( res.data.status === 'ok'){
                console.log(res.data.data)
                this.setState({
                    des_ip_list: res.data.data.length===0 ? []:res.data.data,
                });
            } else{
                console.log("get_master_ip接口错误")
            }
        }else {
            this.setState({
                des_ip_list: []
            });
            console.log("请输入ip或hostname")
        }
    }


    //cluster_name输入框
    onClusterNameSearch = searchText => {
        this.handleGetClusterName(searchText)
    };
    //根据cluster_name输入框自动补全ip
    async handleGetClusterName(value) {
        if (value.length>=1){
            let params = {
                cluster_name: value
            };
            console.log(params)
            let res = await axios.post(`${backendServerApiRoot}/get_cluster_name/`,{params});
            if( res.data.status === 'ok'){
                console.log(res.data.data)
                this.setState({
                    cluster_name_list: res.data.data.length===0 ? []:res.data.data,
                });
            } else{
                console.log("get_cluster_name接口错误")
            }
        }else {
            this.setState({
                cluster_name_list: []
            });
            console.log("请输入cluster_name")
        }
    }
    // async onSelect(value) {
    //     console.log('onSelect', value);
    //     this.setState({
    //         des_ip:value
    //     })
    // }
    onSelect = select => {
        this.setState({
            des_ip:select
        })
    };
    onClusterNameSelect = select => {
        this.setState({
            cluster_name:select
        })
    };
    //master port输入框捕获
    handleHostPortChange = (value) => {
        console.log(value)
        this.setState({
            des_port: value
        })
    }
    //cluster name输入框捕获
    handleClusterNameChange = (value) => {
        console.log(value)
        this.setState({
            cluster_name: value
        })
    }
    handleSqlChange = (value) => {
        console.log(value)
        this.setState({
            check_sql: value,
            check_sql_results:[],
        })
    }
    //预览数据 modal弹出按钮
    showDataModalHandle = (e) => {
        if (this.state.check_sql.length===0|| this.state.check_sql_results.length===0){
            message.error("提交所需参数不满足要求")
        }else {
            this.setState({
                showDataVisible: true
            });
        }
    }
    //预览数据 modal返回按钮
    showDataHandleCancel = (e) => {
        this.setState({
            showDataVisible: false,
        });
    }
    //提工单数据源方式选择
    handleDbSourceTypeChange = (value) => {
        this.setState({
            submit_source_db_type: value,
        });
    }


    handleReset = () => {
      this.props.form.resetFields();
    };

    toggle = () => {
      const { expand } = this.state;
      this.setState({ expand: !expand });
    };
    render() {
        const {form} = this.props;
        const {getFieldDecorator} = form;
        const check_results_columns = [
            {
              title: 'sql',
              dataIndex: 'SQL',
              key:"SQL",
              width:540
            },
            {
              title: '状态',
              dataIndex: 'Stage_Status',
              key:"Stage_Status",
            },
            {
              title: '错误代码',
              dataIndex: 'Error_Level',
              key:"Error_Level",
            },
            {
              title: '错误信息',
              dataIndex: 'Error_Message',
              key: "Error_Message",
            },
            {
              title: '影响行数',
              dataIndex: 'Affected_rows',
              key: "Affected_rows"
            }
        ];
        return (
            <Tabs className="container">
                <TabPane tab="SQL请求列表" key="1">
                    <Table
                        dataSource={this.state.submit_sql_info}
                        rowKey={(row ,index) => index}
                        rowClassName={(record, index) => {
                            let className = 'row-detail-default ';
                            if (record.leader_check === "未审核"|| record.qa_check === "未审核"||record.dba_check === "未审核"||record.dba_execute === "未执行") className = 'row-detail-error';
                            return className;}}
                        size="small"
                    >
                        <Column title="标题"
                            dataIndex="title"/>
                        <Column title="申请人"
                                dataIndex="submit_sql_user"/>
                        <Column title="TL姓名"
                            dataIndex="leader_user_name"/>
                        <Column title="QA姓名"
                            dataIndex="qa_user_name"/>
                        <Column title="TL审核"
                                dataIndex="leader_check"/>
                        <Column title="QA审核"
                                dataIndex="qa_check"/>
                        <Column title="DBA审核"
                            dataIndex="dba_check"/>
                        <Column title="DBA执行"
                            dataIndex="dba_execute"/>
                        <Column title="DBA执行人员"
                            dataIndex="dba_execute_user_name"/>
                        <Column title="工单创建时间"
                            dataIndex="ctime"/>
                        <Column title="工单修改时间"
                            dataIndex="utime"/>
                        <Column title="操作"
                            render={record => {
                                return <Link to={`/viewApplySqlByUuid/${record.submit_sql_uuid}`}>查看</Link>
                            }}/>
                    </Table>
                </TabPane>
                <TabPane tab="SQL新建工单" key="2">
                    <div className="sub-title-input">
                        <Select defaultValue="集群名" style={{ width: 150 }} onChange={e => this.handleDbSourceTypeChange(e)}>
                            <Option value="cluster">集群名</Option>
                            <Option value="master_ip">master_ip_port</Option>
                        </Select>
                        {
                            this.state.submit_source_db_type==="cluster" ?
                                <div>
                                    {/*<Input size="default" style={{width: 300,marginLeft:10}} placeholder="输入集群名" onChange={e => this.handleClusterNameChange(e.target.value)}/>*/}
                                    <AutoComplete
                                        dataSource={this.state.cluster_name_list}
                                        style={{ width: 300,marginLeft:10 }}
                                        onSelect={this.onClusterNameSelect}
                                        onSearch={this.onClusterNameSearch}
                                        placeholder="输入集群名"
                                        size="default"
                                    />
                                </div>
                            :
                                <div>
                                    <AutoComplete
                                        dataSource={this.state.des_ip_list}
                                        style={{ width: 300,marginLeft:10 }}
                                        onSelect={this.onSelect}
                                        onSearch={this.onSearch}
                                        placeholder="数据库主库地址ip或主机名"
                                        size="default"
                                    />
                                    {/*<Input size="large" value={this.state.des_ip} placeholder="数据库主库地址ip" onChange={e => this.handleGetMasterIp(e.target.value)}/>*/}
                                    <Input size="default" style={{marginLeft:10, width: 300}} placeholder="数据库端口" onChange={e => this.handleHostPortChange(e.target.value)}/>
                                </div>
                        }
                    </div>
                    <div>
                        <TextArea rows={10} placeholder="输入SQL,每条SQL以;结尾"  onChange={e => this.handleSqlChange(e.target.value)}/>
                        <Button type="primary" loading={this.state.sql_check_loading} onClick={()=>{this.handleSqlCheck()}}>检测SQL</Button>
                        {this.state.submit_sql_button_disabled==="show" ? <Button  style={{marginLeft:10}} type="primary" onClick={()=>{this.showDataModalHandle()}}>提交SQL</Button>:null}
                    </div>
                    <Table
                        dataSource={this.state.check_sql_results}
                        columns={check_results_columns}
                        bordered
                        rowKey={(row ,index) => index}
                    />
                    <Modal
                        title="表单提交"
                        visible={this.state.showDataVisible}
                        onCancel={this.showDataHandleCancel}
                        onOk={this.handleSqlSubmit.bind(this)}
                        width='960px'
                        footer={false}
                    >
                        <Form className="ant-advanced-search-form" labelCol={{ span: 2 }} onSubmit={this.handleSubmit}>
                            <Row gutter={24}>
                                <Card>
                                    <FormItem  label='Title'>
                                        {getFieldDecorator('Title', {rules: [{required: true, message: '请输入title'}],})(
                                            <Input placeholder='请输入title'/>
                                        )}
                                    </FormItem>
                                    {/*<FormItem  label='LEADER'>*/}
                                    {/*    {getFieldDecorator('LEADER', {rules: [{required: true, message: '请输入leader名字'}],})(*/}
                                    {/*        <Input placeholder='请输入leader名字'/>*/}
                                    {/*    )}*/}
                                    {/*</FormItem>*/}
                                    {/*<FormItem  label='QA'>*/}
                                    {/*    {getFieldDecorator('QA', {rules: [{required: true, message: '请输入qa姓名'}]})(*/}
                                    {/*      <Input placeholder='请输入qa姓名'/>*/}
                                    {/*    )}*/}
                                    {/*</FormItem>*/}
                                    <FormItem  label='ENV'>
                                        {getFieldDecorator('ENV', {rules: [{required: true, message: '请输入环境'}],})(
                                            <Select>
                                                {this.state.selectEnvOptionData.map((record,index) => <Select.Option key={index} value={record}>{record}</Select.Option>)}
                                            </Select>
                                        )}
                                    </FormItem>
                                    <FormItem  label='执行类型'>
                                        {getFieldDecorator('执行类型', {rules: [{required: true, message: '请输入执行类型'}],})(
                                            <Select>
                                                {this.state.selectExecuteTyoeOptionData.map((record,index) => <Select.Option key={index} value={record}>{record}</Select.Option>)}
                                            </Select>
                                        )}
                                    </FormItem>
                                    <FormItem  label='备注'>
                                        {getFieldDecorator('comment_info', {rules: [{required: true, message: '请输入comment_info'}],})(
                                            <Input placeholder='请输入备注'/>
                                        )}
                                    </FormItem>
                                </Card>
                                <Button type="primary" loading={this.state.sql_submit_loading} htmlType="submit">submit</Button>
                            </Row>
                        </Form>
                    </Modal>
                </TabPane>
            </Tabs>
        );
    }
}
export default Form.create()(UserSqlCheckSubmit);