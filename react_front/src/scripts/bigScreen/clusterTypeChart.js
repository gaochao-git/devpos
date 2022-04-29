import React from 'react'
import {G2,Chart,Geom,Axis,Tooltip,Coord,Label,Legend,View,Guide,Shape,Facet,Util} from 'bizcharts';
import {Popover, Table, table} from 'antd'
import {DataSet} from '@antv/data-set';

class ClusterTypeChart extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        //横向柱状图
    const zhuzhuangtu_data = [
      {
        country: "TiDB",
        cluster_count: 15
      },
      {
        country: "MySQL",
        cluster_count: 320
      },
      {
        country: "GoldenDB",
        cluster_count: 8
      },
      {
        country: "SQLServer",
        cluster_count: 4
      },
      {
        country: "达梦",
        cluster_count: 2
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
        return (
            <Chart
            height={150}
            data={dv_zhuzhuangtu}
            padding={{ top: 10, right: 20, bottom: 20, left: 75 }}
            forceFit
            >
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
        )
    }
}

export default ClusterTypeChart;
