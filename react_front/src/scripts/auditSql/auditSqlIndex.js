import React,{Component} from 'react';
import axios from 'axios'
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, data, Card, AutoComplete, Tooltip,message} from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import MyAxios from "../common/interface"
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
            check_sql:"",
            check_sql_info:[],
            check_sql_results:[],
            showDataVisible: false,
            submit_sql_info:[],
            submit_sql_button_disabled:"hide",
            submit_sql_flag:"未提交",
            sql_check_loading:false,
            sql_submit_loading:false,
            des_ip_list:[],
            cluster_name_list:[],
            submit_source_db_type:"master_ip_port",
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

        }
    }


    componentDidMount() {
        this.GetSubmitSqlInfo()
    }
    //获取已经提交的SQL列表
    async GetSubmitSqlInfo() {
        let res = await MyAxios.post('/get_submit_sql_info/');
        this.setState({
            submit_sql_info: res.data.data,
        });
    }
    //检测SQL,cluster_name或者master_ip_port使用不同的方法
    async handleSqlCheck() {
        this.state.submit_source_db_type==="cluster" ? this.handleClusterNameSqlCheck(): this.handleMasterIpPortSqlCheck()
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
    //cluster_name检测SQL,集群名和输入SQL不能为空
    async handleClusterNameSqlCheck() {
        console.log(this.state.check_sql)
        if (this.state.cluster_name.length===0 || this.state.check_sql.length===0){
            message.error("cluster_name检测SQL输入框不能为空")
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
            await MyAxios.post('/check_sql/',params).then(
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
    //master_ip_port检测SQL,ip、port、输入SQL不能为空
    async handleMasterIpPortSqlCheck() {
        this.setState({
                sql_submit_loading:false
            });
        if (this.state.des_ip.length===0 || this.state.des_port.length===0 || this.state.check_sql.length===0){
            message.error("master_ip_port检测SQL输入框不能为空")
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
            await MyAxios.post('/check_sql/',params).then(
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
            env:value["ENV"],
            info:value["INFO"],
            check_sql_results: value["check_sql_results"],
            submit_sql_execute_type: value["执行类型"],
            comment_info: value["comment_info"],
        };
        let res = await MyAxios.post('/submit_sql/',params);
        if( res.data.status === 'ok'){
            window.location.reload();
        }
        else{
            this.setState({
                sql_submit_loading:false
            });
            message.success(res.data.message);
        }
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
            let res = await MyAxios.post('/get_master_ip/',params);
            if( res.data.status === 'ok'){
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
            let res = await MyAxios.post('/get_cluster_name/',params);
            if( res.data.status === 'ok'){
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
        }
    }
    //搜索出来ip后点击捕获
    onSelect = select => {
        this.setState({
            des_ip:select
        })
    };
    //搜索出来cluster_name后点击捕获
    onClusterNameSelect = select => {
        this.setState({
            cluster_name:select
        })
    };
    //master port输入框
    handleHostPortChange = (value) => {
        this.setState({
            des_port: value
        })
    }
    //cluster name输入框自动搜索
    handleClusterNameChange = (value) => {
        this.setState({
            cluster_name: value
        })
    }
    //sql输入框
    handleSqlChange = (value) => {
        this.setState({
            check_sql: value,
            check_sql_results:[],
        })
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
              const check_results_columns = [
            {
              title: 'ID',
              dataIndex: 'ID',
              key: "ID",
            },
            {
              title: 'stage',
              dataIndex: 'stage',
              key: "stage",
            },
            {
              title: 'SQL',
              dataIndex: 'SQL',
              key: "SQL",
            },
            {
              title: '状态',
              dataIndex: 'stagestatus',
              key:"stagestatus",
            },
            {
              title: '错误代码',
              dataIndex: 'errlevel',
              key:"errlevel",
              sorter: (a, b) => a.Error_Level - b.Error_Level,
            },
            {
              title: '错误信息',
              dataIndex: 'errormessage',
              key:"errormessage",
            },
            {
              title: '影响行数',
              dataIndex: 'Affected_rows',
              key:"Affected_rows",
            },
            {
              title: 'SQL类型',
              dataIndex: 'command',
              key:"command",
            },
        ];
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
                    <div className="sub-title-input">
                        <Select defaultValue="master_ip_port" style={{ width: 150 }} onChange={e => this.handleDbSourceTypeChange(e)}>
                            <Option value="cluster">集群名</Option>
                            <Option value="master_ip">master_ip_port</Option>
                            <Option value="template">模版</Option>
                        </Select>
                        {
                            this.state.submit_source_db_type==="cluster" ?
                                <div>
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
                                    <Input size="default" style={{marginLeft:10, width: 300}} placeholder="数据库端口" onChange={e => this.handleHostPortChange(e.target.value)}/>
                                </div>
                        }
                    </div>
                    <div>
                        <TextArea rows={10} placeholder="输入SQL,每条SQL以 ; 结尾"  onChange={e => this.handleSqlChange(e.target.value)}/>
                        <Button type="primary" loading={this.state.sql_check_loading} onClick={()=>{this.handleSqlCheck()}}>检测SQL</Button>
                        {this.state.submit_sql_button_disabled==="show" ? <Button  style={{marginLeft:10}} type="primary" onClick={()=>{this.showDataModalHandle()}}>提交SQL</Button>:null}
                    </div>
                    <Table
                          dataSource={this.state.check_sql_results}
                          rowKey={(row ,index) => index}
                                                    rowClassName={(record, index) => {
                                                let className = 'row-detail-default ';
                                                if (record.Error_Level === 2) {
                                                    className = 'row-detail-error';
                                                    return className;
                                                }else if (record.Error_Level  === 0){
                                                    className = 'row-detail-success';
                                                    return className;
                                                }else if (record.Error_Level  === 1){
                                                    className = 'row-detail-warning';
                                                    return className;
                                                }else {
                                                    return className;
                                                }
                                    }}
                            pagination={true}
                            size="small"
                            columns={check_results_columns}

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
                        <Button type="primary" loading={this.state.sql_check_loading} onClick={()=>{this.handlerCreateBlockSql()}}>生成SQL</Button>
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