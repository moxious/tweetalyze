const moment = require('moment');

// Later put in bunyan or something; now lazy.
const log = (sipper={}, eventType='unknown', obj=null) => {
    console.log(moment.utc().format(),
        eventType, sipper.id_str,
        'label:', sipper.label,
        obj ? obj : '');
};

const handleError = (sipper, err) => {
    console.error(moment.utc().format(),
        'Error', sipper.id_str,
        'label:', sipper.label,
        'message:', err.message,
        'code:', err.code,
        'allErrors:', err.allErrors);
};

module.exports = {
    log,
    handleError,
};
