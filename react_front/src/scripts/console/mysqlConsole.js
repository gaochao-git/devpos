import React,{Component} from 'react';
import { Table, Input,Badge,Button } from "antd";
import { UnControlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/sql-hint.js';
import 'codemirror/theme/ambiance.css';
import 'codemirror/addon/selection/active-line';

export default class mysqlConsole extends Component {
  state = {
    content: ''
  }

  //编辑器内容变动后就修改state
  onChange = (editor, data, sql)=>{
    this.setState({content: sql});
  }

  render() {
    return (
      <div>
        <CodeMirror
          value={this.state.content}
          options={{
            lineNumbers: true,
            mode: {name: "text/x-mysql"},
            extraKeys: {"Tab": "autocomplete"},
            theme: 'ambiance',
            styleActiveLine: true,
            lineWrapping:true
          }}
          onChange={this.onChange}
        />
      </div>
    );
  }
}