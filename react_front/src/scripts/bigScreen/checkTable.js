import React from 'react'
import {Popover, Table, table} from 'antd'

class CheckScreenTable extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
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
        return (
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
              scroll={{ y: 235,x:true }}
              pagination={false}
            />
        )
    }
}

export default CheckScreenTable;
