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
        year: "bj10_trans_00",
        sales: 500
      },
      {
        year: "bj10_trans_01",
        sales: 500
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
      {
        year: "bj10_trans_06",
        sales: 48
      },
      {
        year: "bj10_trans_07",
        sales: 48
      },
      {
        year: "bj10_trans_08",
        sales: 48
      },
      {
        year: "bj10_trans_09",
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
                  data={zhuzhuangtu_data_1}
                  scale={zhuzhuangtu_cols_1}
                  forceFit
                  height={130}
                  padding={{ top: 10, right: 20, bottom: 20, left: 50 }}
                  plotBackground={{
                    stroke:null  //边框颜色
                  }}
                  style={{color:'white',textAlign:'center',marginTop:10}}
                >
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
