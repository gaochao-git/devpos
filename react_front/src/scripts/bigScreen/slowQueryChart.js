import React from 'react'
import {G2,Chart,Geom,Axis,Tooltip,Coord,Label,Legend,View,Guide,Shape,Facet,Util} from 'bizcharts';
import {Popover, Table, table} from 'antd'

class SlowQueryChart extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
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
        )
    }
}

export default SlowQueryChart;
