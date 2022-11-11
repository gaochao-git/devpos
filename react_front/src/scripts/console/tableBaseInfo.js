import { Table, Input, Button, Popconfirm, Form,Select,Checkbox,message } from 'antd';
import React, { Component } from "react";
const { Option } = Select;
const DATA_TYPE_LIST = ['tinyint' ,'smallint' ,'int' ,'bigint' ,'float' ,'double' ,'decimal' ,'date' ,'time' ,'year' ,'datetime' ,'timestamp' ,'char' ,'varchar' ,'tinytext' ,'text' ,'mediumtext' ,'longtext' ,'tinyblob' ,'mediumblob' ,'longblob']

const EditableContext = React.createContext();

const EditableRow = ({ form, index, ...props }) => (
  <EditableContext.Provider value={form}>
    <tr {...props} />
  </EditableContext.Provider>
);

const EditableFormRow = Form.create()(EditableRow);

class EditableCell extends React.Component {
  state = {
    editing: false,
  };

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

export class EditableTable extends React.Component {
  constructor(props) {
    super(props);
    this.columns = [
      {
        title: '列名',
        dataIndex: 'name',
        width: '20%',
        editable: true,
      },
      {
        title: '类型',
        dataIndex: 'type',
        width: '20%',
        render: (text, record, idx) => {
          return (
                  <Select
                      style={{ width: 200 }}
                      id="type"
                      onChange={this.changeType.bind(text,record,idx)}
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
        render: (text, record, idx) => <Checkbox checked={record.not_null} onChange={(e)=>this.changeNull(text,record,e.target.checked)}/>

      },
      {
        title: '默认值',
        dataIndex: 'default_value',
        render: (text, record, idx) => <Input value={record.default_value} onChange={(e)=>this.changeDefault(text,record,idx,e.target.value)}/>
      },
      {
        title: '注释',
        dataIndex: 'comment',
        render: (text, record, idx) => <Input value={record.comment} onChange={(e)=>this.changeComment(text,record,idx,e.target.value)}/>
      },
      {
        title: '主键',
        dataIndex: 'primary_key',
        render: (text, record) => <Checkbox checked={record.primary_key} onChange={(e)=>this.changePrimaryKey(text,record,e.target.checked)}/>
      },
      {
        title: 'operation',
        dataIndex: 'operation',
        width: '20%',
        render: (text, record,idx) =>
          this.state.dataSource.length >= 1 ? (
            <div>
              <Popconfirm title="Sure to delete?" onConfirm={() => this.handleDelete(record.key)}>
                <a>Delete</a>
              </Popconfirm>
              <Button style={{marginLeft:5}} onClick={()=>this.upRow(idx)}>上移</Button>
              <Button onClick={()=>this.downRow(idx)}>下移</Button>
            </div>
          ) : null,
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
          extra_info:[]
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
          primary_key:true,
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
          primary_key:true,
          extra_info:[]
        },
      ],
      count: 3,
    };
  }

  handleDelete = key => {
    const dataSource = [...this.state.dataSource];
    this.setState({ dataSource: dataSource.filter(item => item.key !== key) });
  };

  upRow = position => {
    console.log(position)
    var index1 = position
    var index2 = position - 1
    var dataSource = [...this.state.dataSource];
    if (index1 !==0){
        dataSource[index1] = dataSource.splice(index2, 1, dataSource[index1])[0];
        this.setState({dataSource: dataSource})
    }
  };


  downRow = position => {
    console.log(position)
    var index1 = position
    var index2 = position + 1
    var dataSource = [...this.state.dataSource];
    if (index1 !== dataSource.length - 1){
        dataSource[index1] = dataSource.splice(index2, 1, dataSource[index1])[0];
        this.setState({dataSource: dataSource})
    }
  };

  handleAdd = () => {
    const { count, dataSource } = this.state;
    const newData = {
      key: dataSource.length + 1,
      name: '',
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

  handleSave = row => {
    console.log(7777777)
    const newData = [...this.state.dataSource];
    const index = newData.findIndex(item => row.key === item.key);
    const item = newData[index];
    newData.splice(index, 1, {
      ...item,
      ...row,
    });
    this.setState({ dataSource: newData });
  };


   changeType =(t,e,r) =>{
       const newData = [...this.state.dataSource];
       let row = t;
       row.type=r;
       console.log(t,e,r)
       console.log(this.state.dataSource)
       this.setState({ dataSource: newData });
   }
   changeNull =(t,e,r) =>{
       const newData = [...this.state.dataSource];
       console.log(t,e,r)
       let row = e;
       row.not_null=r;
       console.log(t,e,r)
       console.log(this.state.dataSource)
       this.setState({ dataSource: newData });
   }
   changePrimaryKey =(t,e,r) =>{
       const newData = [...this.state.dataSource];
       console.log(t,e,r)
       let row = e;
       row.primary_key=r
       console.log(t,e,r)
       console.log(this.state.dataSource)
       this.setState({ dataSource: newData });
   }
   changeComment =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       console.log(text,record,idx)
       let row = record;
       row.comment=new_value
       console.log(text,record,idx)
       console.log(this.state.dataSource)
       this.setState({ dataSource: newData });
   }

   changeLength =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       console.log(text,record,idx)
       let row = record;
       row.length=new_value
       console.log(text,record,idx)
       console.log(this.state.dataSource)
       this.setState({ dataSource: newData });
   }

   changePoint =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       console.log(text,record,idx)
       let row = record;
       row.point=new_value
       console.log(text,record,idx)
       console.log(this.state.dataSource)
       this.setState({ dataSource: newData });
   }

   changeDefault =(text,record,idx,new_value) =>{
       const newData = [...this.state.dataSource];
       console.log(text,record,idx)
       let row = record;
       row.default_value=new_value
       console.log(text,record,idx)
       console.log(this.state.dataSource)
       this.setState({ dataSource: newData });
   }





   generateSql =() =>{
       var sql = ''
       var table_columns = ''
       var primary_keys = []
       var table_index = ''
       var table_head = 'create table xxxx ('
       var table_engine = ') ENGINE=InnoDB'
       var table_charset = ' DEFAULT CHARACTER SET=utf8'
       var table_comment = 'xxxxxxx'
       var table_columns_mock = [{"name":"id","type":"int","length":32,"not_null":true,"default_value":1,"comment":"xxxx","primary_key":true},{"name":"status","type":"int","length":320,"null":"no","default_value":1,"comment":"xxxx","primary_key":true}]
       var table_index_mock = [{"type":"normal","columns":['emp','age']}]
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
       });
       primary_keys = primary_keys.length > 0 ? '  primary key' + '(' + primary_keys.join(',') + ')' + ',\n': ""
       table_index_mock.forEach(index_detail => {
           var index_info = ""
           var index_type = index_detail['type']
           var index_column =index_detail['columns'].join()
           var index_name =index_detail['columns'].join('_')
           index_info = index_type==='unique'? 'unique key uniq_' + index_name+  '(' + index_column + ')': 'key idx_' + index_name + '(' + index_column + ')'
           table_index = table_index.length>0 ? table_index + ',\n' + '  ' + index_info: '  ' + index_info
       })

       sql = table_head + '\n' + table_columns + '，\n' + primary_keys + table_index + '\n' + table_engine + table_charset
       console.log(sql)
       console.log(this.state.dataSource)
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
           default:
              COLUMN_TYPE = type
      }
      return COLUMN_TYPE
   }
    

  render() {
    const { dataSource } = this.state;
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
    return (
      <div>
        <Button onClick={this.handleAdd} type="primary" style={{ marginBottom: 16 }}>
          Add a row
        </Button>
        <Button onClick={()=>this.generateSql()} type="primary" style={{ marginBottom: 16 }}>
          生成SQL
        </Button>
        <Table
          rowKey={(row ,index) => index}
          size="small"
          components={components}
          rowClassName={() => 'editable-row'}
          bordered
          dataSource={dataSource}
          columns={columns}
        />
      </div>
    );
  }
}