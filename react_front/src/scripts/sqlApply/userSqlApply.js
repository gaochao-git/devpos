import React, { Component } from 'react';
import { Table, Row, Col, Button, message, Modal, Input, Checkbox,Popconfirm, } from 'antd';
import { Link } from 'react-router-dom';
import axios from "axios";
import {backendServerApiRoot} from "../common/util";


const Column = Table.Column;
const TextArea = Input.TextArea;
// const CheckboxGroup = Checkbox.Group;
// const plainOptions = ['备份', '忽略inception警告', '忽略inception错误强制执行'];
// const defaultCheckedList = ['备份'];
const EditableCell = ({ editable, value, onChange }) => (
    <div>
        {editable
          ? <Input style={{ margin: '-5px 0' }} value={value} onChange={e => onChange(e.target.value)} />
          : value
        }
    </div>
);

export default class UserSqlApply extends Component {
    constructor(props) {
        super(props);
        this.state = {
            submit_sql_title:"",
            submit_sql:"",
            master_ip:"",
            master_port:"",
            submit_sql_user:"",
            leader_user_name:"",
            qa_user_name:"",
            dba_check_user_name:"",
            dba_execute_user_name:"",
            leader_check: "",
            qa_check: "",
            dba_check: "",
            dba_execute: "",
            execute_status:"",
            execute_sql_process_results:[],
            check_sql_results:[],
            view_check_sql_result:[],
            view_submit_sql_info:[],
            submit_sql_uuid:"",
            showSubmitSqlViewVisible:false,
            showSubmitSqlResultsVisible:false,
            ApplyModalVisible:false,
            ViewExecuteSubmitSqlModalVisible:false,
            ViewExecuteSubmitSqlProcessModalVisible:false,
            InceptionVariableConfigModalVisible:false,
            timerId:null,
            timerProcessId:null,
            execute_sql_flag:"未提交",
            inception_backup:1,
            inception_check_ignore_warning:0,
            inception_execute_ignore_error:0,
            data :[],
            editingKey:'',
            newClusterCfg:{},
            newConfig:{}
        }
        this.cacheData = this.state.data.map(item => ({ ...item }));
    }

    componentDidMount() {
        console.log(this.props.match.params["submit_sql_uuid"]);
        let submit_sql_uuid = this.props.match.params["submit_sql_uuid"];
        this.GetSqlApplyByUuid(submit_sql_uuid)
        this.GetInceptionVariableConfig();
    };
    // componentWillUnmount() {
    //     clearInterval(this.timerId);
    // }
    //获取提交SQL的详细信息
    async GetSqlApplyByUuid(sql_uuid) {
        let params = {
            submit_sql_uuid: this.props.match.params["submit_sql_uuid"],
        };
        if( this.state.execute_status === "执行成功" || this.state.execute_status === "执行失败"){
            window.clearInterval(this.timerId);
            window.clearInterval(this.timerProcessId);
            console.log("SQL执完毕，关闭定时器");
        } else{
             console.log("SQL执行中，定时id为:",this.timerId);
        }
        let res = await axios.post(`${backendServerApiRoot}/get_apply_sql_by_uuid/`,{params});
        console.log(res.data.data);
        this.setState({
            submit_sql_title: res.data.data[0]["title"],
            master_ip: res.data.data[0]["master_ip"],
            master_port: res.data.data[0]["master_port"],
            submit_sql_user: res.data.data[0]["submit_sql_user"],
            leader_user_name: res.data.data[0]["leader_user_name"],
            qa_user_name: res.data.data[0]["qa_user_name"],
            dba_check_user_name: res.data.data[0]["dba_check_user_name"],
            dba_execute_user_name: res.data.data[0]["dba_execute_user_name"],
            leader_check: res.data.data[0]["leader_check"],
            qa_check: res.data.data[0]["qa_check"],
            dba_check: res.data.data[0]["dba_check"],
            dba_execute: res.data.data[0]["dba_execute"],
            execute_status: res.data.data[0]["execute_status"],
            submit_sql_uuid:res.data.data[0]["submit_sql_uuid"],
            submit_sql_rows:res.data.data[0]["submit_sql_rows"],
            submit_sql_affect_rows:res.data.data[0]["submit_sql_affect_rows"],
            submit_sql_execute_type:res.data.data[0]["submit_sql_execute_type"],
            comment_info:res.data.data[0]["comment_info"],
            view_submit_sql_info:res.data.data,
        })
    };
    //预览SQL
    async GetSubmitSqlByUuid(uuid) {
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
        };
        let res = await axios.post(`${backendServerApiRoot}/get_submit_sql_by_uuid/`,{params});
        console.log(res.data.data);
        this.setState({
            showSubmitSqlViewVisible: true,
            submit_sql:res.data.data,
        })
    };
    async GetSqlCheckResultsByUuid(uuid) {
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
        };
        let res = await axios.post(`${backendServerApiRoot}/get_check_sql_results_by_uuid/`,{params});
        console.log(res.data.data);
        this.setState({
            showSubmitSqlResultsVisible: true,
            view_check_sql_result:res.data.data,
        })
    };
    //审核通过
    async PassSubmitSqlByUuid(value) {
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
            apply_results:value,
        };
        console.log(value)
        let res = await axios.post(`${backendServerApiRoot}/pass_submit_sql_by_uuid/`,{params});
        console.log(res.data.data);
        alert(res.data.message);
        this.setState({
        ApplyModalVisible: false,
        });
        this.GetSqlApplyByUuid(this.state.submit_sql_uuid);
    };
    setInterVal = (e) => {
         this.timerId = window.setInterval(this.GetSqlApplyByUuid.bind(this),1000);
         this.timerProcessId = window.setInterval(this.getExecuteProcessByUuidTimeInterval.bind(this),1000);
    }
    //执行SQL
    async ExecuteSubmitSqlByUuid(value) {
        this.setState({
            execute_status: ""
        });
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
            inception_backup: this.state.inception_backup,
            inception_check_ignore_warning: this.state.inception_check_ignore_warning,
            inception_execute_ignore_error: this.state.inception_execute_ignore_error,
        };
        console.log(this.state.execute_sql_flag);
        if(this.state.execute_sql_flag === "未提交"){
            this.setState({
                execute_sql_flag: "工单已提交正在处理，不允许多次提交"
            });
            await axios.post(`${backendServerApiRoot}/execute_submit_sql_by_uuid/`,{params}).then(
                res => {res.data.status==="ok"? this.setInterVal() : message.error(res.data.message)}
            );
        } else{
             message.error(this.state.execute_sql_flag);
        }
    };


    //inception变量配置Modal显示
    ShowInceptionVariableConfigModal = (e) => {
        this.setState({
            InceptionVariableConfigModalVisible: true,
        });
    }
    //查看执行SQL结果
    async ViewExecuteSubmitSqlResultsByUuid() {
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
        };
        let res = await axios.post(`${backendServerApiRoot}/get_execute_submit_sql_results_by_uuid/`,{params});
        this.setState({
            execute_sql_results: res.data.data,
            ViewExecuteSubmitSqlModalVisible:true,
        });
    };

    onButtonClick = (title) => {
        this.setState({
            commitType: title,
            modalVisible: true
        })
    };

    closeSubmitSqlViewModal = () => {
        this.setState({
            showSubmitSqlViewVisible: false,
        })
    };

    closeSubmitSqlResultsModal = () => {
        this.setState({
            showSubmitSqlResultsVisible: false,
        })
    };
    closeApplyModal = () => {
        this.setState({
            ApplyModalVisible: false,
        })
    };
    closeViewExecuteSubmitSqlModal = () => {
        this.setState({
            ViewExecuteSubmitSqlModalVisible: false,
        })
    };
    closeViewExecuteSubmitSqlProcessModal = () => {
        this.setState({
            ViewExecuteSubmitSqlProcessModalVisible: false,
        })
    };
    closeInceptionVariableConfigModal = () => {
        this.setState({
            InceptionVariableConfigModalVisible: false,
        })
    };
    handleApplyContentChange = (value) => {
        console.log(value)
        this.setState({
            check_sql: value
        })
    }
    //审核 modal弹出按钮
    showApplySqlModalHandle = (e) => {
        this.setState({
        ApplyModalVisible: true,
        });
    }

    //查看进度
    async getExecuteProcessByUuid() {
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
        };
        let res = await axios.post(`${backendServerApiRoot}/get_execute_process_by_uuid/`,{params});
        console.log(res)
        this.setState({
            execute_sql_process_results: res.data.data,
            ViewExecuteSubmitSqlProcessModalVisible:true,
        });
    }
    //定时查看进度，并更新进度到表里
    async getExecuteProcessByUuidTimeInterval() {
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
        };
        let res = await axios.post(`${backendServerApiRoot}/get_execute_process_by_uuid/`,{params});
        console.log(res)
        this.setState({
            execute_sql_process_results: res.data.data
        });
    }

     //是否备份选择框
    async inceptionBackupCheckBoxOnChange(e) {
        console.log("inception_backup", e.target.checked);
        e.target.checked ? console.log("备份") : console.log("不备份")
        e.target.checked ? this.setState({inception_backup:1}) : this.setState({inception_backup:0})
    }
    //忽略inception警告选择框
    async inceptionIgnoreWarningCheckBoxOnChange(e) {
        console.log("inception_execute_ignore_error", `checked = ${e.target.checked}`);
        e.target.checked ? console.log("忽略inception警告选择框") : console.log("不忽略inception警告选择框")
        e.target.checked ? this.setState({inception_check_ignore_warning:1}) : this.setState({inception_check_ignore_warning:0})
    }
    //忽略inception错误继续执行选择框
    async inceptionIgnoreErrorCheckBoxOnChange(e) {
        console.log(`checked = ${e.target.checked}`);
        e.target.checked ? console.log("忽略inception错误继续执行选择框") : console.log("不忽略inception错误继续执行选择框")
        e.target.checked ? this.setState({inception_execute_ignore_error:1}) : this.setState({inception_execute_ignore_error:0})
    }
    async GetInceptionVariableConfig() {
        let res = await axios.get(`${backendServerApiRoot}/get_inception_variable_config_info/`);
        console.log(res.data);
        this.setState({
            data: res.data.data,
        });
        this.cacheData = this.state.data.map(item => ({ ...item }))
    }
    async handleUpdateInceptionVariable() {
        let params = {
            new_config_json: this.state.newConfig,
        };
        axios.post(`${backendServerApiRoot}/update_inception_variable/`,{params}).then(
           res => {res.data.status==="ok" ? message.success(res.data.message) : message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
        this.setState({
            InceptionVariableConfigModalVisible: false
        });
    }

  columns = [{
    title: '参数名称',
    dataIndex: 'name',
    width: '25%',
    render: (text, record) => this.renderColumns(text, record, 'name')
  }, {
    title: '参数含义',
    dataIndex: 'variable_description',
    width: '45%',
    render: (text, record) => this.renderColumns(text, record, 'variable_description')
  }, {
    title: '值',
    dataIndex: 'value',
    width: '10%',
    render: (text, record) => this.renderColumns(text, record, 'value')
  }, {
    title: '操作',
    dataIndex: 'operation',
    render: (text, record) => {
      return (
        <div className="editable-row-operations">
          {
            this.state.editingKey === record.name ?
              <span>
                <Button onClick={() => this.cancel(record.name)} type='primary' size='small'>取消</Button>
                <Popconfirm title="确认保存 ?" onConfirm={() => this.save(record.name)} okText="确认" cancelText="取消">
                  <Button type='primary' size='small' style={{marginLeft: '10px'}}>保存</Button>
                </Popconfirm>
              </span>
              : <Button onClick={() => this.edit(record.name)} disabled={!record.editable} type='primary' size='small'>修改</Button>
          }
        </div>
      );
    }
  }];

  renderColumns(text, record, column) {
    return (
      <EditableCell
        editable={column === 'value' && record.editable && this.state.editingKey === record.name}
        value={text}
        onChange={value => this.handleChange(value, record.name, column)}
      />
    );
  }
  handleChange(value, key, column) {
    const newData = [...this.state.data];
    const target = newData.filter(item => key === item.name)[0];
    if (target) {
      target[column] = value;
      let newCfg = {}
      newCfg[key] = value
      this.setState({ data: newData, newClusterCfg: newCfg } , () => console.log(this.state.newClusterCfg))

  }}
  edit(key) {
      console.log(key);
      console.log(this.state.editingKey);
    if(this.state.editingKey !== ''){
        this.cancel(this.state.editingKey)
        this.setState({editingKey: key})
    }else{
        this.setState({editingKey: key})
    }

  }
  // 修改集群的配置
  save(key) {
    const newData = [...this.state.data];
    const target = newData.filter(item => key === item.name)[0];       //原始行记录target.value,target.name
    const cacheData =  [...this.cacheData];
    const cacheTarget = cacheData.filter(item => key === item.name)[0];   //新行记录cacheTarget.value,cacheTarget.name
    console.log(target)
    console.log(cacheTarget)
      let newConfigJson = this.state.newConfig
    if (target) {
      if(this.state.newClusterCfg[this.state.editingKey] && cacheTarget.value !== target.value){
          newConfigJson[key]=target.value
          this.setState({newConfig:newConfigJson})
          console.log("当前incption配置",this.state.newConfig)
      }else{
          console.log("不知道",)
      }
      this.setState({ data: newData, editingKey: '' }, () => this.cacheData = this.state.data.map(item => ({ ...item })));
    }
  }
  cancel(key) {
    const newData = [...this.state.data];
    const target = newData.filter(item => key === item.name)[0];
    if (target) {
      Object.assign(target, this.cacheData.filter(item => key === item.name)[0]);
      this.setState({ data: newData, editingKey:'' });
    }
  }
    render() {
        const execute_results_columns = [
            {
              title: 'Id',
              dataIndex: 'inception_id',
              key: "inception_id",
              width:50,
            },
            {
              title: '错误代码',
              dataIndex: 'inception_error_level',
              key:"inception_error_level",
              width:100,
            },
            {
              title: '阶段',
              dataIndex: 'inception_stage',
              key:"inception_stage",
              width:100,
            },
            {
              title: '错误信息',
              dataIndex: 'inception_error_message',
              key:"inception_error_message",
              width:540,
            },
            {
              title: 'sql',
              dataIndex: 'inception_sql',
              key:"inception_sql",
              width:540,
            },
            {
              title: '实际影响行数',
              dataIndex: 'inception_affected_rows',
              key: "inception_affected_rows"
            }
            ,
            {
              title: '执行时间',
              dataIndex: 'inception_execute_time',
              key: "inception_execute_time",
              width:90,
            },

        ];
        const execute_process_columns = [
            {
              title: 'sql',
              dataIndex: 'inception_sql',
              key: "inception_sql",
            },
            {
              title: '执行进度',
              dataIndex: 'inception_execute_percent',
              key:"inception_execute_percent",
            }
        ];
        return (
            <section>
                <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">
                            Home
                        </Link>
                        >
                        <Link className="title-text" to="/checkSummitSql">
                            SQL审核
                        </Link>
                    </div>
                    <div style={{display: 'flex'}}>
                        {/* <Button className="title-text" type="primary" onClick={() => this.handleFilterChange('', 'search_content')}>清空</Button> */}
                        {/* <Input.Search className="title-text" placeholder="集群/实例/namespace" onSearch={value => this.handleFilterChange(value, 'search_content')} /> */}
                    </div>
                </div>
                <div className="padding-container">
                    <h3>申请基础信息</h3>
                    {/* <Row gutter={8}> */}
                    <Row type='flex' justify="space-around">
                        <Col span={11} className="col-detail">
                            <Row gutter={8}><Col style={{padding:5}} span={8}>主题:</Col><Col style={{padding:5}} span={16}>{this.state.submit_sql_title}</Col></Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={8}>SQL预览:</Col>
                                <Button className="link-button" onClick={this.GetSubmitSqlByUuid.bind(this)} style={{padding:5}} span={16}>预览</Button>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={8}>SQL审核结果:</Col>
                                <Button className="link-button" onClick={this.GetSqlCheckResultsByUuid.bind(this)} style={{padding:5}} span={16}>结果</Button>
                            </Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>SQL总条数:</Col><Col style={{padding:5}} span={16}>{this.state.submit_sql_rows}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>SQL预计影响总行数:</Col><Col style={{padding:5}} span={16}>{this.state.submit_sql_affect_rows}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>请求描述:</Col><Col style={{padding:5}} span={16}>{this.state.comment_info}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>执行类型:</Col><Col style={{padding:5}} span={16}>{this.state.submit_sql_execute_type}</Col></Row>
                        </Col>
                        <Col span={11} className="col-detail">
                            <Row gutter={8}><Col style={{padding:5}} span={6}>集群主库ip:</Col><Col style={{padding:5}} span={18}>{this.state.master_ip}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={6}>集群主库port:</Col><Col style={{padding:5}} span={18}>{this.state.master_port}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={6}>申请者:</Col><Col style={{padding:5}} span={18}>{this.state.submit_sql_user}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={6}>Leader:</Col><Col style={{padding:5}} span={18}>[{this.state.leader_user_name}] <span style={{color:"red"}}>[{this.state.leader_check}]</span></Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={6}>QA:</Col><Col style={{padding:5}} span={18}>[{this.state.qa_user_name}] <span style={{color:"red"}}>[{this.state.qa_check}]</span></Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={6}>审核DBA:</Col><Col style={{padding:5}} span={18}>[{this.state.dba_check_user_name}] <span style={{color:"red"}}>[{this.state.dba_check}]</span></Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={6}>执行DBA:</Col><Col style={{padding:5}} span={18}>[{this.state.dba_execute_user_name}] <span style={{color:"red"}}>[{this.state.dba_execute}]</span></Col></Row>
                        </Col>
                    </Row>
                    <br/>
                    <div className="input-padding">
                        { this.state.leader_check==="未审核" && this.state.qa_check === '未审核' && this.state.dba_check ==="未审核" ? <Button type="primary" style={{marginLeft:16}} onClick={this.showApplySqlModalHandle}>审核</Button>:null}
                    </div>
                    <br/>
                    <div>
                        <h3>执行选项</h3>
                        <Checkbox defaultChecked onChange={this.inceptionBackupCheckBoxOnChange.bind(this)}>备份</Checkbox>
                        <Checkbox onChange={this.inceptionIgnoreWarningCheckBoxOnChange.bind(this)}>忽略inception警告</Checkbox>
                        <Checkbox onChange={this.inceptionIgnoreErrorCheckBoxOnChange.bind(this)}>忽略inception错误强制执行</Checkbox>
                    </div>
                    <br/>
                    <h3>执行操作</h3>
                    <Table
                        pagination={false}
                        dataSource={this.state.view_submit_sql_info}
                        rowKey={(row ,index) => index}
                        size="small"
                    >
                        <Column title="master_ip"
                            dataIndex="master_ip"/>
                        <Column title="master_port"
                            dataIndex="master_port"/>
                         <Column title="SQL路径"
                            dataIndex="submit_sql_file_path"
                            width={300}
                         />
                        <Column title="OSC配置"
                            dataIndex="inception_osc_config"
                            render = {() => this.state.leader_check==="通过" && this.state.qa_check === '通过' && this.state.dba_check ==="通过" && this.state.execute_status === '未执行' ? <button className="link-button" onClick={()=>{this.ShowInceptionVariableConfigModal()}}>OSC配置</button>: null}
                        />
                        <Column title="执行SQL"
                            render = {
                                () => this.state.leader_check==="通过" && this.state.qa_check === '通过' && this.state.dba_check ==="通过" && this.state.execute_status === '未执行' ? <button className="link-button" onClick={()=>{this.ExecuteSubmitSqlByUuid()}}>执行SQL</button>: null}
                        />
                        <Column title="查看进度"
                            render = {
                                () => this.state.leader_check==="通过" && this.state.qa_check === '通过' && this.state.dba_check ==="通过" && this.state.execute_status === '执行中' ? <button className="link-button" onClick={()=>{this.getExecuteProcessByUuid()}}>查看进度</button>: null}
                        />
                        <Column title="查看结果"
                            render = {
                                () => this.state.execute_status === '执行成功' || this.state.execute_status === '执行失败' ? <button className="link-button" onClick={()=>{this.ViewExecuteSubmitSqlResultsByUuid()}}>查看执行结果</button>: null}
                        />
                        <Column title="执行结果"
                            dataIndex="execute_status"/>
                        <Column title="执行方式"
                            dataIndex="execute_role"/>
                        <Column title="耗时(秒)"
                            dataIndex="inception_execute_time"/>
                    </Table>
                    <Modal visible={this.state.showSubmitSqlViewVisible}
                        onCancel={this.closeSubmitSqlViewModal}
                        title="SQL预览"
                        footer={false}
                        width={960}
                    >
                        <TextArea wrap="off" style={{minHeight:300,overflow:"scroll"}} value={this.state.submit_sql}/>
                    </Modal>
                    <Modal visible={this.state.showSubmitSqlResultsVisible}
                        onCancel={this.closeSubmitSqlResultsModal}
                        title="SQL审核结果"
                        footer={false}
                        width={960}
                    >
                        <Table
                            dataSource={this.state.view_check_sql_result}
                            rowKey={(row ,index) => index}
                            pagination={true}
                            size="small"
                        >
                            <Column title="SQL"
                                dataIndex="inception_sql"/>
                            <Column title="状态"
                                dataIndex="inception_stage_status"/>
                            <Column title="错误代码"
                                dataIndex="inception_error_level"/>
                            <Column title="错误信息"
                                dataIndex="inception_error_message"/>
                            <Column title="影响行数"
                                dataIndex="inception_affected_rows"/>
                        </Table>
                    </Modal>
                    <Modal visible={this.state.ApplyModalVisible}
                        onCancel={this.closeApplyModal}
                        title="审核"
                        footer={false}
                    >
                        <TextArea rows={6} placeholder="审核说明"  onChange={e => this.handleApplyContentChange(e.target.value)}/>
                        <Row type="flex" justify='center' style={{ marginTop: '10px' }}>
                            <Button onClick={this.PassSubmitSqlByUuid.bind(this,'通过')} type="primary" style={{ marginRight: '10px' }}>通过</Button>
                            <Button onClick={this.PassSubmitSqlByUuid.bind(this,'不通过')}>不通过</Button>
                        </Row>
                    </Modal>
                    <Modal visible={this.state.ViewExecuteSubmitSqlModalVisible}
                        onCancel={this.closeViewExecuteSubmitSqlModal}
                        title="执行结果"
                        footer={false}
                        width={1340}
                    >
                    <Table
                        dataSource={this.state.execute_sql_results}
                        columns={execute_results_columns}
                        bordered
                        rowKey={(row ,index) => index}
                        rowClassName={(record, index) => {
                                                let className = 'row-detail-default ';
                                                if (record.inception_error_level  !== "执行成功") className = 'row-detail-red';
                                                return className;}}
                        size="small"
                    />
                    </Modal>
                    <Modal visible={this.state.ViewExecuteSubmitSqlProcessModalVisible}
                        onCancel={this.closeViewExecuteSubmitSqlProcessModal}
                        title="执行进度"
                        footer={false}
                        width={1340}
                    >
                        <Table
                            dataSource={this.state.execute_sql_process_results}
                            columns={execute_process_columns}
                            bordered
                            size="small"
                        />
                    </Modal>
                    <Modal visible={this.state.InceptionVariableConfigModalVisible}
                        onCancel={this.closeInceptionVariableConfigModal}
                        title="inception变量配置"
                        footer={false}
                        width={1240}
                    >
                        <Table dataSource={this.state.data} pagination={false} columns={this.columns} rowKey={(row) => row.name} size={"small"}/>
                        <Button type={"primary"} onClick={this.handleUpdateInceptionVariable.bind(this)}>提交更改</Button>
                    </Modal>
                </div>
                </div>
            </section>
        )
    }
}