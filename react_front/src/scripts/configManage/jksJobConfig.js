import { Table, Input, Button, Popconfirm, Form,Select,Checkbox,message,Tabs,Icon,Modal, Tooltip } from 'antd';
import React, { Component } from "react";
import {SaveFile} from "../common/export_data"
import MyAxios from "../common/interface"
import {AditSqlTable} from '../auditSql/auditSqlCommon'
const { Option } = Select;
const {TabPane} = Tabs
const { TextArea } = Input
const PARAMS_TYPE_LIST = ['文本参数','字符串参数','选项参数']
const EditableContext = React.createContext();
const EditableRow = ({ form, index, ...props }) => (
  <EditableContext.Provider value={form}>
    <tr {...props} />
  </EditableContext.Provider>
);
const EditableFormRow = Form.create()(EditableRow);
class EditableCell extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editing:false,
      sql_preview:""
    }
  }

  toggleEdit = () => {
    const editing = !this.state.editing;
    this.setState({ editing }, () => {
      if (editing) {
        this.input.focus();
      }
    });
  };

  save = e => {
    const { record, handleSave } = this.props;
    this.form.validateFields((error, values) => {
      if (error && error[e.currentTarget.id]) {
        return;
      }
      this.toggleEdit();
      handleSave({ ...record, ...values });
    });
  };

  renderCell = form => {
    this.form = form;
    const { children, dataIndex, record, title } = this.props;
    const { editing } = this.state;
    return editing ? (
      <Form.Item style={{ margin: 0 }}>
        {form.getFieldDecorator(dataIndex, {
          rules: [
            {
              required: true,
              message: `${title} is required.`,
            },
          ],
          initialValue: record[dataIndex],
        })(<Input ref={node => (this.input = node)} onPressEnter={this.save} onBlur={this.save} />)}
      </Form.Item>
    ) : (
      <div
        className="editable-cell-value-wrap"
        style={{ paddingRight: 24 }}
        onClick={this.toggleEdit}
      >
        {children}
      </div>
    );
  };

  render() {
    const {
      editable,
      dataIndex,
      title,
      record,
      index,
      handleSave,
      children,
      ...restProps
    } = this.props;
    return (
      <td {...restProps}>
        {editable ? (
          <EditableContext.Consumer>{this.renderCell}</EditableContext.Consumer>
        ) : (
          children
        )}
      </td>
    );
  }
}


//主组件
class JksJobConfig extends React.Component {
  constructor(props) {
    super(props);
    this.columns = [
      {
        title: '参数类型',
        dataIndex: 'type',
        render: (text, record, idx) => {
          return (
                  <Select
                      style={{ width: 130 }}
                      id="type"
                      onChange={(value)=>this.changeType(text,record,idx,value)}
                      value={text}
                      showSearch
                      filterOption={(input,option)=>
                          option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                      }
                  >
                      {PARAMS_TYPE_LIST.map((type) => <Option key={type} value={type}>{type}</Option>)}
                  </Select>
          )}
      },
      {
        title: '参数名',
        dataIndex: 'params_name',
        render: (text, record, idx) => <Input value={record.params_name} onChange={(e)=>this.changeParamsName(text,record,idx,e.target.value)}/>
      },
      {
        title: '参数默认值/选项',
        dataIndex: 'params_value',
        render: (text, record, idx) => <TextArea value={record.params_value} onChange={(e)=>this.changeParamsValue(text,record,idx,e.target.value)}/>
      },
      {
        title: '参数描述',
        dataIndex: 'params_comment',
        render: (text, record, idx) => <TextArea value={record.params_comment} onChange={(e)=>this.changeParamsComment(text,record,idx,e.target.value)}/>
      },
      {
        title: '其他属性',
        dataIndex: 'extra_info',
        render: (text, record, idx) => {
          return (
              record.type==="文本参数" ?
              <Input placeholder="行高" defaultValue={this.state.TextAreaRows} value={record.extra_info} onChange={(e)=>this.changeExtraInfo(text,record,idx,e.target.value)}/>
              :null
          )}

      },
      {
        title: 'operation',
        dataIndex: 'operation',
        render: (text, record,idx) =>
          <div>
            <Popconfirm title="Sure to delete?" onConfirm={() => this.handleDelete(record.key)}>
              <a>Delete</a>
            </Popconfirm>
          </div>
      },
    ];


    this.state = {
      dataSource: [],
      jks_job_config_list:[],
      TextAreaRows:12,
      form_create:true,
      count: 1,
      showJobConfigModal:false,
      column_name_list:[],
      history_design_data:[],
      sql_preview:"",
      jks_job_name:"",
      jks_job_comment:"",
    };
  }

  componentDidMount() {
    this.getJksJobConfigList()
  }

  //onok
  onOK = () =>{
      this.state.form_create ? this.addConfig() : this.modifyConfig()
  }

  async addConfig() {
      let params = {
        jks_job_name:this.state.jks_job_name,
        jks_job_comment:this.state.jks_job_comment,
        jks_job_params_kv:this.state.dataSource,
      };
      await MyAxios.post('/jks/v1/add_jks_config/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  message.success(res.data.message)
                  this.setState({showJobConfigModal:false})
                  this.getJksJobConfigList()
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  async modifyConfig() {
      let params = {
        jks_job_name:this.state.jks_job_name,
        jks_job_comment:this.state.jks_job_comment,
        jks_job_params_kv:this.state.dataSource,
      };
      await MyAxios.post('/jks/v1/modify_jks_config/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  message.success(res.data.message)
                  this.setState({showJobConfigModal:false})
                  this.getJksJobConfigList()
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  //获取工单信息
    async getJksJobConfigList() {
        let params = {job_name: "install_mysql"};
        await MyAxios.post('/jks/v1/get_jks_job_config_list/',params).then(
            res => {res.data.status==="ok" ?
                this.setState({
                    jks_job_config_list: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }

  //删除配置任务
  async delJksJobConfig() {
      let params = {jks_job_name: this.state.del_jks_job_name};
      await MyAxios.post('/jks/v1/del_jks_config/',params).then(
          res => {res.data.status==="ok" ?
              message.success('ok') && this.getJksJobConfigList()
          :
              message.error(res.data.message)}
      ).catch(err => {message.error(err.message)})
  }




  //设计列: 删除列
  handleDelete = key => {
    const dataSource = [...this.state.dataSource];
    this.setState({ dataSource: dataSource.filter(item => item.key !== key)});

  };


  //设计列:末尾增加列
  handleAddTailColumn = () => {
    const { count, dataSource } = this.state;
    const newData = {
      key: dataSource.length + 1,
      params_name: '',
      params_value: ''
    };
    this.setState({
      dataSource: [...dataSource, newData],
      count: count + 1,
    });
  };

  handleSave = row => {
    const newData = [...this.state.dataSource];
    const index = newData.findIndex(item => row.key === item.key);
    const item = newData[index];
    newData.splice(index, 1, {
      ...item,
      ...row,
    });
    this.setState({ dataSource: newData});
  };


   //设计字段: 更改字段类型
   changeType =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.type=new_value;
       row.extra_info=this.state.TextAreaRows;
       this.setState({ dataSource: newData});
   }
   //更改参数名
   changeParamsName =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.params_name=new_value
       this.setState({ dataSource: newData});
   }
   //更改参数默认值
   changeParamsValue =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.params_value=new_value
       this.setState({ dataSource: newData});
   }

   //更改参数描述
   changeParamsComment =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.params_comment=new_value
       this.setState({ dataSource: newData});
   }
   //其他外属性(文本框高度设置)
   changeExtraInfo =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.extra_info= Number(new_value)
       this.setState({ dataSource: newData});
   }


  render() {
    const { dataSource,indexSource } = this.state;
    const components = {
      body: {
        row: EditableFormRow,
        cell: EditableCell,
      },
    };
    const columns = this.columns.map(col => {
      if (!col.editable) {
        return col;
      }
      return {
        ...col,
        onCell: record => ({
          record,
          editable: col.editable,
          dataIndex: col.dataIndex,
          title: col.title,
          handleSave: this.handleSave,
        }),
      };
    });

    const job_config_columns = [
          {
            title: 'jks_job_name',
            dataIndex: 'jks_job_name',
          },
          {
            title: 'jks_job_params',
            dataIndex: 'jks_job_params',
            width:'40%'
          },
          {
            title: 'jks_job_comment',
            dataIndex: 'jks_job_comment',
          },
          {
            title: '创建人',
            dataIndex: 'create_by',
          },
          {
            title: '修改人',
            dataIndex: 'update_by',
          }
          ,
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
            render: (text,record) => {
              return (
              <div>
                <Button type="primary" onClick={()=>this.setState({showJobConfigModal:true,form_create:false,jks_job_name:record.jks_job_name,jks_job_comment:record.jks_job_comment,dataSource:JSON.parse(record.jks_job_params.replace(/\n/g,"\\n").replace(/\r/g,"\\r"))})}>修改</Button>
                <Button type="danger" onClick={()=>this.setState({del_jks_job_name:record.jks_job_name} ,()=>this.delJksJobConfig())}>删除</Button>
              </div>
              )
            }
          }
        ];


    return (
      <div>
        <Tabs type="card" tabPosition="top">
          <TabPane tab="jk任务配置" key="1">
            <Table
              rowKey={(row ,index) => index}
              size="small"
              components={components}
              rowClassName={(record, index) => {
                    let className = 'row-detail-default ';
                    if (record.name === 'col_') {
                        className = 'row-detail-error';
                        return className;
                    }else {
                        return className;
                    }
                }}
              bordered
              dataSource={this.state.jks_job_config_list}
              columns={job_config_columns}
              pagination={false}
            />
            <Button type="primary" style={{marginTop:5}} onClick={()=>this.setState({showJobConfigModal:true,form_create:true,jks_job_name:"",jks_job_comment:"",dataSource:[]})}> 新增配置 </Button>
          </TabPane>
        </Tabs>
        <Modal
          visible={this.state.showJobConfigModal}
          onOk={() => this.onOK()}
          onCancel={()=>this.setState({showJobConfigModal:false})}
          width={800}
        >
            任务名: <Input value={this.state.jks_job_name} placeholder='任务名' onChange={(e)=>this.setState({jks_job_name: e.target.value})}/>
            任务描述: <TextArea value={this.state.jks_job_comment} placeholder='任务描述' onChange={(e)=>this.setState({jks_job_comment: e.target.value})}/>
            <Button onClick={this.handleAddTailColumn} type="primary" style={{ marginTop: 10 }}>添加参数</Button>
            <Table
              rowKey={(row ,index) => index}
              size="small"
              components={components}
              rowClassName={(record, index) => {
                    let className = 'row-detail-default ';
                    if (record.name === 'col_') {
                        className = 'row-detail-error';
                        return className;
                    }else {
                        return className;
                    }
                }}
              bordered
              dataSource={dataSource}
              columns={columns}
              pagination={false}
            />

        </Modal>
      </div>
    );
  }
}

export default JksJobConfig;