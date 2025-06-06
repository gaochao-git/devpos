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
import ai_image from '../../images/center.gif'
import huanxing_image from '../../images/huanxing.gif'

import ZabbixScreenTable from "./zabbixTable"
import CheckScreenTable from "./checkTable"
import ClusterScreenTable from "./clusterTable"
import ServerScreenChart from "./serverChart"
import SlowQueryChart from "./slowQueryChart"
import ServerSourceChart from "./serverSourceChart"
import ClusterSourceChart from "./clusterSourceChart"
import ClusterTypeChart from "./clusterTypeChart"
import Arealarge from "./slider_line"



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
        {/*<Row gutter={16}>
            <Col span={24} style={{ backgroundImage:`url(${headBg})`,height:'100px'}}>
                <p style={{color:'white',textAlign: 'center',fontSize:30,marginTop:20}}>数据库智能运维管理平台大屏</p>
            </Col>
        </Row>*/}
          <Row gutter={16}>
          <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:20,paddingTop:2}}>zabbix<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={8}>
                          <img style={{width:'100%',marginLeft:'20%',marginTop:"-30%"}} src={monitor_gif} />
                        </Col>
                        <Col span={8} style={{width:'60%',marginTop:-35}}>
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"center"}}>信息:15</p>
                          <p style={{color:'#BFA42F',marginTop:-10,textAlign:"center"}}>警告:14</p>
                          <p style={{color:'#BF3B2C',marginTop:-10,textAlign:"center"}}>错误:1</p>
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:20,paddingTop:2}}>巡检<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={8}>
                          <img style={{width:'50%',marginLeft:'30%',marginTop:"-20%"}} src={bg_robot} />
                        </Col>
                        <Col span={8} style={{width:'60%',marginTop:-35}}>
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"center"}}>信息:15</p>
                          <p style={{color:'#BFA42F',marginTop:-10,textAlign:"center"}}>警告:14</p>
                          <p style={{color:'#BF3B2C',marginTop:-10,textAlign:"center"}}>错误:1</p>
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:20,paddingTop:2}}>报警<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={8}>
                          <img style={{width:'100%',marginLeft:'20%',marginTop:"-30%"}} src={server_gif} />
                        </Col>
                        <Col span={8} style={{width:'60%',marginTop:-35}}>
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"center"}}>总数:15</p>
                          <p style={{color:'#5BBFBB',marginTop:-10,textAlign:"center"}}>已认领:14</p>
                          <p style={{color:'#BFA42F',marginTop:-10,textAlign:"center"}}>未认领:1</p>
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:20,paddingTop:2}}>备份<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={8}>
                          <img style={{width:'100%',marginLeft:'20%',marginTop:"-30%"}} src={backup_gif} />
                        </Col>
                        <Col span={8} style={{width:'60%',marginTop:-35}}>
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"center"}}>总数:15</p>
                          <p style={{color:'#5BBFBB',marginTop:-10,textAlign:"center"}}>成功:14</p>
                          <p style={{color:'#BF3B2C',marginTop:-10,textAlign:"center"}}>失败:1</p>
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:20,paddingTop:2}}>归档<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={8}>
                          <img style={{width:'100%',marginLeft:'20%',marginTop:"-30%"}} src={archive_gif} />
                        </Col>
                        <Col span={8} style={{width:'60%',marginTop:-35}}>
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"center"}}>总数:15</p>
                          <p style={{color:'#5BBFBB',marginTop:-10,textAlign:"center"}}>成功:14</p>
                          <p style={{color:'#BF3B2C',marginTop:-10,textAlign:"center"}}>失败:1</p>
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:20,paddingTop:2}}>工单<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={8}>
                          <img style={{width:'100%',marginLeft:'20%',marginTop:"-30%"}} src={workFlow} />
                        </Col>
                        <Col span={8} style={{width:'60%',marginTop:-35}}>
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"center"}}>总数:15</p>
                          <p style={{color:'#5BBFBB',marginTop:-10,textAlign:"center"}}>已执行:14</p>
                          <p style={{color:'#BFA42F',marginTop:-10,textAlign:"center"}}>未执行:1</p>
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
          </Row>
          <Row style={{marginTop:'5px',height:370}}>
            <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,}}>
              <Col span={12}>
                  <Tabs defaultActiveKey="1" tabBarStyle={{color:"#367AD2"}}>
                      <TabPane tab="zabbix" key="1" style={{marginTop:-18}}>
                          <ZabbixScreenTable/>
                      </TabPane>
                      <TabPane tab="巡检" key="2" style={{marginTop:-18}}>
                          <CheckScreenTable/>
                      </TabPane>
                      <TabPane tab="工单" key="3" style={{marginTop:-18}}>
                          <ClusterScreenTable/>
                      </TabPane>
                      <TabPane tab="集群信息" key="4" style={{marginTop:-18}}>
                          <ClusterScreenTable/>
                      </TabPane>
                  </Tabs>
              </Col>
              <Col span={12}>
                  <Row>
                      <Col span={12}>
                          <ServerSourceChart/>
                      </Col>
                      <Col span={12}>
                          <ClusterSourceChart/>
                      </Col>
                  </Row>
                  <Row>
                      <ClusterTypeChart/>
                  </Row>
              </Col>
              <view class="left_top_corner"></view>
              <view class="right_top_corner"></view>
              <view class="left_bottom_corner"></view>
              <view class="right_bottom_corner"></view>
            </Card>
          </Row>
          <Row style={{marginTop:'5px'}} gutter={24}>
            <Col span={24}>
              <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,}}>
                <p style={{color:'white'}}>集群RT(ms)</p>
                <SlowQueryChart/>
                <view class="left_top_corner"></view>
                <view class="right_top_corner"></view>
                <view class="left_bottom_corner"></view>
                <view class="right_bottom_corner"></view>
              </Card>
            </Col>
          </Row>
          <Row style={{marginTop:'5px'}} gutter={24}>
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