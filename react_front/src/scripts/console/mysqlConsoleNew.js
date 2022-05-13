import React, { Component, } from "react";
import { List, WindowScroller } from 'react-virtualized';
import 'react-virtualized/styles.css'; // only needs to be imported once
import OtherComponent from "./OtherComponent"
const list = [
  { name: 'test1', description: 'description1' },
  { name: 'test2', description: 'description2' },
  { name: 'test3', description: 'description3' },
  { name: 'test4', description: 'description4' },
  { name: 'test5', description: 'description5' },
  { name: 'test6', description: 'description6' },
  { name: 'test7', description: 'description7' }
];
class mysqlConsoleNew extends Component {
  render() {
    const height = parseInt(document.body.clientHeight);
    const rowHeight = 120;
    const width = parseInt(document.body.clientWidth);
    const renderItem = ({ index, key, style }) => {
      return (
        <div key={key} style={style}>
          <OtherComponent data={list[index]} />
        </div>
      )
    }
    return (
      <div>
          <WindowScroller>
            {({ isScrolling, onChildScroll, scrollTop  }) => (
              <List
                autoHeight
                height={height}
                isScrolling={isScrolling}
                onScroll={onChildScroll}
                rowCount={list.length}
                rowHeight={rowHeight}
                rowRenderer={renderItem}
                scrollTop={scrollTop}
                width={width}
              />
            )}
          </WindowScroller>
      </div>
    )
  }
}
export default mysqlConsoleNew;