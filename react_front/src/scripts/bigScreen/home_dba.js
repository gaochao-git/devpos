import React,{Component} from 'react';
import {G2,Chart,Geom,Axis,Tooltip,Coord,Label,Legend,View,Guide,Shape,Facet,Util} from 'bizcharts';
import Slider from 'bizcharts-plugin-slider';
import { Table, Button,Row,Card, Col,Statistic,Icon,Modal,Input ,Popover,Form,span,Tabs,Select} from 'antd';
import { Alert, message } from 'antd';
import { Link } from 'react-router-dom';
import {Redirect}  from 'react-router-dom';
import {Highlighter} from 'react-highlight-words';
import {Arealarge} from '../common/slider_line'
import {DataSet} from '@antv/data-set';
import pageBg from '../../images/pageBg.png'
import tbBg from '../../images/tb_bg.png'
import headBg from '../../images/head_bg.png'
import popUpBg from '../../images/popUP_bg.png'
import biankuang_gif from '../../images/biankuang.gif'
import backup_gif from '../../images/backup.gif'
import server_gif from '../../images/server.gif'
import archive_gif from '../../images/archive.gif'
import error from '../../images/error.gif'
import workFlow from '../../images/workflow.gif'   // 来源 https://588ku.com/gif/keji-6-0-default-0-3/
import earth_rotate from '../../images/earth-rotate.gif'
import bg_city from '../../images/bgCenter.gif'
import bg_robot from '../../images/robot.gif'
import ZabbixScreenTable from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/zabbixTable.js"
import CheckScreenTable from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/checkTable.js"
import ClusterScreenTable from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/clusterTable.js"
import ServerScreenChart from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/serverChart.js"
import SlowQueryChart from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/slowQueryChart.js"
import ServerSourceChart from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/serverSourceChart.js"
import ClusterTypeChart from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/clusterTypeChart.js"


const { Column } = Table;
const { Meta } = Card;
const { Text } = Guide;
const { TabPane } = Tabs;
const {Option} = Select

class HomeDbaInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {
    // HostTypeCountData:[],
    };
  }

  componentDidMount() {
//    this.setCurrentTimeInterVal()
  }

  render() {
    return (
        <div style={{backgroundImage:`url(${pageBg})`}}>
        <Row gutter={16}>
            <Col span={8} style={{ backgroundImage:`url(${headBg})`,height:'100px'}}>
                <p style={{color:'white',fontSize:50,marginTop:20}}></p>
            </Col>
            <Col span={8} style={{ backgroundImage:`url(${headBg})`,height:'100px'}}>
                <p style={{color:'white',textAlign: 'center',fontSize:30,marginTop:20}}>数据库运维管理平台</p>
            </Col>
            <Col span={8} style={{ backgroundImage:`url(${headBg})`,height:'100px'}}>
                <p style={{color:'white',marginLeft:50,fontSize:30,marginTop:20}}>{this.state.current_time}  {this.state.week_day}</p>
            </Col>
        </Row>
          <Row style={{height:'200px',background:''}} gutter={16}>
          <Col span={4}>
              <Card className='ant-tab-radius' bordered={true} style={{ backgroundImage:`url(${pageBg})`,height:'200px'}}>
                <p style={{color:'white'}}>zabbix<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                <Row>
                  <Col span={12}>
                    <img style={{width:100}} className='robot-gif' alt="example111" src={error} />
                  </Col>
                  <Col span={12}>
                    <p style={{color:'#5BBFBB',fontSize:15}}>信息:15</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>警告:1</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>错误:0</p>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col span={4}>
              <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,height:'200px'}}>
                <p style={{color:'white'}}>巡检任务<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                <Row>
                  <Col span={12}>
                    <img style={{width:55}} className='robot-gif' alt="example111" src={bg_robot} />
                  </Col>
                  <Col span={12}>
                    <p style={{color:'#5BBFBB',fontSize:15}}>信息:15</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>警告:1</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>错误:0</p>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col span={4}>
              <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,height:'200px'}}>
                <p style={{color:'white'}}>报警工单<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                <Row>
                  <Col span={12}>
                    <img style={{width:100}} className='robot-gif' alt="example111" src={workFlow} />
                  </Col>
                  <Col span={12}>
                    <p style={{color:'#5BBFBB',fontSize:15}}>总数:8</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>已处理:5</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>未认领:3</p>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col span={4}>
              <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,height:'200px'}}>
                <p style={{color:'white'}}>备份任务<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                <Row>
                  <Col span={12}>
                    <img style={{width:100}} className='robot-gif' alt="example111" src={backup_gif} />
                  </Col>
                  <Col span={12}>
                    <p style={{color:'#5BBFBB',fontSize:15}}>任务数:300</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>运行中:0</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>成功:298</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>失败:2</p>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col span={4}>
              <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,height:'200px'}}>
                <p style={{color:'white'}}>归档任务<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                <Row>
                  <Col span={12}>
                    <img style={{width:100}} className='robot-gif' alt="example111" src={archive_gif} />
                  </Col>
                  <Col span={12}>
                    <p style={{color:'#5BBFBB',fontSize:15}}>任务数:60</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>运行中:0</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>成功:59</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>失败:1</p>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col span={4}>
              <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,height:'200px'}}>
                <p style={{color:'white'}}>服务器<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                <Row>
                  <Col span={12}>
                    <img style={{width:100}} className='robot-gif' alt="example111" src={server_gif} />
                  </Col>
                  <Col span={12}>
                    <p style={{color:'#5BBFBB',fontSize:15}}>总数:2000</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>运行:1999</p>
                    <p style={{color:'#5BBFBB',fontSize:15,marginTop:10}}>故障:1</p>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
          <Row style={{marginTop:'10px'}}>
            <Col span={8}>
              <Card className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:635}}>
                <p>
                    <Tabs defaultActiveKey="1" tabBarStyle={{color:"#367AD2"}}>
                        <TabPane tab="6idc_zabbix" key="1" style={{marginTop:-20}}>
                            <ZabbixScreenTable/>
                        />
                        </TabPane>
                        <TabPane tab="日常巡检" key="2" style={{marginTop:-20}}>
                            <CheckScreenTable/>
                        </TabPane>
                        <TabPane tab="集群状态" key="3" style={{marginTop:-20}}>
                            <ClusterScreenTable/>
                        </TabPane>
                    </Tabs>
                    <view class="left_top_corner"></view>
                    <view class="right_top_corner"></view>
                    <view class="left_bottom_corner"></view>
                    <view class="right_bottom_corner"></view>
                </p>
              </Card>
            </Col>
            <Col span={8}>
                <img style={{width:'100%'}} alt="example" src={bg_city} />
                <SlowQueryChart/>
            </Col>
            <Col span={8}>
              <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:635}}>
                <p style={{color:'white',textAlign:'right'}}>
                    主机资源
                    <ServerSourceChart/>
                    数据库集群类型分布：{this.state.RotateDBATodayData}
                    <ClusterTypeChart/>
                    <view class="left_top_corner"></view>
                    <view class="right_top_corner"></view>
                    <view class="left_bottom_corner"></view>
                    <view class="right_bottom_corner"></view>
                </p>
              </Card>
            </Col>
          </Row>
          <Row style={{marginTop:'10px'}} gutter={24}>
            <Col  span={24}>
              <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,}}>
                <p style={{color:'white'}}>
                  集群TPS
                  <Select
                    defaultValue="bj10_trans_01"
                    style={{ width: 200,marginLeft:10}}
                    onChange={e => this.handleDbSourceTypeChange(e)}
                    showSearch
                    filterOption={(input,option)=>
                        option.props.children.toLowerCase().indexOf(input.toLowerCase())>=0
                    }
                  >
                      <Option value="bj10_trans_01">bj10_trans_01</Option>
                      <Option value="bj10_trans_02">bj10_trans_02</Option>
                      <Option value="bj10_trans_03">bj10_trans_03</Option>
                  </Select>
                </p>
                <ServerScreenChart/>
                <view class="left_top_corner"></view>
                <view class="right_top_corner"></view>
                <view class="left_bottom_corner"></view>
                <view class="right_bottom_corner"></view>
              </Card>
            </Col>
          </Row>
        <Arealarge />
        </div>
     );
  }
}

export default HomeDbaInfo