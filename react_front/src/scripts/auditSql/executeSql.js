import React, { Component } from 'react';
import { Table, Row, Col, Button, message, Modal, Input, Checkbox,Popconfirm,Spin } from 'antd';
import { Link } from 'react-router-dom';
import axios from "axios";
import {backendServerApiRoot} from "../common/util";
import MyAxios from "../common/interface"
const Column = Table.Column;
const TextArea = Input.TextArea;
const EditableCell = ({ editable, value, onChange }) => (
    <div>
        {editable
          ? <Input style={{ margin: '-5px 0' }} value={value} onChange={e => onChange(e.target.value)} />
          : value
        }
    </div>
);

export default class ExecuteSql extends Component {
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
            view_submit_split_sql_info:[],
            submit_sql_uuid:"",
            showSubmitSqlViewVisible:false,
            showSubmitSqlResultsVisible:false,
            ApplyModalVisible:false,
            ViewExecuteSubmitSqlModalVisible:false,
            ViewExecuteSubmitSqlProcessModalVisible:false,
            InceptionVariableConfigModalVisible:false,
            timerId:null,
            timerProcessId:null,
            execute_sql_flag:"",
            inception_backup:1,
            inception_check_ignore_warning:0,
            inception_execute_ignore_error:0,
            data :[],
            editingKey:'',
            newClusterCfg:{},
            newConfig:{},
            split_sql_file_path:"",
            submit_split_sql:"",
            SplitSQLModalVisible:false,
            sql_check_max_code:"",
            login_user_name:"",
            login_user_name_role:"",
            sql_view_loading:false,
            sql_check_results_loading:false,
            global_loading:false,
            modal_loading:false,
            sql_check_code_explain:"",
            cluster_name:"",
            check_comment:"",
        }
        this.cacheData = this.state.data.map(item => ({ ...item }));
    }

    componentDidMount() {
        let submit_sql_uuid = this.props.match.params["submit_sql_uuid"];
        this.GetSqlApplyByUuid(submit_sql_uuid)
        this.GetSqlCheckResultsByUuid(submit_sql_uuid);
    };
    //获取提交SQL的详细信息
    async GetSqlApplyByUuid(sql_uuid) {
        let params = {
            submit_sql_uuid: this.props.match.params["submit_sql_uuid"],
        };
        let arr_execute_status = ['执行成功','执行失败','执行成功(含警告)']
        if(arr_execute_status.includes(this.state.execute_status)){
            window.clearInterval(this.timerId);
            window.clearInterval(this.timerProcessId);
            console.log("SQL执完毕，关闭定时器");
            this.setState({global_loading:false})
        } else{
             console.log("SQL执行中，定时id为:",this.timerId);
             console.log("SQL执行状态:",this.state.execute_status);
        }
        let res = await MyAxios.post(`${backendServerApiRoot}/get_apply_sql_by_uuid/`,params);
        let res_split_sql = await MyAxios.post(`${backendServerApiRoot}/get_split_sql_by_uuid/`,params);
        if (res.data.data[0]["cluster_name"].length>0){
            this.setState({
                cluster_name:res.data.data[0]["cluster_name"]
            })
        }else{
            this.setState({
                master_ip: res.data.data[0]["master_ip"],
                master_port: res.data.data[0]["master_port"],
            })
        }
        this.setState({
            submit_sql_title: res.data.data[0]["title"],
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
            view_submit_split_sql_info:res_split_sql.data.data,
        })
    };
    //提交预览SQL
    async GetSubmitSqlByUuid(uuid) {
        this.setState({sql_view_loading:true,})
        let params = {submit_sql_uuid: this.state.submit_sql_uuid,};
        let res = await MyAxios.post(`${backendServerApiRoot}/get_submit_sql_by_uuid/`,params);
        if (res.data.status==="ok"){
            this.setState({
                showSubmitSqlViewVisible: true,
                submit_sql:res.data.data,
                sql_view_loading:false,
            })
        }else{
            message.error(res.data.message)
            this.setState({sql_view_loading:false,})
        }
    };

    //查看SQL审核结果
    async GetSqlCheckResultsByUuid(uuid) {
        this.setState({sql_check_results_loading:true})
        let params = {submit_sql_uuid: this.props.match.params["submit_sql_uuid"],};
        let res = await MyAxios.post(`${backendServerApiRoot}/get_check_sql_results_by_uuid/`,params);
        let inception_error_level_rray=[];
        for(var i=0;i<res.data.data.length;i++){
            inception_error_level_rray.push(res.data.data[i]["inception_error_level"])
        };
        this.setState({
            view_check_sql_result:res.data.data,
            sql_check_max_code: Math.max.apply(null,inception_error_level_rray),
            sql_check_code_explain: Math.max.apply(null,inception_error_level_rray)!==0 ? "异常":"正常",
            sql_check_results_loading:false
        });
    };
    //审核通过或不通过
    async PassSubmitSqlByUuid(value) {
        this.setState({global_loading:true});
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
            apply_results:value,
            check_user_name:this.state.login_user_name,
            check_user_name_role:this.state.login_user_name_role,
            check_comment:this.state.check_comment,
        };
        await MyAxios.post('/pass_submit_sql_by_uuid/',params).then(
            res=>{
                if (res.data.status === "ok"){
                    this.setState({
                        ApplyModalVisible: false,
                        view_submit_sql_info:res.data.data,
                        global_loading:false
                    });
                    this.GetSqlApplyByUuid(this.state.submit_sql_uuid);
                    message.success(res.data.message);
                }else{
                    this.setState({
                        ApplyModalVisible: false,
                        global_loading:false
                    });
                    message.error(res.data.message)
                }
            }
        ).catch(err=>{message.error(err.message)})
    };

    //审核通过或不通过
    async v2_PassSubmitSqlByUuid(value) {
        this.setState({modal_loading:true});
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
            apply_results:value,
            check_user_name:this.state.login_user_name,
            check_user_name_role:this.state.login_user_name_role,
            check_comment:this.state.check_comment,
        };
        await MyAxios.post('/pass_submit_sql_by_uuid/',params).then(
            res=>{
                if (res.data.status === "ok"){
                    this.v2_setInterVal();
                    message.success("工单审核通过,DDL/DML任务拆分中,请耐心等待",3);
                }else{
                    this.setState({ApplyModalVisible: false,modal_loading:false});
                    message.error(res.data.message)
                }
            }
        ).catch(err=>{message.error(err.message)})
    };

    //间隔执行
    v2_setInterVal = () => {
         this.splitTimerId = window.setInterval(this.getSplitStatusByUuid.bind(this),2000);
    }

    //获取拆分任务状态
    async getSplitStatusByUuid() {
        let params = {
            submit_id: this.state.submit_sql_uuid,
            task_type:"split_sql"
            };
        await MyAxios.get('/v1/service/ticket/get_celery_task_status/',{params}).then(
            res => {
                if (res.data.status==="ok"){
                    console.log(res.data)
                    this.setState({ApplyModalVisible: false,modal_loading:false});
                   if (res.data.data[0]['task_status']===2){
                       message.success("DDL/DML任务拆分成功",3)
                       window.clearInterval(this.splitTimerId);
                       this.GetSqlApplyByUuid(this.state.submit_sql_uuid);
                   } else if(res.data.data[0]['task_status']===3){
                       message.error("DDL/DML任务拆分失败",3)
                       window.clearInterval(this.splitTimerId);
                       this.GetSqlApplyByUuid(this.state.submit_sql_uuid);
                   }
                }else{
                    this.setState({ApplyModalVisible: false,modal_loading:false});
                    message.error(res.data.message);
                }
            }
        ).catch(err => {message.error(err.message)})
    };

    //间隔执行
    setInterVal = () => {
         this.timerId = window.setInterval(this.GetSqlApplyByUuid.bind(this),1000);
         // this.timerProcessId = window.setInterval(this.getExecuteProcessByUuidTimeInterval.bind(this),1000);
    }
    //平台自动执行SQL
    async ExecuteBySplitSqlFilePath(split_sql_file_path) {
        //如果current_split_seq是最小则直接执行,否则判断他前面的是否已经执行,如果前面没执行,后面不允许执行,代码需要code
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
            inception_backup: this.state.inception_backup,
            inception_check_ignore_warning: this.state.inception_check_ignore_warning,
            inception_execute_ignore_error: this.state.inception_execute_ignore_error,
            inception_execute_sleep_ms: 1,
            split_sql_file_path:split_sql_file_path,
            execute_user_name:this.state.login_user_name,

        };
        let file_execute_dict = {};
        for ( var item=0;item<this.state.view_submit_split_sql_info.length;item++){
            file_execute_dict[this.state.view_submit_split_sql_info[item]["split_seq"]] = this.state.view_submit_split_sql_info[item]["dba_execute"]
            if (this.state.view_submit_split_sql_info[item]["split_sql_file_path"] === split_sql_file_path){
                var current_split_seq = this.state.view_submit_split_sql_info[item]["split_seq"]
            }
        }
        let inception_error_level_rray=[];
        for(var i=0;i<this.state.view_check_sql_result.length;i++){
            inception_error_level_rray.push(this.state.view_check_sql_result[i]["inception_error_level"])
        };
        if (this.state.sql_check_max_code === 2){
           message.error("审核存在错误,请先处理错误")
        }else if (this.state.inception_check_ignore_warning === 0 && this.state.sql_check_max_code === 1){
            message.error("审核存在警告,请处理警告或忽略警告执行")
        }else if (current_split_seq !== 1 && file_execute_dict[current_split_seq -1] !== "已执行"){
            message.error("上面SQL执行完毕下面SQL才能执行")
        }else {
            if (this.state.execute_sql_flag !== split_sql_file_path) {
                this.setState({
                    execute_sql_flag: split_sql_file_path,
                    execute_status: "执行中",
                    global_loading:true
                });
                await MyAxios.post('/execute_submit_sql_by_file_path/', params).then(
                    res => {
                        res.data.status === "ok" ? message.success(res.data.message,3) && this.setInterVal() : message.error(res.data.message);
                    }
                );
            } else {
                message.error("该工单正在执行,请误多次点击!!!");
            }
        }
    };
    //手动执行SQL
    async ExecuteBySplitSqlFilePathManual(split_sql_file_path) {
        this.setState({
            execute_status: "执行中"
        });
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
            split_sql_file_path:split_sql_file_path
        };
        await MyAxios.post(`${backendServerApiRoot}/execute_submit_sql_by_file_path_manual/`, params).then(
            res => {
                res.data.status === "ok" ? this.GetSqlApplyByUuid(this.state.submit_sql_uuid) && message.success(res.data.message) : message.error(res.data.message);
            })
    };

    //inception变量配置Modal显示
    async ShowInceptionVariableConfigModal(split_sql_file_path) {
        let params = {
            split_sql_file_path:split_sql_file_path
        };
        let res = await MyAxios.post(`${backendServerApiRoot}/get_inception_variable_config_info/`,params);
        console.log(res.data);
        this.setState({
            data: res.data.data,
        });
        this.cacheData = this.state.data.map(item => ({ ...item }))
        this.setState({
            InceptionVariableConfigModalVisible: true,
            split_sql_file_path:split_sql_file_path
        });
    }
    //拆分SQL预览
    async ViewSplitSQL(split_sql_file_path){
        let params = {
            split_sql_file_path:split_sql_file_path
        };
        let res = await MyAxios.post(`${backendServerApiRoot}/get_submit_split_sql_by_file_path/`,params);
        if (res.data.status==="ok"){
            this.setState({
                SplitSQLModalVisible: true,
                submit_split_sql:res.data.data
            });
        }else {
            message.error(res.data.message)
        }

    }

    //查看执行SQL结果
    async ViewExecuteSubmitSqlResultsByUuid(split_sql_file_path) {
        console.log(split_sql_file_path)
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
            split_sql_file_path:split_sql_file_path
        };
        let res = await MyAxios.post(`${backendServerApiRoot}/get_execute_results_by_split_sql_file_path/`,params);
        this.setState({
            execute_sql_results: res.data.data,
            ViewExecuteSubmitSqlModalVisible:true,
        });
    };
    //生成重做SQL忽略错误SQL
    async RecreateSql(split_sql_file_path,flag) {
        console.log(split_sql_file_path,flag)
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
            split_sql_file_path:split_sql_file_path,
            recreate_sql_flag: flag
        };
        let res = await MyAxios.post(`${backendServerApiRoot}/recreate_sql/`,params);
        window.location.reload()
        message.error(res.data.message)
        console.log(res)
    };


    //查看进度
    async getExecuteProcessByUuid(split_sql_file_path) {
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
            split_sql_file_path:split_sql_file_path
        };
        let res = await MyAxios.post(`${backendServerApiRoot}/get_execute_process_by_uuid/`,params);
        this.setState({
            execute_sql_process_results: res.data.data,
            ViewExecuteSubmitSqlProcessModalVisible:true,
            split_sql_file_path:split_sql_file_path
        });
        this.timerProcessId = window.setInterval(this.getExecuteProcessByUuidTimeInterval.bind(this),1000);
    }
    //定时查看进度，并更新进度到表里
    async getExecuteProcessByUuidTimeInterval() {
        let params = {
            split_sql_file_path:this.state.split_sql_file_path,
            submit_sql_uuid: this.state.submit_sql_uuid,
        };
        let res = await MyAxios.post(`${backendServerApiRoot}/get_execute_process_by_uuid/`,params);
        if (res.data.data.length>0 && res.data.data[0]["inception_execute_percent"]!==0){
            this.setState({
                execute_sql_process_results: res.data.data
            });
        }else {
            this.setState({
                ViewExecuteSubmitSqlProcessModalVisible:false
            });
        }
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
    //获取inception变量配置
    async GetInceptionVariableConfig() {
        let res = await MyAxios.get(`${backendServerApiRoot}/get_inception_variable_config_info/`);
        console.log(res.data);
        this.setState({
            data: res.data.data,
        });
        this.cacheData = this.state.data.map(item => ({ ...item }))
    }
    //更新inception osc变量
    async handleUpdateInceptionVariable() {
        let params = {
            split_sql_file_path: this.state.split_sql_file_path,
            new_config_json: this.state.newConfig,
        };
        MyAxios.post('/update_inception_variable/',params).then(
           res => {res.data.status==="ok" ? message.success(res.data.message) : message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
        this.setState({
            InceptionVariableConfigModalVisible: false
        });
    }

  inception_varialbes_columns = [{
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
        const temp = {}; // 当前重复的值,支持多列
        const mergeCells = (text, array, columns) => {
          let i = 0;
          if (text !== temp[columns]) {
            temp[columns] = text;
            array.forEach((item) => {
                console.log(item.split_seq)
              if (item.split_seq === temp[columns]) {
                i += 1;
              }
            });
          }
          return i;
        };
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
              sorter: (a, b) => {
                var stringA = a.inception_error_level.toUpperCase(); // ignore upper and lowercase
                var stringB = b.inception_error_level.toUpperCase(); // ignore upper and lowercase
                if (stringA < stringB) {
                    return -1;
                }
                if (stringA > stringB) {
                    return 1;
                }
                // names must be equal
                return 0;
            }
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
              title: '执行进度(%)',
              dataIndex: 'inception_execute_percent',
              key:"inception_execute_percent",
            }
        ];
        const check_results_columns = [
            {
              title: 'ID',
              dataIndex: 'inception_id',
              key: "inception_id",
            },
            {
              title: 'SQL',
              dataIndex: 'inception_sql',
              key: "inception_sql",
              width:500
            },
            {
              title: '状态',
              dataIndex: 'inception_stage_status',
              key:"inception_stage_status",
            },
            {
              title: '错误代码',
              dataIndex: 'inception_error_level',
              key:"inception_error_level",
              sorter: (a, b) => a.inception_error_level - b.inception_error_level,
            },
            {
              title: '错误信息',
              dataIndex: 'inception_error_message',
              key:"inception_error_message",
            },
            {
              title: '影响行数',
              dataIndex: 'inception_affected_rows',
              key:"inception_affected_rows",
            }
        ];

        const split_sql_columns = [
            {
              title: 'split_seq',
              dataIndex: 'split_seq',
              render:(text, row) => {
                const obj = {children: text,props: {}};
                obj.props.rowSpan = mergeCells(row.split_seq, this.state.view_submit_split_sql_info, 'split_seq');
                return obj;
              }
            },
            {
              title: 'SQL路径',
              dataIndex:"split_sql_file_path",
              width:300
            },
            {
              title: 'SQL',
              render:(text, row) => {
                return <button className="link-button" onClick={()=>{this.ViewSplitSQL(row.split_sql_file_path)}}>查看</button>
              }
            },
            {
              title: 'OSC配置',
              render: (text, row) => {
                return (
                     this.state.dba_check ==="通过" && this.state.execute_status !== '执行中'
                     ? <button className="link-button" onClick={()=>{this.ShowInceptionVariableConfigModal(row.split_sql_file_path)}}>OSC配置</button>
                     : null
                )
              }
            },
            {
              title: '执行SQL',
              render:(text, row) => {
                return (
                    row.execute_status === '未执行'?
                    <div>
                        <Button className="link-button" onClick={()=>{this.ExecuteBySplitSqlFilePath(row.split_sql_file_path)}}>平台执行</Button>
                        <Button className="link-button" style={{marginLeft:15}} onClick={()=>{this.ExecuteBySplitSqlFilePathManual(row.split_sql_file_path)}}>手动执行</Button>
                    </div>
                    :null

                )
              }
            },
            {
              title: '查看进度',
              render: (text, row) => {
                return (
                  this.state.dba_check ==="通过" && row.execute_status === '执行中' ?
                  <button className="link-button" onClick={()=>{this.getExecuteProcessByUuid(row.split_sql_file_path)}}>查看</button>
                  :null
                )
              }
            },
            {
              title: '查看结果',
              render: (text, row) => {
                let arr_execute_status = ['执行成功','执行失败','执行成功(含警告)'];
                return (
                  arr_execute_status.includes(row.execute_status) ?
                  <button className="link-button" onClick={()=>{this.ViewExecuteSubmitSqlResultsByUuid(row.split_sql_file_path)}}>查看</button>
                  :null
                )
              }
            },
            {
              title: '执行结果',
              dataIndex: "execute_status",
              render: (val, row) => {
                    if (val === "执行成功"){
                        return <span style={{color:"#52c41a"}}>{val}</span>
                    }else if (val === "执行失败" && row.rerun_flag !==0 ){
                        return <React.Fragment>
                                   <div><span style={{color:"#fa541c"}}>{val}</span></div>
                                   <div><button className="link-button" onClick={()=>{this.RecreateSql(row.split_sql_file_path,"include_error_sql")}}>生成重做SQL含错误SQL</button></div>
                                   <div><button className="link-button" onClick={()=>{this.RecreateSql(row.split_sql_file_path,"ignore_error_sql")}}>生成重做SQL忽略错误SQL</button></div>
                               </React.Fragment>
                    }else if (val === '执行成功(含警告)'){
                        return <span style={{color:"#ffbb96"}}>{val}</span>
                    }else {
                        return <span style={{color:"#bfbfbf"}}>{val}</span>
                    }
                }
            },
            {
              title: '执行方式',
              dataIndex:"submit_sql_execute_plat_or_manual"
            },
            {
              title: '耗时(秒)',
              dataIndex: "inception_execute_time",
            },
        ];
        return (
            <section>
            <Spin spinning={this.state.global_loading} size="default">
                <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">Home</Link>
                        >
                        <Link className="title-text" to="/AuditSqlIndex">SQL审核</Link>
                    </div>
                </div>
                <div className="padding-container">
                    <h3>申请基础信息</h3>
                    <Row type='flex' justify="space-around">
                        <Col span={11} className="col-detail">
                            <Row gutter={8}><Col style={{padding:5}} span={8}>主题:</Col><Col style={{padding:5}} span={16}>{this.state.submit_sql_title}</Col></Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={8}>SQL预览:</Col>
                                <Button className="link-button" loading={this.state.sql_view_loading} onClick={this.GetSubmitSqlByUuid.bind(this)} style={{padding:5}} span={16}>查看</Button>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={8}>SQL审核结果:</Col>
                                <Col >
                                    <Button style={{padding:5}} span={16} className="link-button" loading={this.state.sql_check_results_loading} onClick={() => this.setState({showSubmitSqlResultsVisible:true})} >查看</Button>
                                    {this.state.sql_check_max_code !== 0 ? <span style={{color:"red"}}>{[this.state.sql_check_code_explain]}</span>:<span  style={{color:"#52c41a"}}>[正常]</span>}
                                </Col>
                            </Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>SQL总条数:</Col><Col style={{padding:5}} span={16}>{this.state.submit_sql_rows}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>SQL预计影响总行数:</Col><Col style={{padding:5}} span={16}>{this.state.submit_sql_affect_rows}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>请求描述:</Col><Col style={{padding:5}} span={16}>{this.state.comment_info}</Col></Row>
                            <Row gutter={8}><Col style={{padding:5}} span={8}>执行类型:</Col><Col style={{padding:5}} span={16}>{this.state.submit_sql_execute_type}</Col></Row>
                        </Col>
                        <Col span={11} className="col-detail">
                            {!this.state.cluster_name ? <Row gutter={8}><Col style={{padding:5}} span={6}>集群主库ip:</Col><Col style={{padding:5}} span={18}>{this.state.master_ip}</Col></Row>:null}
                            {!this.state.cluster_name ? <Row gutter={8}><Col style={{padding:5}} span={6}>集群主库port:</Col><Col style={{padding:5}} span={18}>{this.state.master_port}</Col></Row>:null}
                            {this.state.cluster_name ? <Row gutter={8}><Col style={{padding:5}} span={6}>集群名:</Col><Col style={{padding:5}} span={18}>{this.state.cluster_name}</Col></Row>:null}
                            <Row gutter={8}><Col style={{padding:5}} span={6}>申请者:</Col><Col style={{padding:5}} span={18}>{this.state.submit_sql_user}</Col></Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>Leader:</Col>
                                <Col style={{padding:5}} span={18}>
                                    [{this.state.leader_user_name}]
                                        {this.state.leader_check==="通过" ? <span style={{color:"#52c41a"}}>[{this.state.leader_check}]</span>:<span  style={{color:"red"}}>[{this.state.leader_check}]</span>}
                                </Col>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>QA:</Col>
                                <Col style={{padding:5}} span={18}>
                                    [{this.state.qa_user_name}]
                                    {this.state.qa_check === "通过" ? <span style={{color:"#52c41a"}}>[{this.state.qa_check}]</span>:<span  style={{color:"red"}}>[{this.state.qa_check}]</span>}
                                </Col>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>审核DBA:</Col>
                                <Col style={{padding:5}} span={18}>
                                    [{this.state.dba_check_user_name}]
                                    {this.state.dba_check === "通过" ? <span style={{color:"#52c41a"}}>[{this.state.dba_check}]</span>:<span  style={{color:"red"}}>[{this.state.dba_check}]</span>}
                                </Col>
                            </Row>
                            <Row gutter={8}>
                                <Col style={{padding:5}} span={6}>执行DBA:</Col>
                                <Col style={{padding:5}} span={18}>
                                    [{this.state.dba_execute_user_name}]
                                    {this.state.dba_execute === "已执行" ? <span style={{color:"#52c41a"}}>[{this.state.dba_execute}]</span>:<span  style={{color:"red"}}>[{this.state.dba_execute}]</span>}
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                    <br/>
                    {(this.state.login_user_name_role!=="dba") ?
                        <div>
                            <h3>审核操作</h3>
                            <div className="input-padding">
                                { (this.state.leader_check==="未审核" && this.state.login_user_name_role==="leader") ? <Button type="primary" style={{marginLeft:16}} onClick={() => this.setState({ApplyModalVisible:true})}>审核</Button>:null}
                                { (this.state.qa_check === '未审核' && this.state.login_user_name_role==="qa") ? <Button type="primary" style={{marginLeft:16}} onClick={() => this.setState({ApplyModalVisible:true})}>审核</Button>:null}
                                { (this.state.dba_check === '未审核' && this.state.login_user_name_role!=="dba") ? <Button type="primary" style={{marginLeft:16}} onClick={() => this.setState({ApplyModalVisible:true})}>审核</Button>:null}

                            </div>
                        </div>
                        :
                        null
                    }
                    <br/>
                    {this.state.sql_check_results_loading===false ?
                        <div>
                            <div>
                                <h3>执行选项</h3>
                                <Checkbox defaultChecked onChange={this.inceptionBackupCheckBoxOnChange.bind(this)}>备份</Checkbox>
                                <Checkbox onChange={this.inceptionIgnoreWarningCheckBoxOnChange.bind(this)}>忽略inception警告</Checkbox>
                                <Checkbox onChange={this.inceptionIgnoreErrorCheckBoxOnChange.bind(this)}>忽略inception错误强制执行</Checkbox>
                            </div>
                            <Table
                                pagination={false}
                                dataSource={this.state.view_submit_split_sql_info}
                                rowKey={(row ,index) => index}
                                size="small"
                                bordered
                                columns={split_sql_columns}
                            />
                        </div>
                        :null
                    }
                    <Modal visible={this.state.showSubmitSqlViewVisible}
                        onCancel={() => this.setState({showSubmitSqlViewVisible:false})}
                        title="SQL预览"
                        footer={false}
                        width={960}
                    >
                        <TextArea wrap="off" style={{minHeight:300,overflow:"scroll"}} value={this.state.submit_sql}/>
                    </Modal>
                    <Modal visible={this.state.showSubmitSqlResultsVisible}
                        onCancel={() => this.setState({showSubmitSqlResultsVisible:false})}
                        title="SQL审核结果"
                        footer={false}
                        width={1200}
                    >
                        <Table
                            dataSource={this.state.view_check_sql_result}
                            rowKey={(row ,index) => index}
                                                    rowClassName={(record, index) => {
                                                let className = 'row-detail-default ';
                                                if (record.inception_error_level === 2) {
                                                    className = 'row-detail-error';
                                                    return className;
                                                }else if (record.inception_error_level  === 0){
                                                    className = 'row-detail-success';
                                                    return className;
                                                }else if (record.inception_error_level  === 1){
                                                    className = 'row-detail-warning';
                                                    return className;
                                                }else {
                                                    return className;
                                                }
                                    }}
                            pagination={true}
                            size="small"
                            columns={check_results_columns}
                        >
                        </Table>
                    </Modal>
                    <Modal visible={this.state.ApplyModalVisible}
                        onCancel={() => this.setState({ApplyModalVisible:false})}
                        title="审核"
                        footer={false}
                    >
                        <Spin spinning={this.state.modal_loading} size="default">
                            <TextArea rows={6} placeholder="审核说明"  onChange={e => this.setState({check_comment:e.target.value})}/>
                            <Row type="flex" justify='center' style={{ marginTop: '10px' }}>
                                <Button onClick={this.v2_PassSubmitSqlByUuid.bind(this,'通过')}  type="primary" style={{ marginRight: '10px' }}>通过</Button>
                                <Button onClick={this.v2_PassSubmitSqlByUuid.bind(this,'不通过')}  type="primary">不通过</Button>
                            </Row>
                        </Spin>
                    </Modal>
                    <Modal visible={this.state.ViewExecuteSubmitSqlModalVisible}
                        onCancel={() => this.setState({ViewExecuteSubmitSqlModalVisible:false})}
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
                                                if (record.inception_error_level === "执行失败") {
                                                    className = 'row-detail-error';
                                                    return className;
                                                }else if (record.inception_error_level  === "执行成功"){
                                                    className = 'row-detail-success';
                                                    return className;
                                                }else if (record.inception_error_level  === "执行成功(含警告)"){
                                                    className = 'row-detail-warning';
                                                    return className;
                                                }else {
                                                    return className;
                                                }
                        }}
                        size="small"
                    />
                    </Modal>
                    <Modal visible={this.state.ViewExecuteSubmitSqlProcessModalVisible}
                        onCancel={() => this.setState({ViewExecuteSubmitSqlProcessModalVisible:false})}
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
                        onCancel={() => this.setState({InceptionVariableConfigModalVisible:false})}
                        title="inception变量配置"
                        footer={false}
                        width={1240}
                    >
                        <Table dataSource={this.state.data} pagination={false} columns={this.inception_varialbes_columns} rowKey={(row) => row.name} size={"small"}/>
                        <Button type={"primary"} onClick={this.handleUpdateInceptionVariable.bind(this)}>提交更改</Button>
                    </Modal>
                    <Modal visible={this.state.SplitSQLModalVisible}
                        onCancel={() => this.setState({SplitSQLModalVisible:false})}
                        title="SQL预览"
                        footer={false}
                        width={960}
                    >
                        <TextArea wrap="off" style={{minHeight:300,overflow:"scroll"}} value={this.state.submit_split_sql}/>
                    </Modal>
                </div>
                </div>
                </Spin>
            </section>
        )
    }
}