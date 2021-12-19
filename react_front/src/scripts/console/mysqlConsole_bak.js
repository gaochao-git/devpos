import React,{Component} from 'react';
import axios from 'axios'
import { Table, Input,Badge,Button,message,Row,Col,Select,Tabs,Icon,Tree,Spin } from "antd";
import { UnControlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/sql-hint.js';
import 'codemirror/theme/ambiance.css';
import 'codemirror/addon/selection/active-line';
import MyAxios from "../common/interface"
import {tableToExcel} from "../common/excel"
import {MyTree,MyTree1,MyTree2} from "../common/myComponent"
const {Option} = Select
const {TabPane} = Tabs
const { TextArea } = Input
const { TreeNode } = Tree;
const MyIcon = Icon.createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/font_8d5l8fzk5b87iudi.js', // 在 iconfont.cn 上生成
});

export default class mysqlConsole extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sql_content: '',
      table_data:[],
      table_column:[],
      current_schema:"选择库名",
      schema_list:[],
      schema_table_list:[],
      instance_list:[],
      instance_name:"选择实例名",
      cluster_name_list:[],
      cluster_name:"选择集群名",
      get_data:false,
      query_time:"",
      multi_label:[],
      multi_table_data:[],
      multi_table_column:[],
      multi_query_time:[],
      source_slider_info:[],
      global_loading:true
    }
  }

  componentDidMount() {
    this.getClusterName()
    this.getMySource()
  }

    exportBuInfoToExcel = () => {
        tableToExcel({})
    }

  onCursorActivity = (cm) => {
    if (cm.getSelection()) {
      this.setState({sql_content: cm.getSelection()});
    }
  }

  async getTableData(explain) {
      let params = {
        ip:'47.104.2.74',
        port:3306,
        schema_name:'test',
        sql:this.state.sql_content,
        explain:explain
      };
      this.setState({
          table_data: [],
          table_column:[],
          get_data:false
      });
      await MyAxios.post('/v1/service/console/get_table_data/',{params}).then(
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

  async getMySource(e) {
      console.log(e)
      let my_db_source = JSON.parse(window.localStorage.getItem("my_db_source"))
      if (!my_db_source){
        return
      }
      let cluster_name_dir_arr = []
      window.localStorage.setItem("my_db_source", JSON.stringify(my_db_source))
      console.log(JSON.parse(window.localStorage.getItem("my_db_source")))

      for (var i=0;i<my_db_source.length;i++){
          let cluster_name_dir = {}
          cluster_name_dir['title'] = my_db_source[i]
          cluster_name_dir['key'] = my_db_source[i]
          cluster_name_dir['selectable'] = false
          cluster_name_dir['icon'] = <Icon type="cloud"/>
          cluster_name_dir_arr.push(cluster_name_dir)
          console.log(cluster_name_dir_arr)
      }
      this.setState({source_slider_info:cluster_name_dir_arr})

//      await MyAxios.get('/v1/service/ticket/audit_sql/get_submit_sql_info/').then(
//          res=>{
//              if (res.data.status==="ok"){
//                  this.setState({
//                      submit_sql_info: res.data.data,
//                  });
//              }else{
//                  message.error(res.data.message);
//              };
//          }
//      ).catch(
//          err=>{message.error(err.message)}
//      )
  }

  onSelect = (selectedKeys, info) => {
    console.log(this.state.source_slider_info)
    console.log('selected', selectedKeys, info);
    let database_dir_arr = []
    let database_dir = {}
    database_dir['title'] = 'xxx'
    database_dir['key'] = 'xxx'
    database_dir_arr.push(database_dir)
    var database_tree_data = this.state.source_slider_info
    database_tree_data[0]['children']=database_dir_arr
    this.setState=({source_slider_info:database_tree_data})
  };


  onExpand = (selectedKeys, info) => {
    console.log(1111)
    console.log('onExpand', selectedKeys, info);
    console.log(selectedKeys.slice(-1)[0])
    console.log(2222)
  };



  onInputRead = async (cm, change, editor) => {
    console.log(cm)
    console.log(change)
    console.log(editor)
    const { text } = change;
    const dechars = [
      '.',
    ];
    const autocomplete = dechars.includes(text[0]);
    if (autocomplete) {
//      const data = getTableList(); // 获取库表列表
      const data = {"table5": ["c1", "c2"]}; // 获取库表列表
      cm.setOption('hintOptions', {
        tables: data,
        completeSingle: false
      });
      cm.execCommand('autocomplete');
    } else {
//      const tableName = getTableList(); // 获取表列表
      const tableName = {"table6": ["c1", "c2"]};; // 获取库表列表
      cm.setOption('hintOptions', {
        tables: tableName,
        completeSingle: false
      });
    }
    cm.execCommand('autocomplete');
  }

  onLoadData = (treeNode) =>
    new Promise(resolve => {
      if (treeNode.props.children) {
        resolve();
        return;
      }
      if (treeNode.props.eventKey.split(':').length===1){
        var cluster_name = treeNode.props.eventKey.split(':')[0]
        cluster_name==="devops_test"?this.getSchema('47.104.2.74_3306'):this.getSchema('47.104.2.74_3308')
      }else if (treeNode.props.eventKey.split(':').length===2){
        var schema_name = treeNode.props.eventKey.split(':')[1]
        this.getTable(schema_name)
      }
      if (treeNode.props.eventKey.split(':').length===1){
        setTimeout(() => {
          var my_child = []
          console.log(this.state.schema_list)
          for (var i=0;i<this.state.schema_list.length;i++){
            let database_dir = {}
            database_dir['title'] = this.state.schema_list[i]['Database']
            database_dir['key'] = treeNode.props.eventKey + ':' + this.state.schema_list[i]['Database']
            database_dir['icon'] = <Icon type="database"/>
            my_child.push(database_dir)
          }
          treeNode.props.dataRef.children = my_child
          this.setState({
            treeData: [...this.state.source_slider_info],
          });
          resolve();
        }, 300);
      }else if (treeNode.props.eventKey.split(':').length===2){
        setTimeout(() => {
          var my_child = []
          console.log('Tables_in_' + schema_name)
          console.log(this.state.schema_table_list)
          for (var i=0;i<this.state.schema_table_list.length;i++){
            let table_dir = {}
            table_dir['title'] = this.state.schema_table_list[i]['Tables_in_' + schema_name]
            table_dir['key'] = treeNode.props.eventKey + ':' + this.state.schema_table_list[i]['Tables_in_' + schema_name]
            table_dir['icon'] = <Icon type="table"/>
            my_child.push(table_dir)
          }
          console.log(my_child)
          treeNode.props.dataRef.children = my_child
          this.setState({
            treeData: [...this.state.source_slider_info],
          });
          resolve();
        }, 300);
      }else if (treeNode.props.eventKey.split(':').length===3){
        setTimeout(() => {
          treeNode.props.dataRef.children = [
            { title: 'column1', key: treeNode.props.eventKey+':'+'column1',isLeaf: true },
            { title: 'column2', key: treeNode.props.eventKey+':'+'column2',isLeaf: true },
          ];
          this.setState({
            treeData: [...this.state.source_slider_info],
          });
          resolve();
        }, 300);
      }

    });

  renderTreeNodes = data =>
    data.map(item => {
      if (item.children) {
        return (
          <TreeNode title={item.title} key={item.key} dataRef={item} icon={item.icon}>
            {this.renderTreeNodes(item.children)}
          </TreeNode>
        );
      }
      return <TreeNode key={item.key} {...item} dataRef={item} icon={item.icon}/>;
    });

  //获取所有集群名
  async getClusterName() {
      await MyAxios.get('/get_cluster_name/').then(
          res=>{
              if( res.data.status === 'ok'){
                  this.setState({
                      cluster_name_list: res.data.data,
                  });
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  //获取集群实例信息
  async getClusterName() {
      await MyAxios.get('/get_cluster_name/').then(
          res=>{
              if( res.data.status === 'ok'){
                  this.setState({
                      cluster_name_list: res.data.data,
                  });
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  //获取集群实例信息
  async getClusterIns(value) {
      let params = {
          ins_role:["M","S"],
          cluster_name:value,
      };
      this.setState({cluster_name:value})
      console.log(params)
      await MyAxios.post('/get_mysql_cluster_ins/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  this.setState({
                      instance_list: res.data.data,
                  });
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  //获取实例库信息
  async getSchema(value) {
      let params = {
          instance_name:value,
      };
      this.setState({instance_name:value,global_loading:false})
      console.log(params)
      await MyAxios.post('/v1/service/console/get_schema_list/',params,{timeout:300}).then(
          res=>{
              if( res.data.status === 'ok'){
                  console.log(res.data.data)
                  this.setState({schema_list: res.data.data,global_loading:true});
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }


  //连接探测
  async getDbConnect(value) {
      let params = {instance_name:value,};
      await MyAxios.post('/v1/service/console/get_db_connect/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  let my_db_source = JSON.parse(window.localStorage.getItem("my_db_source"))
                  my_db_source = my_db_source?my_db_source:[]
                  if (!my_db_source.includes(this.state.cluster_name)){
                    my_db_source.push(this.state.cluster_name)
                    window.localStorage.setItem("my_db_source", JSON.stringify(my_db_source))
                    this.getMySource()
                  }
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  //获取库表信息
  async getTable(value) {
      let params = {
          schema_name:value,
      };
      this.setState({schema_name:value})
      console.log(params)
      await MyAxios.post('/v1/service/console/get_table_list/',params,{timeout:300}).then(
          res=>{
              if( res.data.status === 'ok'){
                  console.log(res.data.data)
                  this.setState({schema_table_list: res.data.data});
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }



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
                        onChange={e=>this.getClusterIns(e)}
                    >
                        {this.state.schema_list.map(record =>{
                            return <Option value={record.SCHEMA_NAME} key={record.SCHEMA_NAME}>{record.SCHEMA_NAME}</Option>
                        })}
                    </Select>
                    <hr/>
                    <Tree
                        showIcon
                        loadData={this.onLoadData}
                        onExpand={this.onExpand}
                    >
                        {this.renderTreeNodes(this.state.source_slider_info)}
                    </Tree>
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
                        onChange={e=>this.getClusterIns(e)}
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
                        onChange={e=>this.getDbConnect(e)}
                    >
                        {this.state.instance_list.map(record =>{
                            return <Option value={record.instance_name} key={record.instance_name}>{record.instance_name}({record.instance_role})</Option>
                        })}
                    </Select>
                <hr/>
                <Button type="primary" onClick={()=> this.getTableData('no')}>执行</Button>
                <Button type="dashed" style={{marginLeft:10}} onClick={()=> this.getTableData('yes')}>执行计划</Button>
                <CodeMirror
                  value={this.state.content}
                  options={{
                    lineNumbers: true,
                    mode: {name: "text/x-mysql"},
                    extraKeys: {"Tab": "autocomplete"},
                    theme: 'idea',
                    styleActiveLine: true,
                    lineWrapping:true,
                    // 代码提示功能
                    hintOptions: {
                      // 避免由于提示列表只有一个提示信息时，自动填充
                      completeSingle: false,
                      // 不同的语言支持从配置中读取自定义配置 sql语言允许配置表和字段信息，用于代码提示
                      tables: {
                        "table1": ["c1", "c2"],
                        "table2": ["c1", "c2"],
                      },
                    },
                  }}

                  onChange={(cm) => this.setState({sql_content: cm.getValue()})} // sql变化事件
                  onFocus={(cm) => this.setState({sql_content: cm.getValue()})}
                  onCursorActivity={(cm) => this.onCursorActivity(cm)} // 用来完善选中监听
                  onInputRead={// 自动补全
                     (cm, change, editor) => this.onInputRead(cm, change, editor)
                  }
                />
                <Tabs defaultActiveKey='1'>
                    {
                        this.state.multi_label.map((item,index)=>{
                        return(
                            <TabPane tab={item} key={index}>
                                共{this.state.multi_table_data[index].length}条,  耗时:{this.state.multi_query_time[index]} ms
                                <Button
                                    style={{marginLeft: '10px'}}
                                    onClick={tableToExcel.bind(this, this.state.multi_table_data[index], this.state.multi_table_column[index], 'query_result')}
                                >
                                    导出
                                </Button>
                                {
                                    this.state.multi_table_column[index].length>0 && this.state.multi_table_data[index][0].hasOwnProperty('Create Table')
                                    ? <TextArea rows={20} value={this.state.multi_table_data[index][0]['Create Table']}/>
                                    :
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

                                }

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