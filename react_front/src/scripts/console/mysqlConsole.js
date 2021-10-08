import React,{Component} from 'react';
import axios from 'axios'
import { Table, Input,Badge,Button,message } from "antd";
import { UnControlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/sql-hint.js';
import 'codemirror/theme/ambiance.css';
import 'codemirror/addon/selection/active-line';
import { backendServerApiRoot } from "../common/util"

export default class mysqlConsole extends Component {
  state = {
    sql_content: '',
    table_data:[],
    table_column:[],

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
        sql:this.state.sql_content
      };
      this.setState({
          table_data: [],
          table_column:[]
      });
      await axios.post(`${backendServerApiRoot}/get_table_data/`,{params}).then(
          res => {
              if (res.data.status === "ok"){
                  console.log(res.data.data[0])
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
                      table_column: column_arr
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
                showTotal:(count=this.state.table_data.length)=>{return '共'+count+'条'}
            }}
        />
      </div>
    );
  }
}