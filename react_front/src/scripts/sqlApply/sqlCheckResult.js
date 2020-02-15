import React from 'react';
import {Table} from 'antd';
import axios from "axios";
import {backendServerApiRoot} from "../common/util";
const Column = Table.Column;
const server = 'http://192.168.0.104:8000';

export default class ViewCheckSqlResult extends React.Component {
    constructor(props) {
        super(props);
        let { submit_sql_uuid } = this.props
        this.state = { submit_sql_uuid: submit_sql_uuid,view_check_sql_result:[]};
    };
    componentDidMount() {
        this.GetSqlCheckResultsByUuid();
    }

    //查看SQL审核结果
    async GetSqlCheckResultsByUuid(uuid) {
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
        };
        let res = await axios.post(`${server}/get_check_sql_results_by_uuid/`,{params});
        console.log("SQL审核结果:",res.data.data);
        this.setState({
            view_check_sql_result:res.data.data,
        })
    };

  render() {
      return(
          <Table
              dataSource={this.state.view_check_sql_result}
              rowKey={(row ,index) => index}
              pagination={true}
              size="small"

          >
              <Column title="SQL" dataIndex="inception_sql" width="50%"/>
              <Column title="状态" dataIndex="inception_stage_status" width="10%"/>
              <Column title="错误代码" dataIndex="inception_error_level" width="5%"/>
              <Column title="错误信息" dataIndex="inception_error_message"/>
              <Column title="影响行数" dataIndex="inception_affected_rows" width="5%"/>
          </Table>
      )
  }
}