import React from 'react';
import { Input,Popover, Table, table } from 'antd';
import axios from "axios";
import {backendServerApiRoot} from "../common/util";
const TextArea = Input.TextArea;


export class myTimer extends React.Component {
    constructor(props) {
        super(props);
    }
    componentDidMount() {
        this.setCurrentTimeInterVal()
    }
   setCurrentTimeInterVal = () => {
        this.currentTimerId= setInterval(() => {this.getDateWeek()}, 1000);
  }
    getDateWeek = ()=>{
        console.log(111)
        this.getTodayDate();
        this.getTodayWeek()
      }
    getTodayDate = ()=> {
      var checkTime = function (i) {
        if (i < 10) {i = "0" + i}
        return i;
      }
      var date = new Date();
      var year = date.getFullYear().toString();
      var month = (date.getMonth()+1).toString();
      var day = date.getDate().toString();
      var hour =   checkTime(date.getHours().toString());
      var minute = checkTime(date.getMinutes().toString());
      var second = checkTime(date.getSeconds().toString());
      var now_time = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
      this.setState({current_time:now_time})
    };

getTodayWeek = ()=> {
    var tempDate = new Date();
    var days = tempDate.getDay();
    var week;
    switch(days) {
        case 1:
            week = '星期一';
            break;
        case 2:
            week = '星期二';
            break;
        case 3:
            week = '星期三';
            break;
        case 4:
            week = '星期四';
            break;
        case 5:
            week = '星期五';
            break;
        case 6:
            week = '星期六';
            break;
        case 0:
            week = '星期日';
            break;
    }
    this.setState({week_day:week})
};
    render() {
        return (
            <div>
                xxxx{this.state.current_time}  {this.state.week_day}
            </div>
        )
    }
}