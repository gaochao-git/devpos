import React,{Component} from 'react';
import {G2,Chart,Geom,Axis,Tooltip,Coord,Label,Legend,View,Guide,Shape,Facet,Util} from 'bizcharts';
import { Table, Button,Row,Card, Col,Statistic,Icon,Modal,Input ,Popover,Form} from 'antd';
import { Alert, message } from 'antd';
import { Link } from 'react-router-dom';
import {Redirect}  from 'react-router-dom';
import {Highlighter} from 'react-highlight-words';
import {DataSet} from '@antv/data-set';
import pageBg from '../../images/pageBg.png'
import tbBg from '../../images/tb_bg.png'
import headBg from '../../images/head_bg.png'
import popUpBg from '../../images/popUP_bg.png'
import workFlow from '../../images/workflow.gif'   // 来源 https://588ku.com/gif/keji-6-0-default-0-3/

import earth_rotate from '../../images/earth-rotate.gif'
import bg_city from '../../images/bgCenter.gif'
import bg_robot from '../../images/robot.gif'
const { Column } = Table;
const { Meta } = Card;
const { Text } = Guide;


class HomeDbaInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      HostTypeCountData:[],
      HostMysqlRedisCountData:[],
      CallTodayData:'',
      CallHistoryData:[],
      WarrantyServerTodayData:'',
      WarrantyServerHistoryData:[],
      WarrantyServerDetailData:[],
      WorkSheetTodayData:'',
      WorkSheetHistoryData:[],
      MysqlInstanceCountData:'',
      RedisInstanceCountData:'',
      SchemaCountData:'',
      TableCountData:'',
      MysqlSlowTop10Data:[],
      MysqlSlowTotalHistoryData:[],
      RotateDBAData:[],
      RotateDBATodayData:'',
      RotateDBAListVisible: false,
      WarrantyServerListVisible:false,
      //NrpeCritical:'',
      //NrpeWarning:'',
      AgentInspectionTotalCountData:'',
      AgentInspectionListVisible:false,
      MysqlInspectionData:[],
      MysqlInspectionTotalCountData:'',
      MysqlInspectionListVisible:false,
      MysqlVersionData:[],
      MysqlVersionTotalCountData:'',
      MysqlVersionListVisible:false,
      MysqlMmmCountData: '',
      MysqlPxcCountData: '',
      MysqlQmhaCountData: '',
      MysqlMasterSlaveCountData: '',
      MysqlSingleCountData: '',
      MySQLBuLevelInfo:[],
      ClusterBuVisible:false,
      ClusterBuType:[],
      CLusterTypeFilter:[],
      ArchiveInfoList:[],
      ArchiveInfoCount:'',
      ArchiveInfoVisible:false,
      current_time:"",
      week_day:""
    };
  }

  componentDidMount() {
    this.setCurrentTimeInterVal()
  }

  setCurrentTimeInterVal = () => {
      this.currentTimerId = window.setInterval(this.getDateWeek.bind(this),1000);
  }
  getDateWeek = ()=>{
    this.getTodayDate();
    this.getTodayWeek()
  }
  getTodayDate = ()=> {
    var date = new Date();
    var year = date.getFullYear().toString();
    var month = (date.getMonth()+1).toString();
    var day = date.getDate().toString();
    var hour =  date.getHours().toString();
    var minute = date.getMinutes().toString();
    var second = date.getSeconds().toString();
    var now_time = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
    this.setState({current_time:now_time})
};

getTodayWeek = ()=> {
    var tempDate = new Date();
    var days = tempDate.getDay();
    var week;
    switch(days) {
        case 1:
            week = '星期一';
            break;
        case 2:
            week = '星期二';
            break;
        case 3:
            week = '星期三';
            break;
        case 4:
            week = '星期四';
            break;
        case 5:
            week = '星期五';
            break;
        case 6:
            week = '星期六';
            break;
        case 0:
            week = '星期日';
            break;
    }
    this.setState({week_day:week})
};

  render() {
    const ds = new DataSet();
    const server_view1 = ds.createView().source(this.state.HostTypeCountData);
    server_view1.transform({
      type: "fold",
      // 展开字段集
      fields: ["server_count", "openstack_vm_count"],
      // key字段
      key: "type",
      // value字段
      value: "count"
    });
    const call_data_scale = {
      stat_date: {
        alias: "日期"
      },
      count: {
        alias: "报警数量"
      }
    };
    const { DataView } = DataSet;
    const { Html } = Guide;
    const AlertData = [
      {
        item: "warnning",
        count: this.state.NrpeWarning
      },
      {
        item: "critical",
        count: this.state.NrpeCritical
      }
    ];
    const MysqlClusterTypeData = [
      {
        item: "master_slave",
        count: this.state.MysqlMasterSlaveCountData
      },
      {
        item: "MMM",
        count: this.state.MysqlMmmCountData
      },
      {
        item: "PXC",
        count: this.state.MysqlPxcCountData
      },
      {
        item: "QMHA",
        count: this.state.MysqlQmhaCountData
      },
      {
        item: "single_point",
        count: this.state.MysqlSingleCountData
      }
    ];
    const alert_view = new DataView();
    alert_view.source(AlertData).transform({
      type: "percent",
      field: "count",
      dimension: "item",
      as: "percent"
    });
    const mysql_cluster_type_view = new DataView();
    mysql_cluster_type_view.source(MysqlClusterTypeData).transform({
      type: "percent",
      field: "count",
      dimension: "item",
      as: "percent"
    });

    // const alert_scale = {
    //   percent: {
    //     formatter: val => {
    //       val = val * 100 + "%";
    //       return val;
    //     }
    //   }
    // };
    const dv2 = ds.createView().source(this.state.HostMysqlRedisCountData);
    dv2.transform({
      type: "fold",
      // 展开字段集
      fields: ["mysql_count", "redis_count"],
      // key字段
      key: "type",
      // value字段
      value: "count"
    });


    const label = {
      rotate: 11, //坐标轴文本旋转角度
      textStyle: {
        textAlign: 'center', // 文本对齐方向，可取值为： start center end
        fill: '#404040', // 文本的颜色
        textBaseline: 'bottom' // 文本基准线，可取 top middle bottom，默认为middle
      }
    }
    let { sortedInfo, filteredInfo } = this.state;
    sortedInfo = sortedInfo || {};
    filteredInfo = filteredInfo || {};
    const TASK_DTS_TYPE = ["普通归档", "循环归档", "仅迁移不删源端数据", "全表归档删除源表", '全表归档保留源表结构']
    const ArchiveColumns = [{
      title: '任务名称',
      dataIndex: 'base',
      width: '20%',
      render: (text, record) => {
        return (<Link target="_blank" to={`/tasks/${record.task_id}`}>{text}</Link>)
      }
    }, {
      title: "子任务名称",
      dataIndex: 'detail',
      width: '25%',
      render: (text, record) => {
        return (<Link target="_blank" to={`/tasks/${record.task_id}/${record.sub_task_id}`}>{text}</Link>)
      }
    }, {
      title: "类型",
      dataIndex: 'dts_type',
      width: '15%',
      render: (text) => {
        let val = parseInt(text);
        return TASK_DTS_TYPE[val]
      }
    }, {
      title: '创建者',
      dataIndex: 'user_cn',
      width: '10%',
    },{
      title: '创建时间',
      width: '10%',
      dataIndex: 'create_time',
    }, {
      title: '更新时间',
      width: '10%',
      dataIndex: 'update_time',
    }];
    const ClusterBuLevelColumns = [{
      title: '集群名',
      dataIndex: 'cluster_name',
      key: 'cluster_name',
      width:'10%',
      render : (text) => {
        return (<Link target="_blank"  to={`/cluster/${text}`}>{text}</Link>)
      },
    }, {
      title: "集群类型",
      dataIndex: 'cluster_type',
      width:'10%',
      filters: this.state.CLusterTypeFilter,
    filteredValue: filteredInfo.cluster_type || null,
    onFilter: (value, record) => record.cluster_type == (value),
    }, {
      title: '故障节点数目',
      dataIndex: 'error',
      width:'10%',
      sorter: (a, b) => a.error - b.error,
      sortOrder: sortedInfo.columnKey === 'error' && sortedInfo.order,
    }, {
      title: 'p1 app_code',
      dataIndex: 'p1_app_code_count',
      sorter: (a, b) => a.p1_app_code_count - b.p1_app_code_count,
      width:'10%',
      sortOrder: sortedInfo.columnKey === 'p1_app_code_count' && sortedInfo.order
    }, {
      title: 'app_code',
      dataIndex: 'all_app_code_count',
      width:'10%',
      sorter: (a, b) => a.all_app_code_count - b.all_app_code_count,
      sortOrder: sortedInfo.columnKey === 'all_app_code_count' && sortedInfo.order,
    }, {
      title: '首要部门',
      dataIndex: 'first_bu_name',
      width:'15%',
      sorter: (a, b) => {
        let q = a.first_bu_name.toUpperCase();
        let p = b.first_bu_name.toUpperCase();
        if (q < p) {
          return -1
        }
        if (q > p) {
          return 1
        }
        return 0
      },
      sortOrder: sortedInfo.columnKey === 'first_bu_name' && sortedInfo.order,
    }, {
      title: '次要部门',
      dataIndex: 'second_bu_name',
      width:'15%',
      sorter: (a, b) => {
        let q = a.second_bu_name.toUpperCase();
        let p = b.second_bu_name.toUpperCase();
        if (q < p) {
          return -1
        }
        if (q > p) {
          return 1
        }
        return 0
      },
      sortOrder: sortedInfo.columnKey === 'second_bu_name' && sortedInfo.order,
    }];

    const AgentMonitorColumns = [{
      title:'主机名',
      dataIndex:'host_name',
      width:'20%'
    },{
      dataIndex:"department",
      title:"部门",
      width:'15%'

    },{
      title: "异常计数",
      dataIndex:"count",
      width:'15%'
    },{
      title:'详情',
      dataIndex:'error',
      render: (text) => {
        return ((text && text.length > 60) ?
            <Popover placement="bottom"
                overlayStyle={{ width: '480px' }}
                content={<pre
                    style={{
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                    }}>{text}</pre>}>
                <span>{text.slice(0, 60)}...</span>
            </Popover> : <span>{text}</span>)
            }
    }];

    const mock_columns = [
    {
        title: 'idc',
        dataIndex: 'idc',
        className:'replacecolor'
      },
      {
        title: 'ip',
        dataIndex: 'ip',
        className:'replacecolor'
      },
      {
        title: 'type',
        dataIndex: 'type',
        className:'replacecolor'
      },
      {
        title: 'detail',
        dataIndex: 'detail',
        className:'replacecolor'
      },
    ];
    const mock_data = [
      {
        key: '1',
        idc: 'BJ10',
        ip: '172.16.1.216',
        type: 'warning',
        detail: '3306 port is down',
      },
      {
        key: '2',
        idc: 'BJ10',
        ip: '172.16.1.217',
        type: 'warning',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.218',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.219',
        type: 'warning',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
      {
        key: '3',
        idc: 'BJ10',
        ip: '172.16.1.220',
        type: 'error',
        detail: '3306 port is down',
      },
    ];
    const line_mock_data = [
      {
        month: "2015-01-01",
        acc: 84.0
      },
      {
        month: "2015-02-01",
        acc: 14.9
      },
      {
        month: "2015-03-01",
        acc: 17.0
      },
      {
        month: "2015-04-01",
        acc: 20.2
      },
      {
        month: "2015-05-01",
        acc: 55.6
      },
      {
        month: "2015-06-01",
        acc: 56.7
      },
      {
        month: "2015-07-01",
        acc: 30.6
      },
      {
        month: "2015-08-01",
        acc: 63.2
      },
      {
        month: "2015-09-01",
        acc: 24.6
      },
      {
        month: "2015-10-01",
        acc: 14.0
      },
      {
        month: "2015-11-01",
        acc: 9.4
      },
      {
        month: "2015-12-01",
        acc: 6.3
      }
    ];
    const cols = {
      month: {
        alias: "月份"
      },
      acc: {
        alias: "积累量"
      }
    };

    //并入
    const bingtu_data = [{
      gender: 'male',
      path: 'M381.759 0h292l-.64 295.328-100.127-100.096-94.368 94.368C499.808 326.848 512 369.824 512 415.712c0 141.376-114.56 256-256 256-141.376 0-256-114.624-256-256s114.624-256 256-256c48.8 0 94.272 13.92 133.12 37.632l93.376-94.592L381.76 0zM128.032 415.744c0 70.688 57.312 128 128 128s128-57.312 128-128-57.312-128-128-128-128 57.312-128 128z',
      value: 50,
    }, {
      gender: 'middle',
      path: 'M381.759 0h292l-.64 295.328-100.127-100.096-94.368 94.368C499.808 326.848 512 369.824 512 415.712c0 141.376-114.56 256-256 256-141.376 0-256-114.624-256-256s114.624-256 256-256c48.8 0 94.272 13.92 133.12 37.632l93.376-94.592L381.76 0zM128.032 415.744c0 70.688 57.312 128 128 128s128-57.312 128-128-57.312-128-128-128-128 57.312-128 128z',
      value: 25,
    }, {
      gender: 'female',
      path: 'M320.96 503.232v105.376h127.872V736.48H320.96v127.872H191.136V736.48H63.296V608.608h127.84v-105.76C81.216 474.208 0 374.56 0 255.712 0 114.496 114.496 0 255.712 0c141.248 0 255.68 114.496 255.68 255.712 0 119.328-79.872 219.264-190.432 247.52zm-65.248-375.36c-70.624 0-127.872 57.216-127.872 127.84 0 70.592 57.248 127.84 127.872 127.84s127.872-57.248 127.872-127.84c0-70.624-57.248-127.84-127.872-127.84z',
      value: 25,
    }];
    //饼图scale
    const bingtu_scale = {
      value: {
        min: 0,
        max: 100,
      },
    };
    //横向柱状图
    const zhuzhuangtu_data = [
      {
        country: "TiDB",
        population: 131744
      },
      {
        country: "MySQL",
        population: 104970
      },
      {
        country: "GoldenDB",
        population: 29034
      },
      {
        country: "SQLServer",
        population: 23489
      },
      {
        country: "达梦",
        population: 18203
      }
    ];
    const ds_zhuzhuangtu = new DataSet();
    const dv_zhuzhuangtu = ds_zhuzhuangtu.createView().source(zhuzhuangtu_data);
    dv_zhuzhuangtu.source(zhuzhuangtu_data).transform({
      type: "sort",
      callback(a, b) {
        // 排序依据，和原生js的排序callback一致
        return a.population - b.population > 0;
      }
    });

    return (
        <div style={{backgroundImage:`url(${pageBg})`}}>
        <Row gutter={16}>
            <Col span={8} style={{ backgroundImage:`url(${headBg})`,height:'100px'}}>
                <p style={{color:'white',fontSize:30,marginTop:20}}></p>
            </Col>
            <Col span={8} style={{ backgroundImage:`url(${headBg})`,height:'100px'}}>
                <p style={{color:'white',textAlign: 'center',fontSize:30,marginTop:20}}>数据库管理平台大屏</p>
            </Col>
            <Col span={8} style={{ backgroundImage:`url(${headBg})`,height:'100px'}}>
                <p style={{color:'white',marginLeft:50,fontSize:30,marginTop:20}}>{this.state.current_time}  {this.state.week_day}</p>
            </Col>
        </Row>
          <Row style={{height:'200px',background:''}} gutter={16}>
            <Col span={6} style={{}}>
              <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,height:'200px'}}>
                <img style={{width:55}} className='robot-gif' alt="example111" src={bg_robot} />
                <p style={{color:'white'}}>未处理工单</p>
                <span style={{fontSize:'20px',color:'red'}}>{this.state.CallTodayData}</span>
                <Chart
                data={this.state.CallHistoryData}
                scale={call_data_scale}
                forceFit
                height={100}
                padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <Tooltip />
                  <Geom
                    type="area"
                    position="stat_date*count"
                    size={1}
                    color="rgb(149, 95, 233)"
                    //shape="smooth"
                    style={{
                      shadowColor: "l (270) 0:rgba(21, 146, 255, 0)",
                      shadowBlur: 60,
                      shadowOffsetY: 6
                    }}
                  />
                </Chart>
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,height:'200px'}}>
                <img style={{width:55}} className='robot-gif' alt="example111" src={bg_robot} />
                <p style={{color:'white'}}>服务器数量 <Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
                <p style={{fontSize:'20px',color:'#FFD306'}}>{this.state.WarrantyServerTodayData}</p>
                <Chart
                data={this.state.WarrantyServerHistoryData}
                //scale={work_sheet_scale}
                forceFit
                height={80}
                padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <Tooltip />
                  <Geom
                    type="area"
                    position="stat_date*warranty_server_count"
                    size={1}
                    color="blue"
                    shape="smooth"
                    style={{
                      shadowColor: "l (270) 0:rgba(21, 146, 255, 0)",
                      shadowBlur: 60,
                      shadowOffsetY: 6
                    }}
                  />
                  <Geom
                    type="point"
                    position="stat_date*warranty_server_count"
                    size={2}
                    shape={"circle"}
                    color={"status"}
                    style={{
                      stroke: "#fff",
                      lineWidth: 1
                    }}
                  />
                </Chart>
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,height:'200px'}}>
                <img style={{width:100}} className='robot-gif' alt="example111" src={workFlow} />
                <p style={{color:'white'}}>今日工单数量</p>
                <p style={{fontSize:'20px',color:'green'}}>{this.state.WorkSheetTodayData}</p>
                <Chart
                data={this.state.WorkSheetHistoryData}
                //scale={work_sheet_scale}
                forceFit
                height={80}
                padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <Tooltip />
                  <Geom
                    type="area"
                    position="stat_date*work_sheet_count"
                    size={1}
                    color="#009393"
                    //shape="smooth"
                    style={{
                      shadowColor: "l (270) 0:rgba(21, 146, 255, 0)",
                      shadowBlur: 60,
                      shadowOffsetY: 6
                    }}
                  />
                </Chart>
              </Card>
            </Col>
            <Col span={6}>
              <Card className='ant-tab-radius' bordered={true} style={{ backgroundImage:`url(${pageBg})`,height:'200px'}}>
                <p style={{color:'white'}}>DBA值班人员列表  <Icon style={{color:'green'}} type="eye" onClick={()=>{this.showRotateDbaModalHandle()}}/></p>
                <p style={{color:'white'}}>今日值班DBA：{this.state.RotateDBATodayData}</p>
                <p style={{color:'white'}}>值班时间：晚8点～次日上午10点</p>
                <br/>
                <p style={{fontSize:'16px',color:'red'}}>注：非值班期间找对应业务线DBA </p>
              </Card>
            </Col>
          </Row>
          <Row style={{marginTop:'10px'}}>
            <Col span={8}>
              <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:535}}>
                <p style={{color:'white'}}>
                    今日巡检异常：{this.state.RotateDBATodayData}
                    <Table
                      className='ant-table-bg'
                      columns={mock_columns}
                      dataSource={mock_data}
                      style={{bordered:'false'}}
                      size="small"
                      rowClassName={(record, index) => {
                          let className = 'row-detail-bg-default';
                          if (record.type === "warning") {
                              className = 'row-detail-bg-warning';
                              return className;
                          }else if (record.type  === "error"){
                              className = 'row-detail-bg-error';
                              return className;
                          }else if (record.type  === "info"){
                              className = 'row-detail-bg-default';
                              return className;
                          }else {
                              return className;
                          }
                      }}
                      scroll={{ y: 440,x:true }}
                      pagination={false}
                    />
                </p>
              </Card>
            </Col>
            <Col span={8}>
                <img style={{width:'100%'}} alt="example" src={bg_city} />
                <Row>
                    <Col span={8}>
                        <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:150}}>
                          <p style={{color:'white',marginTop:40}}>BJ10：100</p>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:150}}>
                          <p style={{color:'white',marginTop:40}}>BJ10：100</p>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:150}}>
                          <p style={{color:'white',marginTop:40}}>BJ10：100</p>
                        </Card>
                    </Col>
                </Row>
                <Row>
                    <Col span={8}>
                        <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:150}}>
                          <p style={{color:'white',marginTop:40}}>BJ10：100</p>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:150}}>
                          <p style={{color:'white',marginTop:40}}>BJ10：100</p>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:150}}>
                          <p style={{color:'white',marginTop:40}}>BJ10：100</p>
                        </Card>
                    </Col>
                </Row>
            </Col>
            <Col span={8}>
              <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:535}}>

                <p style={{color:'white'}}>
                    GFS备份存储占用空间：{this.state.RotateDBATodayData}
                    <Chart height={200} width={100} data={bingtu_data} padding='auto' scale={bingtu_scale} forceFit>
                      <Tooltip />
                      <Geom
                        type="interval"
                        position="gender*value"
                        color="gender"
                        shape="liquid-fill-gauge"
                        style={{
                          lineWidth: 10,
                          fillOpacity: 0.75,
                        }}
                      />
                      <Guide>
                        {
                          bingtu_data.map(
                            row => (<Text
                              content={`${row.value}%`}
                              top
                              position={{
                                gender: row.gender,
                                value: 50,
                              }}
                              style={{
                                opacity: 0.75,
                                fontSize: window.innerWidth / 60,
                                textAlign: 'center',
                              }}
                            />))
                        }
                      </Guide>
                    </Chart>
                    数据库集群类型分布：{this.state.RotateDBATodayData}
                    <Chart height={280} data={dv_zhuzhuangtu} forceFit>
                      <Coord transpose />
                      <Axis
                        name="country"
                        label={{
                          offset: 12
                        }}
                      />
                      <Axis name="population" />
                      <Tooltip />
                      <Geom type="interval" position="country*population" />
                    </Chart>
                </p>
              </Card>
            </Col>
          </Row>
          <Row style={{marginTop:'10px'}} gutter={24}>
          <Col  span={24}>
            <Card bordered={true} className='ant-tab-radius' style={{ backgroundImage:`url(${pageBg})`,}}>
              <p style={{color:'white'}}>集群TPS<Icon style={{color:'green'}} type="eye" onClick={()=>{this.getBuLevelInfo()}}/></p>
            <Chart height={400} data={line_mock_data} scale={cols} forceFit>
              <Axis
                name="month"
                title={null}
                tickLine={null}
                line={{
                  stroke: "#E6E6E6"
                }}
              />
              <Axis
                name="acc"
                line={false}
                tickLine={null}
                grid={null}
                title={null}
              />
              <Tooltip />
              <Geom
                type="line"
                position="month*acc"
                size={1}
                color="l (270) 0:rgba(255, 146, 255, 1) .5:rgba(100, 268, 255, 1) 1:rgba(215, 0, 255, 1)"
                shape="smooth"
                style={{
                  shadowColor: "l (270) 0:rgba(21, 146, 255, 0)",
                  shadowBlur: 60,
                  shadowOffsetY: 6
                }}
              />
            </Chart>
                  </Card>
            </Col>
          </Row>
        </div>
     );
  }
}

export default HomeDbaInfo