import React from 'react';
import { Input,Popover, Table, table } from 'antd';
import axios from "axios";
import {backendServerApiRoot} from "../common/util";
const TextArea = Input.TextArea;

export class AditSqlTable extends React.Component {
    constructor(props) {
        super(props);

    }
    render() {
        const audit_columns = [
            {
              title: 'ID',
              dataIndex: 'ID',
            },
            {
              title: 'stage',
              dataIndex: 'stage',
            },
            {
              title: 'SQL',
              dataIndex: 'SQL',
            },
            {
              title: '状态',
              dataIndex: 'stagestatus',
            },
            {
              title: '错误代码',
              dataIndex: 'errlevel',
              sorter: (a, b) => a.errlevel - b.errlevel,
            },
            {
              title: '错误信息',
              dataIndex: 'errormessage',
            },
            {
              title: '影响行数',
              dataIndex: 'Affected_rows',
              sorter: (a, b) => a.Affected_rows - b.Affected_rows,
            },
            {
              title: 'SQL类型',
              dataIndex: 'command',
            },
            {
              title: '执行时间',
              dataIndex: 'inception_execute_time',
            },
        ];
        return (
            <Table
                rowKey={(row ,index) => index}
                columns={audit_columns}
                dataSource={this.props.data}
                pagination={this.props.pagination}
                scroll={this.props.scroll}
                size="small"
                rowClassName={(record, index) => {
                    let className = 'row-detail-default ';
                    if (record.errlevel === 2) {
                        className = 'row-detail-error';
                        return className;
                    }else if (record.errlevel  === 0){
                        className = 'row-detail-success';
                        return className;
                    }else if (record.errlevel  === 1){
                        className = 'row-detail-warning';
                        return className;
                    }else {
                        return className;
                    }
                }}
            />
        )
    }
}