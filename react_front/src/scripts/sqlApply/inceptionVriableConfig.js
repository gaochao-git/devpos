import React from 'react';
import { Table, Input, Popconfirm, Button, message } from 'antd';
import axios from "axios";
import {backendServerApiRoot} from "../common/util";


const EditableCell = ({ editable, value, onChange }) => (
    <div>
        {editable
          ? <Input style={{ margin: '-5px 0' }} value={value} onChange={e => onChange(e.target.value)} />
          : value
        }
    </div>
);

export default class EditableTable extends React.Component {
    constructor(props) {
        super(props);
        let { namespace } = this.props
        this.state = { namespace: namespace, data :[], editingKey:'', newClusterCfg:{} ,newConfig:{}};
        this.cacheData = this.state.data.map(item => ({ ...item }));
    };

    componentDidMount() {
        this.GetInceptionVariableConfig();
        console.log("sdfsdfsdfsdf");
    }
    async GetInceptionVariableConfig() {
        let res = await axios.get(`${backendServerApiRoot}/get_inception_variable_config_info/`);
        console.log(res.data);
        this.setState({
            data: res.data.data,
        });
        this.cacheData = this.state.data.map(item => ({ ...item }))
    }
    async handleUpdateInceptionVariable() {
        let params = {
            new_config_json: this.state.newConfig,
        };
        axios.post(`${backendServerApiRoot}/update_inception_variable/`,{params}).then(
           res => {res.data.status==="ok" ? window.location.reload() : message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }

  columns = [{
    title: '参数名称',
    dataIndex: 'name',
    width: '25%',
    render: (text, record) => this.renderColumns(text, record, 'name')
  }, {
    title: '参数含义',
    dataIndex: 'variable_description',
    width: '45%',
    render: (text, record) => this.renderColumns(text, record, 'variable_description')
  }, {
    title: '值',
    dataIndex: 'value',
    width: '10%',
    render: (text, record) => this.renderColumns(text, record, 'value')
  }, {
    title: '操作',
    dataIndex: 'operation',
    render: (text, record) => {
      return (
        <div className="editable-row-operations">
          {
            this.state.editingKey === record.name ?
              <span>
                <Button onClick={() => this.cancel(record.name)} type='primary' size='small'>取消</Button>
                <Popconfirm title="确认保存 ?" onConfirm={() => this.save(record.name)} okText="确认" cancelText="取消">
                  <Button type='primary' size='small' style={{marginLeft: '10px'}}>保存</Button>
                </Popconfirm>
              </span>
              : <Button onClick={() => this.edit(record.name)} disabled={!record.editable} type='primary' size='small'>修改</Button>
          }
        </div>
      );
    }
  }];

  renderColumns(text, record, column) {
    return (
      <EditableCell
        editable={column === 'value' && record.editable && this.state.editingKey === record.name}
        value={text}
        onChange={value => this.handleChange(value, record.name, column)}
      />
    );
  }
  handleChange(value, key, column) {
    const newData = [...this.state.data];
    const target = newData.filter(item => key === item.name)[0];
    if (target) {
      target[column] = value;
      let newCfg = {}
      newCfg[key] = value
      this.setState({ data: newData, newClusterCfg: newCfg } , () => console.log(this.state.newClusterCfg))

  }}
  edit(key) {
      console.log(key);
      console.log(this.state.editingKey);
    if(this.state.editingKey !== ''){
        this.cancel(this.state.editingKey)
        this.setState({editingKey: key})
    }else{
        this.setState({editingKey: key})
    }

  }
  // 修改集群的配置
  save(key) {
    const newData = [...this.state.data];
    const target = newData.filter(item => key === item.name)[0];       //原始行记录target.value,target.name
    const cacheData =  [...this.cacheData];
    const cacheTarget = cacheData.filter(item => key === item.name)[0];   //新行记录cacheTarget.value,cacheTarget.name
    console.log(target)
    console.log(cacheTarget)
      let newConfigJson = this.state.newConfig
    if (target) {
      if(this.state.newClusterCfg[this.state.editingKey] && cacheTarget.value !== target.value){
          newConfigJson[key]=target.value
          this.setState({newConfig:newConfigJson})
          console.log("当前incption配置",this.state.newConfig)
      }else{
          console.log("不知道",)
      }
      this.setState({ data: newData, editingKey: '' }, () => this.cacheData = this.state.data.map(item => ({ ...item })));
    }
  }
  cancel(key) {
    const newData = [...this.state.data];
    const target = newData.filter(item => key === item.name)[0];
    if (target) {
      Object.assign(target, this.cacheData.filter(item => key === item.name)[0]);
      this.setState({ data: newData, editingKey:'' });
    }
  }
  render() {
      return(
                <div>
          <Table dataSource={this.state.data} pagination={false} columns={this.columns} rowKey={(row) => row.name} size={"small"}/>
          <Button type={"primary"} onClick={this.handleUpdateInceptionVariable.bind(this)}>提交更改</Button>
      </div>
          )

  }
}