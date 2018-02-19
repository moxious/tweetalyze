/** 
 * This module defines what the sipper will capture.
 * It can be set to watch a partition file, in which case it will auto-reload
 * itself and notify the caller via a callback.  
 */
const fs = require('fs');
const _ = require('lodash');

class Capture {
    /**
     * @param {*} yargs args sent to command line program.
     * @param {String} partitionFile
     * @param {Function} callback to be called with this object when
     * tracking expression changes.  Will be called with args
     * (thisObject, newCapEx, oldCapEx)
     */
    constructor(yargs, partitionFile, callback) {
        this.partitionFile = partitionFile;
        this.partitionData = null;
	this.callback = callback;

        if (!callback) {
            throw new Error('Must provide change callback');
        }

        this.lastCaptureExpression = null;

        this.captureExpression = {
            track: yargs.argv.track || process.env.TWITTER_TRACK,
        };

        if (this.partitionFile) {
            this.loadPartition(false);

            // Watch the file and reload it whenever
            this.watcher = fs.watch(this.partitionFile, eventType => {
                if (eventType === 'change') {
                    this.loadPartition(true);
                }
            });
        }

        if (!this.captureExpression.track) {
            throw new Error('To specify what to capture from twitter, set TWITTER_TRACK, pass --track foo, or set a partition file');
        }
    }

    loadPartition(fireCallback=true) {
        this.partitionData = fs.readFileSync(this.partitionFile).toString();

        if (!this.partitionData && this.captureExpression.track) {
            // Try not to crash if file is messed up
            console.warn(`Invalid partition data in ${partitionFile} continuing with last tracker`);
        } else if (!this.partitionData) {
            throw new Error(`Partition file ${partitionFile} missing/invalid data, cannot continue`);
        }    

        this.lastCaptureExpression = _.cloneDeep(this.captureExpression);
        this.captureExpression.track = this.partitionData;
        
        if (fireCallback) {
            return this.callback(this, this.captureExpression, this.lastCaptureExpression);
        }
    }

    getCaptureExpression() {
        return this.captureExpression;
    }
}

module.exports = Capture;

