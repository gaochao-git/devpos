import React from 'react'
import {G2,Chart,Geom,Axis,Tooltip,Coord,Label,Legend,View,Guide,Shape,Facet,Util} from 'bizcharts';
import {Popover, Table, table} from 'antd'

class ServerScreenChart extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
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
        return (
            <Chart
            height={100}
            data={line_mock_data}
            scale={cols}
            forceFit
            padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
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
        )
    }
}

export default ServerScreenChart;
