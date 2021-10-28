import React from 'react';
import { Input } from 'antd';
import axios from "axios";
import {backendServerApiRoot} from "../common/util";
const TextArea = Input.TextArea;

export default class PreviewSQL extends React.Component {
    constructor(props) {
        super(props);
        let { submit_sql_uuid } = this.props
        this.state = { submit_sql_uuid: submit_sql_uuid, submit_sql :[]};
    };
    componentDidMount() {
        this.GetSubmitSqlByUuid();
    }
    //预览SQL
    async GetSubmitSqlByUuid() {
        let params = {
            submit_sql_uuid: this.state.submit_sql_uuid,
        };
        let res = await axios.post(`${backendServerApiRoot}/get_submit_sql_by_uuid/`,params);
        console.log("SQL预览:",res.data);
        this.setState({
            submit_sql:res.data.data,
        })
    };

  render() {
      return(
            <TextArea wrap="off" style={{minHeight:300,overflow:"scroll"}} value={this.state.submit_sql}/>
          )

  }
}