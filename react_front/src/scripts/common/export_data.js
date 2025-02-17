/**
 @Time    : 2021/9/17 15:31
 @Author  : chao.gao
 @FileName: excel.js
 **/

import ExportJsonExcel from 'js-export-excel';

/**
 *  导出 antd table 至Excel,
 * @param data table 数据 格式list
 * @param columns 列头信息，格式[{}],关键参数：dataIndex，title
 * @param fileName 默认文件名
 */
export function tableToExcel(data, columns, fileName) {
    let columnsTitleList = [];
    // console.log(columns);
    let columnsDataInfoList = [];
    columns.forEach(column => {
        if (column.hasOwnProperty('dataIndex')) {
            columnsTitleList.push(column.title);
            columnsDataInfoList.push(column.dataIndex);
        }
    });

    let option = {};
    let dataTable = [];
    if (data) {
        for (let i in data) {
            if (data) {
                let obj = {};
                for (let j in columnsTitleList) {
                    obj[columnsTitleList[j]] = data[i][columnsDataInfoList[j]];
                }
                dataTable.push(obj);
            }
        }
    }
    option.fileName = fileName;
    option.datas = [
        {
            sheetData: dataTable,
            sheetName: 'sheet',
            sheetFilter: columnsTitleList,
            sheetHeader: columnsTitleList,
        }
    ];

    let toExcel = new ExportJsonExcel(option);
    toExcel.saveExcel();
}


/**
 * 导出文件
 * @param data 需要保存的内容
 * @param name 保存的文件名
 */
export function SaveFile(data, name) {
    //Blob为js的一个对象，表示一个不可变的, 原始数据的类似文件对象，这是创建文件中不可缺少的！
  var urlObject = window.URL || window.webkitURL || window;
  var export_blob = new Blob([data]);
  var save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
  save_link.href = urlObject.createObjectURL(export_blob);
  save_link.download = name;
  save_link.click();
}