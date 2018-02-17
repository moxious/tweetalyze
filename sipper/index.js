const _ = require('lodash');
const Twit = require('twit');
const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';
const dbName = 'twitter';
let dbConnection = null;
let collection = null;
let T = null;

const creds = require('./creds.json');

let c = 0;

const beginCapture = () => {
  T = new Twit(_.merge(creds, {
    timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
  }));

  var stream = T.stream('statuses/filter', { track: 'Russians, #politics, #trumptrain, #MAGA, #Mueller, Kremlin, Putin', language: 'en' })

  stream.on('tweet', function (tweet) {
    // console.log(tweet.user.screen_name + ': ' + tweet.text); 
    collection.insert([tweet], (err, result) => {
      if (err) { console.error(err); }
      else if (result.result.n !== 1) { console.error('Unexpected result ', result); }
      else {
        c++;
        if (c % 1000 === 0) { console.log('Checkpoint ', c); }
      }
    });
  });
};

MongoClient.connect(url, (err, client) => {
  dbConnection = client.db(dbName);
  collection = dbConnection.collection('documents');
  beginCapture();
});
