import React,{Component,Fragment} from 'react';
import axios from 'axios'
import {Select,Tabs,Icon} from "antd";
import {BaseConsole} from './baseConsole'
const {Option} = Select
const {TabPane} = Tabs


export default class mysqlConsole extends Component {
  constructor(props) {
    super(props);
    this.newTabIndex = 1;
    const panes = [{ title: '新建查询0', content: 'Content of Tab Pane 1', key: '1' }];
    this.state = {
      activeKey: panes[0].key,
      panes:panes,
    }
  }

  componentDidMount() {
    console.log(1111)
  }
  onChange = activeKey => {
    this.setState({ activeKey });
  };

  onEdit = (targetKey, action) => {
    this[action](targetKey);
  };

  add = () => {
    const { panes } = this.state;
    const activeKey = `新建查询${this.newTabIndex++}`;
    console.log(activeKey)
    panes.push({ title: activeKey, content: 'Content of new Tab', key: activeKey });
    this.setState({ panes, activeKey });
  };

  remove = targetKey => {
    let { activeKey } = this.state;
    let lastIndex;
    this.state.panes.forEach((pane, i) => {
      if (pane.key === targetKey) {
        lastIndex = i - 1;
      }
    });
    const panes = this.state.panes.filter(pane => pane.key !== targetKey);
    if (panes.length && activeKey === targetKey) {
      if (lastIndex >= 0) {
        activeKey = panes[lastIndex].key;
      } else {
        activeKey = panes[0].key;
      }
    }
    this.setState({ panes, activeKey });
  };

  render() {
    return (
      <div>
          <Tabs
            onChange={this.onChange}
            activeKey={this.state.activeKey}
            type="editable-card"
            onEdit={this.onEdit}
          >
            {this.state.panes.map(pane => (
              <TabPane tab={pane.title} key={pane.key} closable={pane.closable}>
                <BaseConsole {...this.state}/>
              </TabPane>
            ))}
            </Tabs>
      </div>
    );
  }
}