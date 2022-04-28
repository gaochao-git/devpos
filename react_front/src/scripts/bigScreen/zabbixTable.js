import React from 'react'
import {Popover, Table, table,message} from 'antd'
import {backendServerApiRoot} from "../common/util";
import MyAxios from "../common/interface"


class ZabbixScreenTable extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            //时间对象
           zabbix_data:[]
        }
    }
    componentDidMount(){
        this.timer2= setInterval(() => {
            this.getUserInfo()
        }, 1000);
    }
    componentWillUnmount() {
      if (this.timer2 != null) {
        clearInterval(this.timer2);
      }
    }
    async getUserInfo() {
        await MyAxios.post('/v2/v2_get_login_user_info/').then(
            res => {
                if(res.data.status==="ok")
                {
                    console.log(res.data.data)
                }else
                {
                   message.error(res.data.message)
                }
            }
        ).catch(err => {message.error(err.message)})
    }

    render() {
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
        return (
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
        )
    }
}
export default ZabbixScreenTable;