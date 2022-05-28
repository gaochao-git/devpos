import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, data, Card, AutoComplete, Tooltip,message,Col,Descriptions,Collapse,Tag,Checkbox} from "antd";
import { Link } from 'react-router-dom';
import ReactDiffViewer from 'react-diff-viewer';
import "antd/dist/antd.css";
import "../../styles/index.scss"
const { Search } = Input;
const { TabPane } = Tabs;
const FormItem = Form.Item;
const { Option } = Select;
const { TextArea } = Input
const { Panel } = Collapse;


export default class MetaCompare extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            submit_info:[],
            showSubmitVisible:false,
            source_format:"ip_port:db.tb",
            target_format:"ip_port:db.tb_prefix\nip_port:db1.tb_prefix\nip_port:db2.tb_prefix",
            source_info:"47.104.2.74_3306:test.emp",
            target_info:"47.104.2.74_3306:test.emp\n47.104.2.74_3306:test1.emp\n",
            TableDetailModal:false,
            source_table_meta:"",
            target_table_meta:"",
            source_table:"",
            target_table:"",
            compare_ret_list_filter:[{text: 'ok', value: 'ok'},{text: 'error', value: 'error'}],
            ignore_table_auto_id:"yes",
            ignore_table_name:"yes",
            ignore_table_charset:"no",
            ignore_table_comment:"no",
        }
    }

    componentDidMount() {
//        this.getCompareHistoryInfo()
    }
    //获取工单信息
    async getCompareHistoryInfo() {
        await MyAxios.get('/v1/get_deploy_mysql_submit_info/').then(
            res => {res.data.status==="ok" ?
                this.setState({
                    submit_info: res.data.data
                })
            :
                message.error(res.data.message)}
        ).catch(err => {message.error(err.message)})
    }
    //提交工单
    async submitCompare() {
        let params = {
            source_info: this.state.source_info,
            target_info: this.state.target_info,
            ignore_table_name:this.state.ignore_table_name,
            ignore_table_auto_id:this.state.ignore_table_auto_id,
            ignore_table_charset:this.state.ignore_table_charset,
            ignore_table_comment:this.state.ignore_table_comment,
        };
        await MyAxios.post('/web_console/v1/meta_table_compare/',params).then(
            res => {
                if(res.data.status==="ok") {
                    this.setState({showSubmitVisible:false,submit_info:res.data.data});
                    message.success("提交任务成功");
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    //提交工单
    async getSourceTargetTableDetail(record) {
        let params = {
            source_info: record.source,
            target_info: record.target,
        };
        await MyAxios.post('/web_console/v1/get_source_target_table_meta/',params).then(
            res => {
                if(res.data.status==="ok") {
                    this.setState({
                        TableDetailModal:true,
                        source_table_meta:res.data.data['source_table_meta'],
                        target_table_meta:res.data.data['target_table_meta'],
                        source_table:record.source,
                        target_table:record.target
                    });
                    message.success("提交任务成功");
                }else{
                    message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }



    render() {

    const newStyles = {
      variables: {
        dark: {
          highlightBackground: '#fefed5',
          highlightGutterBackground: '#ffcd3c',
        },
      },
      line: {
        padding: '10px 2px',
        '&:hover': {
          background: '#a26ea1',
        },
      },
      contentText: {
        width: '1000px',
      },
      diffContainer:{
        width: '100%',
        display: "block",
        overflow:"scroll",
      }
    }
        const columns = [
          {
            title: '源',
            dataIndex: 'source',
          },
            {
                title: '目标',
                dataIndex: 'target',
            },
          {
            title: '对比结果',
            dataIndex: 'compare_ret',
            filters: this.state.compare_ret_list_filter,
            filterMultiple: false,
            onFilter: (value, record) =>  record.compare_ret === (value),
            render: (text,record,index) => {
                let color = "red"
                if (text === 'ok') {
                  color = 'green';
                }
                return (<Tag color={color}>{text}</Tag>);
            },
          },
          {
            title: '对比时间',
            dataIndex: 'create_time',
          },
          {
            title: '详情',
            render: (text,record) => {
              return ( <Button onClick={()=>this.getSourceTargetTableDetail(record)}>实时查看</Button>)
            }
          }

        ];
        return (
            <div>
                <Tabs>
                    <TabPane tab="表结构对比" key="1">
                        <div className="sub-title-input">
                            <Checkbox checked={this.state.ignore_table_name==="yes"?true:false} onChange={(e)=>this.setState({ignore_table_name:e.target.checked?"yes":"no"})}>忽略表名</Checkbox>
                            <Checkbox checked={this.state.ignore_table_auto_id==="yes"?true:false} onChange={(e)=>this.setState({ignore_table_auto_id:e.target.checked?"yes":"no"})}>忽略表AUTO_INCREMENT</Checkbox>
                            <Checkbox checked={this.state.ignore_table_charset==="yes"?true:false} onChange={(e)=>this.setState({ignore_table_charset:e.target.checked?"yes":"no"})}>忽略表CHARSET</Checkbox>
                            <Checkbox checked={this.state.ignore_table_comment==="yes"?true:false} onChange={(e)=>this.setState({ignore_table_comment:e.target.checked?"yes":"no"})}>忽略表COMMENT</Checkbox>
                        </div>
                        <div>
                            <Row>
                                <Col span={11}>
                                    <TextArea rows={10} placeholder={this.state.source_format} onChange={e => this.setState({source_info:e.target.value})}/>
                                </Col>
                                <Col span={13}>
                                    <TextArea rows={10} placeholder={this.state.target_format} onChange={e => this.setState({target_info:e.target.value})}/>
                                </Col>
                            </Row>
                            <Button type="primary" loading={this.state.sql_check_loading} onClick={()=>{this.setState({showSubmitVisible:true})}}>开始对比</Button>
                        </div>
                        <Table
                            dataSource={this.state.submit_info}
                            rowKey={(row ,index) => index}
                            columns={columns}
                            size="small"
                            pagination={{
                                showTotal: ((total) => {return `共 ${total} 条`}),
                            }}
                            bordered
                            size="small"
                        />
                    </TabPane>
                    <TabPane tab="历史结果" key="2">
                        <Table
                            dataSource={this.state.submit_info}
                            rowKey={(row ,index) => index}
                            columns={columns}
                            pagination={{
                                showTotal: ((total) => {return `共 ${total} 条`}),
                            }}
                            bordered
                            size="small"
                        />
                    </TabPane>
                </Tabs>
                    <Modal visible={this.state.showSubmitVisible}
                        onCancel={() => this.setState({showSubmitVisible:false})}
                        title="确认对比?"
                        footer={false}
                        width={300}
                    >
                        <Row type="flex" justify='center' style={{ marginTop: '10px' }}>
                            <Button onClick={()=>this.submitCompare()} type="primary" style={{ marginRight: '10px' }}>执行</Button>
                            <Button onClick={() => this.setState({showSubmitVisible:false})} type="primary">返回</Button>
                        </Row>
                    </Modal>
                    <Modal visible={this.state.TableDetailModal}
                        onCancel={() => this.setState({TableDetailModal:false})}
                        title="表结构详情"
                        footer={false}
                        width="100%"
                    >
                        <ReactDiffViewer leftTitle={this.state.source_table} rightTitle={this.state.target_table} styles={newStyles} oldValue={this.state.source_table_meta} newValue={this.state.target_table_meta} splitView={true} />
                    </Modal>
            </div>
        )
    }
}