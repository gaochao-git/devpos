import { Table, Input, Button, Popconfirm, Form,Select,Checkbox,message,Tabs,Icon,Modal } from 'antd';
import React, { Component } from "react";
import {SaveFile} from "../common/export_data"
import MyAxios from "../common/interface"
import {AditSqlTable} from '../auditSql/auditSqlCommon'
const { Option } = Select;
const {TabPane} = Tabs
const { TextArea } = Input
const DATA_TYPE_LIST = ['tinyint' ,'smallint' ,'int' ,'bigint' ,'float' ,'double' ,'decimal' ,'date' ,'time' ,'year' ,'datetime' ,'timestamp' ,'char' ,'varchar' ,'tinytext' ,'text' ,'mediumtext' ,'longtext' ,'tinyblob' ,'mediumblob' ,'longblob']
const INDEX_TYPE_LIST = ['normal','unique']
const INT_EXTRA_INFO_LIST = ['无符号', '自增']
const TIME_EXTRA_INFO_LIST = ['自动更新']
const TABLE_ENGINE_LIST = ['innodb']
const TABLE_CHARSET_LIST = ['utf8', 'utf8mb4']
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
export class EditableTable extends React.Component {
  constructor(props) {
    super(props);
    this.columns = [
      {
        title: '列名',
        dataIndex: 'name',
        width: '10%',
        editable: true,
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
                  >
                      {DATA_TYPE_LIST.map((type) => <Option key={type} value={type}>{type}</Option>)}
                  </Select>
          )}
      },
      {
        title: '长度',
        dataIndex: 'length',
        render: (text, record, idx) => <Input value={record.length} onChange={(e)=>this.changeLength(text,record,idx,e.target.value)}/>
      },
      {
        title: '小数点',
        dataIndex: 'point',
        render: (text, record, idx) => <Input value={record.point} onChange={(e)=>this.changePoint(text,record,idx,e.target.value)}/>
      },
      {
        title: '不是null',
        dataIndex: 'not_null',
        render: (text, record, idx) => <Checkbox checked={record.not_null} onChange={(e)=>this.changeNull(text,record,idx, e.target.checked)}/>

      },
      {
        title: '默认值',
        dataIndex: 'default_value',
        render: (text, record, idx) => <Input value={record.default_value} onChange={(e)=>this.changeDefault(text,record,idx,e.target.value)}/>
      },
      {
        title: '其他属性',
        dataIndex: 'extra_info',
        width: '20%',
        render: (text, record, idx) => (
          <Select
            mode="multiple"
            size="default"
            placeholder="Please select"
            onChange={(value)=>this.changeExtraInfo(text,record,idx,value)}
            style={{ width: '100%' }}
            value={text}
            onDropdownVisibleChange={open=>open ?this.handleExtraInfo(record): null}
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
        width: '20%',
        render: (text, record,idx) =>
          <div>
            <Popconfirm title="Sure to delete?" onConfirm={() => this.handleDelete(record.key)}>
              <a>Delete</a>
            </Popconfirm>
            <Button style={{marginLeft:5}} onClick={()=>this.upRow(idx)}>
              <Icon type="arrow-up" />
            </Button>
            <Button onClick={()=>this.downRow(idx)}>
              <Icon type="arrow-down" />
            </Button>
            <Button onClick={()=>this.handleAddNextColumn(record, idx)}>
              <Icon type="plus" />
            </Button>
          </div>
      },
    ];

    this.index_columns = [
      {
        title: '索引名',
        dataIndex: 'index_name',
        width: '20%',
        render: (text, record, idx) => <Input value={record.index_name} onChange={(e)=>this.changeIndexName(text,record,idx,e.target.value)}/>
      },
      {
        title: '索引列',
        dataIndex: 'index_column',
        width: '20%',
        render: (text, record, idx) => (
          <div>
            <Input style={{width:'80%'}} value={record.index_column} onChange={(e)=>this.changeIndexColumn(text,record,idx,e.target.value)}/>
            <Button onClick={()=>this.setState({idx_select_keys:[]},()=>this.editIndex(text, record, idx))}>
              <Icon type="edit" />
            </Button>
          </div>
        )
      },
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
        title: 'operation',
        dataIndex: 'operation',
        width: '20%',
        render: (text, record,idx) =>
          this.state.indexSource.length >= 1 ? (
            <div>
              <Popconfirm title="Sure to delete?" onConfirm={() => this.handleDeleteIndex(record.key)}>
                <a>Delete</a>
              </Popconfirm>
            </div>
          ) : null,
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
            <Popconfirm title="Sure to delete?" onConfirm={() => this.handleDelete(record.key)}>
              <a>Delete</a>
            </Popconfirm>
            <Button style={{marginLeft:5}} onClick={()=>this.upRow(idx)}>
              <Icon type="arrow-up" />
            </Button>
            <Button onClick={()=>this.downRow(idx)}>
              <Icon type="arrow-down" />
            </Button>
            <Button onClick={()=>this.handleAddNextColumn(record, idx)}>
              <Icon type="plus" />
            </Button>
          </div>
      },
    ];

    this.state = {
      dataSource: [
        {
          key: 1,
          name: 'id',
          type: 'bigint',
          length: 20,
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
          default_value:'now()',
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
          default_value:'now()',
          comment:'更新时间',
          primary_key:false,
          extra_info:[]
        },
      ],
      indexSource: [
        {
          key: 1,
          index_name: 'idx_create_time',
          index_type: 'normal',
          index_column: 'create_time',
          index_column_detail: [],
        },
        {
          key: 2,
          index_name: 'idx_update_time',
          index_type: 'normal',
          index_column: 'update_time',
          index_column_detail: [],
        },
      ],
      count: 3,
      index_count: 2,
      extra_info: [],
      table_name:"t_",
      table_engine: "innodb",
      table_charset: "utf8",
      table_comment: "",
      columnIndexSource: [],
      editIndexModal:false,
      column_name_list:[],
      selected_row_keys:[],
      row_index_select_keys_map:{},
      columnIndexSourceCount:0
    };
  }

  componentDidMount() {
    //pass
  }

  //获取集群实例信息
  async checkGenerateSql() {
      let params = {
        generate_sql:this.state.sql_preview,
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

  handleDelete = key => {
    const dataSource = [...this.state.dataSource];
    this.setState({ dataSource: dataSource.filter(item => item.key !== key)});

  };

  handleDeleteIndex = key => {
    const indexSource = [...this.state.indexSource];
    this.setState({ indexSource: indexSource.filter(item => item.key !== key)});

  };



  upRow = position => {
    var index1 = position
    var index2 = position - 1
    var dataSource = [...this.state.dataSource];
    if (index1 !==0){
        dataSource[index1] = dataSource.splice(index2, 1, dataSource[index1])[0];
        this.setState({dataSource: dataSource});
    }
  };


  downRow = position => {
    var index1 = position
    var index2 = position + 1
    var dataSource = [...this.state.dataSource];
    if (index1 !== dataSource.length - 1){
        dataSource[index1] = dataSource.splice(index2, 1, dataSource[index1])[0];
        this.setState({dataSource: dataSource});
    }
  };

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
      extra_info:[]
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
    console.log(newDataSource)
    this.setState({
      dataSource: newDataSource,
      count: count + 1,
    });
  };

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
      extra_info:[]
    };
    this.setState({
      dataSource: [...dataSource, newData],
      count: count + 1,
    });
  };

  handleAddTailIndexColumn = () => {
    const { columnIndexSource, indexSource } = this.state;
    const newData = {
      key: indexSource[this.state.current_edit_index]['index_column_detail'].length + 1,
      column_name: '',
      length: 0,
    };
    this.setState({
      index_detail: [...indexSource[this.state.current_edit_index]['index_column_detail'], newData],
    });
  };

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

  handleSaveIndex = row => {
    const newData = [...this.state.indexSource];
    const index = newData.findIndex(item => row.key === item.key);
    const item = newData[index];
    newData.splice(index, 1, {
      ...item,
      ...row,
    });
    this.setState({ indexSource: newData});
  };


   changeType =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.type=new_value;
       this.setState({ dataSource: newData});
   }
   changeNull =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.not_null=new_value;
       this.setState({ dataSource: newData});
   }
   changePrimaryKey =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.primary_key=new_value
       this.setState({ dataSource: newData});
   }
   changeComment =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.comment=new_value
       this.setState({ dataSource: newData});
   }

   changeLength =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.length=new_value
       this.setState({ dataSource: newData});
   }

   changePoint =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.point=new_value
       this.setState({ dataSource: newData});
   }

   changeDefault =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.default_value=new_value
       this.setState({ dataSource: newData});
   }

   changeIndexName =(text,record,idx,new_value) =>{
       const newData = [...this.state.indexSource];
       let row = record;
       row.index_name=new_value
       this.setState({ indexSource: newData});
   }

   changeIndexType =(text,record,idx,new_value) =>{
       const newData = [...this.state.indexSource];
       let row = record;
       row.index_type=new_value;
       this.setState({ indexSource: newData});
   }

   changeIndexColumn =(text,record,idx,new_value) =>{
       const newData = [...this.state.indexSource];
       let row = record;
       row.index_column=new_value
       this.setState({ indexSource: newData});
   }

   changeExtraInfo =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       let row = record;
       row.extra_info=new_value
       this.setState({ dataSource: newData});
   }

   changeIndexInfo =(text,record,idx,new_value) =>{
       console.log(new_value)
       const newData = [...this.state.indexSource];
       let row = record;
       row.index_column=new_value
       this.setState({ indexSource: newData});
   }

   handleExtraInfo =(record) =>{
       switch(record.type) {
           case 'datetime':
              this.setState({extra_info:TIME_EXTRA_INFO_LIST})
              break;
           case 'tinyint': case 'smallint': case'int': case'bigint':
              this.setState({extra_info:INT_EXTRA_INFO_LIST})
              break;
           default:
              break
      }
   }


   editIndex =(text,record,idx,new_value) =>{
       this.setState({editIndexModal:true, current_edit_index:idx,index_detail:this.state.indexSource[idx]['index_column_detail']})
   }

   //更改索引列公共方法
   generateIndex =(newIndexSource) =>{
       newIndexSource[this.state.current_edit_index]['index_column_detail'].sort((a,b)=>{ return a.key-b.key})
       var index_columns = ""  //每次都重新生成
       for (var i=0; i<newIndexSource[this.state.current_edit_index]['index_column_detail'].length;i++){
           var column_name = newIndexSource[this.state.current_edit_index]['index_column_detail'][i]['column_name']
           var index_prefix_length = newIndexSource[this.state.current_edit_index]['index_column_detail'][i]['length']
           if (Number(index_prefix_length)>0){
             index_columns = index_columns + column_name + '(' + index_prefix_length + ')' + ','
           }else {
             index_columns = index_columns + column_name  + ','
           }
       }
       newIndexSource[this.state.current_edit_index]['index_column'] = index_columns
       this.setState({indexSource:newIndexSource})
   }


   //索引列选择框触发
   changeIndexColumns=(text,record,idx,new_value) =>{
       const newIndexSource = [...this.state.indexSource];
       if (!newIndexSource[this.state.current_edit_index]['index_column_detail'].includes(record)){
         newIndexSource[this.state.current_edit_index]['index_column_detail'].push(record)
       }
       newIndexSource[this.state.current_edit_index]['index_column_detail'][idx]['column_name'] = new_value
       this.generateIndex(newIndexSource)
   }


   //索引列选择框触发
   changeIndexLength=(text,record,idx,new_value) =>{
       const newIndexSource = [...this.state.indexSource];
       if (!newIndexSource[this.state.current_edit_index]['index_column_detail'].includes(record)){
         newIndexSource[this.state.current_edit_index]['index_column_detail'].push(record)
       }
       newIndexSource[this.state.current_edit_index]['index_column_detail'][idx]['length']=new_value
       this.generateIndex(newIndexSource)
   }





   generateSql =() =>{
       if (!this.checkBaseTableInfo()){
           this.setState({sql_preview:""})
           return
       }
       var sql = ''
       var table_columns = ''
       var primary_keys = []
       var table_index = ''
       var table_head = 'CREATE TABLE ' + this.state.table_name + '('
       var table_engine = ') ENGINE=' + this.state.table_engine
       var table_charset = ' DEFAULT CHARACTER SET=' + this.state.table_charset
       var table_comment = this.state.table_comment.length !== 0 ? ' COMMENT ' + "'" + this.state.table_comment + "'" : ""
       //生成列
       var column_name_list = []
       this.state.dataSource.forEach(field_detail => {
           var column_info = ""
           var name = field_detail['name']
           var type = field_detail['type']
           var length = Number(field_detail['length'])
           var point = Number(field_detail['point'])
           var allow_null = field_detail['not_null'] ? 'not null' : 'null'
           var default_value = field_detail['default_value']==='' ? '': "default " + field_detail['default_value']
           var comment = field_detail['comment']==='' ? '': "comment " + '"' + field_detail['comment'] + '"'
           var format_column_type = this.formatColumnType(type,length,point)
           column_info = name + ' ' + format_column_type + ' ' + allow_null + ' ' + default_value + ' ' + comment
           table_columns = table_columns.length>0 ? table_columns + ',\n' + '  ' + column_info: '  ' + column_info
           var primary_key = field_detail['primary_key'] ? primary_keys.push(field_detail['name']): null
           column_name_list.push(name)
       });
       //生成主键
       primary_keys = primary_keys.length > 0 ? '  primary key' + '(' + primary_keys.join(',') + ')' + ',\n': ""
       //生成索引
       this.state.indexSource.forEach(index_detail => {
           var index_info = ""
           var index_type = index_detail['index_type']
           var index_column =index_detail['index_column']
           var index_name =index_detail['index_name']
           if(index_type==='unique' && !index_name.match('^uniq_.*')){
               message.warning(index_name + "为唯一索引类型,请使用uniq_前缀",3)
           }
           index_info = index_type==='unique'? 'unique key ' + index_name+  '(' + index_column + ')': 'key ' + index_name + '(' + index_column + ')'
           table_index = table_index.length>0 ? table_index + ',\n' + '  ' + index_info: '  ' + index_info
       })

       sql = table_head + '\n' + table_columns + ',\n' + primary_keys + table_index + '\n' + table_engine + table_charset + table_comment + ';'
       this.setState({sql_preview:sql,column_name_list:column_name_list})
   }


   initIndexInfo =() =>{
       //如果columnIndexSource为空列表，则使用所有列信息、选中列、已有索引信息初始化columnIndexSource
       //如果columnIndexSource为非空列表，则动态修改
       var row_list = []
       var column_name_list = []
       for (var i=0; i<this.state.indexSource.length;i++){
           var row = {}
           row['key'] = i
           row['column_name'] = this.state.indexSource[i]['column_name']
           row['length'] = this.state.indexSource[i]['length']
           row['index_column_detail'] = this.state.indexSource[i]['index_column_detail']
           column_name_list.push(this.state.dataSource[i]['name'])
           row_list.push(row)  //如果之前没有则构造信息并追加
           var keys_map = {}
           for (var j=0; j<this.state.columnIndexSource.length;j++){
               var select_keys = []
               if (i.name === j.column_name){
                   select_keys.push(j)  //如果之前有则追加
               }
               keys_map[j] = select_keys
           }
       }
       console.log(row_list,keys_map)
       this.setState({columnIndexSource:row_list,row_index_select_keys_map:keys_map,column_name_list:column_name_list})
   }

   //生成SQL基础校验
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
   
   //格式化字段类型
   formatColumnType = (type,length,point) =>{
       var COLUMN_TYPE = ""
       switch(type) {
           case 'datetime':
              if (length===0){
                  COLUMN_TYPE = type
              }else if (length > 6|length <0){
                  message.error(type + "精度范围为[0-6]")
              }else {
                  COLUMN_TYPE=type + '(' + length + ')'
              }
              break;
           case 'float': case 'double': case'decimal':
              if (length===0){
                  message.error(type + "长度不允许为0")
              }else if (point > length){
                  message.error(type + "小数长度大于整数长度")
              }else {
                  COLUMN_TYPE=type + '(' + length + ',' + point + ')'
              }
              break;
           case 'char': case 'varchar':
              if (length===0){
                  message.error(type + "长度不允许为0")
              }else {
                  COLUMN_TYPE=type + '(' + length + ')'
              }
              break;
           default:
              COLUMN_TYPE = type
      }
      return COLUMN_TYPE
   }

   callbackTabPane = (key) =>{
      if(key==="4"){
        this.generateSql()
      }else if (key==="3"){
//        this.initIndexInfo()
        this.generateSql()
        console.log(111)
      }
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

    return (
      <div>
        <Tabs onChange={this.callbackTabPane} type="card" tabPosition="top">
          <TabPane tab="基本信息" key="1">
            <div style={{width:'50%',marginLeft:'25%'}}>
              <div style={{ marginBottom: 16 }}>
                *表名称<Input defaultValue={this.state.table_name} placeholder="表名前缀采用't_'" onChange={(e)=>this.setState({table_name: e.target.value})}/>
              </div>
              <div style={{ marginBottom: 16 }}>
                *表注释<Input onChange={(e)=>this.setState({table_comment: e.target.value})}/>
              </div>
              <div style={{ marginBottom: 16 }}>
                *表字符集
                <Select defaultValue={this.state.table_charset} style={{width:'100%'}} onChange={(value)=>this.setState({table_charset:value})}>
                    {TABLE_CHARSET_LIST.map((type) => <Option key={type} value={type}>{type}</Option>)}
                </Select>
              </div>
              <div style={{ marginBottom: 16 }}>
                *表引擎
                <Select defaultValue={this.state.table_engine} style={{width:'100%'}} onChange={(value)=>this.setState({table_engine:value})}>
                    {TABLE_ENGINE_LIST.map((type) => <Option key={type} value={type}>{type}</Option>)}
                </Select>
              </div>
            </div>,
          </TabPane>
          <TabPane tab="列信息" key="2">
            <Button onClick={this.handleAddTailColumn} type="primary" style={{ marginBottom: 16 }}>
              Add a Field
            </Button>
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
            />
          </TabPane>
          <TabPane tab="索引信息" key="3">
            <Button onClick={this.handleAddIndex} type="primary" style={{ marginBottom: 16 }}>
              Add a Index
            </Button>
            <Table
              rowKey={(row ,index) => index}
              size="small"
              components={components}
              rowClassName={() => 'editable-row'}
              bordered
              dataSource={indexSource}
              columns={index_columns}
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
            <AditSqlTable
                data={this.state.check_sql_result}
                pagination={false}
            />
          </TabPane>
        </Tabs>
        <Modal
          visible={this.state.editIndexModal}
          onOk={()=>console.log(22222)}
          onCancel={()=>this.setState({editIndexModal:false})}
          width={800}
        >
            <Button onClick={this.handleAddTailIndexColumn} type="primary" style={{ marginBottom: 16 }}>
              Add a Row
            </Button>
            <Table
              rowKey={(row ,index) => index}
              size="small"
              components={components}
              bordered
              dataSource={this.state.index_detail}
              columns={this.select_index_columns}
            />
        </Modal>
      </div>
    );
  }
}