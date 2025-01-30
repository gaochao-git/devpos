import React from 'react';
import { DatePicker, Button } from 'antd';
import moment from 'moment';

const { RangePicker } = DatePicker;

const TimeRangePicker = ({ 
    timeRange,
    onTimeRangeChange,
    onOk,
    style
}) => {
    // 快速选择选项
    const quickRanges = {
        '最近1分钟': [moment().subtract(1, 'minutes'), moment()],
        '最近5分钟': [moment().subtract(5, 'minutes'), moment()],
        '最近10分钟': [moment().subtract(10, 'minutes'), moment()],
        '最近15分钟': [moment().subtract(15, 'minutes'), moment()],
        '最近30分钟': [moment().subtract(30, 'minutes'), moment()],
        '最近1小时': [moment().subtract(1, 'hours'), moment()],
        '最近2小时': [moment().subtract(2, 'hours'), moment()]
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...style }}>
            <RangePicker
                showTime
                value={timeRange}
                onChange={onTimeRangeChange}
                onOk={onOk}
                ranges={quickRanges}
                format="YYYY-MM-DD HH:mm:ss"
                style={{ minWidth: '380px' }}
            />
            <Button 
                type="primary"
                onClick={() => onOk && onOk(timeRange)}
            >
                select time
            </Button>
        </div>
    );
};

export default TimeRangePicker; 