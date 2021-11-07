import React from 'react'
import {Popover, Table, table} from 'antd'


export class CreateSimpleTable extends React.Component {
    constructor(props) {
        super(props);

    }

    getColumn = (index, length) => {
        return (
            {
                title: index,
                dataIndex: index,
                width: '5%',
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
        let columns = [];
        if (this.props.data.length === 0) {
            return []
        }
        let length = 30;
        let keys = Object.keys(this.props.data[0]).length;
        if (keys < 6) {
            length = Math.floor(300 / keys)
        }
        console.log(length);
        for (let key in this.props.data[0]) {
            columns.push(this.getColumn(key, length))
        }
        return columns
    };

    render() {
        return (
            <Table columns={this.getColumns()} dataSource={this.props.data}
                   pagination={this.props.pagination}
                   scroll={this.props.scroll}
            />
        )
    }
}