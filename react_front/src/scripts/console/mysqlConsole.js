import React,{Component} from 'react';
import axios from 'axios'
import {Layout, Table, Input,Badge,Button,message,Row,Col,Select,Tabs,Icon,Tree,Spin } from "antd";
import { UnControlled as CodeMirror } from 'react-codemirror2';
import { BaseTable } from 'ali-react-table'
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
const { Search } = Input;
const { Header, Footer, Sider, Content } = Layout;
const MyIcon = Icon.createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/font_8d5l8fzk5b87iudi.js', // 在 iconfont.cn 上生成
});


export default class mysqlConsole extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sql_content: '',
      sql: '',
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
      global_loading:true,
      table_column_list:[],
      res_format:'row',
      table_search:"%",
    }
  }

  componentDidMount() {
    this.getClusterName()
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
        schema_name:this.state.current_schema,
        sql:this.state.sql,
        explain:explain
      };
      this.setState({
          table_data: [],
          table_column:[],
          get_data:false
      });
      await MyAxios.post('/web_console/v1/get_table_data/',{params}).then(
          res => {
              if (res.data.status === "ok"){
                  let table_column_list = []
                  let table_data_list = []
                  let table_label_list = []
                  let query_time_list = []
                  let col_format_res_list = []
                  for (var j=0; j<res.data.data.length;j++){
                      let column_arr = []
                      let label = '结果' + (j+1)
                      if (res.data.data.length >0){
                          for (var i=0; i<Object.keys(res.data.data[j][j][0]).length;i++){
                              let column_obj = {};
                              column_obj['title'] = [Object.keys(res.data.data[j][j][0])[i]]
                              column_obj['dataIndex'] = [Object.keys(res.data.data[j][j][0])[i]]
                              column_obj['width'] = 200
                              column_arr.push(column_obj)
                          }
                      };
                      table_column_list.push(column_arr)
                      table_data_list.push(res.data.data[j][j])
                      table_label_list.push(label)
                      query_time_list.push(res.data.query_time[j][j])
                      // 列式展示
                      let col_format_res = ""
                      for (var row_index=0;row_index<res.data.data[j][j].length;row_index++){
                          col_format_res = col_format_res + "\n**************** " + (row_index+1) + ". row ****************"
                          for (var col_name_k in res.data.data[j][j][row_index]){
                            var item_res = col_name_k + ": " + res.data.data[j][j][row_index][col_name_k]
                            col_format_res = col_format_res + '\n' + item_res
                          }
                      }
                      col_format_res_list.push(col_format_res)
                  }
                  this.setState({
                      multi_label: table_label_list,
                      multi_table_data: table_data_list,
                      multi_table_column: table_column_list,
                      multi_query_time: query_time_list,
                      col_format_res_list:col_format_res_list,
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
    if (selectedKeys.length===0){
        return
    }
    if (selectedKeys[0].split(":").length===1){
        var sql = "show create table " + selectedKeys[0]
        console.log(sql)
        this.setState({sql_content:sql},()=>this.getTableData("no"))
        message.success("table")
    }else if (selectedKeys[0].split(":").length===2){
        message.success("column")
    }
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
      console.log("level",treeNode.props.eventKey)
      if (treeNode.props.eventKey.split(':').length===1){
        var table_name = treeNode.props.eventKey.split(':')[0]
        this.getColumn(table_name)
      }
      if (treeNode.props.eventKey.split(':').length===1){
        setTimeout(() => {
          var my_child = []
          console.log(this.state.table_column_list)
          for (var i=0;i<this.state.table_column_list.length;i++){
            let column_dir = {}
            column_dir['title'] = this.state.table_column_list[i]['Field']
            column_dir['key'] = treeNode.props.eventKey + ':' + this.state.table_column_list[i]['Field']
            column_dir['isLeaf'] = true
            my_child.push(column_dir)
          }
          console.log(my_child)
          treeNode.props.dataRef.children = my_child
          this.setState({
            treeData: [...this.state.source_slider_info],
          });
          resolve();
        }, 1000);
      }

    });
    onBlur = (cm)=>{
        if (cm.getSelection()!==""){
            this.setState({sql:cm.getSelection(),get_data:false})
        }else{
            this.setState({sql:cm.getValue(),content:cm.getValue(),get_data:false})
        }
    }

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

  //获取集群实例信息
  async getClusterName() {
      await MyAxios.get('/db_resource/v1/get_mysql_cluster/').then(
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
      await MyAxios.post('/db_resource/v1/get_mysql_cluster_ins/',params).then(
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
      let params = {instance_name:value,};
      this.setState({instance_name:value,global_loading:false})
      await MyAxios.post('/web_console/v1/get_schema_list/',params,{timeout:1000}).then(
          res=>{
              if( res.data.status === 'ok'){
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
      this.setState({instance_name:value})
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
  async getTable() {
      let params = {
          schema_name:this.state.current_schema,
          instance_name:this.state.instance_name,
          table_name:this.state.table_search,
      };
      await MyAxios.post('/web_console/v1/get_table_list/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  var table_dir_arr = []
                  for (var i=0;i<res.data.data.length;i++){
                    let table_dir = {}
                    table_dir['title'] = res.data.data[i][this.state.current_schema]
                    table_dir['key'] = res.data.data[i][this.state.current_schema]
                    table_dir['icon'] = <Icon type="table"/>
                    table_dir_arr.push(table_dir)
                  }
                  this.setState({source_slider_info:table_dir_arr});
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  //获取库表信息
  async getColumn(value) {
      let params = {
          schema_name:this.state.current_schema,
          table_name:value,
          instance_name:this.state.instance_name
      };
      this.setState({table_name:value,})
      await MyAxios.post('/web_console/v1/get_column_list/',params,{timeout:1000}).then(
          res=>{
              if( res.data.status === 'ok'){
                  console.log(res.data.data)
                  this.setState({table_column_list: res.data.data});
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

    onCollapseTable = collapsed => {
        this.setState({
        collapsed: !this.state.collapsed,
      });
    };


  render() {
    return (
      <div>
        <Layout>
    <Sider
        style={{ background: 'white'}}
        collapsible
        collapsed={this.state.collapsed}
        onCollapse={this.onCollapse}
        trigger={null}
        width={260}
    >
        <div>
                    {!this.state.collapsed ?
                        <div>
                            <span>
                                <Search style={{ marginBottom: 8,width:'80%'}} placeholder="Search(显示100条)" onChange={(e)=>this.setState({table_search:e.target.value})} onSearch={(value)=>this.getTable()}/>
                                <Icon
                                  className="trigger"
                                  type={this.state.collapsed ? 'menu-unfold' : 'menu-fold'}
                                  onClick={this.onCollapseTable}
                                />
                            </span>
                            <Tree
                                showIcon
                                loadData={this.onLoadData}
                                onSelect={this.onSelect}
                                onExpand={this.onExpand}
                            >
                                {this.renderTreeNodes(this.state.source_slider_info)}
                            </Tree>
                        </div>
                    :
                    <Icon
                          className="trigger"
                          type={this.state.collapsed ? 'menu-unfold' : 'menu-fold'}
                          onClick={this.onCollapseTable}
                        />
                    }
                </div>
    </Sider>
    <Content
    >
        <Select
                        showSearch
                        filterOption={(input,option)=>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                        }
                        style={{width:200,marginLeft:2}}
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
                        style={{width:200,marginLeft:2}}
                        value={this.state.instance_name}
                        onChange={e=>this.getSchema(e)}
                    >
                        {this.state.instance_list.map(record =>{
                            return <Option value={record.instance_name} key={record.instance_name}>{record.instance_name}({record.instance_role})</Option>
                        })}
                    </Select>
                <Select
                        showSearch
                        filterOption={(input,option)=>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                        }
                        style={{width:200,marginLeft:2}}
                        value={this.state.current_schema}
                        onChange={e=>this.setState({current_schema:e},()=>this.getTable())}
                    >
                        {this.state.schema_list.map(record =>{
                            return <Option value={record.Database} key={record.Database}>{record.Database}</Option>
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

//                  onChange={(cm) => this.setState({sql_content: cm.getValue()})} // sql变化事件
//                  onFocus={(cm) => this.setState({sql_content: cm.getValue()})}
//                  onCursorActivity={(cm) => this.onCursorActivity(cm)} // 用来完善选中监听
                  onBlur={cm=>this.onBlur(cm)}
                  onInputRead={(cm, change, editor) => this.onInputRead(cm, change, editor)}  // 自动补全
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
                                <Button type="primary" style={{marginLeft:10}} onClick={()=> this.setState({res_format:'row'})}>行显示</Button>
                                <Button type="primary" style={{marginLeft:10}} onClick={()=> this.setState({res_format:'col'})}>列显示</Button>
                                {
                                    this.state.res_format === 'row'
                                    ?
                                    <Table
                                        dataSource={this.state.multi_table_data[index]}
                                        columns={this.state.multi_table_column[index]}
                                        bordered
                                        size="small"
                                        scroll={{x:'max-content',y:300}}
                                        pagination={false}
                                    />
                                    : <TextArea rows={20} value={this.state.col_format_res_list[index]}/>

                                }

                            </TabPane>
                        )
                        })
                    }
                </Tabs>

    </Content>
</Layout>
      </div>
    );
  }
}