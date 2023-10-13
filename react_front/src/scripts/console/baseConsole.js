import React,{Component,Fragment} from 'react';
import axios from 'axios'
import {Layout, Table, Input,Badge,Button,message,Row,Col,Select,Tabs,Icon,Tree,Spin,Switch,Modal,Tooltip,Drawer,List, Typography,Divider        } from "antd";
import sqlFormatter from 'sql-formatter';
import { UnControlled as CodeMirror } from 'react-codemirror2';
import { BaseTable } from 'ali-react-table'
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';   // 配置 https://github.com/HarryChen0506/react-markdown-editor-lite/blob/HEAD/docs/configure.md
import 'react-markdown-editor-lite/lib/index.css';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/sql-hint.js';
import 'codemirror/theme/ambiance.css';
import 'codemirror/addon/selection/active-line';
import { Resizable } from "re-resizable";
import MyAxios from "../common/interface"
import {tableToExcel} from "../common/export_data"
import { MyResizeTable } from "../common/resizeTable"
import {EditableTable} from "./tableBaseInfo"
import {EditableAlterTable} from "./alterTableBaseInfo"
const {Option} = Select
const {TabPane} = Tabs
const { TextArea } = Input
const { TreeNode } = Tree;
const { Search } = Input;
const { Header, Footer, Sider, Content } = Layout;
const ButtonGroup = Button.Group;
const MyIcon = Icon.createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/font_8d5l8fzk5b87iudi.js', // 在 iconfont.cn 上生成
});
const STORE_TYPE = ['收藏数据源','收藏SQL']
// Initialize a markdown parser
const mdParser = new MarkdownIt(/* Markdown-it options */);


export class BaseConsole extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sql_content: '',
      sql: '',
      table_data:[],
      table_column:[],
      current_schema:"选择库名",
      schema_list:[],
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
      global_loading:false,
      table_column_list:[],
      res_format:'row',
      table_search:"%",
      input_source_type:false,
      DrawerVisible:false,
      favorite_list:[],
      db_info:"",
      collapsed:true,

      store_info_name:"",    //收藏名称
      store_info_detail:"",  //收藏信息
      favoriteVisible:false,
      favorite_type:"选择收藏类型",   //收藏类型
      favorite_name:"",
      favorite_detail:"",
      contextMenuVisiable: false,// 显示右键菜单
      contextMenuStyle:"",// 右键菜单位置
      my_pos:{line:0,ch:0},
      tables_hint:{}, //表名补全
      editTableModal:false,
      editAlterTableModal:false,
      sql_preview:"",
      sqlScoreModal:false,
      table_list: [],
      table_col_hint_data: {"table_name":["id","name","age"]},
    }
  }

  componentDidMount() {
    this.getClusterName();
  }

    exportBuInfoToExcel = () => {
        tableToExcel({})
    }

  onCursorActivity = (cm) => {
    if (cm.getSelection()) {
      this.setState({sql_content: cm.getSelection()});
    }
  }

  handleColumnWidth = (text,record,index) =>{
          let columnWidth = text?text.width:30;
          if(columnWidth < 30 && index != 0) {
              columnWidth = 30;
          }
          return (<span title={text} className="ellipsisText" style={{width: columnWidth }}>{text}</span>);
      }


onSorter = (a,b) => {
  if (!a) {
    a = "";
  }
  if (!b) {
    b = "";
  }
  if ((typeof a) !== "number") {
    return a.length - b.length;
  }
  return a.length - b.length;
};


  async getTableData(explain) {
      let params = {
        des_ip_port:this.state.instance_name,
        schema_name:this.state.current_schema,
        sql:this.state.sql,
        explain:explain
      };
      this.setState({
          multi_label: [],
          multi_table_data: [],
          multi_table_column: [],
          multi_query_time: [],
          col_format_res_list:[],
          get_data:false,
          global_loading:true,
      });
      await MyAxios.post('/web_console/v1/get_table_data/',params).then(
          res => {
              if (res.data.status === "ok"){
                  let table_column_list = []
                  let table_data_list = []
                  let table_label_list = []
                  let query_time_list = []
                  let mask_time_list = []
                  let sens_time_list = []
                  let col_format_res_list = []
                  // sql1=select user from mysql.user limit 1;  sql2=select host from mysql.user limit 1;
                  // res.data.data = [{"0": [{"user": "gaochao"}]}, {"1": [{"host": "%"}]}]
                  for (var j=0; j<res.data.data.length;j++){
                      let column_arr = []
                      let label = '结果' + (j+1)
                      if (res.data.data[j][j].length >0){
                          for (var i=0; i<Object.keys(res.data.data[j][j][0]).length;i++){
                              let column_obj = {};
                              column_obj['title'] = [Object.keys(res.data.data[j][j][0])[i]]
                              column_obj['dataIndex'] = [Object.keys(res.data.data[j][j][0])[i]]
                              column_obj['render'] = (text, record, index) => {return this.handleColumnWidth(text,record,index);}
                              if (i<Object.keys(res.data.data[j][j][0]).length){
                                column_obj['width'] = 160
                              }
                              column_obj['sorter'] = (a, b) => {this.onSorter(a, b)}
//                              column_obj['sorter'] = (a, b) => {this.onSorter(a,b,res.data.data[j][j])}
//                              console.log(typeof [Object.keys(res.data.data[j][j][0])[i]][0])
                              column_arr.push(column_obj)
//                              console.log(column_obj)
                          }
                          column_arr.push({'title':''})
                      };
                      table_column_list.push(column_arr)
                      table_data_list.push(res.data.data[j][j])
                      table_label_list.push(label)
                      query_time_list.push(res.data.query_time[j][j])
                      mask_time_list.push(res.data.mask_time[j][j])
                      sens_time_list.push(res.data.sens_time[j][j])
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
                      multi_mask_time: mask_time_list,
                      multi_sens_time: sens_time_list,
                      col_format_res_list:col_format_res_list,
                      get_data:true,
                      global_loading:false,
                  });
              }else{
                  this.setState({
                    global_loading:false
                  });
                  message.error(res.data.message);
              }
          }
      ).catch(err => {
          message.error(err.message);
          this.setState({
              table_data: [],
              table_column:[],
              global_loading:false
          });
      })
    };

  async getMySource(e) {
      let my_db_source = JSON.parse(window.localStorage.getItem("my_db_source"))
      if (!my_db_source){
        return
      }
      let cluster_name_dir_arr = []
      window.localStorage.setItem("my_db_source", JSON.stringify(my_db_source))

      for (var i=0;i<my_db_source.length;i++){
          let cluster_name_dir = {}
          cluster_name_dir['title'] = my_db_source[i]
          cluster_name_dir['key'] = my_db_source[i]
          cluster_name_dir['selectable'] = false
          cluster_name_dir['icon'] = <Icon type="cloud"/>
          cluster_name_dir_arr.push(cluster_name_dir)
      }
      this.setState({source_slider_info:cluster_name_dir_arr})
  }

  onSelect = (selectedKeys, info) => {
    if (selectedKeys.length===0){
        return
    }
    if (selectedKeys[0].split(":").length===1){
        var insert_str = selectedKeys[0]
        this.editor.replaceRange(insert_str,this.state.my_pos)
    }else if (selectedKeys[0].split(":").length===2){
        var insert_str = selectedKeys[0].split(":")[1] + ','
        this.editor.replaceRange(insert_str,this.state.my_pos)
    }
    let pos2={
        line:this.state.my_pos.line,  //行号
        ch:this.state.my_pos.ch + insert_str.length//光标位置
    }
    this.setState({my_pos:pos2})
  };

  onExpand = (selectedKeys, info) => {
    console.log('onExpand', selectedKeys, info);
  };

  // 快速获取表结构、数据、信息
  fastTableInfo = (table, type) => {
    //根据不同类型确定SQL
    if (type === 'data'){
        var sql = "select * from " + table + ";"
    }else if (type === 'struct'){
        var sql = "show create table  " + table + ";"
    }else if (type === 'status'){
        var sql = "show table status like " + "'" + table + "'" + ";"
    }
    // 设置状态
    if (this.state.sql_content===""){
        this.setState({sql_content: sql});
        var sql_content = sql
    }else{
        var sql_content = this.state.sql_content + '\n' + sql
    }
    this.setState({sql: sql,sql_content:sql_content,DrawerVisible:false,contextMenuVisiable:false},()=>this.getTableData('no'))
  };


  //设计表获取目标实例当前表信息
  async alterDesignTable(table) {
      let params = {
        des_ip_port: this.state.instance_name,
        des_schema_name: this.state.current_schema,
        des_table_name: table
      };
      await MyAxios.post('/web_console/v1/get_target_table_info/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  this.setState({alter_table_info:res.data.data,DrawerVisible:false,contextMenuVisiable:false,editAlterTableModal:true})
                  message.success(res.data.message)
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  onInputRead = async (cm, change, editor) => {
    const tableName = this.state.tables_hint; // 获取库表列表
    const { text } = change;
    const ignore_chars = [',',' ',';'];     //这些字符不提示
    const ignore = ignore_chars.includes(text[0]);
    if (change.origin==="paste" || ignore){
        return
    } else {
      const hintData = this.state.table_col_hint_data;
      cm.setOption('hintOptions', {
        tables: hintData,
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
        var table_name = treeNode.props.eventKey.split(':')[0]
        this.getColumn(table_name).then(() => {
          var my_child = []
          for (var i=0;i<this.state.table_column_list.length;i++){
            let column_dir = {}
            //column_dir['title'] = this.state.table_column_list[i]['COLUMN_NAME']  + ':  ' + this.state.table_column_list[i]['Type']
            column_dir['title'] = <Tooltip
                                      placement="rightBottom"
                                      overlayStyle={{ maxWidth: 350 }}
                                      title={
                                          <span>
                                              COLUMN_COMMENT: {this.state.table_column_list[i]['COLUMN_COMMENT']}
                                              <br/>IS_NULLABLE: {this.state.table_column_list[i]['IS_NULLABLE']}
                                              <br/>COLUMN_KEY: {this.state.table_column_list[i]['COLUMN_KEY'] }
                                              <br/>COLUMN_DEFAULT: {this.state.table_column_list[i]['COLUMN_DEFAULT']}
                                              <br/>EXTRA: {this.state.table_column_list[i]['EXTRA']}
                                          </span>
                                      }
                                  >
                                      {this.state.table_column_list[i]['COLUMN_NAME']}
                                      <span style={{ color: '#d1cdcd', marginLeft: 10}}>
                                          {this.state.table_column_list[i]['COLUMN_TYPE']}
                                      </span>
                                  </Tooltip>
            column_dir['key'] = treeNode.props.eventKey + ':' + this.state.table_column_list[i]['COLUMN_NAME']
            column_dir['isLeaf'] = true
            my_child.push(column_dir)
          }
          treeNode.props.dataRef.children = my_child
          this.setState({treeData: [...this.state.source_slider_info]});
          resolve();
          }
        )
      }
    });

  onBlur = (cm)=>{
      this.setState({my_pos:cm.getCursor()})
      if (cm.getSelection()!==""){
          this.setState({sql:cm.getSelection(),get_data:false})
      }else{
          this.setState({sql:cm.getValue(),sql_content:cm.getValue(),get_data:false})
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

  rightClickTree = e => {
    if (e.node.props.eventKey.split(':').length===2){
        return
    }
    this.setState({
      rightClickData: e.node.props.dataRef,
      checkedKeys: [],// 复选框清空
      selectedKeys: [e.node.props.dataRef.id],// 右键的节点设置selected
      contextMenuVisiable: true,// 显示右键菜单
      contextMenuStyle: { top: e.event.clientY, left: e.event.clientX },// 右键菜单位置
    });
  };

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
  async getDbInfo() {
      this.setState({db_info:[]})
      let params = {des_ip_port:this.state.instance_name}
      await MyAxios.get('/web_console/v1/get_db_info/',{params}).then(
          res=>{
              if( res.data.status === 'ok'){
                  let db_info = []
                  for(var key in res.data.data[0]){
                   let item_info = ""
                   item_info = key + ': ' + res.data.data[0][key]
                   db_info.push(item_info)
                  }
                  this.setState({
                      db_info: db_info,
                  });
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  //获取收藏信息
  async getFavorite() {
      let params = {favorite_type:this.state.favorite_type}
      this.setState({DrawerVisible:true})
      await MyAxios.get('/web_console/v1/get_favorite/',{params}).then(
          res=>{
              if( res.data.status === 'ok'){
                  this.setState({
                      favorite_list: res.data.data,
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
  async getSchema() {
      let params = {instance_name:this.state.instance_name};
      await MyAxios.post('/web_console/v1/get_schema_list/',params,{timeout:1000}).then(
          res=>{
              if( res.data.status === 'ok'){
                  this.setState({schema_list: res.data.data});
                  this.getDbInfo()  // 获取数据库基础信息
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
      this.setState({source_slider_info:[]});   // source_slider_info中的表变化时让tree重新渲染
      await MyAxios.post('/web_console/v1/get_table_list/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  var table_dir_arr = []
                  var table_hint_obj = {}
                  var table_info_list = res.data.data['table_info_list']
                  for (var i=0;i<table_info_list.length;i++){
                    let table_dir = {}
                    table_hint_obj[table_info_list[i]['TABLE_NAME']] = []
                    table_dir['title'] = <Tooltip
                                             placement="rightBottom"
                                             overlayStyle={{ maxWidth: 350 }}
                                             title={
                                                 <span>
                                                     TABLE_COMMENT: {table_info_list[i]['TABLE_COMMENT']}
                                                     <br/>ENGINE: {table_info_list[i]['ENGINE']}
                                                     <br/>CREATE_TIME: {table_info_list[i]['CREATE_TIME']}
                                                     <br/>AUTO_INCREMENT: {table_info_list[i]['AUTO_INCREMENT']}
                                                     <br/>DATA_LENGTH: {table_info_list[i]['DATA_LENGTH']} bytes
                                                     <br/>DATA_FREE: {table_info_list[i]['DATA_FREE']} bytes
                                                     <br/>INDEX_LENGTH: {table_info_list[i]['INDEX_LENGTH']} bytes
                                                     <br/>TABLE_ROWS: {table_info_list[i]['TABLE_ROWS']}
                                                 </span>
                                             }
                                         >
                                             <span style={{ color: 'gray' }}>
                                                 {table_info_list[i]['TABLE_NAME']}
                                             </span>
                                         </Tooltip>
                    table_dir['key'] = table_info_list[i]['TABLE_NAME']
                    table_dir['icon'] = <Icon type="table"/>
                    table_dir_arr.push(table_dir)
                  }
                  this.setState({source_slider_info:table_dir_arr,collapsed:false,table_col_hint_data:res.data.data['hint_data'],table_list:res.data.data})
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
      await MyAxios.post('/web_console/v1/get_column_list/',params).then(
          res=>{
              if( res.data.status === 'ok'){
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

  onEditorDidMount = editor =>{
        this.editor = editor;
        editor.setSize("auto","174px")
    };


  //收藏功能
  async favoriteOk() {
      let params = {
          favorite_type:this.state.favorite_type,
          favorite_name:this.state.favorite_name,
          favorite_detail:this.state.favorite_detail
      };
      await MyAxios.post('/web_console/v1/add_favorite/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  this.setState({favoriteVisible: false});
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }
  //取消收藏
  async favoriteCancel(favorite_name) {
      let params = {
          favorite_name:favorite_name,
      };
      await MyAxios.post('/web_console/v1/del_favorite/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  this.getFavorite()
                  message.success(res.data.message)
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  //获取SQL质量
  async getSqlScore() {
      let params = {
          des_ip_port:this.state.instance_name,
          schema_name:this.state.current_schema,
          sql:this.state.sql,
      };
      await MyAxios.post('/web_console/v1/get_sql_score/',params).then(
          res=>{
              if( res.data.status === 'ok'){
                  message.success(res.data.message)
                  this.setState({sql_score:res.data.data, sqlScoreModal: true})
                  console.log(res.data.data)
              } else{
                  message.error(res.data.message)
              }
          }
      ).catch(err=>message.error(err.message))
  }

  handleChangeStoreType = (e) => {
    if (e==="db_source"){
        this.setState({favorite_detail: this.state.instance_name,favorite_type:e});
    }else if (e==="db_sql"){
        this.setState({favorite_detail: this.state.sql,favorite_type:e});
    }else{
        message.warning('not support type')
    }
  };

  onChange(pagination, filters, sorter) {
    console.log(9999)
    console.log('Various parameters', pagination, filters, sorter);
  }

  onFavorite = (favorite_detail) => {
    if (this.state.favorite_type==="db_source"){
        this.setState({instance_name: favorite_detail,input_source_type:true,DrawerVisible:false});
    }else if (this.state.favorite_type==="db_sql"){
        if (this.state.sql_content===""){
            this.setState({sql_content: favorite_detail});
        }else{
            this.setState({sql_content: this.state.sql_content + '\n' + favorite_detail});
        }
        this.setState({sql: favorite_detail,DrawerVisible:false},()=>this.getTableData('no'))
    }
  };


  //渲染SQL质量markdown
  renderHTML = () =>{
    return mdParser.render(this.state.sql_score);
  }

  render() {
    const favorite_column = [
      {
        title: '名称',
        dataIndex: 'favorite_name',
        render: (value,record) => {
          return (
            <Tooltip
                placement="bottomLeft"
               title={record.favorite_detail}
           >
               <Button type="link" onClick={()=> this.onFavorite(record.favorite_detail)}>{value}</Button>
           </Tooltip>

          )
        }
      },
      {
        title: '取消收藏',
        fixed:"right",
        render: (record) => {
          return (<Button type="link" onClick={()=> this.favoriteCancel(record.favorite_name)} icon="close"></Button>)
        }
      }
    ];
    return (
      <div>
        <Layout style={{ marginTop:1,marginLeft:1}}>
          <div>
              <Sider
                  style={{ background: 'white'}}
                  collapsible
                  collapsed={this.state.collapsed}
                  onCollapse={this.onCollapse}
                  trigger={null}
                  width='100%'
                  collapsedWidth={0}
              >
                {!this.state.collapsed ?
                  <div>
                    <Resizable style={{overflow:'scroll',display:'block'}} defaultSize={{width:320, height:'400'}} minWidth='140'>
                        <Search size="small" placeholder="Search(显示100条)" onChange={(e)=>this.setState({table_search:e.target.value})} onSearch={(value)=>this.getTable()}/>
                        <Tree
                           key={JSON.stringify(this.state.table_col_hint_data)}
                           showIcon
                           loadData={this.onLoadData}
                           onSelect={this.onSelect}
                           onExpand={this.onExpand}
                           onRightClick={this.rightClickTree}
                        >
                          {this.renderTreeNodes(this.state.source_slider_info)}
                        </Tree>
                    </Resizable>
                    <List
                       header={<span>连接信息</span>}
                       size="small"
                       bordered
                       dataSource={this.state.db_info}
                       renderItem={item => <p style={{marginLeft:10,marginBottom: 2}}>{item}</p>}
                       style={{borderRadius:0}}
                    />
                  </div>
                :null
                  }
              </Sider>
          </div>
          <Content style={{margin:0,padding:0}}>
            <Icon
                className="trigger"
                type={this.state.collapsed ? 'menu-unfold' : 'menu-fold'}
                onClick={this.onCollapseTable}
            />
            <Switch
              checkedChildren="Select"
              unCheckedChildren="Input"
              defaultChecked
              size="small"
              style={{marginLeft:5}}
              onClick={()=>this.setState({input_source_type:!this.state.input_source_type,instance_name:"",db_info:""})}
            />
            {
              this.state.input_source_type ?
              <Input size="small" style={{ width: 150,marginLeft:2}} value={this.state.instance_name} placeholder="ip_port" onChange={e => this.setState({instance_name:e.target.value})}/>
              :
              <span>
                  <Select
                  size="small"
                  showSearch
                  filterOption={(input,option)=>
                      option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                  }
                  style={{width:180,marginLeft:2}}
                  value={this.state.cluster_name}
                  onChange={e=>this.getClusterIns(e)}
              >
                  {this.state.cluster_name_list.map(record =>{
                      return <Option value={record.cluster_name} key={record.cluster_name}>{record.cluster_name}</Option>
                  })}
              </Select>
              <Select
                  size="small"
                  showSearch
                  filterOption={(input,option)=>
                      option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                  }
                  style={{width:200,marginLeft:2}}
                  value={this.state.instance_name}
                  onChange={e=>this.setState({instance_name:e},()=>this.getSchema())}
              >
                  {this.state.instance_list.map(record =>{
                      return <Option value={record.instance_name} key={record.instance_name}>{record.instance_name}({record.instance_role})</Option>
                  })}
              </Select>
              </span>
            }
            <Select
                size="small"
                showSearch
                filterOption={(input,option)=>
                    option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                }
                style={{width:200,marginLeft:2}}
                value={this.state.current_schema}
                onChange={e=>this.setState({current_schema:e},()=>this.getTable())}
//                onDropdownVisibleChange={open=>open ?this.getSchema(): null}
            >
                {this.state.schema_list.map(record =>{
                    return <Option value={record.Database} key={record.Database}>{record.Database}</Option>
                })}
            </Select>

            <hr style={{margin:0}}/>
            <Button type="primary" size="small" loading={this.state.global_loading} onClick={()=> this.getTableData('no')}>执行</Button>
            <Button type="dashed" size="small" style={{marginLeft:10}} onClick={()=> this.getTableData('yes')}>解释</Button>
            <Button type="dashed" size="small" style={{marginLeft:10}} onClick={()=> this.setState({sql_content:sqlFormatter.format(this.state.sql_content)})}>美化</Button>
            <Button type="dashed" size="small" style={{marginLeft:10}} onClick={()=> this.getSqlScore()}>SQL质量</Button>
            <Button type="link"  icon="star" onClick={()=> this.setState({favoriteVisible:true})}></Button>
            <Tooltip
                placement="bottomRight"
               title={
                   <div>
                     <p>
                        <Button type="link" onClick={()=> this.setState({favorite_type:"db_source"},()=>this.getFavorite())}>我的数据源</Button>
                     </p>
                     <p>
                        <Button type="link" onClick={()=> this.setState({favorite_type:"db_sql"},()=>this.getFavorite())}>我的SQL</Button>
                     </p>
                     <p>
                        <Button type="link" onClick={()=> this.setState({favorite_type:"db_sql"},()=>message.success('开发中'))}>公共快捷键</Button>
                     </p>
                   </div>
               }
           >
               <Icon type="folder-open" />
           </Tooltip>
            <CodeMirror
              editorDidMount={this.onEditorDidMount}
              value={this.state.sql_content}
              resize="vertical"
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
              // onChange={(cm) => this.setState({sql_content: cm.getValue()})} // sql变化事件
              // onFocus={(cm) => this.setState({sql_content: cm.getValue()})}
               // onCursorActivity={(cm) => this.onCursorActivity(cm)} // 用来完善选中监听
               onBlur={cm=>this.onBlur(cm)}
               onInputRead={(cm, change, editor) => this.onInputRead(cm, change, editor)}  // 自动补全
            />
            <Tabs defaultActiveKey='1' tabPosition="top" size="small" style={{ margin:1}}>
              {
                  this.state.multi_label.map((item,index)=>{
                  return(

                      <TabPane tab={item} key={index}>
                          共{this.state.multi_table_data[index].length}条,  查询耗时:{this.state.multi_query_time[index]} ms, 脱敏耗时:{this.state.multi_mask_time[index]} ms, 敏感数据探测耗时: {this.state.multi_sens_time[index]} ms
                          {
                              this.state.res_format === 'row'
                              ?
                              <div className="components-table-resizable-column">
                                   <MyResizeTable dataSource={this.state.multi_table_data[index]} columns={this.state.multi_table_column[index]} onChange={this.onChange}/>
                              </div>
                              : <TextArea rows={10} value={this.state.col_format_res_list[index]}/>

                          }
                          <Button
                              style={{marginLeft: '10px'}}
                              onClick={tableToExcel.bind(this, this.state.multi_table_data[index], this.state.multi_table_column[index], 'query_result')}
                          >
                              导出
                          </Button>
                          <Button type="primary" style={{marginLeft:10}} onClick={()=> this.setState({res_format:'row'})}>行显示</Button>
                          <Button type="primary" style={{marginLeft:10}} onClick={()=> this.setState({res_format:'col'})}>列显示</Button>
                      </TabPane>
                  )
                  })
              }
            </Tabs>
          </Content>
        </Layout>


        <Modal
          visible={this.state.favoriteVisible}
          onOk={()=>this.favoriteOk()}
          onCancel={()=>this.setState({favoriteVisible:false})}
          width={500}
          afterClose={()=>this.setState({favorite_type:"选择收藏类型",favorite_name:"",favorite_detail:""})}
        >
          <p>
            <Select
                style={{width:130}}
                value={this.state.favorite_type}
                onChange={e=>this.handleChangeStoreType(e)}
            >
                <Option value="db_source" key="db_source">数据源</Option>
                <Option value="db_sql" key="db_sql">SQL</Option>
            </Select>
            <Input style={{ width: 230}} placeholder="名称" onChange={e => this.setState({favorite_name:e.target.value})}/>
          </p>
          <p>
            <TextArea disabled={true} style={{ width: 360}} rows={6} placeholder="详情" value={this.state.favorite_detail}/>
          </p>
        </Modal>
        <Drawer
          title="我的收藏"
          placement="right"
          closable={false}
          onClose={()=>this.setState({DrawerVisible:false})}
          visible={this.state.DrawerVisible}
        >
          <Table
            dataSource={this.state.favorite_list}
            columns={favorite_column}
            bordered={false}
            size="small"
            pagination={false}
            className="rowStyle"
            scroll={{x:'max-content'}}
          />
        </Drawer>
        <Fragment>
          {
          this.state.contextMenuVisiable ?
           <div
             style={{ ...this.state.contextMenuStyle, position: 'fixed',width:120,height:200,background:'#f1f2f5',zIndex:9999,borderRadius:5,padding:1}}
           >
             <Button type="link" onClick={()=>this.fastTableInfo(this.state.rightClickData.key,"data")}>查看表数据</Button>
             <Icon style={{background:'#f1f2f5'}} type="close" onClick={()=>this.setState({contextMenuVisiable:false})} />
             <Button type="link" onClick={()=>this.fastTableInfo(this.state.rightClickData.key,"struct")}>查看表结构</Button>
             <Button type="link" onClick={()=>this.fastTableInfo(this.state.rightClickData.key,"status")}>查看表信息</Button>
             <Button type="link" onClick={()=>this.setState({editTableModal:true,contextMenuVisiable:false})}>新建表结构</Button>
             <Button type="link" onClick={()=>this.alterDesignTable(this.state.rightClickData.key)}>更改表结构</Button>
           </div>
           :null
          }
        </Fragment>
        <Modal
          visible={this.state.editTableModal}
          onCancel={()=>this.setState({editTableModal:false})}
          footer={false}
          width='90%'
        >
            <EditableTable/>
        </Modal>
        <Modal
          visible={this.state.editAlterTableModal}
          onCancel={()=>this.setState({editAlterTableModal:false})}
          footer={false}
          width='90%'
        >
            <EditableAlterTable des_ip_port={this.state.instance_name} des_schema_name={this.state.current_schema}  alter_table_info={this.state.alter_table_info}/>
        </Modal>
        <Modal
          visible={this.state.sqlScoreModal}
          onCancel={()=>this.setState({sqlScoreModal:false})}
          footer={false}
          width='90%'
        >
            <MdEditor value={this.state.sql_score} view={{ menu: false, md: false, html: true }} readOnly={true} shortcuts={true} toolbars={false} style={{ height: '500px' }} renderHTML={text => this.renderHTML()}/>
        </Modal>
      </div>
    );
  }
}