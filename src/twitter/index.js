const moment = require('moment');

module.exports = {
    dateFormat: 'ddd MMM DD HH:mm:ss ZZZZZ YYYY',
    date: str => moment(str, this.dateFormat).toISOString(),
};
