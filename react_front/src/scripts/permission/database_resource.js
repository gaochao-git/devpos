import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import { Table, Input,message,Button,Modal,Transfer,Tree } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
const { Search } = Input;
const { TreeNode } = Tree;


export default class DatabaseResource extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            user_info:[],
            schema_list:[],
            ResourceManageVisible:false,
            current_schema_name:"",
            expandedKeys: [],
            autoExpandParent: true,
            checkedKeys: [],
            treeData:[],
            search_schema_name:""
        }
    }

    componentDidMount() {
        this.getSchemaList();
        this.getAllUserinfo();
    }


    // 把后台返回数据变成树形结构
    handleTreeData = (treeData) => {
      let l1_data = []    // l1_data = [{'title': '基础设施', 'key': '基础设施', 'children': []}, {'title': '一部', 'key': '一部', 'children': []}]
      let l2_data = []    // l2_data = [{'title': '技术组件', 'key': '基础设施-技术组件', 'children': []}, {'title': '交易', 'key': '一部-交易', 'children': []}, {'title': '运管团队', 'key': '基础设施-运管团队', 'children': []}]
      let l3_data = []    // l3_data = [{'title': 'gaochao', 'key': '基础设施-技术组件-gaochao'}, {'title': 'zhangfei', 'key': '基础设施-技术组件-zhangfei'}, {'title': 'lisi', 'key': '一部-交易-lisi'}, {'title': 'caocao', 'key': '基础设施-运管团队-caocao'}]
      treeData.map(item => {
        // 生成3级数据
        let l1_dict = {}
        l1_dict['title'] = item['department_name']
        l1_dict['key'] = item['department_name']
        l1_dict['children'] = []

        if(JSON.stringify(l1_data).indexOf(JSON.stringify(l1_dict)) === -1){
            l1_data.push(l1_dict)
        }
        let l2_dict = {}
        l2_dict['title'] = item['group_name']
        l2_dict['key'] = item['department_name'] + '-' + item['group_name']
        l2_dict['children'] = []
        if(JSON.stringify(l2_data).indexOf(JSON.stringify(l2_dict)) === -1) {
            l2_data.push(l2_dict)
        }
        let l3_dict = {}
        l3_dict['title'] = item['username']
        l3_dict['key'] = item['department_name'] + '-' + item['group_name'] + '-' + item['username']
        if(JSON.stringify(l3_data).indexOf(JSON.stringify(l3_dict)) === -1) {
            l3_data.push(l3_dict)
        }
      })
      // 将用户挂到小组中
      l3_data.map(user => {
        l2_data.map(group => {
          var department_group = user['key'].split('-').splice(0, 2).join('-')
          if (department_group == group['key']){
            group['children'].push(user)
          }
        })
      })
      // 将小组挂到部门，生成最终数据
      l2_data.map(group1 => {
        l1_data.map(department => {
          var department_group = group1['key'].split('-').splice(0, 1).join('-')
          if (department_group == department['key']){
            department['children'].push(group1)
          }
        })
      })
      console.log('l1_data',l1_data)
      return l1_data;
    }

    //获取所有机器信息
    async getAllUserinfo() {
        await MyAxios.post('/permission/v1/get_all_user/',{}).then(
            res => {
                if(res.data.status==="ok"){
                    var treeData = this.handleTreeData(res.data.data)
                    this.setState({treeData: treeData})
                }

            else {
                message.error(res.data.message)
            }
            }

        ).catch(err => {message.error(err.message)})
    }
    //获取所有数据库列表
    async getSchemaList() {
        console.log(this.state.search_schema_name)
        let params = this.state.search_schema_name.length > 0 ? {"schema_name": this.state.search_schema_name}: {}
        await MyAxios.post('/db_resource/v1/get_schema_list/',params).then(
            res => {res.data.status==="ok" ?
                this.setState({
                    schema_list: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }

    //更改数据库权限
    async changeSchemaPermission() {
        var permission_users = [];
        this.state.checkedKeys.map(user => {
            var user_name = user.split('-')[2]
            permission_users.push(user_name)
        })
        let params = {
            "cluster_name": this.state.current_cluster_name,
            "schema_name": this.state.current_schema_name,
            "permission_user": permission_users
        }
        await MyAxios.post('/permission/v1/change_schema_permission/',params).then(
            res => {
                if (res.data.status==="ok"){
                    message.success(res.data.message);
                    this.setState({ResourceManageVisible:false})
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    //获取某个库已经分配的权限
    async getSchemaPermisson(record) {
        let params = {
            "cluster_name":record.cluster_name,
            "schema_name": record.schema_name
        }
        await MyAxios.post('/permission/v1/get_schema_permisson/',params).then(
            res => {
                if (res.data.status==="ok") {
                    var schema_permisson_user = []
                    res.data.data.map(schema_permisson => {
                        schema_permisson_user.push(schema_permisson.user)
                    })
                    this.setState({
                        checkedKeys: schema_permisson_user,
                        ResourceManageVisible:true,
                        current_cluster_name:record.cluster_name,
                        current_schema_name:record.schema_name,
                    })
                }else {
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    //模糊搜索
    async GetSearchServerInfo(server_name) {
        let params = {
            search_server_name:server_name,
            mem:"2G"
        };
        await MyAxios.get('/server_resource/v1/get_user_info/',{params}).then(
            res => {res.data.status==="ok" ?
                this.setState({
                    user_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }

  onExpand = expandedKeys => {
    this.setState({expandedKeys,autoExpandParent: false});
  };

  onCheck =(checkedKeys,e) => {
    let name_arr = []
    if (checkedKeys.length >0){
        for (var i=0; i<checkedKeys.length;i++){
            //只获取第三级用户数据
            if (checkedKeys[i].split('-').length > 2){
                name_arr.push(checkedKeys[i])
            };
        }
    };
    this.setState({ checkedKeys:name_arr });
  };

      renderTreeNodes = data =>
        data.map(item => {
          if (item.children) {
            return (
              <TreeNode title={item.title} key={item.key} dataRef={item}>
                {this.renderTreeNodes(item.children)}
              </TreeNode>
            );
          }
          return <TreeNode key={item.key} {...item} />;
        });

    render() {
        const { targetKeys, selectedKeys, disabled } = this.state;
        const columns = [
            {
            title: '集群名',
            dataIndex: 'cluster_name',
          },
          {
            title: '库名',
            dataIndex: 'schema_name',
          },
          {
            title: '操作',
            render:(text,record) => {
                return (
                   <Button type="primary" onClick={()=>this.getSchemaPermisson(record)}>权限管理</Button>
                )
              }
          },

        ];
        return (
            <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">
                            Home
                        </Link>
                        >>
                        <Link className="title-text" to="/databaseResource">
                            数据库权限管理
                        </Link>
                    </div>
                    <div>
                        <Search
                          placeholder="库名"
                          onSearch={(value)=>this.setState({search_schema_name:value},()=>this.getSchemaList())}
                          style={{ width: 200 }}
                          allowClear
                        />
                    </div>
                </div>
                <Table
                    rowKey={(row ,index) => index}
                    dataSource={this.state.schema_list}
                    columns={columns}
                    pagination={{
                        showTotal: ((total) => {return `共 ${total} 条`}),
                    }}
                    bordered
                    size="small"
                />
              <Modal
                  visible={this.state.ResourceManageVisible}
                  onCancel={() => this.setState({ResourceManageVisible:false})}
                  title={this.state.current_cluster_name + '.' +  this.state.current_schema_name}
                  onOk={()=>this.changeSchemaPermission()}
                  width={500}
              >
                  <Tree
                    checkable
                    onExpand={this.onExpand}
                    expandedKeys={this.state.expandedKeys}
                    autoExpandParent={this.state.autoExpandParent}
                    onCheck={this.onCheck}
                    checkedKeys={this.state.checkedKeys}
                  >
                    {this.renderTreeNodes(this.state.treeData)}
                  </Tree>
              </Modal>
            </div>
        )
    }
}