import { Table, Input, Button, Popconfirm, Form,Select,Checkbox,message,Tabs,Icon,Modal, Tooltip } from 'antd';
import React, { Component } from "react";
import {SaveFile} from "../common/export_data"
import MyAxios from "../common/interface"
import {AditSqlTable} from '../auditSql/auditSqlCommon'
const { Option } = Select;
const {TabPane} = Tabs
const { TextArea } = Input
const DATA_TYPE_LIST = ['tinyint' ,'smallint' ,'int' ,'bigint' ,'float' ,'double' ,'decimal' ,'date' ,'time' ,'year' ,'datetime' ,'timestamp' ,'char' ,'varchar' ,'tinytext' ,'text' ,'mediumtext' ,'longtext' ,'tinyblob' ,'blob','mediumblob' ,'longblob']
const INDEX_TYPE_LIST = ['normal','unique']
const INT_EXTRA_INFO_LIST = ['无符号', '自增','填充零']
const TIME_EXTRA_INFO_LIST = ['自动更新']
const TABLE_ENGINE_LIST = ['InnoDB']
const TABLE_CHARSET_LIST = ['utf8', 'utf8mb4']
const EditableContext = React.createContext();


//列设计长度部分不需要的直接禁止编辑
const LENGTH_SWITCH = (record) =>{
    switch(record.type) {
        case'tinytext':
        case 'text':
        case 'mediumtext':
        case 'longtext':
        case'tinyblob':
        case'blob':
        case 'mediumblob':
        case 'longblob':
            return true;
            break;
        case 'tinyint':
        case 'smallint':
        case'int':
        case'bigint':
           if (record.extra_info.includes('填充零')){
               return false;
           }else{
               return true;
           }
           break;
        default:
           return false;
           break;
    }
}

//列设计小数点部分不需要的直接禁止编辑
const POINT_SWITCH = (column_type) =>{
    switch(column_type) {
        case'decimal':
        case 'double':
        case 'float':
            return false;
           break;
        default:
           return true;
           break;
    }
}

//列设计默认值部分不需要的直接禁止编辑
const DEFAULT_SWITCH = (column_type) =>{
    switch(column_type) {
        case'tinytext':
        case 'text':
        case 'mediumtext':
        case 'longtext':
        case'tinyblob':
        case'blob':
        case 'mediumblob':
        case 'longblob':
            return true;
           break;
        default:
           return false;
           break;
    }
}


//列设计NOT NULL部分拦截
const NOT_NULL_SWITCH = (record) =>{
    switch(record.type) {
        case'tinytext':
        case 'text':
        case 'mediumtext':
        case 'longtext':
        case'tinyblob':
        case'blob':
        case 'mediumblob':
        case 'longblob':
            return false;
           break;
        default:
           return record.not_null;
           break;
    }
}

//列设计其他部分不需要的直接禁止编辑
const EXTRA_INFO_SWITCH = (column_type) =>{
    switch(column_type) {
        case 'tinyint':
        case 'smallint':
        case'int':
        case'bigint':
        case 'datetime':
        case 'timestamp':
            return false;
           break;
        default:
           return true;
           break;
    }
}


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
export class EditableAlterTable extends React.Component {
  constructor(props) {
    super(props);
    this.columns = [
      {
        title: '列名',
        dataIndex: 'name',
        width: '10%',
        render: (text, record, idx) => <Input value={record.name} onChange={(e)=>this.changeName(text,record,idx,e.target.value)}/>
      },
      {
        title: '类型',
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
                      {DATA_TYPE_LIST.map((type) => <Option key={type} value={type}>{type}</Option>)}
                  </Select>
          )}
      },
      {
        title: '长度',
        dataIndex: 'length',
        width: '6%',
        render: (text, record, idx) => <Input disabled={LENGTH_SWITCH(record)} value={record.length} onChange={(e)=>this.changeLength(text,record,idx,e.target.value)}/>
      },
      {
        title: '小数点',
        dataIndex: 'point',
        width: '6%',
        render: (text, record, idx) => <Input disabled={POINT_SWITCH(record.type)} value={record.point} onChange={(e)=>this.changePoint(text,record,idx,e.target.value)}/>
      },
      {
        title: '不是null',
        dataIndex: 'not_null',
        render: (text, record, idx) => <Checkbox checked={record.not_null} onChange={(e)=>this.changeNull(text,record,idx, e.target.checked)}/>

      },
      {
        title: '默认值',
        dataIndex: 'default_value',
        render: (text, record, idx) => <Input disabled={DEFAULT_SWITCH(record.type)} value={record.default_value} onChange={(e)=>this.changeDefault(text,record,idx,e.target.value)}/>
      },
      {
        title: '其他属性',
        dataIndex: 'extra_info',
        width: '14%',
        render: (text, record, idx) => (
          <Select
            mode="multiple"
            size="default"
            placeholder="Please select"
            onChange={(value)=>this.changeExtraInfo(text,record,idx,value)}
            style={{ width: '100%' }}
            value={text}
            onDropdownVisibleChange={open=>open ?this.handleExtraInfo(record): null}
            disabled={EXTRA_INFO_SWITCH(record.type)}
          >
            {this.state.extra_info.map((type) => <Option key={type} value={type}>{type}</Option>)}
          </Select>
        )
      },
      {
        title: '注释',
        dataIndex: 'comment',
        render: (text, record, idx) => <Input value={record.comment} onChange={(e)=>this.changeComment(text,record,idx,e.target.value)}/>
      },
      {
        title: '主键',
        dataIndex: 'primary_key',
        render: (text, record,idx) => <Checkbox checked={record.primary_key} onChange={(e)=>this.changePrimaryKey(text,record,idx,e.target.checked)}/>
      },
      {
        title: 'operation',
        dataIndex: 'operation',
        width: '8%',
        render: (text, record,idx) =>
          <div>
            <Popconfirm
              title={record.operate_flag ==="new_add_col" ? "Sure to delete?": <p style={{color:"red"}}>"注意!!! 会生成删除列数据的SQL,请谨慎操作"</p>}
              onConfirm={() => this.handleDelete(record)}
            >
              <a>Delete</a>
            </Popconfirm>
            <Button onClick={()=>this.handleAddNextColumn(record, idx)}>
              <Icon type="plus" />
            </Button>
            <Button onClick={()=>this.handleSearchColumn(record, idx)}>
              <Icon type="search" />
            </Button>
          </div>
      },
    ];

    this.db_columns = [
      {
        title: '列名',
        dataIndex: 'name',
        width: '10%',
      },
      {
        title: '类型',
        dataIndex: 'type',

      },
      {
        title: '长度',
        dataIndex: 'length',
        width: '6%',
      },
      {
        title: '小数点',
        dataIndex: 'point',
        width: '6%',
      },
      {
        title: '不是null',
        dataIndex: 'not_null',
        render: (text, record, idx) => <Checkbox disabled="true" checked={record.not_null}/>
      },
      {
        title: '默认值',
        dataIndex: 'default_value',
      },
      {
        title: '其他属性',
        dataIndex: 'extra',
        width: '30%',
      },
      {
        title: '注释',
        dataIndex: 'comment',
      },
      {
        title: 'operation',
        dataIndex: 'operation',
        render: (text, record,idx) =>
            <Button onClick={()=>this.handleSelectColumn(record)}>选中</Button>
      },
    ];

    this.index_columns = [
      {
        title: '索引类型',
        dataIndex: 'index_type',
        width: '20%',
        render: (text, record, idx) => {
          return (
                  <Select
                      style={{ width: 200 }}
                      id="type"
                      onChange={(value)=>this.changeIndexType(text,record,idx,value)}
                      value={text}
                      defaultValue="normal"
                  >
                      {INDEX_TYPE_LIST.map((type) => <Option key={type} value={type}>{type}</Option>)}
                  </Select>
          )}
      },
      {
        title: '索引名',
        dataIndex: 'index_name',
        width: '20%',
        render: (text, record, idx) => <Input placeholder={record.index_type==="normal"? "idx_列名,多列名简写": "uniq_列名,多列名简写"} value={record.index_name} onChange={(e)=>this.changeIndexName(text,record,idx,e.target.value)}/>
      },
      {
        title: '索引列',
        dataIndex: 'index_column',
        width: '20%',
        render: (text, record, idx) => (
          <div>
            <Input  placeholder="选择列自动填充,无需手动编辑" style={{width:'80%'}} value={record.index_column}/>
            <Button onClick={()=>this.setState({idx_select_keys:[]},()=>this.editIndex(text, record, idx))}>
              <Icon type="edit" />
            </Button>
          </div>
        )
      },
      {
        title: 'operation',
        dataIndex: 'operation',
        width: '20%',
        render: (text, record,idx) =>
          <div>
            <Popconfirm title="Sure to delete?" onConfirm={() => this.handleDeleteIndex(record.key)}>
              <a>Delete</a>
            </Popconfirm>
          </div>
      },
    ];

    this.select_index_columns = [
      {
        title: '字段名',
        dataIndex: 'column_name',
        width: '20%',
        render: (text, record, idx) => {
          return (
            <Select
              style={{ width: 200 }}
              id="type"
              onChange={(value)=>this.changeIndexColumns(text,record,idx,value)}
              value={text}
              defaultValue="normal"
            >
                {this.state.column_name_list.map((name) => <Option key={name} value={name}>{name}</Option>)}
            </Select>
          )
        }
      },
      {
        title: '索引前缀长度',
        dataIndex: 'length',
        render: (text, record, idx) => <Input value={text} onChange={(e)=>this.changeIndexLength(text,record,idx,e.target.value)}/>
      },
      {
        title: 'operation',
        dataIndex: 'operation',
        width: '50%',
        render: (text, record,idx) =>
          <div>
            <Popconfirm title="Sure to delete?" onConfirm={() => this.handleDeleteIndexColumn(text, record,idx)}>
              <a>Delete</a>
            </Popconfirm>
          </div>
      },
    ];

    this.state = {
      dataSource: [
        {
          key: 1,
          name: 'id',
          type: 'bigint',
          length: 0,
          point:0,
          not_null:true,
          default_value:'',
          comment:'主键id',
          primary_key:true,
          extra_info:['无符号','自增']
        },
        {
          key: 2,
          name: 'create_time',
          type: 'datetime',
          length: 0,
          point:0,
          not_null:true,
          default_value: 'CURRENT_TIMESTAMP',
          comment:'创建时间',
          primary_key:false,
          extra_info:[]
        },
        {
          key: 3,
          name: 'update_time',
          type: 'datetime',
          length: 0,
          point:0,
          not_null:true,
          default_value: 'CURRENT_TIMESTAMP',
          comment:'更新时间',
          primary_key:false,
          extra_info:['自动更新']
        },
      ],
      indexSource: [],
      count: 3,
      index_count: 2,
      extra_info: [],
      table_name: "t_",
      table_engine: "InnoDB",
      table_charset: "utf8",
      table_comment: "",
      table_auto_increment: "",
      columnIndexSource: [],
      editIndexModal: false,
      column_name_list: [],
      selected_row_keys: [],
      row_index_select_keys_map: {},
      columnIndexSourceCount: 0,
      history_design_data: [],
      sql_preview: "",
      alter_table_info: [],  //修改表结构使用字段，父组件传递来的
      des_ip_port: "",       //目的ip，父组件传递来的
      des_schema_name: "",  //目的库名，父组件传递来的
      alterSqlType: "merge", //合并多条alter
      searchColModal: false,
      search_col_content: "",
      edit_table_index: "",
      db_col_list: [],
      temp_db_col_list: [],
      tabs_active_key: '1'
    };
  }

  componentDidMount() {
    this.getDbCol()
  }

  //获取推荐列
  async getDbCol() {
      let params = {
        search_col_content:this.state.search_col_content,
      };
      await MyAxios.post('/web_console/v1/get_db_col/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  this.setState({db_col_list:res.data.data,temp_db_col_list:res.data.data})
                  message.success(res.data.message)
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  //设计表使用监听父组件变化,获取表信息,
  static getDerivedStateFromProps(nextProps,prevState) {
    if(nextProps.alter_table_info !== prevState.alter_table_info ){
       return {
          alter_table_info: nextProps.alter_table_info,
          dataSource:JSON.parse(nextProps.alter_table_info['data_source']),
          indexSource:JSON.parse(nextProps.alter_table_info['index_source']),
          table_name:nextProps.alter_table_info['table_name'],
          table_engine:nextProps.alter_table_info['table_engine'],
          table_comment:nextProps.alter_table_info['table_comment'],
          table_charset:nextProps.alter_table_info['table_charset'],
          table_auto_increment:nextProps.alter_table_info['table_auto_increment'],
          des_ip_port:nextProps.des_ip_port,
          des_schema_name:nextProps.des_schema_name,
          tabs_active_key: '1'
       }
    }
    return null;
  }

  //校验SQL语法
  async checkGenerateSql() {
      let params = {
        generate_sql:this.state.sql_preview,
        des_ip_port:this.state.des_ip_port,
        des_schema_name:this.state.des_schema_name,
      };
      await MyAxios.post('/web_console/v1/check_generate_sql/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  this.setState({check_sql_result:res.data.data})
                  message.success(res.data.message)
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  mergeOrSplit = () =>{
      if (this.state.sql_preview===""){
          return
      }
      var sql_list = this.state.sql_preview.split('\n')
      sql_list = sql_list.filter(item => item !== "")  //去除''
      var alter_sql_prefix = this.state.sql_preview.split('\n')[0].split(' ').slice(0,3).join(' ')  //第1行前3个字符串
      if (this.state.alterSqlType==="merge") {
          var merge_sql = this.state.merge_sql_view
          this.setState({sql_preview:merge_sql})
      }else {
          //没一行必须有alter开始,没有的追加alter，并删除最后","并加";"
          var split_sql = ""
          sql_list.forEach((item)=>{
              item = item.substring(item.length-1)===',' ? item.substring(0,item.length-1): item
              item = item.substring(item.length-1)===';' ? item.substring(0,item.length-1): item
              if (item.match(/^ALTER TABLE/g)){
                  if (item.split(' ').length>3){
                      split_sql = split_sql + item + ';\n'
                  }
              }else{
                  split_sql = split_sql + alter_sql_prefix  + item + ';\n'
              }
          })
          this.setState({sql_preview:split_sql})
      }
  }

  //保存设计表信息快照
  async handleSnapshot() {
      let params = {
        table_name: this.state.table_name,
        data_source: this.state.dataSource,
        index_source: this.state.indexSource,
        table_engine: this.state.table_engine,
        table_charset: this.state.table_charset,
        table_comment: this.state.table_comment,
      };
      await MyAxios.post('/web_console/v1/save_design_table_snap_shot/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  message.success(res.data.message)
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  //获取历史快照信息
  async handleGetSnapshot() {
      await MyAxios.post('/web_console/v1/get_design_table_snap_shot/').then(
          res=>{
              if( res.data.status === 'ok'){
                  this.setState({history_design_data:res.data.data})
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }


  //设计列: 删除列,将删除的列加到删除列表,后续添加列时如果字段名一样直接填充使用
  handleDelete = record => {
    const dataSource = [...this.state.dataSource];
    this.setState({
      dataSource: dataSource.filter(item => item.key !== record.key),
    });
  };

  //设计索引: 删除索引
  handleDeleteIndex = key => {
    const indexSource = [...this.state.indexSource];
    this.setState({ indexSource: indexSource.filter(item => item.key !== key)});
  };

  //设计列:向上移动
  upRow = position => {
    var index1 = position
    var index2 = position - 1
    var dataSource = [...this.state.dataSource];
    if (index1 !==0){
        dataSource[index1] = dataSource.splice(index2, 1, dataSource[index1])[0];
        this.setState({dataSource: dataSource});
    }
  };

  //设计列:向下移动
  downRow = position => {
    var index1 = position
    var index2 = position + 1
    var dataSource = [...this.state.dataSource];
    if (index1 !== dataSource.length - 1){
        dataSource[index1] = dataSource.splice(index2, 1, dataSource[index1])[0];
        this.setState({dataSource: dataSource});
    }
  };

  //设计列:在中间插入列
  handleAddNextColumn = (record,position) => {
    const { count, dataSource } = this.state;
    const newData = {
      key: record.key + 1,
      name: 'col_',
      type: '',
      length: 0,
      point:0,
      not_null:true,
      default_value:'',
      comment:'',
      primary_key:false,
      extra_info:[],
      operate_flag: "new_add_col",   //标记这列是新增的
      operate_position: "after",   //新增列在末尾
    };
    var newDataSource = []
    //更改每行key
    dataSource.forEach(row=>{
      newDataSource.push(row)
      if (row.key===record.key){
        newDataSource.push(newData)
      }else if (row.key>record.key){
        row.key = row.key+1
      }
    })
    this.setState({
      dataSource: newDataSource,
      count: count + 1,
    });
  };
  //设计列:智能匹配选择列
  handleSearchColumn = (record,position) => {
    this.setState({searchColModal:true,edit_table_index:record.key-1})
  };

  //设计列:末尾增加列
  handleAddTailColumn = () => {
    const { count, dataSource } = this.state;
    const newData = {
      key: dataSource.length + 1,
      name: 'col_',
      type: '',
      length: 0,
      point:0,
      not_null:true,
      default_value:'',
      comment:'',
      primary_key:false,
      extra_info:[],
      operate_flag: "new_add_col",   //标记这列是新增的
      operate_position: "tail",   //新增列在末尾
    };
    this.setState({
      dataSource: [...dataSource, newData],
      count: count + 1,
    });
  };

  //设计索引: 增加索引列
  handleAddTailIndexColumn = () => {
    const indexSource = [...this.state.indexSource];
    const newData = {
      key: indexSource[this.state.current_edit_index]['index_column_detail'].length + 1,
      column_name: '',
      length: 0,
    };

    var index_detail = [...indexSource[this.state.current_edit_index]['index_column_detail'], newData]
    var newIndexSource = indexSource
    newIndexSource[this.state.current_edit_index]['index_column_detail'] = index_detail
    this.setState({
      index_detail: index_detail,
      indexSource: newIndexSource
    });
  };

  //设计索引: 增加索引
  handleAddIndex = () => {
    const { indexCount, indexSource } = this.state;
    const newIndex = {
      key: indexSource.length + 1,
      index_name: '',
      index_column: '',
      index_type: 'normal',
      index_column_detail:[]
    };
    this.setState({
      indexSource: [...indexSource, newIndex],
      indexCount: indexCount + 1,
    });
    var row_index_select_keys_map = {}
    for (var m=0; m<this.state.indexSource.length;m++){
        row_index_select_keys_map[m] = []
    }
    this.setState({row_index_select_keys_map: row_index_select_keys_map})
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
       this.setState({ dataSource: newData});
   }
   //设计字段: 更改字段null
   changeNull =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.not_null=new_value;
       this.setState({ dataSource: newData});
   }
   //设计字段: 更改主键
   changePrimaryKey =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.primary_key=new_value
       this.setState({ dataSource: newData});
   }
   //设计字段: 更改列名注释
   changeComment =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.comment=new_value
       this.setState({ dataSource: newData});
   }
   //设计字段: 更改类型长度
   changeLength =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.length=new_value
       this.setState({ dataSource: newData});
   }
   //设计字段: 更改类型小数点长度
   changePoint =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.point=new_value
       this.setState({ dataSource: newData});
   }

   //设计字段: 更改默认值
   changeDefault =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.default_value=new_value
       this.setState({ dataSource: newData});
   }
   //设计索引: 更改索引名
   changeIndexName =(text,record,idx,new_value) =>{
       const newData = [...this.state.indexSource];
       let row = record;
       row.index_name=new_value
       this.setState({ indexSource: newData});
   }

   //设计索引: 更改索引类型(normal|unique)
   changeIndexType =(text,record,idx,new_value) =>{
       const newData = [...this.state.indexSource];
       let row = record;
       row.index_type=new_value;
       this.setState({ indexSource: newData});
   }
   //设计列: 列额外属性(自增|无符号|自动更新...)
   changeExtraInfo =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.extra_info=new_value
       this.setState({ dataSource: newData});
   }


   //设计列: 根据字段类型生成可选属性
   handleExtraInfo =(record) =>{
       switch(record.type) {
           case 'datetime':
              this.setState({extra_info:TIME_EXTRA_INFO_LIST})
              break;
           case 'tinyint': case 'smallint': case'int': case'bigint':
              this.setState({extra_info:INT_EXTRA_INFO_LIST})
              break;
           default:
              this.setState({extra_info:[]});
              break;
      }
   }


   //设计索引: 更新当前正在修改的是哪一个索引
   editIndex =(text,record,idx,new_value) =>{
       this.setState({editIndexModal:true, current_edit_index:idx,index_detail:this.state.indexSource[idx]['index_column_detail']})
   }

   //设计索引: 更改索引列公共方法
   generateIndex =(newIndexSource) =>{
       newIndexSource[this.state.current_edit_index]['index_column_detail'].sort((a,b)=>{ return a.key-b.key})
       var index_columns = ""  //每次都重新生成
       for (var i=0; i<newIndexSource[this.state.current_edit_index]['index_column_detail'].length;i++){
           var column_name = newIndexSource[this.state.current_edit_index]['index_column_detail'][i]['column_name']
           var index_prefix_length = newIndexSource[this.state.current_edit_index]['index_column_detail'][i]['length']
           if (Number(index_prefix_length)>0){
             index_columns = index_columns + column_name + '(' + index_prefix_length + ')' + ','
           }else {
             index_columns = index_columns + column_name + ','
           }
       }
       index_columns = index_columns.slice(0,index_columns.length-1);   //去掉多余逗号
       newIndexSource[this.state.current_edit_index]['index_column'] = index_columns
       this.setState({indexSource:newIndexSource})
   }

   //设计索引: 删除索引列
   handleDeleteIndexColumn = (text,record,idx,new_value) => {
     const newIndexSource = [...this.state.indexSource];
     newIndexSource[this.state.current_edit_index]['index_column_detail'].splice(idx,1)
     this.generateIndex(newIndexSource)
   }


   //设计索引: 索引列选择框触发
   changeIndexColumns=(text,record,idx,new_value) =>{
       const newIndexSource = [...this.state.indexSource];
       if (!newIndexSource[this.state.current_edit_index]['index_column_detail'].includes(record)){
         newIndexSource[this.state.current_edit_index]['index_column_detail'].push(record)
       }
       newIndexSource[this.state.current_edit_index]['index_column_detail'][idx]['column_name'] = new_value
       this.generateIndex(newIndexSource)
   }


   //设计索引: 索引前缀长度触发
   changeIndexLength=(text,record,idx,new_value) =>{
       const newIndexSource = [...this.state.indexSource];
       if (!newIndexSource[this.state.current_edit_index]['index_column_detail'].includes(record)){
         newIndexSource[this.state.current_edit_index]['index_column_detail'].push(record)
       }
       newIndexSource[this.state.current_edit_index]['index_column_detail'][idx]['length']=new_value
       this.generateIndex(newIndexSource)
   }

   //设计字段: 列名触发,如果列名是删除列中的名字则自动填充该列
   changeName=(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.old_name = row.old_name ? row.old_name: record.name   //如果old_name存在后续输入框在变化就不变了,保留原始列名
       row.name=new_value
       this.setState({dataSource: newData});
       //额外处理
       const column_name_list = [...this.state.column_name_list];
   }


    get_field = (col_name, source) =>{
        //forEach return只是退出循环,代码会继续往下走
        for(var i=0;i<source.length;i++){
            if (col_name === source[i]['name']){
                return source[i];
            }
        }
        return false;
    }

    //从动态列源中获取列名(name,old_name)对应的信息是否存在
    get_field_from_data_source = (col_name, source) =>{
        //forEach return只是退出循环,代码会继续往下走
        for(var i=0;i<source.length;i++){
            if (col_name === source[i]['name'] || col_name === source[i]['old_name']){
                return source[i];
            }
        }
        return false;
    }

    //获取index
    get_index = (index, source) =>{
        for(var i=0;i<source.length;i++){
            if (
                index['index_type'] === source[i]['index_type'] &&
                index['index_name'] === source[i]['index_name'] &&
                index['index_column'] === source[i]['index_column'] &&
                JSON.stringify(index['index_column_detail']) === JSON.stringify(source[i]['index_column_detail'])
            ){
                return source[i];
            }
        }
        return false;
    }

    buildAddSql = (field_detail,before_column_detail) =>{
        var before_column_name = ' `' + before_column_detail['name'] + '`'
        var format_column = this.formatColumn(field_detail)
        var add_sql = "ADD COLUMN " + format_column
        add_sql = field_detail.operate_position === "after" ? add_sql + " after " + before_column_name : add_sql
        return add_sql
    }


    buildAddIndexSql = (index_detail) =>{
        var index_info = ""
        var index_type = index_detail['index_type']
        var index_column =index_detail['index_column']
        var index_name =index_detail['index_name']
        if(index_type==='unique' && !index_name.match('^uniq_.*')){
            message.warning(index_name + "为唯一索引类型,请使用uniq_前缀",3)
        }
        index_info = index_type==='unique'? `UNIQUE KEY \`${index_name}\` (${index_column}) /*先确认表中是否有重复数据,如果有重复数据增加唯一索引会失败*/`: `KEY \`${index_name}\` (${index_column})`
        var add_index_sql = "add " + index_info
        return add_index_sql
    }

    buildDropIndexSql = (index_detail) =>{
        var index_type = index_detail['index_type']
        var index_name =index_detail['index_name']
        var drop_index_sql = "drop index " + '`' + index_name + '`' + '/*索引删除会影响查询效率,请确认要删除*/'
        return drop_index_sql
    }

    buildDropSql = (field_name) =>{
        var drop_sql = "DROP COLUMN " + '`' + field_name + '`' + '/*这列数据会被删除,请确认要删除*/'
        return drop_sql
    }

    buildModifySql = (field_detail) =>{
        var format_column =this.formatColumn(field_detail)
        var modify_sql = "MODIFY COLUMN " + format_column
        return modify_sql
    }   

    buildChangeSql = (field_detail) =>{
        var old_name = ' `' + field_detail['old_name'] + '`'
        var format_column =this.formatColumn(field_detail)
        var change_sql = "CHANGE column " + old_name + format_column
        return change_sql
    }

    handleSelectColumn=(record)=>{
       var new_data_source = []
       for (var i=0;i<this.state.dataSource.length;i++){
           if (i !== this.state.edit_table_index){
            new_data_source.push(this.state.dataSource[i])
           }else{
               var newRow = {
                   key: this.state.dataSource[i]['key'],
                   name: record['name'],
                   not_null: record['not_null'],
                   length: record['length'],
                   point: record['point'],
                   type: record['type'],
                   default_value: record['default_value'],
                   comment: record['comment'],
                   extra_info: record['extra'],
                   operate_flag: 'new_add_col',
                   operate_position: 'after',
               };

               new_data_source.push(newRow)
           }
       }
       this.setState({ dataSource: new_data_source, searchColModal:false});
   }

   //生成改表结构SQL
   generateAlterSql =() =>{
       //增加索引、删除索引、修改索引类型、修改索引列
       var old_data_source = JSON.parse(this.state.alter_table_info['data_source'])
       var old_index_source = JSON.parse(this.state.alter_table_info['index_source'])
       var old_table_name = this.state.alter_table_info['table_name']
       var old_table_comment = this.state.alter_table_info['table_comment']
       var old_table_charset = this.state.alter_table_info['table_charset']
       var data_source = this.state.dataSource
       var index_source = this.state.indexSource
       var change_sql_list = []
       var modify_sql_list = []
       var add_sql_list = []
       var drop_sql_list = []
       var add_key_sql_list = []
       var drop_key_sql_list = []
       var new_primary_key_col_list = data_source.filter(item => item.primary_key === true)      // 主键列过滤出来
       var old_primary_key_col_list = old_data_source.filter(item => item.primary_key === true)  // 主键列过滤出来

       // 增加列,不用forEach,需要将上一个列一并传过去
       for(var col=0;col<data_source.length;col++){
           if (data_source[col].operate_flag === "new_add_col"){
              add_sql_list.push(this.buildAddSql(data_source[col],data_source[col-1]))
           }
       }

       // 增加索引
       index_source.forEach((index)=>{
           var find_index = this.get_index(index,old_index_source)
           if (find_index === false){
               add_key_sql_list.push(this.buildAddIndexSql(index))
           }
       })
       // 获取减少的索引
       old_index_source.forEach((index)=>{
           var find_index = this.get_index(index,index_source)
           if (find_index === false){
               drop_key_sql_list.push(this.buildDropIndexSql(index))
           }
       })
       //改名列
       data_source.forEach((col)=>{
           if (col.operate_flag === "new_add_col"){
               return true //模拟continue
           }
           var old_col = this.get_field(col['name'],old_data_source)   //false证明列名改了
           if (old_col === false){
               change_sql_list.push(this.buildChangeSql(col))
           }
       })
       //修改属性列
       data_source.forEach((col)=>{
           var old_col = this.get_field(col['name'],old_data_source)  //获取到证明该列是之前就存在的
           if (old_col !== false){
               if (
                   col['type'] !== old_col['type'] ||
                   Number(col['length']) !== Number(old_col['length']) ||
                   Number(col['point']) !== Number(old_col['point']) ||
                   col['default_value'] !== old_col['default_value'] ||
                   JSON.stringify(col['extra_info']) !== JSON.stringify(old_col['extra_info']) ||
                   col['not_null'] !== old_col['not_null'] ||
                   col['comment'] !== old_col['comment']
               )
               {
                   modify_sql_list.push(this.buildModifySql(col))
               }
           }
       })
       // 减少列，通过name和old_name识别，如果这2个都不存在说明这列被删除了
       old_data_source.forEach((col)=>{
           var old_col = this.get_field_from_data_source(col['name'],data_source)
           if (old_col === false){
               drop_sql_list.push(this.buildDropSql(col['name']))
           }
       })
       //生成Alter SQL
       if (
           change_sql_list.length===0 &&
           modify_sql_list.length===0 &&
           add_sql_list.length===0 &&
           drop_sql_list.length===0 &&
           add_key_sql_list.length===0 &&
           drop_key_sql_list.length===0 &&
           this.state.table_name === old_table_name &&
           this.state.table_comment === old_table_comment &&
           this.state.table_charset === old_table_charset &&
           JSON.stringify(new_primary_key_col_list) === JSON.stringify(old_primary_key_col_list)
       ){
           this.setState({sql_preview: ""})
       }else{
           var base_sql = "ALTER TABLE " + old_table_name
           var format_drop_col_sql = this.formatSql(base_sql,drop_sql_list);
           var format_add_col_sql = this.formatSql(base_sql,add_sql_list);
           var format_modify_col_sql = this.formatSql(base_sql,modify_sql_list);
           var format_change_col_sql = this.formatSql(base_sql,change_sql_list);
           var format_change_table_name_sql = this.formatTableNameSql(old_table_name);
           var format_change_table_comment_sql = this.formatTableCommentSql(old_table_comment);
           var format_change_table_charset_sql = this.formatTableCharsetSql(old_table_charset);
           var format_primary_key_sql = this.formatAlterTablePrimaryKeySql(new_primary_key_col_list, old_primary_key_col_list);
           var format_add_key_sql = this.formatSql(base_sql,add_key_sql_list)
           var format_drop_key_sql = this.formatSql(base_sql,drop_key_sql_list)
           var sql = base_sql + format_drop_col_sql + format_add_col_sql  + format_modify_col_sql + format_change_col_sql  + format_primary_key_sql + format_add_key_sql + format_drop_key_sql + format_change_table_comment_sql + format_change_table_charset_sql + format_change_table_name_sql
           sql = sql.substring(sql.length-1)===',' ? sql.substring(0,sql.length-1): sql  //去除最后一个逗号
           sql = sql + ';'  // 在拼接结束符号
           this.setState({sql_preview: sql, merge_sql_view:sql})
       }
       //生成列名，用于索引编辑
       var column_name_list = []
       data_source.forEach(field_detail => {
           column_name_list.push(field_detail.name)
       });
       this.setState({column_name_list:column_name_list})
   }
   //修改主键
   formatAlterTablePrimaryKeySql = (new_primary_key_col_list, old_primary_key_col_list) =>{
       //主键列名不一样但是数量一样、主键列数量不一样场景需要删除主键再增加主键
       console.log(new_primary_key_col_list.length, old_primary_key_col_list.length)
       console.log(typeof new_primary_key_col_list, typeof old_primary_key_col_list)
       var sql = "";
       var new_pri_col_name_list = []
       var old_pri_col_name_list = []
       new_primary_key_col_list.forEach((item)=>{new_pri_col_name_list.push(item.name)})
       old_primary_key_col_list.forEach((item)=>{old_pri_col_name_list.push(item.name)})
       if (JSON.stringify(new_pri_col_name_list) !== JSON.stringify(old_pri_col_name_list)){
          sql = "\n  DROP PRIMARY KEY /*更改主键比较危险,请充分评估*/,"
          sql = sql + "\n  ADD PRIMARY KEY (" + new_pri_col_name_list.join(',') + ")"
       }
       return sql;
   }

   // 生成更改表名SQL
   formatTableNameSql = (old_table_name) =>{
       var sql = ""
       if (this.state.table_name !== old_table_name) {
           sql = "\n  rename to " + this.state.table_name  + ","
       }
       return sql
   }

   // 生成更改注释SQL
   formatTableCommentSql = (old_table_comment) =>{
       var sql = ""
       if (this.state.table_comment !== old_table_comment) {
           sql = "\n  comment '" + this.state.table_comment  + "',"
       }
       return sql
   }

   // 生成更改字符集SQL
   formatTableCharsetSql = (old_table_charset) =>{
       var sql = ""
       if (this.state.table_charset !== old_table_charset) {
           sql = "\n  convert to character set '" + this.state.table_charset  + "',"
       }
       return sql
   }

   formatSql = (base_sql, sql_list) =>{
       var sql = ""
       sql_list.forEach((item)=>{
           sql = sql + "\n  " + item + ","
       })
       return sql
   }

    formatPrimaryKey = (primary_keys) =>{
        var PRIMARY_KEY = "  PRIMARY KEY"
        var key_name = ""
        primary_keys.forEach((item)=>{
            key_name = key_name + "`" + item + "`" + ","
        })
        key_name = key_name.slice(0,key_name.length - 1);  //去除末尾多余逗号
        return PRIMARY_KEY + ' (' + key_name + ')'
    }


   //生成SQL做一些基础校验
   checkBaseTableInfo = () =>{
       if (this.state.table_name.length===0){
           message.error("请输入表名")
           return false
       }
       if (this.state.table_comment.length===0){
           message.error("请输入表注释")
           return false
       }
       return true
   }

   //格式化字段
   formatColumn = (field_detail) =>{
       var name = ' `' + field_detail['name'] + '`'
       var type = field_detail['type']
       var length = Number(field_detail['length'])
       var point = Number(field_detail['point'])
       var allow_null = field_detail['not_null'] ? ' NOT NULL' : ''
       var default_value = field_detail['default_value']==='' ? '': " DEFAULT " + field_detail['default_value']
       var extra_info = field_detail['extra_info']
       var comment = field_detail['comment']==='' ? '': " COMMENT " + "'" + field_detail['comment'] + "'"
       var COLUMN_TYPE = ""
       var extra_info_unsigned = ""
       var extra_info_zerofill = ""
       var extra_info_increment = ""
       var extra_info_update = ""
       switch(type) {
           case 'tinyint':
           case 'smallint':
           case'int':
           case'bigint':
              if (extra_info.includes('填充零')){
                  COLUMN_TYPE=type + '(' + length + ')'
              }else {
                  COLUMN_TYPE = type
              }
              //计算额外属性
              if (extra_info.includes('无符号')){
                  extra_info_unsigned = ' unsigned'
              }
              if (extra_info.includes('填充零')){
                  extra_info_zerofill = ' ZEROFILL'
              }
              if (extra_info.includes('自增')){
                  extra_info_increment = ' AUTO_INCREMENT'
              }
              COLUMN_TYPE = COLUMN_TYPE + extra_info_unsigned + extra_info_zerofill + allow_null + extra_info_increment + default_value
              break;
           case 'datetime':
           case 'timestamp':
           case 'time':
              if (length===0){
                  COLUMN_TYPE = type
              }else if (length > 6|length <0){
                  message.error(type + "精度范围为[0-6]")
              }else {
                  COLUMN_TYPE=type + '(' + length + ')'
              }
              //计算额外属性
              if (extra_info.includes('自动更新')){
                  if (length===0){
                      extra_info_update = ' ON UPDATE CURRENT_TIMESTAMP'
                  }else {
                      extra_info_update = ' ON UPDATE CURRENT_TIMESTAMP' + '(' + length + ')'
                  }
              }
              COLUMN_TYPE = COLUMN_TYPE + allow_null + default_value + extra_info_update
              break;
           case 'float':
           case 'double':
           case'decimal':
              if (length===0){
                  message.error(type + "长度不允许为0")
              }else if (point > length){
                  message.error(type + "小数长度大于整数长度")
              }else {
                  COLUMN_TYPE = type + '(' + length + ',' + point + ')'
                  COLUMN_TYPE = COLUMN_TYPE + allow_null + default_value
              }
              break;
           case 'char':
           case 'varchar':
              if (length===0){
                  message.error(type + "长度不允许为0")
              }else {
                  COLUMN_TYPE=type + '(' + length + ')'
                  COLUMN_TYPE = COLUMN_TYPE + allow_null + default_value
              }
              break;
           case'tinytext':
           case 'text':
           case 'mediumtext':
           case 'longtext':
           case'tinyblob':
           case'blob':
           case 'mediumblob':
           case 'longblob':
               COLUMN_TYPE = type + allow_null
               break;
           default:
              COLUMN_TYPE = type + allow_null + default_value
      }
      return name + ' ' +  COLUMN_TYPE + comment
   }

   callbackTabPane = (key) =>{
      switch(key) {
         case '3': case '4':
            this.generateAlterSql()
            break;
         case '5':
            this.handleGetSnapshot()
            break;
         default:
            break
      }
   }

   //选中保存快照信息
   editTable = (record,idx) =>{
     message.success("已选中")
     this.setState({
       table_name: record['table_name'],
       dataSource: JSON.parse(record['data_source']),
       indexSource: JSON.parse(record['index_source']),
       table_engine: record['table_engine'],
       table_charset: record['table_charset'],
       table_comment: record['table_comment'],
     })
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

    const index_columns = this.index_columns.map(col => {
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

    const history_design_columns = [
      {
        title: '表名',
        dataIndex: 'table_name',
      },
      {
        title: '表注释',
        dataIndex: 'table_comment',
      },
      {
        title: '表字符集',
        dataIndex:"table_charset",
      },
      {
        title: '表引擎',
        dataIndex:"table_engine",
      },
      {
        title: '列信息',
        dataIndex:"data_source",
        render:(text, row) => {
          return (
            text.length>50 ?
            <Tooltip
              placement="topLeft"
              overlayStyle={{ maxWidth: 500 }}
              title={text}><span>{text.slice(0,50)}...</span>
            </Tooltip>
            :<span>{text}</span>
          )
        }
      },
      {
        title: '索引信息',
        dataIndex:"index_source",
        render:(text, row) => {
          return (
            text.length>50 ?
            <Tooltip
              placement="topLeft"
              overlayStyle={{ maxWidth: 500 }}
              title={text}><span>{text.slice(0,50)}...</span>
            </Tooltip>
            :<span>{text}</span>
          )
        }
      },
      {
        title: '创建时间',
        dataIndex:"create_time",
      },
      {
        title: '更新时间',
        dataIndex:"update_time",
      },
      {
        title: 'operation',
        dataIndex: 'operation',
        render: (text, record,idx) =>
          <div>
            <Button onClick={()=>this.editTable(record,idx)}>选中</Button>
            <Button type="danger" style={{marginLeft:5}} onClick={()=>console.log(idx)}>删除</Button>
          </div>
      },
    ];

    return (
      <div>
        <Tabs onChange={this.callbackTabPane} type="card" tabPosition="top" activeKey={this.state.tabs_active_key}>
          <TabPane tab="基本信息" key="1">
            <div style={{width:'50%',marginLeft:'25%'}}>
              <div style={{ marginBottom: 4 }}>
                *表名称<Input value={this.state.table_name} placeholder="表名前缀采用't_'" onChange={(e)=>this.setState({table_name: e.target.value})}/>
              </div>
              <div style={{ marginBottom: 4 }}>
                *表注释<Input value={this.state.table_comment} onChange={(e)=>this.setState({table_comment: e.target.value})}/>
              </div>
              <div style={{ marginBottom: 4 }}>
                *表字符集
                <Select value={this.state.table_charset} style={{width:'100%'}} onChange={(value)=>this.setState({table_charset:value})}>
                    {TABLE_CHARSET_LIST.map((type) => <Option key={type} value={type}>{type}</Option>)}
                </Select>
              </div>
              <div style={{ marginBottom: 4 }}>
                *表引擎
                <Select defaultValue={this.state.table_engine} style={{width:'100%'}} onChange={(value)=>this.setState({table_engine:value})}>
                    {TABLE_ENGINE_LIST.map((type) => <Option key={type} value={type}>{type}</Option>)}
                </Select>
              </div>
            </div>,
          </TabPane>
          <TabPane tab="列信息" key="2">
            <Button onClick={this.handleAddTailColumn} type="primary" style={{ marginBottom: 4 }}> Add a Field </Button>
            <Tooltip
              overlayStyle={{ maxWidth: 900 }}
              placement="topRight"
              title={
                <span>
                    <p style={{padding:1,margin:1}}>字段名:不允许使用mysql关键字,使用'_'分割; 长度不允许超过64</p>
                    <p style={{padding:1,margin:1}}>字段数量: 不允许超过50个</p>
                    <p style={{padding:1,margin:1}}>必须字段: id,create_time,update_time</p>
                </span>
              }
            >
              <Button type="dash" style={{ marginBottom: 4 }}> 帮助 </Button>
            </Tooltip>
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
              pagination={{
                  defaultPageSize: 100,
                  showTotal: ((total) => {return `共 ${total} 条`}),
              }}
            />
          </TabPane>
          <TabPane tab="索引信息" key="3">
            <Button onClick={this.handleAddIndex} type="primary" style={{ marginBottom:4,marginRight:6 }}> Add a Index </Button>
            <Tooltip
              overlayStyle={{ maxWidth: 900 }}
              placement="topRight"
              title={
                <span>
                    <p style={{padding:1,margin:1}}>索引名规则: 普通索引索引名前缀为idx_xxx,唯一索引名前缀uniq_xxxx; 索引名长度不允许超过64,多列索引进行简化</p>
                    <p style={{padding:1,margin:1}}>索引列规则: 单表索引数量不超过5个; 单个索引中字段数不超过5个; 区分度不高的字段不建议建索引; 禁止创建冗余索引</p>
                </span>
              }
            >
              <Button type="dash" style={{ marginBottom: 4 }}> 帮助 </Button>
            </Tooltip>
            <Table
              rowKey={(row ,index) => index}
              size="small"
              components={components}
              rowClassName={() => 'editable-row'}
              bordered
              dataSource={indexSource}
              columns={index_columns}
              pagination={false}
            />
          </TabPane>
          <TabPane tab="SQL预览" key="4">
            <TextArea rows={10} value={this.state.sql_preview}/>
            <Button onClick={()=>SaveFile(this.state.sql_preview,'table.sql')} type="primary" style={{ marginTop: 5 }}>
              导出SQL
            </Button>
            <Button onClick={()=>this.checkGenerateSql()} type="primary" style={{ marginTop: 5,marginLeft:10 }}>
              校验SQL
            </Button>
            <Button onClick={()=>this.handleSnapshot()} type="primary" style={{ marginTop: 5,marginLeft:10  }}>
              保存当前建表信息
            </Button>
            <Button onClick={()=>this.setState({alterSqlType: "merge"},()=>this.mergeOrSplit())} type="dash" style={{ marginTop: 5,marginLeft:10  }}>
              合并DDL
            </Button>
            <Button onClick={()=>this.setState({alterSqlType: "split"},()=>this.mergeOrSplit())} type="dash" style={{ marginTop: 5,marginLeft:10  }}>
              拆分DDL
            </Button>
            <AditSqlTable
                data={this.state.check_sql_result}
                pagination={false}
            />
          </TabPane>
          <TabPane tab="我的收藏" key="5">
            <Table
              rowKey={(row ,index) => index}
              size="small"
              bordered
              dataSource={this.state.history_design_data}
              columns={history_design_columns}
            />
          </TabPane>
        </Tabs>
        <Modal
          visible={this.state.editIndexModal}
          footer={false}
          onCancel={()=>this.setState({editIndexModal:false})}
          width={800}
        >
            <Button onClick={this.handleAddTailIndexColumn} type="primary" style={{ marginBottom: 4 }}> Add a Row </Button>
            <Table
              rowKey={(row ,index) => index}
              size="small"
              components={components}
              bordered
              dataSource={this.state.index_detail}
              columns={this.select_index_columns}
              pagination={false}
            />
        </Modal>
        <Modal
          visible={this.state.searchColModal}
          footer={false}
          onCancel={()=>this.setState({searchColModal:false})}
          width={1200}
        >
            <Input allowClear style={{width:'30%'}} placeholder="列名匹配" value={this.state.search_col_content} onChange={(e)=>this.setState({search_col_content:e.target.value},()=>this.filterColOrComment()   )}/>
            <Table
              rowKey={(row ,index) => index}
              size="small"
              components={components}
              bordered
              dataSource={this.state.temp_db_col_list}
              columns={this.db_columns}
              pagination={false}
            />
        </Modal>
      </div>
    );
  }
}