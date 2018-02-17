const uuid = require('uuid');
const _ = require('lodash');
const Twit = require('twit');
const MongoClient = require('mongodb').MongoClient;
const moment = require('moment');
const yargs = require('yargs');

const SIPPER_VERSION = '0.03';

let creds;
try {
  creds = require('./creds.json');
} catch(err) {
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
}

const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'documents';
const CHECKPOINT_FREQUENCY = 1000;

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
  errors: 0,
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

  console.log(moment.utc().format(), 'Checkpoint ', sipperDetails.id_str, 
    'captured:', sipperDetails.captured, 'errors:', sipperDetails.errors, 
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
        if (sipperDetails.captured % CHECKPOINT_FREQUENCY === 0) {
          checkpoint(true);
        }
      } else {
        console.log('err', cmdResult);
        sipperDetails.errors++;
      }
    })
    .catch(err => console.error('Upsert failed: ', err));
};

const beginCapture = () => {
  T = new Twit(_.merge(creds, {
    timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
  }));

  const stream = T.stream('statuses/filter', captureExpression)
  stream.on('tweet', insertTweet);
};

MongoClient.connect(url, (err, client) => {
  dbConnection = client.db(dbName);
  collection = dbConnection.collection(MONGO_COLLECTION);

  checkpoint();
  beginCapture();
});
