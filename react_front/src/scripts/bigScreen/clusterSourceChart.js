import React from 'react'
import {G2,Chart,Geom,Axis,Tooltip,Coord,Label,Legend,View,Guide,Shape,Facet,Util} from 'bizcharts';
import {Popover, Table, table} from 'antd'
import {DataSet} from '@antv/data-set';

class ServerSourceChart extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
    const { Html } = Guide;
    const ds = new DataSet();
    const { DataView } = DataSet;
    const alert_view = new DataView();
    //饼图
    const bingtu_data = [
      {
        item: "麒麟/海光X86",
        count: 30
      },
      {
        item: "Centos/IntelX86",
        count: 50
      },
      {
        item: "麒麟/鲲鹏Arm",
        count: 20
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
        return (
            <Chart
                      height={160}
                      data={bingtu_dv}
                      scale={bingtu_cols}
                      padding={{ top: 15, right: 20, bottom: 60, left: 30 }}
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
                          html="<div style=&quot;color:#8c8c8c;font-size:0.6em;text-align: center;width: 10em;&quot;>200套</div>"
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
                            return item.point.item + ": \n" + val;
                          }}
                          textStyle= {{
                            //textAlign: 'center', // 文本对齐方向，可取值为： start middle end
                            fill: '#5BBFBB', // 文本的颜色
                            fontSize: '12', // 文本大小
//                            fontWeight: 'bold', // 文本粗细
                            //textBaseline: 'top' // 文本基准线，可取 top middle bottom，默认为middle
                          }}
                        />
                      </Geom>
                    </Chart>
        )
    }
}

export default ServerSourceChart;
