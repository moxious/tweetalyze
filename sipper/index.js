const uuid = require('uuid');
const _ = require('lodash');
const Twit = require('twit');
const moment = require('moment');
const yargs = require('yargs');
const Promise = require('bluebird');
const sipperStatus = require('sipper-status');
const DB = require('./DB');
const Capture = require('./capture');
const events = require('./events');

const SIPPER_VERSION = '0.11';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'documents';
const CHECKPOINT_FREQUENCY = process.env.SIPPER_CHECKPOINT_FREQUENCY || 1000;
const SIPPER_DEBUG = process.env.SIPPER_DEBUG;

const creds = {
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
};

// Validate startup args.
if (!creds.consumer_key || !creds.consumer_secret || !creds.access_token || !creds.access_token_secret) {
  throw new Error('Missing credential configuration, check env vars');
} else if (!process.env.TWITTER_TRACK || !yargs.argv.track) {
  throw new Error('Please either define TWITTER_TRACK or pass --track param');
} if (!yargs.argv.label) {
  throw new Error('Please call me with --label <name> to name your sipper');
}

// Log entry for tracking progress of a sipper.
const sipperDetails = {
  id_str: uuid.v4(),
  started_str: moment.utc().format(),
  started: moment.utc().valueOf(),
  checkpoint: moment.utc().valueOf(),
  checkpoint_str: moment.utc().format(),
  rate: [],
  captureExpression: capture.getCaptureExpression(),
  captured: 0,
  inserted: 0,
  errors: 0,
  duplicates: 0,
  warnings: 0,
  limitNotices: 0,
  label: yargs.argv.label || 'unnamed',
  version: SIPPER_VERSION,
  next_heartbeat: '',
  // Log which account used for capture, but not secrets.
  consumer_key: creds.consumer_key,
  access_token: creds.access_token,
};

const onCaptureChange = (cap, oldC, newC) => {
  sipperDetails.captureExpression = cap.getCaptureExpression();
  console.log('OLD=', oldC, 'newC=', newC);
}

const capture = new Capture(yargs, yargs.argv.partition, onCaptureChange);

let collection = null;
let T = null;

/**
 * Put single captured tweet into the DB.
 * @param {*} tweet object from streaming API
 * @param {*} db instance of DB class.
 * @returns {Promise}
 */
const insertTweet = (tweet, db) => {
  const findCriteria = _.pick(tweet, ["id_str"]);

  if (!collection) {
    collection = db.getConnection().collection(MONGO_COLLECTION);
  }

  // Depends on id_str index.
  return collection.insert(tweet)
    .then(cmdResult => {
      if (cmdResult.result.ok) {
        sipperDetails.captured++;
        sipperDetails.inserted += cmdResult.result.n;
        if (sipperDetails.captured % CHECKPOINT_FREQUENCY === 0) {
          sipperStatus.checkpoint(db, sipperDetails);
        }
      } else {
        events.log(sipperDetails, 'InsertError', cmdResult);
        sipperDetails.errors++;
      }
    })
    .catch(err => {
      if (err.message && err.message.indexOf('duplicate key error')) {
        // Fine, ignorable; we just skipped inserting a dupe.
        sipperStatus.duplicates++;
      } else {
        sipperStatus.errors++;
        events.log(sipperDetails, 'Tweet insert failed', {
          name: err.name,
          message: err.message,
        });
      }
    });
};

const beginCapture = (db) => {
  T = new Twit(_.merge(creds, {
    timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
  }));

  // Sample query to see if auth works, etc.
  T.get('statuses/home_timeline', function (err, reply) {
    if (err) {
      return events.log(sipperDetails, 'API Not Working', err);
    } else {
      return events.log(sipperDetails, 'API Working', !_.isEmpty(reply));
    }
  });

  const stream = T.stream('statuses/filter', cap.getCaptureExpression());

  process.on('SIGINT', () => {
    events.log(sipperDetails, 'SIGINT', { message: 'Shutting down' });
    db.disconnect();
    if (stream) { stream.stop(); }
    try { capture.watcher.close(); }
    catch(err) { ; } 
    process.exit(1);
  });

  events.log(sipperDetails, 'Beginning capture');

  // Various kinds of stream events which can occur...

  stream.on('tweet', tweet => insertTweet(tweet, db));
  stream.on('error', err => handleError(sipperDetails, err));
  stream.on('limit', msg => {
    // Limit notices indicate you're asking for more data than streaming API
    // can send.  Increment this counter. For large values, we're missing a lot.
    sipperDetails.limitNotices++;
  });
  stream.on('disconnect', msg => events.log(sipperDetails, 'Disconnect', msg));
  stream.on('warning', msg => {
    sipperDetails.warnings++;
    events.log(sipperDetails, 'Warning', msg);
  });
  stream.on('status_withheld', msg => events.log(sipperDetails, 'Withheld', msg));
  stream.on('scrub_geo', msg => events.log(sipperDetails, 'ScrubGeo', msg));
  stream.on('connected', msg => events.log(sipperDetails, 'Connected'));
};

const main = () => {
  const url = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const dbName = process.env.MONGO_DB_NAME || 'twitter';

  const db = new DB(url, dbName);

  return db.connect()
    .then(() => {
      sipperStatus.checkpoint(db, sipperStatus);
      return beginCapture(db);
    })
    .catch(err => {
      console.error('Outer error caught; terminating', err, sipperDetails);
    });
};

/*********************************************/
main();