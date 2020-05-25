// import React from 'react';
// import {Table} from 'antd';
// import axios from "axios";
// import {backendServerApiRoot} from "../common/util";
// const Column = Table.Column;
// //const server = 'http://192.168.0.104:8000';
//
// export default class ViewCheckSqlResult extends React.Component {
//     constructor(props) {
//         super(props);
//         let { submit_sql_uuid } = this.props
//         this.state = { submit_sql_uuid: submit_sql_uuid,view_check_sql_result:[]};
//     };
//     componentDidMount() {
//         this.GetSqlCheckResultsByUuid();
//     }
//
//     //查看SQL审核结果
//     async GetSqlCheckResultsByUuid(uuid) {
//         let params = {
//             submit_sql_uuid: this.state.submit_sql_uuid,
//         };
//         let res = await axios.post(`${backendServerApiRoot}/get_check_sql_results_by_uuid/`,{params});
//         console.log("SQL审核结果:",res.data.data);
//         this.setState({
//             view_check_sql_result:res.data.data,
//         })
//     };
//
//   render() {
//       // const check_results_columns = [
//       //       {
//       //         title: 'SQL',
//       //         dataIndex: 'inception_sql',
//       //         key: "inception_sql",
//       //         width:600
//       //       },
//       //       {
//       //         title: '状态',
//       //         dataIndex: 'inception_stage_status',
//       //         key:"inception_stage_status",
//       //       },
//       //       {
//       //         title: '错误代码',
//       //         dataIndex: 'inception_error_level',
//       //         key:"inception_error_level",
//       //         sorter: (a, b) => a.inception_error_level - b.inception_error_level,
//       //       },
//       //       {
//       //         title: '错误信息1111',
//       //         dataIndex: 'inception_error_message',
//       //         key:"inception_error_message",
//       //       },
//       //       {
//       //         title: '影响行数',
//       //         dataIndex: 'inception_affected_rows',
//       //         key:"inception_affected_rows",
//       //       }
//       //   ];
//       return(
//           <Table
//               dataSource={this.state.view_check_sql_result}
//               rowKey={(row ,index) => index}
//                                                     rowClassName={(record, index) => {
//                                                 let className = 'row-detail-default ';
//                                                 if (record.inception_error_level === 2) {
//                                                     className = 'row-detail-error';
//                                                     return className;
//                                                 }else if (record.inception_error_level  === 0){
//                                                     className = 'row-detail-success';
//                                                     return className;
//                                                 }else if (record.inception_error_level  === 1){
//                                                     className = 'row-detail-warning';
//                                                     return className;
//                                                 }else {
//                                                     return className;
//                                                 }
//                                     }}
//                             pagination={true}
//                             size="small"
//                             columns={check_results_columns}
//
//           >
//               {/*<Column title="SQL" dataIndex="inception_sql" width="50%"/>*/}
//               {/*<Column title="状态" dataIndex="inception_stage_status" width="10%"/>*/}
//               {/*<Column title="错误代码" dataIndex="inception_error_level" width="5%"*/}
//               {/*/>*/}
//               {/*<Column title="错误信息"*/}
//               {/*        dataIndex="inception_error_message"*/}
//               {/*        render={val => {*/}
//               {/*                              if (val !== "None"){*/}
//               {/*                                  return <span style={{color:"#52c41a"}}>{val}</span>*/}
//               {/*                              }else {*/}
//               {/*                                  return <span style={{color:"#bfbfbf"}}>{val}</span>*/}
//               {/*                              }*/}
//               {/*                          }*/}
//               {/*        }*/}
//               {/*/>*/}
//               {/*/!*<Column title="错误信息" dataIndex="inception_error_message"/>*!/*/}
//               {/*<Column title="影响行数" dataIndex="inception_affected_rows" width="5%"/>*/}
//           </Table>
//       )
//   }
// }