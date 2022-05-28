import React,{Component} from 'react';
import axios from 'axios'
import MyAxios from "../common/interface"
import {Button, Table, Input, Modal, Tabs, Form, Row, Select, data, Card, AutoComplete, Tooltip,message,Col,Descriptions,Collapse} from "antd";
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
      width: '600px',
      display: "block",
      overflow:"scroll"
    },
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
              title: '源表md5',
              dataIndex: 'source_tb_md5',
          },
            {
                title: '目标表md5',
                dataIndex: 'target_tb_md5',
            },
          {
            title: '对比结果',
            dataIndex: 'compare_ret',
          },
          {
            title: '对比时间',
            dataIndex: 'create_time',
          },
          {
            title: '详情',
            render: (text,record) => {
              return ( <Button onClick={()=>this.getSourceTargetTableDetail(record)}>查看</Button>)
            }
          }

        ];
        return (
            <div>
                <Tabs>
                    <TabPane tab="表结构对比" key="1">
                        <div className="sub-title-input">
                            <Select defaultValue="选择对比类型" style={{ width: 300 }} onChange={e => this.setState({idc:e})}>
                                <Option value="BJ10">BJ10</Option>
                                <Option value="BJ11">BJ11</Option>
                            </Select>
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
                                total:this.state.submit_info.length,
                                showTotal:(count=this.state.submit_info.length)=>{return '共'+count+'条'}
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
                                total:this.state.submit_info.length,
                                showTotal:(count=this.state.submit_info.length)=>{return '共'+count+'条'}
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
                        width={1400}
                    >
                        <Row>
                            <Col span={12}>
                                源表结构
                                <TextArea rows={10} style={{overflow:"scroll"}} value={this.state.source_table_meta}/>
                            </Col>
                            <Col span={12}>
                                目标表结构
                                <TextArea rows={10} style={{overflow:"scroll"}} value={this.state.target_table_meta}/>
                            </Col>
                        </Row>
                        <ReactDiffViewer styles={newStyles} oldValue={this.state.source_table_meta} newValue={this.state.target_table_meta} splitView={true} />
                    </Modal>
            </div>
        )
    }
}