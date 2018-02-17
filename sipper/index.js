var Twit = require('twit');
const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';
const dbName = 'twitter';
let dbConnection = null;
let collection = null;
let T = null;

let c = 0;

const beginCapture = () => {
  T = new Twit({
	  consumer_key:         'uXbZBOultAKuF3nBOBieSdNPK',
	  consumer_secret:      '0ZKG8ztTE8jnqgx4GP85Y9Hc6nFKEatYJNwOqgMBQkfR8hNsSW',
	  access_token:         '7014362-BQxIMHsQaTio2qaVMJDwb6Bf5jUvyi487EBD3bdleu',
	  access_token_secret:  'XauM8rIYpJEwjpatPlF0Iv1sBw7gCeu7TnzdPqVe5nHy7',
	  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  });

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
