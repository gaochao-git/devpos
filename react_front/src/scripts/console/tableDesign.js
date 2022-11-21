import React,{Component} from 'react';
import MyAxios from "../common/interface"
import {EditableTable} from "./tableBaseInfo"


export default class TableDesign extends Component  {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <div>
                <EditableTable/>
            </div>
        )
    }
}