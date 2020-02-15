import React from 'react';
import {Table} from 'antd';
import axios from "axios";
import {backendServerApiRoot} from "../common/util";
export default class ExecuteSqlResults extends React.Component {
    constructor(props) {
        super(props);
        let { submit_sql_uuid } = this.props
        this.state = { submit_sql_uuid: submit_sql_uuid, submit_sql :[]};
    };
    componentDidMount() {
        this.ViewExecuteSubmitSqlResultsByUuid();
    }
    //查看SQL执行结果
    async ViewExecuteSubmitSqlResultsByUuid() {
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
        };
        let res = await axios.post(`${backendServerApiRoot}/get_execute_submit_sql_results_by_uuid/`,{params},{withCredentials: true});
        this.setState({
            execute_sql_results: res.data.data,
            ViewExecuteSubmitSqlModalVisible:true,
        });
        console.log("SQL执行结果:",res.data)
    };

  render() {
        const execute_results_columns = [
            {
              title: 'Id',
              dataIndex: 'inception_id',
              key: "inception_id",
              width:50,
            },
            {
              title: '错误代码',
              dataIndex: 'inception_error_level',
              key:"inception_error_level",
              width:100,
            },
            {
              title: '阶段',
              dataIndex: 'inception_stage',
              key:"inception_stage",
              width:100,
            },
            {
              title: '错误信息',
              dataIndex: 'inception_error_message',
              key:"inception_error_message",
              width:540,
            },
            {
              title: 'sql',
              dataIndex: 'inception_sql',
              key:"inception_sql",
              width:540,
            },
            {
              title: '实际影响行数',
              dataIndex: 'inception_affected_rows',
              key: "inception_affected_rows"
            },
            {
              title: '执行时间',
              dataIndex: 'inception_execute_time',
              key: "inception_execute_time",
              width:90,
            },

        ];
      return(
          <Table
              dataSource={this.state.execute_sql_results}
              columns={execute_results_columns}
              bordered
              rowKey={(row ,index) => index}
              rowClassName={(record, index) => {
                  let className = 'row-detail-default ';
                  if (record.inception_error_level  !== "执行成功") className = 'row-detail-red';
                  return className;
              }}
              size="small"
          />
          )

  }
}