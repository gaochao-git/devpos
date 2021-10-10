import React,{Component} from 'react';
import axios from 'axios'
import { Table, Input,Badge,Button,message,Row,Col,Select,Tabs } from "antd";
import { UnControlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/sql-hint.js';
import 'codemirror/theme/ambiance.css';
import 'codemirror/addon/selection/active-line';
import { backendServerApiRoot } from "../common/util"
import {tableToExcel} from "../common/excel"
const {Option} = Select
const {TabPane} = Tabs

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
    multi_label:[],
    multi_table_data:[],
    multi_table_column:[],
    multi_query_time:[]

  }

    exportBuInfoToExcel = () => {
        tableToExcel({})
    }

  onCursorActivity = (cm) => {
    if (cm.getSelection()) {
      this.setState({sql_content: cm.getSelection()});
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
                  let table_column_list = []
                  let table_data_list = []
                  let table_label_list = []
                  let query_time_list = []
                  for (var j=0; j<res.data.data.length;j++){
                      let column_arr = []
                      let label = '结果' + (j+1)
                      if (res.data.data.length >0){
                          for (var i=0; i<Object.keys(res.data.data[j][j][0]).length;i++){
                              let column_obj = {};
                              column_obj['title'] = [Object.keys(res.data.data[j][j][0])[i]]
                              column_obj['dataIndex'] = [Object.keys(res.data.data[j][j][0])[i]]
                              column_arr.push(column_obj)
                          }
                      };
                      table_column_list.push(column_arr)
                      table_data_list.push(res.data.data[j][j])
                      table_label_list.push(label)
                      query_time_list.push(res.data.query_time[j][j])
                  }
                  console.log(table_label_list)
                  console.log(table_data_list)
                  console.log(table_column_list)
                  console.log(query_time_list)
                  this.setState({
                      multi_label: table_label_list,
                      multi_table_data: table_data_list,
                      multi_table_column: table_column_list,
                      multi_query_time: query_time_list,
                      get_data:true,
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
                  onChange={(cm) => this.setState({sql_content: cm.getValue()})} // sql变化事件
                  onFocus={(cm) => this.setState({sql_content: cm.getValue()})}
                  onCursorActivity={(cm) => this.onCursorActivity(cm)} // 用来完善选中监听
                />
                <Tabs defaultActiveKey='1'>
                    {
                        this.state.multi_label.map((item,index)=>{
                        return(
                            <TabPane tab={item} key={index}>
                                共{this.state.multi_table_data[index].length}条,  耗时:{this.state.multi_query_time[index]} ms
                                <Button
                                    style={{marginLeft: '10px'}}
                                    onClick={tableToExcel.bind(this, this.state.multi_table_data[0], this.state.multi_table_column[0], 'query_result')}
                                >
                                    导出
                                </Button>
                                <Table
                                    dataSource={this.state.multi_table_data[index]}
                                    columns={this.state.multi_table_column[index]}
                                    bordered
                                    size="small"
                                    scroll={{x:'max-content'}}
                                    pagination={{
                                        pageSizeOptions:[10,20,30,40,50,60,70,80,90,100,300,500],
                                        showSizeChanger:true,
                                        total:this.state.table_data.length,
                                    }}
                                />
                            </TabPane>
                        )
                        })
                    }
                </Tabs>
            </Col>
        </Row>
      </div>
    );
  }
}