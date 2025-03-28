import React from 'react';
import { Input,Popover, Table, table } from 'antd';
import axios from "axios";
import {backendServerApiRoot} from "../common/util";
import { UnControlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/sql-hint.js';
import 'codemirror/theme/ambiance.css';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/display/fullscreen.js'
import 'codemirror/addon/scroll/simplescrollbars.js'
import 'codemirror/addon/scroll/simplescrollbars.css'
const TextArea = Input.TextArea;


export class ReadCodemirror extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <CodeMirror
              editorDidMount={this.props.editorDidMount}
              value={this.props.value}
              options={{
                lineNumbers: true,
                mode: {name: "text/x-mysql"},
                theme: 'idea',
                styleActiveLine: false,
                lineWrapping:false,
                scrollbarStyle:"overlay",
                readOnly:true,
              }}
            />
        )
    }
}


export class AuditSqlModifyCodemirror extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <CodeMirror
              editorDidMount={this.props.editorDidMount}
              value={this.props.value}
              options={{
                lineNumbers: true,
                mode: {name: "text/x-mysql"},
                theme: 'idea',
                styleActiveLine: true,
                lineWrapping:false,
                scrollbarStyle:"overlay"
              }}
              onBlur={this.props.onBlur}
              onChange={this.props.onChange}
            />
        )
    }
}