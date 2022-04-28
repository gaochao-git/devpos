import React from 'react';

class HeadTimer extends React.Component{
    constructor(){
        super()
        this.state={
            //时间对象
           time:new Date(),
            current_time:"xxxx-xx-xx xx:xx:xx",
            week_day:"xx"
        }
    }
    //组件一旦挂载就调用
    componentDidMount(){
        this.timer= setInterval(() => {
            this.getDateWeek()
        }, 1000);
    }
    componentWillUnmount() {
    if (this.timer2 != null) {
      clearInterval(this.timer2);
    }
  }

    getDateWeek = ()=>{
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
    render(){
        return <p style={{marginTop:15,textAlign:'right'}}>{this.state.current_time} {this.state.week_day}</p>
    }
}
export default HeadTimer