// function getTime() {
//     let today = new Date();
//     let date = today.getDate() + '-' + (today.getMonth() + 1) + '-' + today.getFullYear();
//     let time = today.getHours() + ":" + today.getMinutes();
//     let dateTime = time + ' ' + date;
//     return dateTime;
// }

function getTime() {
    var d = new Date();
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000); // UTC time
    var offset = 7; // UTC +7 hours
    var gmt7 = new Date(utc + (3600000 * (offset - d.getTimezoneOffset() / 60)));
    return gmt7;
    // let str = gmt7.toLocaleString('vi-VN', { timeZone: 'UTC' }).split(" ");
    // return str[0].substr(0,str[0].lastIndexOf(":")) + " " + str[1];
}
// console.log(getCurrentTimeGMT7().toLocaleString('vi-VN', { timeZone: 'UTC' }));

module.exports = {
    getTime
};
