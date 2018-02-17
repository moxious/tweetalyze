const uuid = require('uuid');
const _ = require('lodash');
const Twit = require('twit');
const MongoClient = require('mongodb').MongoClient;
const moment = require('moment');
const yargs = require('yargs');
const Promise = require('bluebird');

const SIPPER_VERSION = '0.05';

let creds;
try {
  creds = require('./creds.json');
} catch (err) {
  creds = {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  };
}

if (!creds.consumer_key || !creds.consumer_secret || !creds.access_token || !creds.access_token_secret) {
  throw new Error('Missing credential configuration');
} else if (!process.env.TWITTER_TRACK) {
  throw new Error('Please define TWITTER_TRACK');
} if (!yargs.argv.label) {
  throw new Error('Please call me with --label <name> to name your sipper');
}

const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'documents';
const CHECKPOINT_FREQUENCY = process.env.SIPPER_CHECKPOINT_FREQUENCY || 1000;
const SIPPER_DEBUG = process.env.SIPPER_DEBUG;

const captureExpression = {
  track: process.env.TWITTER_TRACK || 'Russians, #politics, #trumptrain, #MAGA, #Mueller, Kremlin, Putin',
};

const sipperDetails = {
  id_str: uuid.v4(),
  started_str: moment.utc().format(),
  started: moment.utc().valueOf(),
  checkpoint: moment.utc().valueOf(),
  checkpoint_str: moment.utc().format(),
  captureExpression,
  captured: 0,
  inserted: 0,
  errors: 0,
  label: yargs.argv.label || 'unnamed sipper',
  version: SIPPER_VERSION,

  // Log which account used for capture, but not secrets.
  consumer_key: creds.consumer_key,
  access_token: creds.access_token,
};

const sipperID = uuid.v4();

const url = 'mongodb://localhost:27017';
const dbName = 'twitter';
let dbConnection = null;
let collection = null;
let T = null;

const checkpoint = (update = false) => {
  sipperDetails.checkpoint = moment.utc().valueOf();
  sipperDetails.checkpoint_str = moment.utc().format();

  // How much unique stuff we haven't already seen is this sipper getting?
  try {
    sipperDetails.ratio = sipperDetails.inserted / sipperDetails.captured;
  } catch (err) {
    sipperDetails.ratio = 0;
  }

  console.log(moment.utc().format(),
    'Checkpoint ', sipperDetails.id_str,
    'version:', sipperDetails.version,
    'inserted:', sipperDetails.inserted,
    'captured:', sipperDetails.captured,
    'ratio:', sipperDetails.ratio,
    'errors:', sipperDetails.errors,
    'tracking:', captureExpression.track);

  const op = update ? { $set: sipperDetails } : { $setOnInsert: sipperDetails };
  const options = { upsert: true };

  return collection.updateOne({ id_str: sipperDetails.id_str }, op, options)
    .catch(err => console.error('Error updating sipper: ', err));
};

const insertTweet = tweet => {
  const findCriteria = _.pick(tweet, ["id_str"]);

  // Depends on id_str index.
  return collection.updateOne(findCriteria, { $setOnInsert: tweet }, { upsert: true })
    .then(cmdResult => {
      if (cmdResult.result.ok) {
        sipperDetails.captured++;
        sipperDetails.inserted += cmdResult.result.n;
        if (sipperDetails.captured % CHECKPOINT_FREQUENCY === 0) {
          checkpoint(true);
          if (SIPPER_DEBUG) { console.log(cmdResult); }
        }
      } else {
        console.log('err', cmdResult);
        sipperDetails.errors++;
      }
    })
    .catch(err => console.error('Upsert failed: ', err));
};

const log = (eventType, obj) => {
  console.error(moment.utc().format(),
    eventType, sipperDetails.id_str,
    'label:', sipperDetails.label,
    obj);
};

const handleError = err => {
  console.error(moment.utc().format(),
    'Error', sipperDetails.id_str,
    'label:', sipperDetails.label,
    'message:', err.message,
    'code:', err.code,
    'allErrors:', err.allErrors);
};

const beginCapture = () => {
  T = new Twit(_.merge(creds, {
    timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
  }));

  const stream = T.stream('statuses/filter', captureExpression)
  stream.on('tweet', insertTweet);
  stream.on('error', handleError);
  stream.on('limit', msg => log('Limit', msg));
  stream.on('disconnect', msg => log('Disconnect', msg));
  stream.on('warning', msg => log('Warning', msg));
  stream.on('status_withheld', msg => log('Withheld', msg));
  stream.on('scrub_geo', msg => log('ScrubGeo', msg));
  stream.on('connected', msg => log('Connected', msg));
};

const main = () => {
  return MongoClient.connect(url)
    .then(client => {
      dbConnection = client.db(dbName);
      collection = dbConnection.collection(MONGO_COLLECTION);

      checkpoint();
      return beginCapture();
    })
    .catch(err => {
      console.error('Outer error caught; terminating', err);
    });
};


main();