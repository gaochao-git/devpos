import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import { FixedSizeList as List } from 'react-window';
import {Layout, Table, Input,Badge,Button,message,Row,Col,Select,Tabs,Icon,Tree,Spin } from "antd";

const MIN_NUMBER_OF_PARENTS = 500;
const MAX_NUMBER_OF_CHILDREN = 30;
const MAX_DEEPNESS = 4;

const Column = ({ index, style }) => (
  <div className={index % 2 ? 'ListItemOdd' : 'ListItemEven'} style={style}>
    Column {index}
  </div>
);
const listData = ['axxxxxx','bxxxx','cxxxx','dxxxx','exxxxx'];

export default class MysqlConsoleNew extends Component {
  render() {
    return (
      <List
        className="List"
        height={100}
        itemCount={listData.length}
        itemSize={30}
        itemData={listData}
        width={100}
      >
        {({ index, style, data }) => {
          let item = data[index];
          return <Button style={index.style} type="primary" onClick={()=> message.success(1111)}>{item}</Button>
        }}
      </List>
    );
  }
}
