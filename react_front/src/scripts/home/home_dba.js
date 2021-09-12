import React,{Component} from 'react';
import {G2,Chart,Geom,Axis,Tooltip,Coord,Label,Legend,View,Guide,Shape,Facet,Util} from 'bizcharts';
import { Table, Button,Row,Card, Col,Statistic,Icon,Modal,Input ,Popover,Form} from 'antd';
import { Alert, message } from 'antd';
import { Link } from 'react-router-dom';
import {Redirect}  from 'react-router-dom';
import {Highlighter} from 'react-highlight-words';
import {DataSet} from '@antv/data-set';
const { Column } = Table;

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
    };
  }

  componentDidMount() {
//    this.getServerTypeData();
//    this.getServerMysqlRedisData();
//    this.getCallData();
//    this.getWarrantyServerData();
//    this.getWarrantyServerDetailData();
//    this.getWorkSheetData();
//    this.getMysqlRedisInstanceCountData();
//    this.getMysqlSlowTopData();
//    this.getMysqlSlowHistoryData();
//    this.getRotateDbaData();
//    //this.getNrpeAlertData();
//    this.getAgentInspectionData();
//    this.getMysqlInspectionData();
//    this.getMysqlClusterTypeCountData();
//    this.getMysqlVersionData();
//    this.getMysqlNeedUpgradeCountHistoryData()
//    this.getBuType()
//    this.getMySQLArchiveErrorData()
  }



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
      ...message.success('cluster_name'),
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
      ...message.success('first_bu_name'),
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
      ...message.success('second_bu_name'),
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

    return (
        <div>
          <Row style={{marginTop:'15px',height:'200px',background:''}} gutter={16}>
            <Col span={6} style={{}}>
              <Card bordered={true} style={{ background:'',height:'200px'}}>
                <p style={{color:''}}>今日电话报警数量</p>
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
              <Card bordered={true} style={{ background:'',height:'200px'}}>
                <p style={{color:''}}>当前过保机器数量 <Icon style={{color:'green'}} type="eye" onClick={()=>{this.showWarrantyServerModalHandle()}}/></p>
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
              <Card bordered={true} style={{ background:'',height:'200px'}}>
                <p style={{color:''}}>今日工单数量</p>
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
              <Card bordered={true} style={{ background:'',height:'200px'}}>
                <p>DBA值班人员列表  <Icon style={{color:'green'}} type="eye" onClick={()=>{this.showRotateDbaModalHandle()}}/></p>
                <p>今日值班DBA：{this.state.RotateDBATodayData}</p>
                <p>值班时间：晚8点～次日上午10点</p>
                <br/>
                <p style={{fontSize:'16px',color:'red'}}>注：非值班期间找对应业务线DBA </p>
              </Card>
            </Col>
          </Row>
          <Row style={{marginTop:'10px'}}>
            <Col span={14} style={{background:'white'}}>
                <p style={{color:''}}>今日慢查询Top10</p>
                <Chart
                height={300}
                data={this.state.MysqlSlowTop10Data}
                forceFit
                padding={{ top: 20, right: 100, bottom: 70, left:80}}
                onPlotClick={ev => {
                  // console.log(ev.data._origin.instance_name)
                  this.getMysqlSlowDetailData(ev.data._origin.instance_name)
                }}
                >
                    <Axis
                    name="instance_name"
                    //title={null}
                    label={label}
                    />
                    <Axis name="slow_log_count" />
                    <Tooltip
                        crosshairs={{
                        type: "y"
                        }}
                    />
                    <Geom
                    type="interval"
                    position="instance_name*slow_log_count"
                    style={{
                        stroke: "#DAA520",
                        lineWidth: 1,
                        fill:"#DAA520"
                      }}
                    />
                </Chart>
            </Col>
            <Col span={10} style={{background:'white'}}>
                <p style={{color:''}}>踢库信息</p>
                <Chart
                data={this.state.MysqlSlowTotalHistoryData}
                //scale={cols3}
                forceFit
                padding={{ top: 20, right: 40, bottom: 50, left:60 }}
                height={300}
                >
                  <Axis
                    name="stat_date"
                    title={null}
                    tickLine={null}
                    line={{
                      stroke: "#E6E6E6"
                    }}
                  />
                  <Axis
                    name="slow_log_total"
                    line={false}
                    tickLine={null}
                    grid={null}
                    title={null}
                  />
                  <Tooltip />
                  <Geom
                    type="line"
                    position="stat_date*slow_log_total"
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
            </Col>
          </Row>
          <Row style={{marginTop:'10px',height:'200px',background:''}} gutter={16}>
          <Col span={6}>
              <Card bordered={true} style={{ background:'',height:'200px'}}>
                <p style={{color:''}}>Agent 巡检异常数量 <Icon style={{color:'green'}} type="eye" onClick={()=>{this.showAgentInspectionModalHandle()}}/></p>
                <p style={{textAlign:'center',fontSize:'20px',color:'#FFD306'}}>{this.state.AgentInspectionTotalCountData}</p>
                <p style={{color:''}}>MySQL归档失败数量 <Icon style={{color:'green'}}
                                                          type="eye" onClick={()=>{this.setState({ArchiveInfoVisible:true})}}/></p>
                <p style={{textAlign:'center',fontSize:'20px',color:'#FFD306'}}>{this.state.ArchiveInfoCount}</p>
              </Card>

            </Col>
            <Col span={6}>
              <Card bordered={true} style={{ background:'',height:'200px'}}>
                <p style={{color:''}}>MySQL待升级版本 <Icon style={{color:'green'}} type="eye" onClick={()=>{this.showMysqlVsersionModalHandle()}}/></p>
                <p style={{fontSize:'20px',color:'#FFD306'}}>{this.state.MysqlVersionTotalCountData}</p>
                <Chart
                data={this.state.MysqlNeedUpgradeHistoryData}
                //scale={work_sheet_scale}
                forceFit
                height={80}
                padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <Tooltip />
                  <Geom
                    type="area"
                    position="stat_date*need_upgrade_count"
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
                    position="stat_date*need_upgrade_count"
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
              <Card bordered={true} style={{ background:'',height:'200px'}}>
                <p style={{color:''}}>MySQL巡检异常数量 <Icon style={{color:'green'}} type="eye" onClick={()=>{this.showMysqlInspectionModalHandle()}}/></p>
                <p style={{textAlign:'center',fontSize:'30px',color:'#FFD306'}}>{this.state.MysqlInspectionTotalCountData}</p>
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={true} style={{ background:'',height:'200px'}}>
                <p style={{color:''}}>MySQL实例数量：{this.state.MysqlInstanceCountData}</p>
                <p style={{color:''}}>Redis实例数量：{this.state.RedisInstanceCountData}</p>
              </Card>
            </Col>
          </Row>
          <Row style={{marginTop:'10px',background:''}} gutter={16}>
            <Col span={12}>
              <Card bordered={true} style={{ background:''}}>
                <Chart
                  height={200}
                  data={server_view1}
                  //scale={cols1}
                  forceFit
                  //style={{width: '100%',float:'left',background:'red',paddingRight:'20px'}}
                  >
                  <Legend />
                  <Axis
                    name="stat_date"
                    title={null}
                  />
                  <Axis
                    name="count"
                    title={null}
                    label={{
                      formatter: val => `${val}`
                    }}
                  />
                  <Tooltip
                    crosshairs={{
                      type: "y"
                    }}
                  />
                  <Geom
                    type="area"
                    position="stat_date*count"
                    size={2}
                    color={"type"}
                    shape={""}
                  />
                  <Geom
                    type="point"
                    position="stat_date*count"
                    size={2}
                    shape={"circle"}
                    color={"type"}
                    style={{
                      stroke: "#fff",
                      lineWidth: 1
                    }}
                  />
                </Chart>
                  <Chart
                    height={200}
                    data={dv2}
                    forceFit
                    >
                    <Legend />
                    <Axis
                      name="stat_date"
                      title={null}
                    />
                    <Axis
                      name="count"
                      title={null}
                      label={{
                        formatter: val => `${val}`
                      }}
                    />
                    <Tooltip
                      crosshairs={{
                        type: "y"
                      }}
                    />
                    <Geom
                      type="area"
                      position="stat_date*count"
                      size={2}
                      color={"type"}
                      shape={"smooth"}
                    />
                    <Geom
                      type="point"
                      position="stat_date*count"
                      size={2}
                      shape={"circle"}
                      color={"type"}
                      style={{
                        stroke: "#fff",
                        lineWidth: 1
                      }}
                    />
                  </Chart>
              </Card>
            </Col>
            <Col span={12}>
              <Card bordered={true} style={{ background:''}}>
              <Chart
                    height={400}
                    data={mysql_cluster_type_view}
                    //scale={alert_scale}
                    padding={{ top: 0, right: 0, bottom: 0, left: 0}}
                    forceFit
                  >
                    <Coord type={"theta"} radius={0.5} innerRadius={0.8} />
                    <Axis name="percent" />
                    <Guide>
                      <Html
                        position={["50%", "50%"]}
                        html={'<div style="font-size:10px;text-align: center;width: 10em;">MySQL<br><span style="font-size:10px">' + '集群分布' + '</span></div>'}
                        alignX="middle"
                        alignY="middle"
                      />
                    </Guide>
                    <Geom
                      type="intervalStack"
                      position="percent"
                      color="item"
                    >
                      <Label
                        content="percent"
                        formatter={(val, item) => {
                          return item.point.item + "：" + item.point.count;
                        }}
                      />
                    </Geom>
                  </Chart>
                </Card>
            </Col>
          </Row>
          <Row style={{marginTop:'10px'}} gutter={24}>
          <Col  span={24}>
            <Card bordered={true} style={{ background:''}}>
              <p style={{color:''}}>MySQL部门分布<Icon style={{color:'green'}} type="eye" onClick={()=>{this.getBuLevelInfo()}}/></p>
            <Chart
                    height={300}
                    data={this.state.ClusterBuType}
                    //scale={alert_scale}
                    padding={{ top: 0, right: 0, bottom: 0, left: 0}}
                    forceFit
                  >
                    <Coord type={"theta"} radius={0.5} innerRadius={0.8} />
                    <Axis name="percent" />

                    <Geom
                      type="intervalStack"
                      position="percent"
                      color="item"
                    >
                      <Label
                        content="percent"
                        formatter={(val, item) => {
                          return item.point.item + "：" + item.point.count;
                        }}
                      />
                    </Geom>
                  </Chart>
                  </Card>
            </Col>
          </Row>
        </div>
     );
  }
}

export default HomeDbaInfo