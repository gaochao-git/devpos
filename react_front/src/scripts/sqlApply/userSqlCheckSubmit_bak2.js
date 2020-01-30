import React,{Component} from 'react';
import axios from 'axios'
import { Layout, Button,Table, Menu, Icon, Input, Col, Modal, Tabs, Form, Row } from "antd";
import { Link } from 'react-router-dom';
import "antd/dist/antd.css";
import "../../styles/index.scss"
import { backendServerApiRoot } from "../common/util"
axios.defaults.withCredentials = true;
axios.defaults.headers.post['Content-Type'] = 'application/json';
const { TextArea } = Input
const { TabPane } = Tabs;
const Column = Table.Column;
function callback(key) {
  console.log(key);
}


export default class UserSqlCheckSubmit extends Component  {
    constructor(props) {
        super(props);
        this.state = {
            des_ip:"",
            des_port:"",
            check_sql:"",
            check_sql_info:[],
            showDataVisible: false,
            submit_sql_info:[],
            expand: false,
        }
    }

    componentDidMount() {
        this.GetSubmitSqlInfo()
    }
    async GetSubmitSqlInfo() {
        let res = await axios.get(`${backendServerApiRoot}/get_submit_sql_info/`);
        console.log(res.data);
        this.setState({
            submit_sql_info: res.data.data
        })
    }
    handleHostIpChange = (value) => {
        console.log(value)
        this.setState({
            des_ip: value
        })
    }
    handleHostPortChange = (value) => {
        console.log(value)
        this.setState({
            des_port: value
        })
    }
    handleSqlChange = (value) => {
        console.log(value)
        this.setState({
            check_sql: value
        })
    }
    async handleSqlCheck() {
        let params = {
            db_ip: this.state.des_ip,
            db_port: this.state.des_port,
            check_sql_info: this.state.check_sql
        };
        console.log(params);
        let res = await axios.post(`${backendServerApiRoot}/check_sql/`,{params});
        console.log(res.data);
        this.setState({
            check_sql_results: res.data
        })
    }
    async handleSqlSubmit() {
        let params = {
            db_ip: this.state.des_ip,
            db_port: this.state.des_port,
            check_sql_info: this.state.check_sql,
        };
        console.log(params)
        let res = await axios.post(`${backendServerApiRoot}/submit_sql/`,{params});
        alert(res.data.message)
        this.setState({
        showDataVisible: false,
        });

    }
    //预览数据 modal弹出按钮
    showDataModalHandle = (e) => {
        this.handleSqlCheck();
        this.setState({
        showDataVisible: true,
        });
    }
    //预览数据 modal返回按钮
    showDataHandleCancel = (e) => {
        this.setState({
            showDataVisible: false,
        });
    }
    getFields() {
      const count = this.state.expand ? 10 : 6;
      const { getFieldDecorator } = this.props.form;
      const children = [];
      for (let i = 0; i < 10; i++) {
        children.push(
          <Col span={8} key={i} style={{ display: i < count ? 'block' : 'none' }}>
            <Form.Item label={`Field ${i}`}>
              {getFieldDecorator(`field-${i}`, {
                rules: [
                  {
                    required: true,
                    message: 'Input something!',
                  },
                ],
              })(<Input placeholder="placeholder" />)}
            </Form.Item>
          </Col>,
        );
      }
      return children;
    }
    handleSearch = e => {
        console.log(111)
      // e.preventDefault();
      // this.props.form.validateFields((err, values) => {
      //   console.log('Received values of form: ', values);
      // });
    };

    handleReset = () => {
      this.props.form.resetFields();
    };

    toggle = () => {
      const { expand } = this.state;
      this.setState({ expand: !expand });
    };
    render() {
        let {check_sql_results} = this.state;
        const temp = {}; // 当前重复的值,支持多列
        const mergeCells = (text, array, columns) => {
          let i = 0;
          if (text !== temp[columns]) {
            temp[columns] = text;
            array.forEach((item) => {
              if (item.cluster_name === temp[columns]) {
                i += 1;
              }
            });
          }
          return i;
        };
        const columns = [
          {
            title: 'sql',
            dataIndex: 'sql',
          },
          {
            title: 'results',
            dataIndex: 'results',
          },
          {
            title: '影响行数',
            dataIndex: 'rows',
          }
        ];
        return (
            <div className="server-list">
                <div className="sub-title">
                    <div>
                        <Link className="title-text" to="/">
                            Home
                        </Link>
                        >>
                        <Link className="title-text" to="/checkSummitSql">
                            SQL审核
                        </Link>
                    </div>
                </div>
                <Tabs onChange={callback} type="card">
                    <TabPane tab="SQL请求列表" key="1">
                        <Table dataSource={this.state.submit_sql_info}>
                            <Column title="申请人"
                                dataIndex="submit_sql_user"/>
                            <Column title="标题"
                                dataIndex="title"/>
                            <Column title="Leader审核"
                                dataIndex="leader_check"/>
                            <Column title="Leader姓名"
                                dataIndex="leader_user_name"/>
                            <Column title="QA审核"
                                dataIndex="qa_check"/>
                            <Column title="QA姓名"
                                dataIndex="qa_user_name"/>
                            <Column title="DBA审核"
                                dataIndex="dba_check"/>
                            <Column title="DBA审核人员"
                                dataIndex="dba_check"/>
                            <Column title="DBA执行人员"
                                dataIndex="dba_execute_user_name"/>
                            <Column title="工单创建时间"
                                dataIndex="ctime"/>
                            <Column title="工单修改时间"
                                dataIndex="utime"/>
                            <Column title="操作"
                                render={record => {
                                    return <Link to={`/viewApplySqlByUuid`}>查看</Link>
                                }}/>
                        </Table>
                    </TabPane>
                    <TabPane tab="新建工单" key="2">
                        <div className="sub-title-input">
                            <Input size="large" placeholder="数据库主库地址ip" onChange={e => this.handleHostIpChange(e.target.value)}/>
                            <Input size="large" placeholder="数据库端口" style={{marginLeft:10}} onChange={e => this.handleHostPortChange(e.target.value)}/>
                        </div>
                        <div className="sub-title-input">
                            <Input size="large" placeholder="主题" onChange={e => this.handleHostIpChange(e.target.value)}/>
                            <Input size="large" placeholder="说明" style={{marginLeft:10}} onChange={e => this.handleHostPortChange(e.target.value)}/>
                            <Input size="large" placeholder="QA名字" style={{marginLeft:10}} onChange={e => this.handleHostPortChange(e.target.value)}/>
                            <Input size="large" placeholder="Leader名字" style={{marginLeft:10}} onChange={e => this.handleHostPortChange(e.target.value)}/>
                        </div>
                        <Form className="ant-advanced-search-form" onSubmit={console.log(1111)}>
                          <Row gutter={24}>{this.getFields.bind(this)}</Row>
                          <Row>
                            <Col span={24} style={{ textAlign: 'right' }}>
                              <Button type="primary" htmlType="submit">
                                Search
                              </Button>
                              <Button style={{ marginLeft: 8 }} onClick={this.handleReset}>
                                Clear
                              </Button>
                              <a style={{ marginLeft: 8, fontSize: 12 }} onClick={this.toggle}>
                                Collapse <Icon type={this.state.expand ? 'up' : 'down'} />
                              </a>
                            </Col>
                          </Row>
                        </Form>
                        <div>
                            <TextArea rows={10} placeholder="sql"  onChange={e => this.handleSqlChange(e.target.value)}/>
                            <Button type="primary" onClick={()=>{this.showDataModalHandle()}}>检测</Button>
                        </div>
                        <br/>
                        <Modal
                            title="表单提交"
                            visible={this.state.showDataVisible}
                            onCancel={this.showDataHandleCancel}
                            onOk={this.handleSqlSubmit.bind(this)}
                            okText="submit"
                            okButtonProps={{ disabled: false }}
                            width='960px'
                        >
                        <span>检查结果</span>
                        </Modal>
                    </TabPane>
                </Tabs>
            </div>
        )
    }
}