import React,{Component} from 'react';
import 'antd/dist/antd.css';
import { Table,Popover } from 'antd';
import { Resizable } from 'react-resizable';

const ResizeableTitle = props => {
  const { onResize, width, ...restProps } = props;
  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

export class MyResizeTable extends Component {
  state = {
    columns: this.props.columns
  };

  components = {
    header: {
      cell: ResizeableTitle,
    },
  };

  handleResize = index => (e, { size }) => {
    this.setState(({ columns }) => {
      const nextColumns = [...columns];
      nextColumns[index] = {
        ...nextColumns[index],
        width: size.width,
      };
      return { columns: nextColumns };
    });
  };

  render() {
    const columns = this.state.columns.map((col, index) => ({
      ...col,
      onHeaderCell: column => ({
        width: column.width,
        onResize: this.handleResize(index),
      }),
    }));

    return <Table pagination={{defaultPageSize: 2000}} className="rowStyle" scroll={{x:'true',y:320}} size= "small" bordered={true} components={this.components} columns={columns} dataSource={this.props.dataSource} />;
  }
}
