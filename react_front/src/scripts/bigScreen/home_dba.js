import React,{Component} from 'react';
import {G2,Chart,Geom,Axis,Tooltip,Coord,Label,Legend,View,Guide,Shape,Facet,Util} from 'bizcharts';
import Slider from 'bizcharts-plugin-slider';
import { Table, Button,Row,Card, Col,Statistic,Icon,Modal,Input ,Popover,Form,span,Tabs,Select} from 'antd';
import { Alert, message } from 'antd';
import { Link } from 'react-router-dom';
import {Redirect}  from 'react-router-dom';
import {Highlighter} from 'react-highlight-words';
import {DataSet} from '@antv/data-set';
import pageBg from '../../images/pageBg.png'
import tbBg from '../../images/tb_bg.png'
import headBg from '../../images/head_bg.png'
import popUpBg from '../../images/popUP_bg.png'
import biankuang_gif from '../../images/biankuang.gif'
import backup_gif from '../../images/backup.gif'
import server_gif from '../../images/server.gif'
import archive_gif from '../../images/archive1.gif'
import monitor_gif from '../../images/monitor.gif'
import workFlow from '../../images/workflow.gif'   // 来源 https://588ku.com/gif/keji-6-0-default-0-3/
import earth_rotate from '../../images/earth-rotate.gif'
import bg_city from '../../images/bgCenter.gif'
import bg_robot from '../../images/robot.gif'
import bg_background_frame from '../../images/beijing.gif'

import ZabbixScreenTable from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/zabbixTable.js"
import CheckScreenTable from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/checkTable.js"
import ClusterScreenTable from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/clusterTable.js"
import ServerScreenChart from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/serverChart.js"
import SlowQueryChart from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/slowQueryChart.js"
import ServerSourceChart from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/serverSourceChart.js"
import ClusterTypeChart from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/clusterTypeChart.js"
import Arealarge from "/Users/gaochao/gaochao-git/gaochao_repo/devpos/react_front/src/scripts/bigScreen/slider_line.js"



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
            <Col span={24} style={{ backgroundImage:`url(${headBg})`,height:'100px'}}>
                <p style={{color:'white',textAlign: 'center',fontSize:30,marginTop:20}}>数据库智能运维管理平台大屏</p>
            </Col>
        </Row>
          <Row style={{height:'200px',background:''}} gutter={16}>
          <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:30,paddingTop:8}}>zabbix<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={12}>
                          <img style={{width:90,marginLeft:10}} src={monitor_gif} />
                        </Col>
                        <Col span={12} style={{width:100,marginTop:-35}}>
                          <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>信息:15</p>
                          {3>2?<p style={{color:'#BFA42F',fontSize:15,fontWeight: 'bold'}}>警告:2</p>:<p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>警告:0</p>}
                          {2>3?<p style={{color:'#BF3B2C',fontSize:15,fontWeight: 'bold'}}>警告:2</p>:<p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>警告:0</p>}
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:30,paddingTop:8}}>巡检任务<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={12}>
                          <img style={{width:45,marginLeft:30}} src={bg_robot} />
                        </Col>
                        <Col span={12} style={{width:100,marginTop:-35}}>
                          <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>信息:15</p>
                          <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>警告:1</p>
                          {2>3?<p style={{color:'#BF3B2C',fontSize:15,fontWeight: 'bold'}}>失败:2</p>:<p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>失败:0</p>}
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:30,paddingTop:8}}>报警工单<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={12}>
                          <img style={{width:90,marginLeft:30}} src={workFlow} />
                        </Col>
                        <Col span={12} style={{width:100,marginTop:-35}}>
                          <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>总数:8</p>
                          <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>已处理:5</p>
                          <p style={{color:'#BFA42F',fontSize:15,fontWeight: 'bold'}}>未认领:3</p>
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                    <p style={{color:'white',marginLeft:30,paddingTop:8}}>备份任务<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={12}>
                          <img style={{width:90,marginLeft:25}} src={backup_gif} />
                        </Col>
                        <Col span={12} style={{width:100,marginTop:-35}}>
                          <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>任务数:300</p>
                          <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>运行中:0</p>
                          <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>成功:298</p>
                          <p style={{color:'#BF3B2C',fontSize:15,fontWeight: 'bold'}}>失败:2</p>
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:30,paddingTop:8}}>归档任务<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                <Row>
                  <Col span={12}>
                    <img style={{width:80,marginLeft:15}} src={archive_gif} />
                  </Col>
                  <Col span={12} style={{width:100,marginTop:-35}}>
                    <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold',fontWeight: 'bold'}}>任务数:60</p>
                    <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>运行中:0</p>
                    <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>成功:59</p>
                    {3>2?<p style={{color:'#BF3B2C',fontSize:15,fontWeight: 'bold'}}>失败:2</p>:<p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>失败:2</p>}
                  </Col>
                </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                    <p style={{color:'white',marginLeft:30,paddingTop:8}}>服务器信息<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={12}>
                          <img style={{width:90,marginLeft:30}} src={server_gif} />
                        </Col>
                        <Col span={12} style={{width:100,marginTop:-35}}>
                          <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>总数:2000</p>
                          <p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>运行:1999</p>
                          {3>2?<p style={{color:'#BF3B2C',fontSize:15,fontWeight: 'bold'}}>故障:2</p>:<p style={{color:'#5BBFBB',fontSize:15,fontWeight: 'bold'}}>故障:2</p>}
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
          </Row>
          <Row style={{marginTop:'-40px'}}>
            <Col span={8}>
              <Card className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:650}}>
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
              <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:650}}>
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
            <Col span={24}>
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
          <Row style={{marginTop:'10px'}} gutter={24}>
            <Col span={24}>
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
                <Arealarge />
                <view class="left_top_corner"></view>
                <view class="right_top_corner"></view>
                <view class="left_bottom_corner"></view>
                <view class="right_bottom_corner"></view>
              </Card>
            </Col>
          </Row>

        </div>
     );
  }
}

export default HomeDbaInfo