import React,{Component} from 'react';
import axios from 'axios'
import { Table, Input,Badge,Button,message,Row,Col,Select } from "antd";
import { UnControlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/sql-hint.js';
import 'codemirror/theme/ambiance.css';
import 'codemirror/addon/selection/active-line';
import { backendServerApiRoot } from "../common/util"
const {Option} = Select

export default class mysqlConsole extends Component {
  state = {
    sql_content: '',
    table_data:[],
    table_column:[],
    current_schema:"选择库名",
    schema_list:[{'SCHEMA_NAME':'information_schema'}],
    schema_table_list:[],
    instance_name_list:[{'instance_name':'47.104.2.74_3306'}],
    instance_name:"选择实例名",
    cluster_name_list:[{'cluster_name':'cloud'}],
    cluster_name:"选择集群名",
    get_data:false,
    query_time:"",

  }

  //编辑器内容变动后就修改state
  onChange = (editor, data, sql)=>{
    this.setState({sql_content: sql});
//    console.log(sql)
  }

  onCursorActivity = (cm) => {
    if (cm.getSelection()) {
      this.setState({sql_content: cm.getSelection()});
//      console.log(cm.getSelection()); // 获取到选中部分内容，用来实现执行部分内容
    }
  }

  async getTableData() {
      let params = {
        ip:'47.104.2.74',
        port:3306,
        schema_name:'test',
        sql:this.state.sql_content
      };
      this.setState({
          table_data: [],
          table_column:[],
          get_data:false
      });
      await axios.post(`${backendServerApiRoot}/get_table_data/`,{params}).then(
          res => {
              if (res.data.status === "ok"){
                  let column_arr = []
                  if (res.data.data.length >0){
                      for (var i=0; i<Object.keys(res.data.data[0]).length;i++){
                          console.log(Object.keys(res.data.data[0])[i])
                          let column_obj = {};
                          column_obj['title'] = [Object.keys(res.data.data[0])[i]]
                          column_obj['dataIndex'] = [Object.keys(res.data.data[0])[i]]
                          column_arr.push(column_obj)
                      }
                  };
                  this.setState({
                      table_data: res.data.data,
                      table_column: column_arr,
                      get_data:true,
                      query_time:res.data.diff_time
                  });
              }else{
                  message.error(res.data.message);
              }
          }
      ).catch(err => {
          message.error(err);
          this.setState({
              table_data: [],
              table_column:[]
          });
      })
    };

  render() {
    return (
      <div>
        <Row type="flex" justify="space-around">
            <Col span={7} className="col-detail">
                <div>
                    <Select
                        showSearch
                        filterOption={(input,option)=>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                        }
                        style={{width:300,marginLeft:2}}
                        value={this.state.current_schema}
                        onChange={e=>this.getSchemaTable(e)}
                    >
                        {this.state.schema_list.map(record =>{
                            return <Option value={record.SCHEMA_NAME} key={record.SCHEMA_NAME}>{record.SCHEMA_NAME}</Option>
                        })}
                    </Select>
                    <hr/>
                </div>
            </Col>
            <Col span={16} className="col-detail">
                <Select
                        showSearch
                        filterOption={(input,option)=>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                        }
                        style={{width:300,marginLeft:2}}
                        value={this.state.cluster_name}
                        onChange={e=>this.getSchemaTable(e)}
                    >
                        {this.state.cluster_name_list.map(record =>{
                            return <Option value={record.cluster_name} key={record.cluster_name}>{record.cluster_name}</Option>
                        })}
                    </Select>
                <Select
                        showSearch
                        filterOption={(input,option)=>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                        }
                        style={{width:300,marginLeft:2}}
                        value={this.state.instance_name}
                        onChange={e=>this.getSchemaTable(e)}
                    >
                        {this.state.schema_list.map(record =>{
                            return <Option value={record.SCHEMA_NAME} key={record.SCHEMA_NAME}>{record.SCHEMA_NAME}</Option>
                        })}
                    </Select>
                <hr/>
                <Button type="primary" onClick={()=> this.getTableData()}>执行</Button>
                <CodeMirror
                  value={this.state.content}
                  options={{
                    lineNumbers: true,
                    mode: {name: "text/x-mysql"},
                    extraKeys: {"Tab": "autocomplete"},
                    theme: 'ambiance',
                    styleActiveLine: true,
                    lineWrapping:true
                  }}
                  onChange={this.onChange} // sql变化事件
                  onCursorActivity={(cm) => this.onCursorActivity(cm)} // 用来完善选中监听
                />
                {this.state.get_data ?
                <div>
                    <Table
                        dataSource={this.state.table_data}
                        columns={this.state.table_column}
                        bordered
                        size="small"
                        scroll={{x:'max-content'}}
                        pagination={{
                            pageSizeOptions:[10,20,30,40,50,60,70,80,90,100,300,500],
                            showSizeChanger:true,
                            total:this.state.table_data.length,
//                            showTotal:(count=this.state.table_data.length)=>{return '共'+count+'条'}
                        }}
                    />
                    {this.state.table_data.length} rows in set  ({this.state.query_time} ms)
                </div>
                :null
                }
            </Col>
        </Row>

      </div>
    );
  }
}