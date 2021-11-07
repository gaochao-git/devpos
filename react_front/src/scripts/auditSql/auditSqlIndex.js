import React,{Component} from 'react';
import axios from 'axios'
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, data, Card, AutoComplete, Tooltip,message,Spin} from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import MyAxios from "../common/interface"
import {AditSqlTable} from './auditSqlCommon'
import { UnControlled as CodeMirror } from 'react-codemirror2';
import {ModifyCodemirror} from "../common/myCodemirror";
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { TextArea } = Input
const { TabPane } = Tabs;
const Column = Table.Column;
const FormItem = Form.Item;
const { Option } = Select;


class AuditSqlIndex extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expand:false,
            selectEnvOptionData:['生产','测试'],
            selectExecuteTypeOptionData:['立即执行','暂缓执行'],
            des_ip:"",
            des_port:"",
            db_ip_port:"",
            current_instance_name:"",
            current_cluster_name:"",
            check_sql:"",
            check_sql_info:[],
            check_sql_results:[],
            showDataVisible: false,
            submit_sql_info:[],
            submit_sql_button_disabled:"hide",
            submit_sql_flag:"未提交",
            sql_submit_loading:false,
            des_ip_list:[],
            cluster_name_list:[],
            submit_type:"master_ip_port",
            cluster_name:"",
            schema_name:"",
            table_name:"",
            min_id:"",
            max_id:"",
            where_condition:"",
            mdl_type:"delete",
            create_sql_content:"",
            rebuild_table:"",
            set_value:"",
            check_sql_uuid:"",
            global_loading:false

        }
    }


    componentDidMount() {
        this.GetSubmitSqlInfo()
        this.handleGetMasterIp()
        this.handleGetClusterName()
    }
    //获取已经提交的SQL列表
    async GetSubmitSqlInfo() {
        await MyAxios.get('/v1/service/ticket/audit_sql/get_submit_sql_info/').then(
            res=>{
                if (res.data.status==="ok"){
                    this.setState({
                        submit_sql_info: res.data.data,
                    });
                }else{
                    message.error(res.data.message);
                };
            }
        ).catch(
            err=>{message.error(err.message)}
        )

    }

    //生成块SQL,防止delete/update产生大事物
    async handlerCreateBlockSql() {
        this.setState({create_sql_content:""})
        let params = {
                db_ip: this.state.des_ip,
                db_port: this.state.des_port,
                cluster_name:this.state.cluster_name,
                schema_name:this.state.schema_name,
                table_name:this.state.table_name,
                min_id:this.state.min_id,
                max_id:this.state.max_id,
                where_condition: this.state.where_condition,
                mdl_type: this.state.mdl_type,
                rebuild_table: this.state.rebuild_table,
                set_value: this.state.set_value,
            };
        await MyAxios.post('/create_block_sql/',params).then(
            res => {res.data.status==="ok"?
                this.setState({
                    create_sql_content: res.data.data,
                })
                :
                message.error(res.data.message,3) && this.setState({create_sql_content: ""})
            }
        ).catch(err => {
            message.error(err, 3);
            this.setState({
                create_sql_content: "",
            });
        })
    }
    //检测SQL
    async handleSqlCheck() {
        let params = {
            cluster_name:this.state.current_cluster_name,
            instance_name: this.state.current_instance_name,
            check_sql_info: this.state.check_sql,
            submit_type:this.state.submit_type
        };
        this.setState({
            check_sql_results: [],
            global_loading:true,
            submit_sql_button_disabled:"hide"
        });
        await MyAxios.post('/v1/service/ticket/audit_sql/check_sql/',params).then(
            res => {
                if (res.data.status==="ok"){
                   this.setState({
                        check_sql_results: res.data.data,
                        submit_sql_button_disabled:"show",
                        global_loading:false,
                    })
                }else{
                    message.error(res.data.message,3)
                    this.setState({
                        check_sql_results: [],
                        global_loading:false,
                    })
                }
            }
        ).catch(err => {
            message.error(err, 3);
            this.setState({
                check_sql_results: [],
                global_loading:false,
            });
        })
    }


    //获取预审核结果
    async getPreCheckResultsByUuid() {
        let params = {check_sql_uuid:this.state.check_sql_uuid};
        await MyAxios.get('/v1/service/ticket/audit_sql/get_pre_check_result/',{params}).then(
            res => {
                if (res.data.status==="ok"){
                   this.setState({
                        check_sql_results: res.data.data,
                        submit_sql_button_disabled:"show",
                        global_loading:false,
                    })
                }else{
                    message.error(res.data.message,3)
                }
            }
        ).catch(err => {
            message.error(err, 3);
            this.setState({
                check_sql_results: [],
                global_loading:false,
            });
        })
    }

    //检测SQL
    async v2_handleSqlCheck() {
        let params = {
            cluster_name:this.state.current_cluster_name,
            instance_name: this.state.current_instance_name,
            check_sql_info: this.state.check_sql,
            submit_type:this.state.submit_type
        };
        this.setState({
            check_sql_results: [],
            submit_sql_button_disabled:"hide",
            global_loading:true,
        });
        await MyAxios.post('/v1/service/ticket/audit_sql/check_sql/',params).then(
            res => {
                if (res.data.status==="ok"){
                   message.success("异步审核任务已发起,请等待",3);
                   console.log(res.data.data)
                   this.setState({
                        check_sql_uuid: res.data.data["check_sql_uuid"],
                        celery_id: res.data.data["celery_id"],
                    },()=>{this.setInterVal()})
                }else{
                    message.error(res.data.message,3)
                    this.setState({
                        check_sql_results: [],
                        global_loading:false,
                    })
                }
            }
        ).catch(err => {
            message.error(err, 3);
            this.setState({
                check_sql_results: [],
                global_loading:false,
            });
        })
    }
    //间隔执行
    setInterVal = () => {
         this.timerId = window.setInterval(()=>this.getCheckStatusByUuid(),2000);
    }

    //获取审核任务状态
    async getCheckStatusByUuid() {
        let params = {celery_id:this.state.celery_id};
        await MyAxios.post('/v1/service/ticket/get_celery_task_status/',params).then(
            res => {
                if (res.data.status==="ok"){
                   window.clearInterval(this.timerId);
                   message.success("异步审核任务完成",3);
                   this.getPreCheckResultsByUuid();
                   this.setState({global_loading:false});
                }else if (res.data.status==="error"){
                   window.clearInterval(this.timerId);
                   message.error(res.data.message,3)
                }else {
                   message.warning(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    };


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
            submit_type:this.state.submit_type,
            cluster_name:this.state.current_cluster_name,
            instance_name: this.state.current_instance_name,
            check_sql: this.state.check_sql,
            title:value["Title"],
            env:value["ENV"],
            info:value["INFO"],
            check_sql_results: value["check_sql_results"],
            submit_sql_execute_type: value["执行类型"],
            comment_info: value["comment_info"],
            submit_source_db_type: this.state.submit_type,
            check_sql_uuid: this.state.check_sql_uuid,
        };
        let res = await MyAxios.post('/submit_sql/',params);
        if( res.data.status === 'ok'){
            window.location.reload();
        }
        else{
            this.setState({
                sql_submit_loading:false
            });
            message.error(res.data.message);
        }
    }

    //获取所有mysql实例
    async handleGetMasterIp() {
            await MyAxios.post('/get_master_ip/').then(
                res=>{
                    if(res.data.status === 'ok'){
                        this.setState({
                            des_ip_list: res.data.data,
                        });
                    } else{
                        message.error(res.data.message);
                        this.setState({
                            des_ip_list: []
                        });
                    }
                }
            ).catch(
                err=>{message.error(err.message)}
            )
    }
    //获取所有集群名
    async handleGetClusterName() {
        await MyAxios.post('/get_cluster_name/').then(
            res=>{
                if( res.data.status === 'ok'){
                    this.setState({
                        cluster_name_list: res.data.data,
                    });
                } else{
                    message.error(res.data.message)
                }
            }
        ).catch(err=>message.error(err.message))

    }

    //工单提交modal弹出按钮
    showDataModalHandle = (e) => {
        if (this.state.check_sql.length===0|| this.state.check_sql_results.length===0){
            message.error("提交所需参数不满足要求")
        }else {
            this.setState({
                showDataVisible: true
            });
        }
    }
    //工单提交modal返回按钮
    showDataHandleCancel = (e) => {
        this.setState({
            showDataVisible: false,
        });
    }
    //提工单数据源方式选择
    handleDbSourceTypeChange = (value) => {
        this.setState({
            submit_type: value,
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
        return (
            <Tabs className="container">
                <TabPane tab="SQL工单列表" key="1">
                    <Table
                        dataSource={this.state.submit_sql_info}
                        rowKey={(row ,index) => index}
                        size="small"
                    >
                        <Column title="标题"
                            dataIndex="title"
                            render={(text) => {
                                return (
                                    text.length>5 ?
                                    <Tooltip placement="topLeft" title={text}>
                                        <span>{text.slice(0,5)}...</span>
                                    </Tooltip>
                                        :<span>{text}</span>
                                )
                            }}
                        />
                        <Column title="申请人"
                                dataIndex="submit_sql_user"/>
                        <Column title="TL"
                            dataIndex="leader_user_name"/>
                        <Column title="QA"
                            dataIndex="qa_user_name"/>
                        <Column title="TL审核"
                                dataIndex="leader_check"
                                render={(val) => {
                                return <span>{val==="通过" ? <span style={{color:"green"}}>{val}</span>:<span style={{color:"red"}}>{val}</span>}</span>
                                }}
                        />
                        <Column title="QA审核"
                                dataIndex="qa_check"
                                render={(val) => {
                                    return <span>{val==="通过" ? <span style={{color:"green"}}>{val}</span>:<span style={{color:"red"}}>{val}</span>}</span>
                                }}
                        />
                        <Column title="DBA审核"
                                dataIndex="dba_check"
                                render={(val) => {
                                    return <span>{val==="通过" ? <span style={{color:"green"}}>{val}</span>:<span style={{color:"red"}}>{val}</span>}</span>
                                }}
                        />
                        <Column title="DBA执行"
                                dataIndex="dba_execute"
                                render={(val) => {
                                    return <span>{val==="已执行" ? <span style={{color:"green"}}>{val}</span>:<span>{val}</span>}</span>
                                }}
                        />
                        <Column title="执行人员"
                                dataIndex="dba_execute_user_name"/>
                        <Column title="执行结果"
                                dataIndex="execute_status"
                                render={(val) => {
                                    return <span>{val==="执行成功" || val==="未执行"? <span>{val}</span>:<span  style={{color:"red"}}>{val}</span>}</span>
                                }}
                        />
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
                <Spin spinning={this.state.global_loading} size="large">
                    <div className="sub-title-input">
                        <Select defaultValue="master_ip_port" style={{ width: 150 }} onChange={e => this.handleDbSourceTypeChange(e)}>
                            <Option value="cluster">集群名</Option>
                            <Option value="master_ip">master_ip_port</Option>
                            <Option value="template">模版</Option>
                        </Select>
                        {
                            this.state.submit_type==="cluster" ?
                                <div>
                                    <Select
                                        showSearch
                                        filterOption={(input,option)=>
                                            option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                                        }
                                        style={{width:300,marginLeft:2}}
                                        value={this.state.current_cluster_name}
                                        onChange={e=>this.setState({current_cluster_name:e})}
                                    >
                                        {this.state.cluster_name_list.map(record =>{
                                            return <Option value={record.cluster_name} key={record.cluster_name}>{record.cluster_name}</Option>
                                        })}
                                    </Select>
                                </div>
                            :
                                <div>
                                    <Select
                                        showSearch
                                        filterOption={(input,option)=>
                                            option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                                        }
                                        style={{width:300,marginLeft:2}}
                                        value={this.state.current_instance_name}
                                        onChange={e=>this.setState({current_instance_name:e})}
                                    >
                                        {this.state.des_ip_list.map(record =>{
                                            return <Option value={record.instance_name} key={record.instance_name}>{record.instance_name}</Option>
                                        })}
                                    </Select>
                                </div>
                        }
                    </div>
                    <div>
                        <ModifyCodemirror
                            value={this.state.submit_split_sql}
                            onBlur={(cm) => this.setState({check_sql:cm.getValue()})}
                            onChange={(cm) => this.setState({check_sql_results:[]})}
                        />
                        <Button type="primary" onClick={()=>{this.v2_handleSqlCheck()}}>检测SQL</Button>
                        {this.state.submit_sql_button_disabled==="show" ? <Button  style={{marginLeft:10}} type="primary" onClick={()=>{this.showDataModalHandle()}}>提交SQL</Button>:null}
                    </div>
                    <AditSqlTable
                        data={this.state.check_sql_results}
                        pagination={false}
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
                                                {this.state.selectExecuteTypeOptionData.map((record,index) => <Select.Option key={index} value={record}>{record}</Select.Option>)}
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
                </Spin>
                </TabPane>
                <TabPane tab="生成块SQL" key="3">
                    <div className="sub-title-input">
                        <Input size="default" style={{ width: 150}} placeholder="库名" onChange={e => this.setState({schema_name:e.target.value})}/>
                        <Input size="default" style={{marginLeft:10, width: 300}} placeholder="表名" onChange={e => this.setState({table_name:e.target.value})}/>
                    </div>
                    <div className="sub-title-input">
                        <Input size="default" style={{ width: 150}} placeholder="最小ID" onChange={e => this.setState({min_id:e.target.value})}/>
                        <Input size="default" style={{marginLeft:10, width: 300}} placeholder="最大ID" onChange={e => this.setState({max_id:e.target.value})}/>
                    </div>
                    <div className="sub-title-input">
                        <Select defaultValue="delete" style={{ width: 150 }} onChange={e => this.setState({mdl_type:e})}>
                            <Option value="delete">delete</Option>
                            <Option value="update">update</Option>
                        </Select>
                        {
                            this.state.mdl_type === "delete" ?
                                <Select defaultValue="重建表" style={{marginLeft:10, width: 150 }} onChange={e => this.setState({rebuild_table:e})}>
                                    <Option value="重建表">重建表</Option>
                                    <Option value="不重建表">不重建表</Option>
                                </Select>
                            :null
                        }
                    </div>
                    <div className="sub-title-input">
                        {this.state.mdl_type === "update" ? <Input size="default" style={{width: 800}} placeholder="set 条件(不要输入set关键字),正确输入案例:name='张三', age=18" onChange={e => this.setState({set_value:e.target.value})}/> :null}
                    </div>
                    <div className="sub-title-input">
                        <Input size="default" style={{width: 800}} placeholder="where 条件(不要输入where关键字,不要输入结束符),正确输入案例:name='张三' and age=18" onChange={e => this.setState({where_condition:e.target.value})}/>
                    </div>
                    <div className="sub-title-input">
                        <Button type="primary" onClick={()=>{this.handlerCreateBlockSql()}}>生成SQL</Button>
                    </div>
                    <div className="sub-title-input">
                        {this.state.create_sql_content === "" ? null : <TextArea rows={5} value={this.state.create_sql_content} onChange={e => this.setState({where_condition:e.target.value})}/>}
                    </div>
                    <br/>
                    <div><span style={{color:"#fa541c"}}>功能说明1：通过主键id和用户条件拆分成多个SQL,避免大事物影响线上业务(适用主键为id整型自增场景)</span></div>
                    <div><span style={{color:"#fa541c"}}>功能说明2：重建表用来回收delete产生的碎片,释放数据文件空间及磁盘空间</span></div>
                </TabPane>
            </Tabs>
        );
    }
}
export default Form.create()(AuditSqlIndex);