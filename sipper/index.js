const uuid = require('uuid');
const _ = require('lodash');
const Twit = require('twit');
const MongoClient = require('mongodb').MongoClient;
const moment = require('moment');
const creds = require('./creds.json');

const MONGO_COLLECTION = 'documents';
const CHECKPOINT_FREQUENCY = 10;

const captureExpression = {
  track: 'Russians, #politics, #trumptrain, #MAGA, #Mueller, Kremlin, Putin',
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
};

const sipperID = uuid.v4();

const url = 'mongodb://localhost:27017';
const dbName = 'twitter';
let dbConnection = null;
let collection = null;
let T = null;

const checkpoint = (update = false) => {
  sipperDetails.checkpoint = moment.utc().valueOf();
  sipperDetails.checkpoint_str = moment.utc().valueOf();

  console.log('Checkpoint ', sipperDetails.id_str, 'captured:',
    sipperDetails.captured, 'errors:', sipperDetails.errors);

  const op = update ? { $set: sipperDetails } : { $setOnInsert: sipperDetails };
  const options = { upsert: true };

  return collection.updateOne({ id_str: sipperDetails.id_str }, op, options)
    .catch(err => console.error('Error updating sipper: ', err));
};

const insertTweet = tweet => {
  const findCriteria = _.pick(tweet, ["id_str"]);

  // Depends on id_str index.
  return collection.updateOne(findCriteria, { $setOnInsert: tweet }, { upsert: true })
    .then(result => {
      if (result.ok) {
        sipperDetails.captured++;
        if (sipperDetails.captured % CHECKPOINT_FREQUENCY === 0) {
          checkpoint();
        }
      } else {
        sipper.errors++;
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

  beginCapture();
});
