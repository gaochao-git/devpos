import React from 'react'
import {Popover, Table, table} from 'antd'

class ClusterScreenTable extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
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
        return (
            <Table
              columns={mock_tdb_columns}
              dataSource={mock_tdb_data}
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
              scroll={{ y: 235}}
              pagination={false}
            />
        )
    }
}
export default ClusterScreenTable;