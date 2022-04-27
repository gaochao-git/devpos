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
const { Column } = Table;
const { Meta } = Card;
const { Text } = Guide;
const { TabPane } = Tabs;
const {Option} = Select

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
//      current_time:"",
//      week_day:""
    };
  }

  componentDidMount() {
//    this.setCurrentTimeInterVal()
  }

//  setCurrentTimeInterVal = () => {
//      //setInterval与slider滑块在一起会导致滑块失效
//      this.currentTimerId = window.setInterval(this.getDateWeek.bind(this),1000);
//  }
//  getDateWeek = ()=>{
//    this.getTodayDate();
//    this.getTodayWeek()
//  }
//  getTodayDate = ()=> {
//    var checkTime = function (i) {
//      if (i < 10) {i = "0" + i}
//      return i;
//    }
//    var date = new Date();
//    var year = date.getFullYear().toString();
//    var month = (date.getMonth()+1).toString();
//    var day = date.getDate().toString();
//    var hour =   checkTime(date.getHours().toString());
//    var minute = checkTime(date.getMinutes().toString());
//    var second = checkTime(date.getSeconds().toString());
//    var now_time = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
//    this.setState({current_time:now_time})
//};
//
//getTodayWeek = ()=> {
//    var tempDate = new Date();
//    var days = tempDate.getDay();
//    var week;
//    switch(days) {
//        case 1:
//            week = '星期一';
//            break;
//        case 2:
//            week = '星期二';
//            break;
//        case 3:
//            week = '星期三';
//            break;
//        case 4:
//            week = '星期四';
//            break;
//        case 5:
//            week = '星期五';
//            break;
//        case 6:
//            week = '星期六';
//            break;
//        case 0:
//            week = '星期日';
//            break;
//    }
//    this.setState({week_day:week})
//};

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
    const mock_check_columns = [
    {
        title: '巡检类型',
        dataIndex: 'check_type',
        className:'replacecolor'
      },
      {
        title: '巡检结果',
        dataIndex: 'check_ret',
        className:'replacecolor'
      },
      {
        title: '巡检人员',
        dataIndex: 'check_user',
        className:'replacecolor'
      },
      {
        title: '巡检时间',
        dataIndex: 'check_time',
        className:'replacecolor'
      },
      {
        title: '巡检详情',
        dataIndex: 'check_detail',
        className:'replacecolor'
      },
    ];
    const mock_check_data = [
      {
        check_type: 'big_table',
        check_ret: 'warning',
        check_user: 'gaochao',
        check_time: '2022-04-23 05:08:45',
        check_detail: '点击获取详情',
      },
    ]
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
    const bingtu_data = [
      {
        item: "一部",
        count: 40
      },
      {
        item: "二部",
        count: 21
      },
      {
        item: "三部",
        count: 17
      },
      {
        item: "平台部",
        count: 13
      },
      {
        item: "设施部",
        count: 9
      }
    ];
    const bingtu_dv = new DataView();
    bingtu_dv.source(bingtu_data).transform({
      type: "percent",
      field: "count",
      dimension: "item",
      as: "percent"
    });
    const bingtu_cols = {
      percent: {
        formatter: val => {
          val = val * 100 + "%";
          return val;
        }
      }
    };
    //横向柱状图
    const zhuzhuangtu_data = [
      {
        country: "TiDB",
        cluster_count: 131744
      },
      {
        country: "MySQL",
        cluster_count: 104970
      },
      {
        country: "GoldenDB",
        cluster_count: 29034
      },
      {
        country: "SQLServer",
        cluster_count: 23489
      },
      {
        country: "达梦",
        cluster_count: 18203
      }
    ];
    const ds_zhuzhuangtu = new DataSet();
    const dv_zhuzhuangtu = ds_zhuzhuangtu.createView().source(zhuzhuangtu_data);
    dv_zhuzhuangtu.source(zhuzhuangtu_data).transform({
      type: "sort",
      callback(a, b) {
        // 排序依据，和原生js的排序callback一致
        return a.cluster_count - b.cluster_count > 0;
      }
    });

    const mock_tdb_columns = [
    {
        title: 'idc',
        dataIndex: 'idc',
        className:'replacecolor'
      },
      {
        title: '业务',
        dataIndex: 'project',
        className:'replacecolor'
      },
      {
        title: '总数',
        dataIndex: 'total',
        className:'replacecolor'
      },
      {
        title: '在线',
        dataIndex: 'active',
        className:'replacecolor'
      },
      {
        title: '允许隔离',
        dataIndex: 'config_tdb_total',
        className:'replacecolor'
      },
      {
        title: '已隔离',
        dataIndex: 'tdb_total',
        className:'replacecolor'
      },
    ];
    const mock_tdb_data = [
      {
        idc: 'BJ10',
        project: 'trans',
        total: 35,
        active:27,
        config_tdb_total: 17,
        tdb_total: 8,
      },
      {
        idc: 'BJ11',
        project: 'trans',
        total: 35,
        active:18,
        config_tdb_total: 17,
        tdb_total: 17,
      },{
        idc: 'BJ10',
        project: 'trans',
        total: 35,
        active:27,
        config_tdb_total: 17,
        tdb_total: 8,
      },{
        idc: 'BJ10',
        project: 'trans',
        total: 35,
        active:27,
        config_tdb_total: 17,
        tdb_total: 8,
      },{
        idc: 'BJ10',
        project: 'trans',
        total: 35,
        active:27,
        config_tdb_total: 17,
        tdb_total: 8,
      },{
        idc: 'BJ10',
        project: 'trans',
        total: 35,
        active:27,
        config_tdb_total: 17,
        tdb_total: 8,
      },{
        idc: 'BJ10',
        project: 'trans',
        total: 35,
        active:27,
        config_tdb_total: 17,
        tdb_total: 8,
      },{
        idc: 'BJ10',
        project: 'trans',
        total: 35,
        active:27,
        config_tdb_total: 17,
        tdb_total: 8,
      },{
        idc: 'BJ10',
        project: 'trans',
        total: 35,
        active:27,
        config_tdb_total: 17,
        tdb_total: 8,
      },{
        idc: 'BJ10',
        project: 'trans',
        total: 35,
        active:27,
        config_tdb_total: 17,
        tdb_total: 8,
      },{
        idc: 'BJ10',
        project: 'trans',
        total: 35,
        active:27,
        config_tdb_total: 17,
        tdb_total: 8,
      }
      ]

    const zhuzhuangtu_data_1 = [
      {
        year: "bj10_trans_01",
        sales: 380
      },
      {
        year: "bj10_trans_02",
        sales: 52
      },
      {
        year: "bj10_trans_03",
        sales: 61
      },
      {
        year: "bj10_trans_04",
        sales: 145
      },
      {
        year: "bj10_trans_05",
        sales: 48
      },
    ];

    const zhuzhuangtu_cols_1 = {
      sales: {
        tickInterval: 100
      }
    };

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
          </Row>
          <Row style={{marginTop:'10px'}}>
            <Col span={8}>
              <Card className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:635}}>
                <p>
                    <Tabs defaultActiveKey="1" tabBarStyle={{color:"#367AD2"}}>
                        <TabPane tab="6idc_zabbix" key="1" style={{marginTop:-20}}>
                            <Table

                              columns={mock_columns}
                              dataSource={mock_data}
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
                              scroll={{ y: 510,x:true }}
                              pagination={false}
                            />
                        </TabPane>
                        <TabPane tab="日常巡检" key="2" style={{marginTop:-20}}>
                            <Table
                              columns={mock_check_columns}
                              dataSource={mock_check_data}
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
                              scroll={{ y: 510,x:true }}
                              pagination={false}
                            />
                        </TabPane>
                        <TabPane tab="集群状态" key="3" style={{marginTop:-20}}>
                            <Table
                              columns={mock_tdb_columns}
                              dataSource={mock_tdb_data}
                              rowClassName={(record, index) => {
                                  let className = 'row-detail-bg-default';
                                  if (record.tdb_total>0 && record.tdb_total <record.config_tdb_total) {
                                      className = 'row-detail-bg-warning';
                                      return className;
                                  }else if (record.tdb_total>=record.config_tdb_total){
                                      className = 'row-detail-bg-error';
                                      return className;
                                  }else {
                                      return className;
                                  }
                              }}
                              scroll={{ y: 510,x:true}}
                              pagination={false}
                            />
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
                <Chart
                  height={370}
                  data={zhuzhuangtu_data_1}
                  scale={zhuzhuangtu_cols_1}
                  forceFit
                  padding={{ top: 10, right: 20, bottom: 30, left: 60 }}
                  plotBackground={{
                    stroke:null  //边框颜色
                  }}
                  style={{color:'white',textAlign:'center',marginTop:10}}
                >
                  <span className='main-title'>今日慢查询TOP5集群</span>
                  <Axis name="year" />
                  <Axis name="sales" />
                  <Tooltip
                    // crosshairs用于设置 tooltip 的辅助线或者辅助框
                    // crosshairs={{
                    //  type: "y"
                    // }}
                  />
                  <Geom type="interval" position="year*sales" color='#5BBFBB' size="32"/>
                </Chart>
            </Col>
            <Col span={8}>
              <Card bordered={true} className='ant-tab-radius' style={{backgroundImage:`url(${pageBg})`,height:635}}>
                <p style={{color:'white',textAlign:'right'}}>
                    主机资源
                    <Chart
                      height={300}
                      data={bingtu_dv}
                      scale={bingtu_cols}
                      padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
                      forceFit
                    >
                      <Coord type={"theta"} radius={0.75} innerRadius={0.6} />
                      <Axis name="percent" />
                      <Legend
                        position="bottom"
                      />
                      <Tooltip
                        showTitle={false}
                        itemTpl="<li>{name}: {value}</li>"
                      />
                      <Guide>
                        <Html
                          position={["50%", "50%"]}
                          html="<div style=&quot;color:#8c8c8c;font-size:1.16em;text-align: center;width: 10em;&quot;>200台</div>"
                          alignX="middle"
                          alignY="middle"
                        />
                      </Guide>
                      <Geom
                        type="intervalStack"
                        position="percent"
                        color="item"
                        tooltip={[
                          "item*percent",
                          (item, percent) => {
                            percent = percent * 100 + "%";
                            return {
                              name: item,
                              value: percent
                            };
                          }
                        ]}
                        style={{
                          lineWidth: 1,
                          stroke: null
                        }}
                      >
                        <Label
                          content="percent"
                          formatter={(val, item) => {
                            return item.point.item + ": " + val;
                          }}
                          textStyle= {{
                            //textAlign: 'center', // 文本对齐方向，可取值为： start middle end
                            fill: '#5BBFBB', // 文本的颜色
                            fontSize: '15', // 文本大小
                            fontWeight: 'bold', // 文本粗细
                            //textBaseline: 'top' // 文本基准线，可取 top middle bottom，默认为middle
                          }}
                        />
                      </Geom>
                    </Chart>
                    数据库集群类型分布：{this.state.RotateDBATodayData}
                    <Chart height={300} data={dv_zhuzhuangtu} forceFit>
                      <Coord transpose />
                      <Axis
                        name="country"
                        label={{
                          offset: 12,
                        }}
                      />
                      <Axis name="cluster_count" />
                      <Tooltip />
                      <Geom type="interval" position="country*cluster_count" />
                    </Chart>
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