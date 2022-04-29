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
import ai_image from '../../images/AI_1.gif'
import huanxing_image from '../../images/huanxing.gif'

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
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"right"}}>信息:15</p>
                          <p style={{color:'#BFA42F',marginTop:-10,textAlign:"right"}}>警告:14</p>
                          <p style={{color:'#BF3B2C',marginTop:-10,textAlign:"right"}}>错误:1</p>
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
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"right"}}>信息:15</p>
                          <p style={{color:'#BFA42F',marginTop:-10,textAlign:"right"}}>警告:14</p>
                          <p style={{color:'#BF3B2C',marginTop:-10,textAlign:"right"}}>错误:1</p>
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
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"right"}}>总数:15</p>
                          <p style={{color:'#5BBFBB',marginTop:-10,textAlign:"right"}}>已处理:14</p>
                          <p style={{color:'#BFA42F',marginTop:-10,textAlign:"right"}}>未处理:1</p>
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
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"right"}}>总数:15</p>
                          <p style={{color:'#5BBFBB',marginTop:-10,textAlign:"right"}}>成功:14</p>
                          <p style={{color:'#BF3B2C',marginTop:-10,textAlign:"right"}}>失败:1</p>
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
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"right"}}>总数:15</p>
                          <p style={{color:'#5BBFBB',marginTop:-10,textAlign:"right"}}>成功:14</p>
                          <p style={{color:'#BF3B2C',marginTop:-10,textAlign:"right"}}>失败:1</p>
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
             <Col span={4}>
                  <div class="img_box">
                    <div class="img" style={{backgroundImage: `url(${bg_background_frame})`}}>
                      <p style={{color:'white',marginLeft:20,paddingTop:2}}>服务器<Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                      <Row>
                        <Col span={8}>
                          <img style={{width:'100%',marginLeft:'20%',marginTop:"-30%"}} src={server_gif} />
                        </Col>
                        <Col span={8} style={{width:'60%',marginTop:-35}}>
                          <p style={{color:'#5BBFBB',marginTop:5,textAlign:"right"}}>总数:15</p>
                          <p style={{color:'#5BBFBB',marginTop:-10,textAlign:"right"}}>正常:14</p>
                          <p style={{color:'#BF3B2C',marginTop:-10,textAlign:"right"}}>故障:1</p>
                        </Col>
                      </Row>
                    </div>
                  </div>
            </Col>
          </Row>
          <Row >
            <Col span={8} style={{backgroundImage:`url(${pageBg})`,height:335}}>
              <ZabbixScreenTable/>
              <view class="left_top_corner"></view>
                    <view class="right_top_corner"></view>
                    <view class="left_bottom_corner"></view>
                    <view class="right_bottom_corner"></view>
            </Col>
            <Col span={8} style={{backgroundImage:`url(${pageBg})`,height:300}}>
                <img style={{width:'100%'}} alt="example" src={ai_image} />
            </Col>
            <Col span={8}>
              <Card bordered={true} className='ant-tab-radius' bodyStyle={{backgroundImage:`url(${pageBg})`,height:335,padding:0}}>
                <p style={{color:'white',textAlign:'right'}}>
                    主机资源
                    <ServerSourceChart/>
                    数据库集群类型分布
                    <ClusterTypeChart/>
                    <view class="left_top_corner"></view>
                    <view class="right_top_corner"></view>
                    <view class="left_bottom_corner"></view>
                    <view class="right_bottom_corner"></view>
                </p>
              </Card>
            </Col>
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