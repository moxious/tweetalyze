/** 
 * This module defines what the sipper will capture.
 * It can be set to watch a partition file, in which case it will auto-reload
 * itself and notify the caller via a callback.  
 * 
 * A partition file is usually going to be a single line of text that looks like:
 * #hashtag,@account,Topic1,Topic2,etc
 * 
 * This turns into a capture expression that's sent to the streaming API.
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
                    setTimeout(() => this.loadPartition(true), 500);
                }
            });
        }

        if (!this.captureExpression.track) {
            throw new Error('To specify what to capture from twitter, set TWITTER_TRACK, pass --track foo, or set a partition file');
        }
    }

    loadPartition(fireCallback=true) {
        // Right now partition data is just a comma-separated string, later it might
        // be parseable json to send other options to twitter like lang: en
        this.partitionData = fs.readFileSync(this.partitionFile).toString();

        if (!this.partitionData && this.captureExpression.track) {
            // Try not to crash if file is messed up
            console.warn(`Invalid partition data in ${this.partitionFile} continuing with last tracker`);
        } else if (!this.partitionData) {
            throw new Error(`Partition file ${this.partitionFile} missing/invalid data, cannot continue`);
        }    

        this.lastCaptureExpression = _.cloneDeep(this.captureExpression);

        const dataChanged = !(this.partitionData === this.captureExpression.track);

        this.captureExpression.track = this.partitionData;
        
        if (dataChanged && fireCallback) {
            // Don't fire callback if the file event fired but no data changed.
            // Switching twitter streams is expensive, to be avoided.
            return this.callback(this, this.captureExpression, this.lastCaptureExpression);
        }
    }

    /** 
     * Get the expression for passing to twitter's streaming filter API.
     */
    getCaptureExpression() {
        return this.captureExpression;
    }
}

module.exports = Capture;

