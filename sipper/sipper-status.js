const moment = require('moment');
const uuid = require('uuid');

const SIPPER_COLLECTION = 'sipper'; // mongo status docs for sippers

/**
 * @param {*} conn mongodb connection
 * @param {*} sipperDetails object with sipper details to log.
 */
const checkpoint = (db, sipperDetails, checkpointFrequency) => {
    const collection = db.getConnection().collection(SIPPER_COLLECTION);

    const now = moment.utc().valueOf();
    const nowStr = moment.utc(now).format();

    const elapsedTimeMs = now - sipperDetails.checkpoint;
    const elapsedTimeMin = elapsedTimeMs / 1000 / 60;

    // We captured a set in this many ms, meaning our rate is this many
    // tweets/min.
    const r = checkpointFrequency / elapsedTimeMin;

    // An estimate of when the sipper will checkpoint again.  This lets us detect dead 
    // ones that aren't running.
    sipperDetails.next_heartbeat = moment.utc(now + elapsedTimeMs + 1000).format();

    // Checkpoint rate for this capture expression.
    sipperDetails.rate = r;

    sipperDetails.checkpoint = now;
    sipperDetails.checkpoint_str = nowStr;

    console.log(moment.utc().format(),
        'Checkpoint ', sipperDetails.id_str,
        'version:', sipperDetails.version,
        'inserted:', sipperDetails.inserted,
        'captured:', sipperDetails.captured,
        'rate:', sipperDetails.rate,
        'errors:', sipperDetails.errors,
        'tracking:', sipperDetails.captureExpression.track);

    return collection.insert(sipperDetails)
        .catch(err => console.error('Error updating sipper: ', err));
};

module.exports = {
    checkpoint,
};


