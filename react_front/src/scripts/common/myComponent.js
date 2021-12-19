import React from 'react'
import { Tree, Icon } from 'antd';
const { TreeNode } = Tree;

export class MyTree extends React.Component {
  onExpand = (selectedKeys, info) => {
    console.log('onExpand', selectedKeys, info);
  };

  render() {
    return (
      <Tree
        showIcon
//        defaultExpandedKeys={['0-0-0']}
        onSelect={this.onSelect}
        onExpand={this.onExpand}
      >
        <TreeNode title="eagle(172.16.1.216_3306_同城备)" selectable={false} key="172.16.1.216_3306" icon={<Icon type="cloud" />}>
          <TreeNode title="database1" selectable={false} key="172.16.1.216_3306:database1" icon={<Icon type="database" />}>
            <TreeNode title="table1" selectable={false}  key="172.16.1.216_3306:database1.table1" icon={<Icon type="table" />}>
              <TreeNode title="leaf" key="1-1-1-1" />
              <TreeNode title="leaf" key="1-1-1-2" />
              <TreeNode title="leaf" key="1-1-1-3" />
            </TreeNode>
          </TreeNode>
          <TreeNode title="database2" selectable={false} key="172.16.1.216_3306:database2" icon={<Icon type="database" />}>
            <TreeNode title="table1" selectable={false}  key="172.16.1.216_3306:database2.table1" icon={<Icon type="table" />}>
              <TreeNode title="leaf" key="1-2-1-1" />
              <TreeNode title="leaf" key="1-2-1-2" />
              <TreeNode title="leaf" key="1-2-1-3" />
            </TreeNode>
          </TreeNode>
        </TreeNode>
        <TreeNode title="cloud(172.16.1.220_3306_同城备)" selectable={false} key="172.16.1.220_3306" icon={<Icon type="cloud" />}>
          <TreeNode title="database1" selectable={false}  key="2-1" icon={<Icon type="database" />}>
            <TreeNode title="table1" selectable={false}  key="2-1-1" icon={<Icon type="table" />}>
              <TreeNode title="leaf" key="2-1-1-1" />
              <TreeNode title="leaf" key="2-1-1-2" />
              <TreeNode title="leaf" key="2-1-1-3" />
            </TreeNode>
          </TreeNode>
          <TreeNode title="database2" selectable={false}  key="2-2" icon={<Icon type="database" />}>
            <TreeNode title="table1" selectable={false}  key="2-2-1" icon={<Icon type="table" />}>
              <TreeNode title="leaf" key="2-2-1-1" />
              <TreeNode title="leaf" key="2-2-1-2" />
              <TreeNode title="leaf" key="2-2-1-3" />
            </TreeNode>
          </TreeNode>
        </TreeNode>

      </Tree>
    );
  }
}


export class MyTree1 extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Tree
        treeData={this.props.treeData}
        showIcon
        onSelect={this.props.onSelect}
        onExpand={this.onExpand}
      />
    );
  }
}


export class MyTree2 extends React.Component {
  constructor(props) {
    super(props);
    this.state.treeData = this.props.state.treeData
  }

  onLoadData = treeNode =>
    new Promise(resolve => {
      if (treeNode.props.children) {
        resolve();
        return;
      }
      setTimeout(() => {
        treeNode.props.dataRef.children = [
          { title: 'Child Node', key: `${treeNode.props.eventKey}-0` },
          { title: 'Child Node', key: `${treeNode.props.eventKey}-1` },
        ];
        this.setState({
          treeData: [...this.state.treeData],
        });
        resolve();
      }, 1000);
    });

  renderTreeNodes = data =>
    data.map(item => {
      if (item.children) {
        return (
          <TreeNode title={item.title} key={item.key} dataRef={item}>
            {this.renderTreeNodes(item.children)}
          </TreeNode>
        );
      }
      return <TreeNode key={item.key} {...item} dataRef={item} />;
    });

  render() {
    return <Tree loadData={this.onLoadData}>{this.renderTreeNodes(this.state.treeData)}</Tree>;
  }
}