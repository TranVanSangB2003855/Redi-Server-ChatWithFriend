function getTime() {
    let today = new Date();
    let date = today.getDate() + '-' + (today.getMonth() + 1) + '-' + today.getFullYear();
    let time = (today.getHours()+7) + ":" + today.getMinutes();
    let dateTime = time + ' ' + date;
    return dateTime;
}

module.exports = {
    getTime
};
