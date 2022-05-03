import React from 'react'
import {Popover, Table, table,message} from 'antd'

export class MyTable extends React.Component {
    constructor(props) {
        super(props);
    }
    state = {
            current_page_number:0,
            current_page_size:10

        }

    getColumn = (index, length) => {
        return (
            {
                title: index,
                dataIndex: index,
                render: (text) => {
                    return ((text && text.length > length) ?
                        <Popover placement="bottom"
                                 overlayStyle={{width: 'max-content'}}
                                 content={<pre
                                     style={{
                                         wordWrap: 'break-word',
                                         whiteSpace: 'pre-wrap',
                                     }}>{text}</pre>}>
                            <span>{text.slice(0, length)}...</span>
                        </Popover> : <span>{text}</span>)
                }
            }
        )
    };

    getColumns = () => {
        if (this.props.dataSource.length === 0) {
            return []
        }
        let columns = [];
        if (this.props.columns) {
            columns = this.props.columns
        }
        else
        {
            let length = 60;  // tooltip长度
            let keys = Object.keys(this.props.dataSource[0]).length;
            if (keys < 6) {
                length = Math.floor(300 / keys)
            }
            columns.push({
                title:'序号',
                render:(text,record,index) => {
                    return (
                        this.state.current_page_number>0 ?
                        <span>{(this.state.current_page_number-1)*this.state.current_page_size+index+1}</span>
                        :
                        <span>{index+1}</span>
                    )
                }
            })
            for (let key in this.props.dataSource[0]) {
                columns.push(this.getColumn(key, length))
            }

        }
        return columns
    };

    getPagination = () => {
        let pagination = {};
        if (this.props.pagination) {
            pagination = this.props.pagination;
        }else
        {
           pagination={
               showTotal: ((total) => {return `共 ${total} 条`}),
               pageSizeOptions: ['10', '20', '30', '40', '50', '100', '500', '1000'],
               showSizeChanger: true,
               defaultPageSize: 10,
               defaultCurrent: 1,
               showQuickJumper:true,
               defaultCurrent:1,
               onChange: ((page, pageSize) => {
                                this.setState({current_page_number:page,current_page_size:pageSize})
                            }),
               onShowSizeChange: (page) => {
                   console.log(page)
               }
           }
        }
        return pagination
    };

    render() {
        return (
            <Table
                dataSource={this.props.dataSource}
                columns={this.getColumns()}
                pagination={this.getPagination()}
                scroll={this.props.scroll}
                size="small"
            />
        )
    }
}