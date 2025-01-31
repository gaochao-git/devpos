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

    // 格式化时间为指定格式
    const formatTime = (time) => {
        if (!time) return null;
        return moment(time).local().format('YYYY-MM-DD HH:mm:ss');
    };

    // 处理时间范围变化
    const handleChange = (dates) => {
        const formattedDates = dates ? dates.map(formatTime) : null;
        onTimeRangeChange(formattedDates);
    };

    // 处理确认按钮点击
    const handleOk = () => {
        if (onOk && timeRange) {
            const formattedTimeRange = timeRange.map(time => 
                typeof time === 'string' ? time : formatTime(time)
            );
            onOk(formattedTimeRange);
        }
    };

    // 将字符串时间转换为moment对象以供显示
    const displayTimeRange = timeRange ? timeRange.map(time => 
        typeof time === 'string' ? moment(time, 'YYYY-MM-DD HH:mm:ss').local() : time
    ) : null;

    // 快速选择选项的时间也需要格式化
    const formattedQuickRanges = {};
    Object.entries(quickRanges).forEach(([key, value]) => {
        formattedQuickRanges[key] = value.map(formatTime);
    });

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...style }}>
            <RangePicker
                showTime
                value={displayTimeRange}
                onChange={handleChange}
                onOk={handleOk}
                ranges={formattedQuickRanges}
                format="YYYY-MM-DD HH:mm:ss"
                style={{ minWidth: '380px' }}
            />
        </div>
    );
};

export default TimeRangePicker; 